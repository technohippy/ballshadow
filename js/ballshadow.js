(function() {
  var canvas = document.getElementById('texture');
  canvas.addEventListener('click', function() {
    if (canvas.className === 'hide') {
      canvas.className = '';
    }
    else {
      canvas.className = 'hide';
    }
  });
})();




function getMinUvI(geometry, faceIndex) {
  var face = geometry.faces[faceIndex]
  var va = geometry.vertices[face.a];
  var vb = geometry.vertices[face.b];
  var vc = geometry.vertices[face.c];
  if (va.y < vb.y) {
    if (vc.y < va.y) {
      return 2;
    }
    return 0;
  }
  else if (vb.y < vc.y) {
    return 1;
  }
  else {
    return 2;
  }
}

function setupGeometryUvs(targetMesh, sphereMesh) {
  var raycaster = new THREE.Raycaster(new THREE.Vector3());
  if (targetMesh.geometry instanceof THREE.BufferGeometry) {
    var uvs = [];
    var positions = targetMesh.geometry.getAttribute('position');
    var normals = targetMesh.geometry.getAttribute('normal');
    for (var i = 0; i < positions.count; i += 3) {
      var px1 = positions.getX(i);
      var py1 = positions.getY(i);
      var pz1 = positions.getZ(i);
      var px2 = positions.getX(i+1);
      var py2 = positions.getY(i+1);
      var pz2 = positions.getZ(i+1);
      var px3 = positions.getX(i+2);
      var py3 = positions.getY(i+2);
      var pz3 = positions.getZ(i+2);
      positions.setX(i, px1/30);
      positions.setY(i, py1/30);
      positions.setZ(i, pz1/30);
      positions.setX(i+1, px2/30);
      positions.setY(i+1, py2/30);
      positions.setZ(i+1, pz2/30);
      positions.setX(i+2, px3/30);
      positions.setY(i+2, py3/30);
      positions.setZ(i+2, pz3/30);

      var nx1 = normals.getX(i);
      var ny1 = normals.getY(i);
      var nz1 = normals.getZ(i);
      var nx2 = normals.getX(i+1);
      var ny2 = normals.getY(i+1);
      var nz2 = normals.getZ(i+1);
      var nx3 = normals.getX(i+2);
      var ny3 = normals.getY(i+2);
      var nz3 = normals.getZ(i+2);
      var normal = new THREE.Vector3(
        (nx1 + nx2 + nx3) / 3.0,
        (ny1 + ny2 + ny3) / 3.0,
        (nz1 + nz2 + nz3) / 3.0
      ).normalize();
      var origin = sphereMesh.position.clone().add(normal.clone().multiplyScalar(2));
      var direction = normal.clone().negate();
      raycaster.set(origin, direction);
      var intersects = raycaster.intersectObject(sphereMesh);
      if (0 < intersects.length) {
        var intersect = intersects[0];
        var uv = sphereMesh.geometry.faceVertexUvs[0][intersect.faceIndex];
        for (var j = 0; j < 3; j++) {
          uvs.push(uv[j].x);
          uvs.push(uv[j].y);
        }
      }
      else {
        //console.log('intersects is []. (i = ' + i + ')');
        for (var j = 0; j < 3; j++) {
          uvs.push(0);
          uvs.push(0);
        }
      }
    }
    var typedUvs = new Float32Array(uvs.length);
    for (var i = 0; i < uvs.length; i++) {
      typedUvs[i] = uvs[i];
    }
    targetMesh.geometry.addAttribute('uv', new THREE.BufferAttribute(typedUvs, 2));
    console.log(targetMesh.geometry.attributes);
  }
  else if (targetMesh.geometry instanceof THREE.Geometry) {
    targetMesh.geometry.faces.forEach(function(face, faceIndex) {
      var origin = sphereMesh.position.clone().add(face.normal.clone().multiplyScalar(2));
      var direction = face.normal.clone().negate();
      raycaster.set(origin, direction);
      var intersects = raycaster.intersectObject(sphereMesh);
      if (0 < intersects.length) {
        var intersect = intersects[0];
        var sphereUv = sphereMesh.geometry.faceVertexUvs[0][intersect.faceIndex];
        var minSphereUvI = getMinUvI(sphereMesh.geometry, intersect.faceIndex);
        var targetUv = targetMesh.geometry.faceVertexUvs[0][faceIndex];
        var minTargetUvI = getMinUvI(targetMesh.geometry, faceIndex);
        var di = minSphereUvI - minTargetUvI;
        for (var i = 0; i < 3; i++) {
          targetUv[i].copy(sphereUv[(i+di+3)%3]);
        }
      }
      else {
        console.log('intersects is []. (faceIndex = ' + faceIndex + ')');
      }
    });
  }
}

function createTargetMesh(type, canvas, after) {
  var targetGeometry;
  if (type === 'sphere') {
    sphereMesh.material.transparent = false;
    targetMesh.visible = false;
  }
  else if (type === 'torus') {
    sphereMesh.material.transparent = true;
    targetGeometry = new THREE.TorusGeometry(1, 0.3, 128, 64);
    var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(canvas)});
    var mesh = new THREE.Mesh(targetGeometry, targetMaterial);
    setupGeometryUvs(mesh, sphereMesh);
    if (targetMesh) {
      scene.remove(targetMesh);
      targetMesh.geometry.dispose();
    }
    scene.add(mesh);
    targetMesh = mesh;
    targetMesh.material.map.needsUpdate = true;
    if (after) after(mesh);
  }
  else if (type === 'torusKnot') {
    sphereMesh.material.transparent = true;
    targetGeometry = new THREE.TorusKnotGeometry(1, 0.3, 256, 32);
    var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(canvas)});
    var mesh = new THREE.Mesh(targetGeometry, targetMaterial);
    setupGeometryUvs(mesh, sphereMesh);
    if (targetMesh) {
      scene.remove(targetMesh);
      targetMesh.geometry.dispose();
    }
    scene.add(mesh);
    targetMesh = mesh;
    targetMesh.material.map.needsUpdate = true;
    if (after) after(mesh);
  }
  else if (type === 'yoda') {
    sphereMesh.material.transparent = true;
    var loader = new THREE.STLLoader();
    loader.load('model/Yoda-SuperLite.stl', function(geometry) {
      var targetGeometry = geometry;
      var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(canvas)});
      var mesh = new THREE.Mesh(targetGeometry, targetMaterial);
      setupGeometryUvs(mesh, sphereMesh);
      if (targetMesh) {
        scene.remove(targetMesh);
        targetMesh.geometry.dispose();
      }
      scene.add(mesh);
      targetMesh = mesh;
      targetMesh.material.map.needsUpdate = true;
      if (after) after(mesh);
    });
  }
}

var headerHeight = 42;
var video = document.getElementsByTagName('video')[0];
var qrcode = document.getElementById('qrcode');
var targetMesh;
var canvas = document.getElementById('texture');
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

var renderer = new THREE.WebGLRenderer({canvas:document.getElementById('webgl-canvas')});
renderer.setSize(window.innerWidth, window.innerHeight - headerHeight);
renderer.setClearColor(0x607d8b);

var sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
sphereGeometry.faces.forEach(function(face, faceIndex) {
  var uv = sphereGeometry.faceVertexUvs[0][faceIndex];
  ['a', 'b', 'c'].forEach(function(vi, i) {
    uv[i].x = sphereGeometry.vertices[face[vi]].x / 2 + 0.5;
    uv[i].y = sphereGeometry.vertices[face[vi]].y / 2 + 0.5;
  });
});
var sphereMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(canvas)});
var sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphereMesh.material.transparent = true;
sphereMesh.material.opacity = 0;
scene.add(sphereMesh);

createTargetMesh('torusKnot', canvas);


var controls = new THREE.OrbitControls(camera, renderer.domElement);

function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
}
render();






var gc = canvas.getContext('2d');
var image = new Image();
image.onload = function() {
  gc.drawImage(image, 0, 0);
  if (targetMesh.material.map instanceof THREE.VideoTexture) {
    targetMesh.material.map = new THREE.Texture(canvas);
    sphereMesh.material.map = new THREE.Texture(canvas);
  }
  targetMesh.material.map.needsUpdate = true;
  sphereMesh.material.map.needsUpdate = true;
};
//image.src = 'img/iron.png';
image.src = 'img/texture.png';

video.addEventListener('click', function() {
  video.style.width = video.videoWidth + 'px';
  video.style.height = video.videoHeight + 'px';

  var diSx = 0;
  var diSy = 0;
  if (video.videoWidth < video.videoHeight) {
    diSy = (video.videoHeight - video.videoWidth) / 2;
  }
  else {
    diSx = (video.videoWidth - video.videoHeight) / 2;
  }
  var diSw = Math.min(video.videoWidth, video.videoHeight);
  var diSh = Math.min(video.videoWidth, video.videoHeight);
  var diDw = 400;
  var diDh = 400;
  gc.drawImage(video, diSx, diSy, diSw, diSh, 0, 0, diDw, diDh);
  if (targetMesh.material.map instanceof THREE.VideoTexture) {
    targetMesh.material.map = new THREE.Texture(canvas);
    sphereMesh.material.map = new THREE.Texture(canvas);
  }
  sphereMesh.material.map.needsUpdate = true;
  targetMesh.material.map.needsUpdate = true;
  video.className = 'hide';
});

window.addEventListener('resize', function() {
  var height = window.innerHeight - headerHeight;
  camera.aspect = window.innerWidth / height;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, height);
});

document.addEventListener('keypress', function(event) {
  console.log(event.keyCode);
  if (event.keyCode === 118) { // v
    navigator.webkitGetUserMedia({video:true}, function(stream) {
      video.src = window.URL.createObjectURL(stream);

      if (!(targetMesh.material.map instanceof THREE.VideoTexture)) {
        targetMesh.material.map = new THREE.VideoTexture(video);
        sphereMesh.material.map = new THREE.VideoTexture(video);
      }
      targetMesh.material.map.needsUpdate = true;
      sphereMesh.material.map.needsUpdate = true;
    }, function(err) {
      console.log(err);
    });
  }
});

var Config = new (function() {
  this.geometry = 'torusKnot';
  this.texture = 'img/texture.png';
  this.toggleQRCode = function() {
    if (qrcode.className === 'hide') {
      qrcode.className = '';
    }
    else {
      qrcode.className = 'hide';
    }
  };
  this.toggleTexture = function() {
    if (video.className === 'hide') {
      video.className = '';
      video.style.width = video.videoWidth + 'px';
      video.style.height = video.videoHeight + 'px';
    }
    else {
      video.className = 'hide';
    }
  };
});
var geometryValues = ['sphere', 'torus', 'torusKnot', 'yoda'];
var gui = new dat.GUI({autoPlace: false});
gui.add(Config, 'geometry', geometryValues).onChange(function(value) {
  createTargetMesh(value, canvas);
});
var textureValues = {
  "white": "img/white.png",
  "red to black": "img/r2b.jpg",
  "black to red": "img/b2r.jpg",
  "sketch": "img/texture.png",
  "soil": "img/soil.png",
  "iron": "img/iron.png"
};
gui.add(Config, 'texture', textureValues).onChange(function(value) {
  image.src = value;
});
gui.add(Config, 'toggleQRCode');
gui.add(Config, 'toggleTexture');
window.addEventListener("load", function() {
  document.getElementById("dat-gui-container").appendChild(gui.domElement);
});
