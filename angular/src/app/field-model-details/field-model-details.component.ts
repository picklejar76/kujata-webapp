import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { addBlendingToMaterials } from '../helpers/gltf-helper'

@Component({
  selector: 'field-model-details',
  templateUrl: './field-model-details.component.html',
  styleUrls: ['./field-model-details.component.css']
})
export class FieldModelDetailsComponent implements OnInit {

  public environment = environment;
  public CHAR_BASE_URL = environment.KUJATA_DATA_BASE_URL + '/data/field/char.lgp/';
  public SCENE_WIDTH = 300;
  public SCENE_HEIGHT = 300;
  public fieldModelMetadata;
  public skeletonFriendlyNames;
  public selectedHrcId;
  public standAnimations = [];
  public walkAnimations = [];
  public runAnimations = [];
  public otherAnimations = [];
  public modelGLTF;
  public selectedAnimId;
  public friendlyName;
  public metadata;
  public Object = Object; // so the html can call Object.keys()
  // THREE.js objects
  public clock;
  public renderer;
  public scene;
  public gltf;
  public camera;
  public controls;
  public mixer;
  public isAnimationEnabled = false;
  public isDestroyed = false;

  constructor(public route: ActivatedRoute, public http: HttpClient) {
  }

  ngOnInit() {
    let url = environment.KUJATA_DATA_BASE_URL + '/metadata/field-model-metadata.json';
    this.http.get(url).subscribe(fieldModelMetadata => {
      this.fieldModelMetadata = fieldModelMetadata;
      this.initialize();
    });
    url = environment.KUJATA_DATA_BASE_URL + '/metadata/skeleton-friendly-names.json';
    this.http.get(url).subscribe(skeletonFriendlyNames => {
      this.skeletonFriendlyNames = skeletonFriendlyNames;
      this.initialize();
    });
    this.route.paramMap.subscribe(params => {
      this.selectedHrcId = params.get("hrcId");
      this.initialize();
    });
  }

  ngOnDestroy() {
    console.log("ngOnDestroy() called");
    this.isDestroyed = true;
    this.isAnimationEnabled = false; // stop the appTick loop
  }

  initialize() {
    if (!this.fieldModelMetadata) { return; }
    if (!this.skeletonFriendlyNames) { return; }
    if (!this.selectedHrcId) { return; }
    this.friendlyName = this.skeletonFriendlyNames[this.selectedHrcId];
    this.metadata = this.fieldModelMetadata[this.selectedHrcId];
    this.standAnimations = Object.keys(this.metadata.animationStats.stand);
    this.walkAnimations = Object.keys(this.metadata.animationStats.walk);
    this.runAnimations = Object.keys(this.metadata.animationStats.run);
    this.otherAnimations = Object.keys(this.metadata.animationStats.other);
    var statSortFunction = function (statMap) {
      return (a1, a2) => {
        return statMap[a2] - statMap[a1];
      };
    }
    this.standAnimations.sort(statSortFunction(this.metadata.animationStats.stand));
    this.walkAnimations.sort(statSortFunction(this.metadata.animationStats.walk));
    this.runAnimations.sort(statSortFunction(this.metadata.animationStats.run));
    this.otherAnimations.sort(statSortFunction(this.metadata.animationStats.other));

    this.isAnimationEnabled = false;
    this.selectedAnimId = this.standAnimations[0];

    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.SCENE_WIDTH, this.SCENE_HEIGHT);

    // clear these variables in case a user re-visits this page after leaving it
    // (in particular, if the number of bones changes in between character sleections)
    this.modelGLTF = null;
    this.gltf = null;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(90, this.SCENE_WIDTH / this.SCENE_HEIGHT, 0.1, 1000);
    this.camera.position.x = 0;
    this.camera.position.y = 0; // 13.53
    this.camera.position.z = 50;
    this.camera.rotation.x = 0 * Math.PI / 180.0;

    this.controls = null;

    this.http.get(this.CHAR_BASE_URL + this.selectedHrcId + '.hrc.gltf').subscribe(modelGLTF => {
      this.modelGLTF = modelGLTF;
      this.fetchAnimationAndInitializeScene();
    }, function (error) {
      console.error('oops!', error);
    }); // end http get modelGLTF

    var app = this;

    var appTick = function () {
      if (!app || app.isDestroyed) {
        console.log("stopping appTick()");
        return;
      }
      // Note: Even if app.isAnimationEnabled == false, we must still
      // keep calling appTick(), to let the OrbitControls adjust the
      // camera if the user moves it.
      requestAnimationFrame(appTick);
      var delta = app.clock.getDelta();
      if (app.controls) {
        app.controls.update(delta);
      }
      if (app.mixer) {
        if (app.isAnimationEnabled) {
          app.mixer.update(delta);
        }
      }
      if (app.renderer && app.scene && app.camera) {
        app.renderer.render(app.scene, app.camera);
      }
    }

    appTick();
  }

  onSelectAnimation(animId) {
    this.selectedAnimId = animId;
    this.fetchAnimationAndInitializeScene();
  }

  fetchAnimationAndInitializeScene() {
    this.http.get(this.CHAR_BASE_URL + this.selectedAnimId + '.a.gltf').subscribe(animGLTF => {
      var combinedGLTF = this.createCombinedGLTF(this.modelGLTF, animGLTF);
      this.initializeSceneWithCombinedGLTF(this, combinedGLTF);
    }, function (error) {
      console.error('oops!', error);
    }); // end http get animGLTF
  }

  initializeSceneWithCombinedGLTF(app, combinedGLTF) {
    var modelRootHeight = combinedGLTF.nodes[1].translation[1];
    if (modelRootHeight == 0) {
      modelRootHeight = 15.0;
    }
    if (app.camera.position.y == 0) {
      console.log("setting camera height to:" + modelRootHeight * 2);
      app.camera.position.y = modelRootHeight * 2;
      app.camera.position.z = Math.max(modelRootHeight * 3, 50);
    }

    console.log("modelRootHeight=" + modelRootHeight);
    var gltfLoader = new GLTFLoader();
    //gltfLoader.setDRACOLoader( new THREE.DRACOLoader() );
    gltfLoader.parse(JSON.stringify(combinedGLTF), app.CHAR_BASE_URL, function (gltf) {
      addBlendingToMaterials(gltf)
      console.log("combined gltf:", gltf);
      ////let modelHeight = gltf.nodes[1].translation[1];
      app.gltf = gltf;
      let model = gltf.scene;
      let rootNode = model.children[0];
      //rootNode.position.x = 0; // += 90.0 * Math.PI/180.0;
      //rootNode.position.y += modelHeight; // += 90.0 * Math.PI/180.0;
      //rootNode.position.z = 0; // z;
      app.scene = new THREE.Scene();
      ////app.camera = new THREE.PerspectiveCamera(90, app.SCENE_WIDTH/app.SCENE_HEIGHT, 0.1, 1000);

      app.scene.background = new THREE.Color(0xBBDDFF); //0x505050
      app.scene.add(app.camera);
      // add lights
      var light = new THREE.DirectionalLight(0xffffff);
      light.position.set(0, 0, 50).normalize();
      app.scene.add(light);
      var ambientLight = new THREE.AmbientLight(0x404040); // 0x404040 = soft white light
      app.scene.add(ambientLight);

      // add ground
      var material = new THREE.MeshBasicMaterial({ color: 0x33bb55, opacity: 1.0, side: THREE.DoubleSide });
      var geometry = new THREE.CircleGeometry(50, 32);
      var plane = new THREE.Mesh(geometry, material);
      plane.rotateX(-Math.PI / 2);
      app.scene.add(plane);

      app.scene.add(model);
      var containerElement = document.getElementById("scene-container");
      containerElement.appendChild(app.renderer.domElement);

      app.controls = new OrbitControls(app.camera, app.renderer.domElement);
      app.controls.target = new THREE.Vector3(0, modelRootHeight, 0);
      app.controls.update();
      // app.controls.target.set( 0, 0.5, 0 );
      //app.controls.enablePan = true;

      ////if (app.isAnimationEnabled) {
      app.startAnimation();
      ////}

      app.renderer.render(app.scene, app.camera);

    }, undefined, function (error) {
      console.error('oops!', error);
    }); // end of three.js glotf loader
  }


  createCombinedGLTF(modelGLTF, animGLTF) {
    console.log("modelGLTF:", modelGLTF);
    console.log("animGLTF:", animGLTF);
    var gltf1 = JSON.parse(JSON.stringify(modelGLTF)); // clone
    var gltf2 = JSON.parse(JSON.stringify(animGLTF));  // clone
    var numModelBuffers = gltf1.buffers.length;
    var numModelBufferViews = gltf1.bufferViews.length;
    var numModelAccessors = gltf1.accessors.length;
    if (!gltf1.animations) {
      gltf1.animations = [];
    }
    for (let buffer of gltf2.buffers) {
      gltf1.buffers.push(buffer);
    }
    for (let bufferView of gltf2.bufferViews) {
      bufferView.buffer += numModelBuffers;
      gltf1.bufferViews.push(bufferView);
    }
    for (let accessor of gltf2.accessors) {
      accessor.bufferView += numModelBufferViews;
      gltf1.accessors.push(accessor);
    }
    for (let animation of gltf2.animations) {
      for (let sampler of animation.samplers) {
        sampler.input += numModelAccessors;
        sampler.output += numModelAccessors;
      }
      gltf1.animations.push(animation);
    }
    console.log("combinedGLTF:", gltf1);
    return gltf1;
  }

  public startAnimation() {
    this.isAnimationEnabled = true;
    this.mixer = new THREE.AnimationMixer(this.gltf.scene);
    this.mixer.clipAction(this.gltf.animations[0]).play();
  }

  public stopAnimation() {
    this.isAnimationEnabled = false;
    // TODO: tell model to return to normal and re-render scene?
  }
}
