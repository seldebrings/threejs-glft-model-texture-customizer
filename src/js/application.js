import * as THREE from "three";
import OrbitControls from "orbit-controls-es6";
import { Interaction } from "three.interaction";
import * as onChange from "on-change";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as Detector from "../js/vendor/Detector";
import * as DAT from "dat.gui";

import * as checkerboard from "../textures/checkerboard.jpg";
import * as hover from "../textures/hover.jpg";
import * as camo from "../textures/camo.jpg";
import * as ghost from "../textures/ghost.jpg";
import * as fabricNormal from "../textures/fabric_normal.jpg";
import * as canvasNormal from "../textures/canvas_normal.jpg";
import * as leatherNormal from "../textures/leather_normal.png";
import * as vertShader from "../glsl/vert.glsl";
import * as fragShader from "../glsl/frag.glsl";
import gltfFile from "../gltf/vans.gltf";

export class Application {
  constructor(opts = {}) {
    if (opts.container) {
      this.container = opts.container;
    } else {
      this.createContainer();
    }

    if (Detector.webgl) {
      this.bindEventHandlers();
      this.init();
      this.render();
    } else {
      // console.warn("WebGL NOT supported in your browser!");
      const warning = Detector.getWebGLErrorMessage();
      this.container.appendChild(warning);
    }
  }

  /**
   * Bind event handlers to the Application instance.
   */
  bindEventHandlers() {
    this.createPreviews = this.createPreviews.bind(this);
    this.initViews = this.initViews.bind(this);
    this.setupGUI = this.setupGUI.bind(this);
    this.setupCamera = this.setupCamera.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.removeGUIControls = this.removeGUIControls.bind(this);
    this.addGUIFolder = this.addGUIFolder.bind(this);
    this.addControls = this.addControls.bind(this);
    this.declareObjects = this.declareObjects.bind(this);
    this.loadModel = this.loadModel.bind(this);
    this.loopThrough = this.loopThrough.bind(this);
    this.getMeshes = this.getMeshes.bind(this);
    this.setListeners = this.setListeners.bind(this);
    this.setMaterial = this.setMaterial.bind(this);
    this.setShaderMaterial = this.setShaderMaterial.bind(this);
    this.renderPreviews = this.renderPreviews.bind(this);
    this.updateCustomMesh = this.updateCustomMesh.bind(this);
    this.getMeshRef = this.getMeshRef.bind(this);
    //utils
    this.getAllChildrenNames = this.getAllChildrenNames.bind(this);
    this.setMeshesColor = this.setMeshesColor.bind(this);
    this.forEachMeshes = this.forEachMeshes.bind(this);
    this.setMeshesMap = this.setMeshesMap.bind(this);
    this.getTexture = this.getTexture.bind(this);
    this.invertHex = this.invertHex.bind(this);
  }

  init() {
    const getUrl = window.location;
    const baseUrl =
      getUrl.protocol +
      "//" +
      getUrl.host +
      "/" +
      getUrl.pathname.split("/")[1];
    console.log("baseUrl " + baseUrl);

    window.addEventListener("resize", this.handleResize);
    this.createPreviews();
    this.setupScene();
    this.initViews();
    this.setupRenderers();
    this.setupCamera();
    const interaction = new Interaction(
      this.mainRenderer,
      this.scene,
      this.views[0].camera
    );
    this.setupLights();
    this.declareObjects();
    this.setupControls();
    const particleSpecs = { spread: { x: 50, y: 100, z: 50 } };
    this.loadModel();
  }

  declareObjects() {
    this.textures = {
      Leather: { normal: leatherNormal },
      Canvas: { normal: canvasNormal },
      Laces: { normal: fabricNormal },
      Rubber: { color: 0xffffff },
      Camouflage: { pattern: camo },
      Checkerboard: { pattern: checkerboard },
      Ghost: { pattern: ghost },
      Hover: { pattern: hover },
    };

    this.shoeFabric = {
      type: "Leather",
    };

    this.shoeParts = {
      Tag: {
        normal: "Canvas",
        editable: false,
      },
      Plate: {
        editable: false,
      },
      Bottom: { color: 0xffffff, editable: false },
      Stripe: { color: 0x4d4747, editable: true },
      Binding: {
        normal: "Leather",
        color: 0xffffff,
        pattern: "None",
        editable: true,
        isFabric: true,
      },
      Eyelets: { color: 0xa7a7a7, editable: true },
      Inner_Binding: { color: 0xff0000, editable: false },
      Laces: {
        normal: "Laces",
        color: 0xffffff,
        editable: true,
      },
      Quarters: {
        normal: "Leather",
        color: 0xa70909,
        pattern: "None",
        editable: true,
        isFabric: true,
      },
      Stitch: { color: 0xff0000, editable: false },
      Tongue: {
        normal: "Leather",
        color: 0x385225,
        pattern: "None",
        editable: true,
        isFabric: true,
      },
      Vamp: {
        normal: "Leather",
        color: 0xffffff,
        pattern: "Camouflage",
        editable: true,
        isFabric: true,
      },
    };

    this.meshes = onChange(this.shoeParts, this.renderPreviews);
  }

  loadModel() {
    this.loader = new GLTFLoader();
    this.loader.parse(
      gltfFile,
      "",
      gltf => {
        this.model = gltf.scene;
        this.scene.add(this.model);
        this.loopThrough();
        this.setupGUI();
        this.renderPreviews();
      },
      xhr => {
        // called while loading is progressing
        console.log(`${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      error => {
        // called when loading has errors
        console.error("An error happened", error);
      }
    );
  }

  loopThrough() {
    this.model.traverse(child => {
      if (Object.keys(this.meshes).indexOf(child.name) != -1) {
        this.getMeshes(child);
      }
    });
  }
  getMeshes(child) {
    if (child.isMesh) {
      this.setListeners(child);
      this.setMaterial(child);
    } else {
      child.children.forEach(element => {
        this.getMeshes(element);
      });
    }
  }

  setListeners(child) {
    child.on("mouseover", this.onMouseOver);
    child.on("mouseout", this.onMouseOut);
    child.on("mousedown", this.onMouseDown);
  }

  setMaterial(child) {
    if (typeof child === "string" || child instanceof String) {
      child = this.model.getObjectByName(child);
    }
    const meshRef = this.getMeshRef(child);

    child.material.dispose();
    const currentMesh = this.meshes[meshRef];
    const mat =
      child.material.type == "MeshPhongMaterial"
        ? child.material
        : new THREE.MeshPhongMaterial();

    if (currentMesh.color) {
      mat.dispose();
      mat.color.setHex(currentMesh.color);
    }
    if (currentMesh.pattern && currentMesh.pattern !== "None") {
      const diffuse = this.getTexture(
        this.textures[currentMesh.pattern].pattern
      );
      mat.map = diffuse;
    }

    if (currentMesh.normal) {
      const bumpMap = this.getTexture(this.textures[currentMesh.normal].normal);
      mat.normalMap = bumpMap;
    }

    mat.needsUpdate = true;
    child.material = mat;
  }

  setShaderMaterial(childName) {
    const child = this.model.getObjectByName(childName);
    child.material.dispose();

    this.delta = 0;
    const customUniforms = {
      color1: {
        type: "c",
        value: new THREE.Color(0xacb6e5),
      },
      color2: {
        type: "c",
        value: new THREE.Color(0x74ebd5),
      },
      delta: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      fragmentShader: fragShader,
      vertexShader: vertShader,
      uniforms: customUniforms,
    });

    mat.needsUpdate = true;
    child.material = mat;
  }

  getMeshRef(child) {
    const meshRef =
      Object.keys(this.meshes).indexOf(child.name) != -1
        ? child.name
        : Object.keys(this.meshes).indexOf(child.parent.name) != -1
        ? child.parent.name
        : child.parent.parent.name;

    return meshRef;
  }

  renderPreviews() {
    setTimeout(() => {
      for (var i = 1; i < this.views.length; i++) {
        const view = this.views[i];
        const context = view.canvas.getContext("2d");
        view.camera.updateMatrixWorld(true);
        this.previewRenderer.render(this.scene, view.camera);
        context.drawImage(this.previewRenderer.domElement, 0, 0);
      }
    }, 500);
  }

  updateCustomMesh() {
    //console.log("updateCustomMesh");
    //this.delta += 0.1;
    if (this.model) {
      const customMesh = this.model.getObjectByName("Vamp");
      //console.log(JSON.stringify(customMesh));
      // customMesh.material.uniforms.delta.value =
      //   0.5 + Math.sin(this.delta) * 0.5;
    }
  }

  render() {
    this.controls.update();
    this.updateCustomMesh();
    this.mainRenderer.render(this.scene, this.views[0].camera);
    requestAnimationFrame(() => this.render());
  }

  /**
   * Create a div element which will contain the Three.js canvas.
   */
  createContainer() {
    const elements = document.getElementsByClassName("app");
    if (elements.length !== 1) {
      alert("You need to have exactly ONE <div class='app' /> in your HTML");
    }
    const app = elements[0];
    const div = document.createElement("div");
    div.setAttribute("class", "main-canvas-container");
    app.appendChild(div);
    this.container = div;
  }

  createPreviews() {
    const elements = document.getElementsByClassName("app");
    const app = elements[0];
    const div = document.createElement("div");
    div.setAttribute("class", "preview");
    app.appendChild(div);

    const front = document.createElement("canvas");
    front.setAttribute("class", "front-canvas-container");
    div.appendChild(front);
    this.frontCanvas = front;

    const side = document.createElement("canvas");
    side.setAttribute("class", "side-canvas-container");
    div.appendChild(side);
    this.sideCanvas = side;
  }

  initViews() {
    this.views = [
      {
        name: "Main View",
        background: new THREE.Color(0.7, 0.5, 0.5),
        canvas: this.container,
        cameraSetup: {
          fov: 75,
          near: 0.1,
          far: 10000,
          name: "Main Camera",
          position: new THREE.Vector3(100, 200, 100),
          lookAt: this.scene.position,
        },
      },
      {
        name: "Side View",
        background: new THREE.Color(0.2, 0.5, 0.5),
        canvas: this.sideCanvas,
        cameraSetup: {
          fov: 50,
          near: 0.1,
          far: 10000,
          name: "Side Camera",
          position: new THREE.Vector3(-30, 60, 243),
          lookAt: new THREE.Vector3(
            this.scene.position.x - 30,
            this.scene.position.y + 30,
            this.scene.position.z
          ),
          rotation: new THREE.Vector3(100, 150, 150),
        },
      },
      {
        name: "Top View",
        background: new THREE.Color(0.2, 0.5, 0.5),
        canvas: this.frontCanvas,
        cameraSetup: {
          fov: 60,
          near: 0.1,
          far: 10000,
          name: "Top Camera",
          lookAt: new THREE.Vector3(
            this.scene.position.x - 30,
            this.scene.position.y,
            this.scene.position.z - 30
          ),
          position: new THREE.Vector3(-30, 244, 0),
        },
      },
    ];
  }

  handleResize(event) {
    const { clientWidth, clientHeight } = this.container;
    this.views[0].camera.aspect = clientWidth / clientHeight;
    this.views[0].camera.updateProjectionMatrix();
    this.mainRenderer.setSize(clientWidth, clientHeight);
    this.renderPreviews();
  }

  onMouseOver(interactionEvent) {
    const child = interactionEvent.target;
    const { name, uuid, type } = interactionEvent.target;
    const meshRef = this.getMeshRef(child);
    if (this.meshes[meshRef].editable) {
      this.forEachMeshes(meshRef, this.model, this.setShaderMaterial);
    }
  }

  onMouseOut(interactionEvent) {
    const child = interactionEvent.currentTarget;
    const meshRef = this.getMeshRef(child);
    if (this.meshes[meshRef].editable) {
      this.forEachMeshes(meshRef, this.model, this.setMaterial);
    }
  }

  onMouseDown(interactionEvent) {
    const child = interactionEvent.target;
    const meshRef = this.getMeshRef(child);
    if (this.meshes[meshRef].editable) {
      this.addGUIFolder(meshRef);
    }
  }

  addSelectedObject(object) {
    const selectedObjects = [];
    return selectedObjects.push(object);
  }

  addGUIFolder(meshRef) {
    if (this.textureFolder) {
      this.removeGUIControls();
      this.gui.removeFolder(this.textureFolder);
      this.textureFolder = null;
    }

    this.textureFolder = this.gui.addFolder(meshRef);
    this.addControls(meshRef);
    this.textureFolder.open();
  }

  removeGUIControls() {
    if (this.texturePattern) {
      this.textureFolder.remove(this.texturePattern);
      this.texturePattern = null;
    }
    if (this.textureColor) {
      this.textureFolder.remove(this.textureColor);
      this.textureColor = null;
    }
  }

  addControls(meshRef) {
    this.removeGUIControls();
    this.textureColor = this.textureFolder
      .addColor(this.meshes[meshRef], "color")
      .onChange(val => {
        this.setMeshesColor(meshRef, this.model, this.meshes[meshRef].color);
      });
    this.setMeshesColor(meshRef, this.model, this.meshes[meshRef].color);

    if (this.meshes[meshRef].pattern) {
      this.texturePattern = this.textureFolder
        .add(this.meshes[meshRef], "pattern", [
          "None",
          ...Object.keys(this.textures).slice(4, 8),
        ])
        .onChange(val => {
          this.meshes[meshRef].pattern = val;
          const texture =
            this.meshes[meshRef].pattern === "None"
              ? null
              : this.textures[this.meshes[meshRef].pattern].pattern;
          this.setMeshesMap(meshRef, this.model, texture);
        });
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.autoUpdate = true;
    const style = window.getComputedStyle(this.container);
    this.scene.fog = null;
  }

  setupRenderers() {
    this.mainRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.mainRenderer.setClearColor(0x000000, 0);
    this.mainRenderer.setPixelRatio(window.devicePixelRatio || 1);
    const { clientWidth, clientHeight } = this.container;
    this.mainRenderer.setSize(clientWidth, clientHeight);
    this.mainRenderer.shadowMap.enabled = false;
    this.container.appendChild(this.mainRenderer.domElement);

    this.previewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.previewRenderer.trans;
    this.previewRenderer.setClearColor(0x000000, 0); // it's a dark gray
    this.previewRenderer.setPixelRatio(window.devicePixelRatio || 1);

    this.previewRenderer.setSize(
      this.frontCanvas.clientWidth,
      this.frontCanvas.clientHeight
    );
    this.previewRenderer.shadowMap.enabled = false;
  }

  setupCamera() {
    this.views.forEach(view => {
      const { clientWidth, clientHeight } = view.canvas;
      const aspect = clientWidth / clientHeight;
      view.canvas.width = clientWidth * window.devicePixelRatio;
      view.canvas.height = clientHeight * window.devicePixelRatio;
      const camera = new THREE.PerspectiveCamera(
        view.cameraSetup.fov,
        aspect,
        view.cameraSetup.near,
        view.cameraSetup.far
      );
      camera.name = view.cameraSetup.name;
      camera.position.set(
        view.cameraSetup.position.x,
        view.cameraSetup.position.y,
        view.cameraSetup.position.z
      );

      camera.lookAt(view.cameraSetup.lookAt);
      view.camera = camera;
    });
  }

  setupLights() {
    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);
    this.lightGroup.add(new THREE.AmbientLight(0x464646));
    const light1 = new THREE.DirectionalLight(0xffddcc, 1);
    light1.position.set(1, 0.75, 0.5);
    this.lightGroup.add(light1);
    const light2 = new THREE.DirectionalLight(0xccccff, 1);
    light2.position.set(-1, 0.75, -0.5);
    this.lightGroup.add(light2);
  }

  setupControls() {
    this.controls = new OrbitControls(
      this.views[0].camera,
      this.mainRenderer.domElement
    );
    this.controls.enabled = true;
    this.controls.maxDistance = 1500;
    this.controls.minDistance = 0;
    this.controls.autoRotate = false;
    this.controls.maxPolarAngle = Math.PI / 2;
  }

  setupGUI() {
    this.gui = new DAT.GUI();
    const materialFolder = this.gui.addFolder("Shoe Material");

    materialFolder
      .add(this.shoeFabric, "type", Object.keys(this.textures).slice(0, 2))
      .onChange(val => {
        const fabricMeshes = Object.keys(this.meshes).filter(
          key => this.meshes[key].isFabric
        );
        fabricMeshes.forEach(key => {
          this.meshes[key].normal = val;
        });

        const childrenNames = this.getAllChildrenNames(
          fabricMeshes,
          this.model
        );
        childrenNames.forEach(childName => {
          const child = this.model.getObjectByName(childName);
          this.setMaterial(child);
        });
      });

    materialFolder.open();
  }

  getAllChildrenNames(meshRef, model) {
    const children = [];
    if (typeof meshRef === "string") {
      const main = model.getObjectByName(meshRef);
      if (main.isMesh) {
        children.push(main.name);
      } else {
        main.children.forEach(child => {
          children.push(child.name);
        });
      }
      return children;
    } else if (Array.isArray(meshRef)) {
      meshRef.forEach(ref => {
        children.push(...this.getAllChildrenNames(ref, model));
      });
      return children;
    }
  }
  setMeshesColor(meshRef, model, color) {
    const childrenNames = this.getAllChildrenNames(meshRef, model);
    childrenNames.forEach(childName => {
      const child = model.getObjectByName(childName);
      if (child.isMesh) {
        child.material.dispose();
        child.material.color = new THREE.Color(color);
      }
    });
  }

  forEachMeshes(meshRef, model, func) {
    const childrenNames = this.getAllChildrenNames(meshRef, model);
    childrenNames.forEach(func);
  }

  setMeshesMap(meshRef, model, texture) {
    const childrenNames = this.getAllChildrenNames(meshRef, model);
    childrenNames.forEach(childName => {
      const child = model.getObjectByName(childName);
      if (!texture) {
        child.material.map = null;
      } else {
        const diffuse = this.getTexture(texture);
        child.material.map = diffuse;
      }
      child.material.needsUpdate = true;
    });
  }

  getTexture(name) {
    const texture = new THREE.TextureLoader().load(name);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  invertHex(hex) {
    return (Number(`0x1${hex}`) ^ 0xffffff)
      .toString(16)
      .substr(1)
      .toUpperCase();
  }
}
