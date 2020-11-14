import { Object3D } from '/modules/three.js/src/core/Object3D.js';
import { Mesh } from '/modules/three.js/src/objects/Mesh.js';

class PortalWindow extends Mesh {
  constructor(args) {
    /** Represents a scene on a face.
     *  
     * Params:
     * scene: THREE.Scene
     *      Scene object to render
     * portal_geometry: THREE.Geometry
     *      Geometry that scene render gets projected to 
     * transform: THREE.Euler
     *      Rotation of the scene so it appears in the correct orientation for target portal geometry
     * 
     * antialias: boolean (default=true)
     *      Renders with anti-aliasing if true
     * 
     * resolution_width: int
     * resolution_height: int
     *      Height and width resolution of the render. Should usually be the same as the main window.
     */

    super(args);

    this.scene = args.scene;
    this.portal_geometry = args.portal_geometry;

    // XXX TODO.
    this.transform = null;

    this.antialias = args.antialias || false;
    this.resolution_width = args.resolution_width || window.innerWidth;
    this.resolution_height = args.resolution_height || window.innerHeight;


    this.buffer_texture = new THREE.WebGLRenderTarget(this.resolution_width, this.resolution_height, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter });
    this.live_material = new THREE.MeshBasicMaterial({ map: this.buffer_texture.texture });


    // call showDebugUVs() to enable.
    this.show_debug_uvs = false;
    this.debug_width = args.debug_width || this.resolution_width / 4;
    this.debug_height = args.debug_height || this.resolution_height / 4;

    this.renderer = args.renderer;

    this.debug_renderer = new THREE.WebGLRenderer({ antialias: true });
    this.debug_renderer.setSize(this.debug_width, this.debug_height);

    // Required to be set in Mesh.
    this.geometry = this.portal_geometry;
    this.material = this.live_material;

    // Show wireframe of actual geometry if requested.
    this.show_wire_geometry = args.show_wire_geometry || false;
    if (this.show_wire_geometry) { this.showWireGeometry(); }

    // This is required to be set with .setCamera()
    this.camera = null;

    // A wireframe showing the geometry.
    this.wire = null;

  }

  showWireGeometry(show) {
    if (show) {
      if (!this.wire) {
        var wireframe = new THREE.WireframeGeometry(mainBoxGeo);
        var line = new THREE.LineSegments(wireframe);
        line.material.depthTest = true;
        line.material.opacity = 0.5;
        line.material.color = new THREE.Color(0x0088ff)
        line.material.transparent = true;
        this.wire = line;
      }
      this.scene.add(this.wire);
    } else {
      if (this.wire) {
        this.scene.remove(this.wire);
      }
    }
  }

  getScene() {
    return this.scene;
  }

  getScreenGeometry() {
    return this.screen_geometry;
  }

  getBufferImage() {
    return this.buffer_image;
  }

  /**
   * Returns true if any face is visible. Used in optimization.
   */
  isVisible() {
    // TODO: implement.
    console.warn("isVisible not implemented");
    return true;
  }

  /**
   * True if the geometry is coplanar.
   * This technically only checks the normals so translations of the same plane are valid.
   * Allows for optimizations in rendering.
   */
  isPlanar() {
    console.warn("isPlanar not implemented.");
    return false;
  }

  setCamera(cam) {
    this.camera = cam;
  }

  onBeforeRender() {
    this.camera.updateProjectionMatrix();

    if (this.show_debug_uvs) {
      var ctx = this.debug_canvas2d.getContext('2d');
      ctx.clearRect(0, 0, this.debug_canvas2d.width, this.debug_canvas2d.height);
    }

    var face_uvs = this.portal_geometry.faceVertexUvs[0];
    var face_idx = this.portal_geometry.faces;
    var vertices = this.portal_geometry.vertices;

    for (var i = 0; i < face_uvs.length; i++) {
      // per tri
      var tri_uvs = face_uvs[i];
      var tri_vertices = face_idx[i];
      var tri_geometry = [vertices[tri_vertices['a']], vertices[tri_vertices['b']], vertices[tri_vertices['c']]]

      var uvs = [];
      for (var j = 0; j < tri_uvs.length; j++) {
        // per vertex

        // project to camera
        var vertex = tri_geometry[j];
        var projected = vertex.clone().project(this.camera);
        projected.x = (projected.x + 1) / 2;
        projected.y = -(projected.y - 1) / 2;

        // For drawing UVs in debugger tools.
        uvs.push({ x: projected.x * this.debug_width, y: projected.y * this.debug_height });

        // Set the UVs.
        var uv = tri_uvs[j];
        uv.x = projected.x;
        uv.y = 1 - projected.y;
      }

      if (this.show_debug_uvs) {
        this.drawTriangle(this.debug_canvas2d, uvs[0], uvs[1], uvs[2]);
      }

    }
    this.portal_geometry.uvsNeedUpdate = true;


    this.debug_renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(this.buffer_texture);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    // Copy results to debug
    //this.debug_canvas2d.getContext('2d').drawImage( this.renderer.domElement, 0, 0 );

  }

  drawTriangle(canvas, a, b, c) {
    if (!canvas.getContext) {
      console.error("cannot get context for ", canvas);
      return;
    }

    var ctx = canvas.getContext('2d');
    ctx.strokeStyle = "#FF0000";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(a.x, a.y);
    ctx.stroke();
  }

  showDebugUVs(dom_element) {
    this.show_debug_uvs = true;

    var div = $('<div class="debug_container">');
    div.append(this.debug_renderer.domElement);

    var canvas = $(`<canvas height=${this.debug_height} width=${this.debug_width}></canvas>`);
    canvas.addClass("overlay");
    canvas.addClass("debug-portal-window");
    this.debug_canvas2d = canvas[0];

    div.append(canvas)
    dom_element.append(div);
  }

}

export { PortalWindow };