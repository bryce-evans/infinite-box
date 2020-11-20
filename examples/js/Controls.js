/**
 * Improved controls over the standard THREE.OrbitControls.
 * Adds listeners to show debug info on keypress.
 */


import { OrbitControls } from 'https://threejs.org/examples/jsm/controls/OrbitControls.js';
import { PortalMesh } from '/src/PortalMesh.js';

class Controls {
  constructor(camera, renderer) {
    this.orbit_controls = new OrbitControls(camera, renderer.domElement);

    this.renderer = renderer;
    this.camera = camera;
    this.show_debug_uvs = false;
  }

  update() {
    this.orbit_controls.update();
  }
  addListeners() {
    function onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onWindowResize.bind(this), false);

    window._FREEZE_ALL_PORTALS = false;
    $(document).keydown(function (event) {
      if (event.which == 32) {
        // space bar: Show debug pane.
        $('#debug_uvs').show();
        this.show_debug_uvs = true;
      } else if (event.which == 70) {
        // F: freeze textures.
        window._FREEZE_ALL_PORTALS = !window._FREEZE_ALL_PORTALS;
      }
    }.bind(this));

    $(document).keyup(function (event) {
      if (event.which == 32) {
        $('#debug_uvs').hide();
        this.show_debug_uvs = false;
      }
    }.bind(this));
  }
}

class ObjectPicker {
  constructor(domElement) {
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.pickedObject = null;
    this.pickedObjectSavedColor = 0;

    domElement.addEventListener('mousemove', this.setPickPosition.bind(this));
    domElement.addEventListener('mouseout', this.clearPickPosition.bind(this));
    domElement.addEventListener('mouseleave', this.clearPickPosition.bind(this));
    //domElement.addEventListener('mousedown', this.clickHandler.bind(this));
    $(domElement).on('click', this.clickHandler.bind(this));

    this.pickPosition = { x: 0, y: 0 };
    this.clearPickPosition();
  }

  getCanvasRelativePosition(event) {
    const rect = this.domElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.domElement.width / rect.width,
      y: (event.clientY - rect.top) * this.domElement.height / rect.height,
    };
  }

  setPickPosition(event) {
    const pos = this.getCanvasRelativePosition(event);
    this.pickPosition.x = (pos.x / this.domElement.width) * 2 - 1;
    this.pickPosition.y = (pos.y / this.domElement.height) * -2 + 1;  // note we flip Y
    //console.log(this.pickPosition);
  }
  clearPickPosition() {
    // unlike the mouse which always has a position
    // if the user stops touching the screen we want
    // to stop picking. For now we just pick a value
    // unlikely to pick something
    this.pickPosition.x = -100000;
    this.pickPosition.y = -100000;
    //console.log(this.pickPosition);
  }

  pick(scene, camera, time) {
    var normalizedPosition = this.pickPosition;

    // restore the color if there is a picked object
    if (this.pickedObject) {
      // We put this here to handle the case the click comes in the middle of executing this fn.
      if (this.clicked) {
        console.log(this.pickedObject.material.color);
        this.pickedObject.material.emissive.setHex(0xFFFFFF);
        this.pickedObject.clicked = true;
        this.pickedObjectSavedColor = 0xFFFFFF;

        this.clicked = false;
      }

      this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
      this.pickedObject = undefined;
    }

    // cast a ray through the frustum
    this.raycaster.setFromCamera(normalizedPosition, camera);
    // get the list of objects the ray intersected
    var intersectedObjects = this.raycaster.intersectObjects(scene.children);
    var max_jumps = -1;
    handle_intersected: while (intersectedObjects.length && max_jumps !== 0) {
      // pick the first object. It's the closest one
      var pickedObject = intersectedObjects[0].object;
      if (pickedObject instanceof PortalMesh) {
        //this.raycaster.setFromCamera(normalizedPosition, camera);
        intersectedObjects = this.raycaster.intersectObjects(pickedObject.material.scene.children);
        max_jumps--;
        continue handle_intersected;
      }

      if (!pickedObject.clicked) {
        // save its color
        this.pickedObjectSavedColor = pickedObject.material.emissive.getHex();
        // set its emissive color to flashing red/yellow
        pickedObject.material.emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
        this.pickedObject = pickedObject;
      }
      break;
    }

  }
  clickHandler(e) {
    this.clicked = true;
  }
}


export { Controls, ObjectPicker };