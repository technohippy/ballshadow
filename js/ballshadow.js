(function() {
  var texture = document.getElementById('texture');
  texture.addEventListener('click', function() {
    if (texture.className === 'hide') {
      texture.className = '';
    }
    else {
      texture.className = 'hide';
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

function createTargetMesh(type, texture, after) {
  var targetGeometry;
  if (type === 'sphere') {
    sphereMesh.material.transparent = false;
    targetMesh.visible = false;
  }
  else if (type === 'torus') {
    sphereMesh.material.transparent = true;
    targetGeometry = new THREE.TorusGeometry(1, 0.3, 128, 64);
    var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(texture)});
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
    var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(texture)});
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
    loader.load('Yoda-SuperLite.stl', function(geometry) {
      var targetGeometry = geometry;
      var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(texture)});
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

var video = document.getElementsByTagName('video')[0];
var qrcode = document.getElementById('qrcode');
var targetMesh;
var texture = document.getElementById('texture');
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.id = 'wegbl-canvas';
document.body.appendChild(renderer.domElement);

var sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
sphereGeometry.faces.forEach(function(face, faceIndex) {
  var uv = sphereGeometry.faceVertexUvs[0][faceIndex];
  ['a', 'b', 'c'].forEach(function(vi, i) {
    uv[i].x = sphereGeometry.vertices[face[vi]].x / 2 + 0.5;
    uv[i].y = sphereGeometry.vertices[face[vi]].y / 2 + 0.5;
  });
});
var sphereMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(texture)});
var sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphereMesh.material.transparent = true;
sphereMesh.material.opacity = 0;
scene.add(sphereMesh);

createTargetMesh('torusKnot', texture);


var controls = new THREE.OrbitControls(camera, renderer.domElement);

function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
}
render();






var gc = texture.getContext('2d');
var image = new Image();
image.onload = function() {
  gc.drawImage(image, 0, 0);
  sphereMesh.material.map.needsUpdate = true;
  targetMesh.material.map.needsUpdate = true;
};
image.src = 'iron.png';

var diSy = 75;
var diSw = 400;
var diSh = 400;
var diDw = 500;
var diDh = 500;
video.addEventListener('click', function() {
  //gc.drawImage(video, 0, 75, 400, 400, 0, 0, 500, 500);
  gc.drawImage(video, 0, diSy, diSw, diSh, 0, 0, diDw, diDh);
  sphereMesh.material.map.needsUpdate = true;
  targetMesh.material.map.needsUpdate = true;
  video.className = 'hide';
});

var imgs = document.querySelectorAll('#textures img');
imgs.forEach(function(img) {
  img.addEventListener('click', function() {
    if (img.src.match(/movie\.png$/)) {
      if (video.className === 'hide') {
        video.className = '';
        /*
        navigator.webkitGetUserMedia({video:true}, function(stream) {
          video.src = window.URL.createObjectURL(stream);
        }, function(err) {
          console.log(err);
        });
        */
      }
      else {
        video.className = 'hide';
      }
    }
    else if (img.src.match(/phone\.png$/)) {
      if (qrcode.className === 'hide') {
        qrcode.className = '';
      }
      else {
        qrcode.className = 'hide';
      }
    }
    else {
      image.src = img.src;
    }
  });
});

buttons = document.querySelectorAll('#geometries button');
buttons.forEach(function(button) {
  button.addEventListener('click', function() {
    createTargetMesh(button.textContent, texture);
  });
});

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
