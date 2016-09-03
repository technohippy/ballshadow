Handshade = (function() {
  var Handshade = {};

  Handshade.View = function(options) {
    var id = options.webglCanvasId;
    var clearColor = options.webglClearColor;
    var headerHeight = options.webglHeaderHeight;
    var targetMeshType = options.targetMeshType;
    var textureCanvasId = options.textureCanvasId;
    var textureVideoId = options.textureVideoId;
    this.textureCanvas = document.getElementById(textureCanvasId);
    this.textureCanvasGc = this.textureCanvas.getContext('2d');
    this.textureVideo = document.getElementById(textureVideoId);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / (window.innerHeight - headerHeight), 0.1, 1000);
    this.camera.position.z = 3;
    this.scene.add(this.camera);

    this.referenceSphereMesh = this.buildReferenceSphereMesh();
    this.scene.add(this.referenceSphereMesh);

    //this.targetMesh = this.buildTargetMesh(targetMeshType || 'torusKnot');
    this.setupTargetMesh(targetMeshType || 'torusKnot');
    this.scene.add(this.targetMesh);

    this.renderer = this.buildRenderer(id, clearColor, headerHeight);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

    this.streaming = false;
    this.textureImage = new Image();
    this.setupTextureCanvas();
  };

  Handshade.View.prototype.buildRenderer = function(id, clearColor, headerHeight) {
    var renderer = new THREE.WebGLRenderer({canvas:document.getElementById(id)});
    renderer.setSize(window.innerWidth, window.innerHeight - headerHeight);
    renderer.setClearColor(clearColor);

    window.addEventListener('resize', function() {
      var height = window.innerHeight - headerHeight;
      this.camera.aspect = window.innerWidth / height;
      this.camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, height);
    }.bind(this));

    return renderer;
  };

  Handshade.View.prototype.buildReferenceSphereMesh = function() {
    var sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    sphereGeometry.faces.forEach(function(face, faceIndex) {
      var uv = sphereGeometry.faceVertexUvs[0][faceIndex];
      ['a', 'b', 'c'].forEach(function(vi, i) {
        uv[i].x = sphereGeometry.vertices[face[vi]].x / 2 + 0.5;
        uv[i].y = sphereGeometry.vertices[face[vi]].y / 2 + 0.5;
      });
    });
    var texture = new THREE.Texture(this.textureCanvas);
    var sphereMaterial = new THREE.MeshBasicMaterial({map:texture});
    var sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.material.transparent = true;
    sphereMesh.material.opacity = 0;
    return sphereMesh;
  };

  Handshade.View.prototype.getMinUvI = function(geometry, faceIndex) {
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
  };

  Handshade.View.prototype.setupGeometryUvs = function(targetMesh, sphereMesh) {
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
          var minSphereUvI = this.getMinUvI(sphereMesh.geometry, intersect.faceIndex);
          var targetUv = targetMesh.geometry.faceVertexUvs[0][faceIndex];
          var minTargetUvI = this.getMinUvI(targetMesh.geometry, faceIndex);
          var di = minSphereUvI - minTargetUvI;
          for (var i = 0; i < 3; i++) {
            targetUv[i].copy(sphereUv[(i+di+3)%3]);
          }
        }
        else {
          console.log('intersects is []. (faceIndex = ' + faceIndex + ')');
        }
      }.bind(this));
    }
  };

  Handshade.View.prototype.setupTargetMesh = function(type) {
    // TODO: need refactoring
    var targetGeometry;
    if (type === 'sphere') {
      this.referenceSphereMesh.material.transparent = false;
      if (this.targetMesh) {
        this.targetMesh.visible = false;
      }
    }
    else if (type === 'torus') {
      this.referenceSphereMesh.material.transparent = true;
      targetGeometry = new THREE.TorusGeometry(1, 0.3, 128, 64);
      var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(this.textureCanvas)});
      var mesh = new THREE.Mesh(targetGeometry, targetMaterial);
      this.setupGeometryUvs(mesh, this.referenceSphereMesh);
      if (this.targetMesh) {
        this.scene.remove(this.targetMesh);
        this.targetMesh.geometry.dispose();
      }
      this.scene.add(mesh);
      this.targetMesh = mesh;
      this.targetMesh.material.map.needsUpdate = true;
    }
    else if (type === 'torusKnot') {
      this.referenceSphereMesh.material.transparent = true;
      targetGeometry = new THREE.TorusKnotGeometry(1, 0.3, 256, 32);
      var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(this.textureCanvas)});
      var mesh = new THREE.Mesh(targetGeometry, targetMaterial);
      this.setupGeometryUvs(mesh, this.referenceSphereMesh);
      if (this.targetMesh) {
        this.scene.remove(this.targetMesh);
        this.targetMesh.geometry.dispose();
      }
      this.scene.add(mesh);
      this.targetMesh = mesh;
      this.targetMesh.material.map.needsUpdate = true;
    }
    else if (type === 'yoda') {
      this.referenceSphereMesh.material.transparent = true;
      var loader = new THREE.STLLoader();
      loader.load('model/Yoda-SuperLite.stl', function(geometry) {
        var targetGeometry = geometry;
        var targetMaterial = new THREE.MeshBasicMaterial({map:new THREE.Texture(this.textureCanvas)});
        var mesh = new THREE.Mesh(targetGeometry, targetMaterial);
        this.setupGeometryUvs(mesh, this.referenceSphereMesh);
        if (this.targetMesh) {
          this.scene.remove(this.targetMesh);
          this.targetMesh.geometry.dispose();
        }
        this.scene.add(mesh);
        this.targetMesh = mesh;
        this.targetMesh.material.map.needsUpdate = true;
      }.bind(this));
    }
  };

  Handshade.View.prototype.setupTextureCanvas = function() {
    this.textureImage.onload = function() {
      if (this.textureImage.src.match(/.(png|gif|jpg|jpeg)$/)) {
        this.streaming = false;
      }
      this.textureCanvasGc.drawImage(this.textureImage, 0, 0);
      if (this.targetMesh.material.map instanceof THREE.VideoTexture) {
        this.targetMesh.material.map = new THREE.Texture(this.textureCanvas);
        this.referenceSphereMesh.material.map = new THREE.Texture(this.textureCanvas);
        //this.reflectVideo();
      }
      this.targetMesh.material.map.needsUpdate = true;
      this.referenceSphereMesh.material.map.needsUpdate = true;
    }.bind(this);
    this.textureImage.src = 'img/icon2.png';
  };

  Handshade.View.prototype.render = function() {
    requestAnimationFrame(this.render.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  Handshade.View.prototype.reflectVideo = function() {
    this.textureVideo.style.width = this.textureVideo.videoWidth + 'px';
    this.textureVideo.style.height = this.textureVideo.videoHeight + 'px';

    var diSx = 0;
    var diSy = 0;
    if (this.textureVideo.videoWidth < this.textureVideo.videoHeight) {
      diSy = (this.textureVideo.videoHeight - this.textureVideo.videoWidth) / 2;
    }
    else {
      diSx = (this.textureVideo.videoWidth - this.textureVideo.videoHeight) / 2;
    }
    var diSw = Math.min(this.textureVideo.videoWidth, this.textureVideo.videoHeight);
    var diSh = Math.min(this.textureVideo.videoWidth, this.textureVideo.videoHeight);
    var diDw = 400;
    var diDh = 400;
    this.textureCanvasGc.drawImage(this.textureVideo, diSx, diSy, diSw, diSh, 0, 0, diDw, diDh);
    if (this.targetMesh.material.map instanceof THREE.VideoTexture) {
      this.targetMesh.material.map = new THREE.Texture(this.textureCanvas);
      this.referenceSphereMesh.material.map = new THREE.Texture(this.textureCanvas);
    }
    this.referenceSphereMesh.material.map.needsUpdate = true;
    this.targetMesh.material.map.needsUpdate = true;
  };

  Handshade.View.prototype.start = function() {
    this.render();
  };

  Handshade.Menu = function(view, options) {
    var qrCodeId = options.qrCodeId;
    var datGuiId = options.datGuiId;
    this.qrCodeElm = document.getElementById(qrCodeId);
    this.view = view;
    this.setupQrCodeEvent();
    this.setupTextureCanvasEvent();
    this.setupTextureVideoEvent();
    this.setupGui(datGuiId);
  };

  Handshade.Menu.prototype.setupQrCodeEvent = function() {
    this.qrCodeElm.addEventListener('click', function() {
      this.qrCodeElm.className = this.qrCodeElm.className === 'hide' ? '' : 'hide';
    }.bind(this));
  };

  Handshade.Menu.prototype.setupTextureCanvasEvent = function() {
    this.view.textureImage.onload = function() {
      if (this.view.textureImage.src.match(/.(png|gif|jpg|jpeg)$/)) {
        this.view.streaming = false;
      }
      this.view.textureCanvasGc.drawImage(this.view.textureImage, 0, 0);
      if (this.view.targetMesh.material.map instanceof THREE.VideoTexture) {
        this.view.targetMesh.material.map = new THREE.Texture(this.view.textureCanvas);
        this.view.referenceSphereMesh.material.map = new THREE.Texture(this.view.textureCanvas);
        reflectVideo();
      }
      this.view.targetMesh.material.map.needsUpdate = true;
      this.view.referenceSphereMesh.material.map.needsUpdate = true;
    }.bind(this);
  };

  Handshade.Menu.prototype.setupTextureVideoEvent = function() {
    this.view.textureVideo.addEventListener('click', function() {
      this.view.reflectVideo();
      this.view.textureVideo.className = 'hide';
    }.bind(this));
  };

  Handshade.Menu.prototype.setupGui = function(datGuiId) {
    var Config = new (function(menu) {
      this.geometry = 'torusKnot';
      this.texture = 'img/icon2.png';
      this.toggleQRCode = function() {
        if (menu.qrCodeElm.className === 'hide') {
          menu.qrCodeElm.className = '';
        }
        else {
          menu.qrCodeElm.className = 'hide';
        }
      };
      this.toggleVideo = function() {
        if (menu.view.textureVideo.className === 'hide') {
          menu.view.textureVideo.className = '';
          menu.view.textureVideo.style.width = menu.view.textureVideo.videoWidth + 'px';
          menu.view.textureVideo.style.height = menu.view.textureVideo.videoHeight + 'px';
        }
        else {
          menu.view.textureVideo.className = 'hide';
        }
      };
      this.toggleTexture = function() {
        if (menu.view.textureCanvas.parentNode.className === 'hide') {
          menu.view.textureCanvas.parentNode.className = '';
        }
        else {
          menu.view.textureCanvas.parentNode.className = 'hide';
        }
      };
    })(this);
    var textureValues = {
      "title icon": "img/icon2.png",
      "red to black": "img/r2b.jpg",
      "black to red": "img/b2r.jpg",
      "sketch": "img/texture.png",
      "soil": "img/soil.png",
      "iron": "img/iron.png",
      "white": "img/white.png"
    };
    var geometryValues = ['sphere', 'torus', 'torusKnot', 'yoda'];
    this.gui = new dat.GUI({autoPlace: false});
    this.gui.add(Config, 'toggleTexture');
    this.gui.add(Config, 'toggleQRCode');
    this.gui.add(Config, 'texture', textureValues).onChange(function(value) {
      this.view.textureImage.src = value;
    }.bind(this));
    this.gui.add(Config, 'geometry', geometryValues).onChange(function(value) {
      this.view.setupTargetMesh(value);
    }.bind(this));
    //this.gui.add(Config, 'toggleVideo');
    window.addEventListener("load", function() {
      document.getElementById(datGuiId).appendChild(this.gui.domElement);
    }.bind(this));
  };

  Handshade.Menu.prototype.setupPeer = function(peerKey) {
    var peer = new Peer({key: peerKey});
    peer.on('open', function(id) {
      this.qrCodeElm.innerHTML = '';
      new QRCode(this.qrCodeElm, {
        text: window.location + 'camera.html#' + id,
        width: 128,
        height: 128
      });
    }.bind(this));
    peer.on('call', function(call) {
      call.on('stream', function(stream) {
        this.view.textureVideo.src = window.URL.createObjectURL(stream);
      }.bind(this));
      call.answer();
    }.bind(this));
    this.view.streaming = false;
    peer.on('connection', function(conn) {
      conn.on('open', function() {
        conn.on('data', function(data) {
          console.log('received: ' + data);
          if (data === 'start') {
            this.qrCodeElm.className = 'hide';
            //this.view.textureVideo.className = '';
            this.view.streaming = true;
            this.view.targetMesh.material.map.needsUpdate = true;
            this.view.referenceSphereMesh.material.map.needsUpdate = true;
          }
          else if (data === 'freeze') {
            this.view.streaming = false;
            this.view.textureVideo.click();
          }
        }.bind(this));
      }.bind(this));
    }.bind(this));

    function reflectVideoIfNeeded() {
      if (this.view.streaming) {
        this.view.reflectVideo();
      }
      window.requestAnimationFrame(reflectVideoIfNeeded.bind(this));
    }
    (reflectVideoIfNeeded.bind(this))();
  };

  Handshade.start = function(options) {
    var view = new Handshade.View(options);
    var menu = new Handshade.Menu(view, options);

    if (typeof Peer !== 'undefined') {
      menu.setupPeer(options.peerKey);
    }
    view.start(options);
  };

  return Handshade;
})();
