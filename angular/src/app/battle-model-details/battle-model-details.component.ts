import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import * as THREE from 'three-full';
import { addBlendingToMaterials } from '../helpers/gltf-helper'

@Component({
  selector: 'battle-model-details',
  templateUrl: './battle-model-details.component.html',
  styleUrls: ['./battle-model-details.component.css']
})
export class BattleModelDetailsComponent implements OnInit {

  public environment = environment;
  public BATTLE_LGP_BASE_URL = environment.KUJATA_DATA_BASE_URL + '/data/battle/battle.lgp/';
  public SCENE_WIDTH = 300;
  public SCENE_HEIGHT = 300;
  public fieldModelMetadata;
  public skeletonFriendlyNames;
  public bodyAnimationIdToIndexMap = {};
  public bodyAnimationIdToFriendlyNameMap = {
    "body-0": "battle stance",
    "body-1": "critical status",
    "body-2": "victory",
    "body-3": "move to front row",
    "body-4": "move to back row",
    "body-5": "block",
    "body-6": "knocked out",
    "body-7": "running away",
    "body-8": "frozen/defend",
    "body-9": "use item",
    "body-10": "throw item",
    "body-12": "magic: pre-cast",
    "body-13": "magic: cast",
    "body-14": "magic: post-cast",
    "body-15": "take damage (quick)",
    "body-16": "take damage (sustained)",
    "body-17": "return to battle stance",
    "body-18": "knocked off feet",
    "body-19": "dodge/twirl"
  };
  public selectedHrcId;
  public bodyAnimationNames = [];
  public bodyAnimationIds = [];
  public modelGLTF;
  public selectedAnimId = 0;
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
    if (!this.selectedHrcId) { return; }

    this.isAnimationEnabled = false;
    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.SCENE_WIDTH, this.SCENE_HEIGHT);

    // clear these variables in case a user re-visits this page after leaving it
    // (in particular, if the number of bones changes in between character selections)
    this.modelGLTF = null;
    this.gltf = null;
    this.scene = null;
    this.camera = new THREE.PerspectiveCamera(90, this.SCENE_WIDTH / this.SCENE_HEIGHT, 0.1, 100000);
    this.camera.position.x = 0;
    this.camera.position.y = 0; // 13.53
    this.camera.position.z = 50;

    this.controls = null;

    this.http.get(this.BATTLE_LGP_BASE_URL + this.selectedHrcId + '.hrc.gltf').subscribe(modelGLTF => {
      this.modelGLTF = modelGLTF;
      this.bodyAnimationNames = [];
      for (let i = 0; i < modelGLTF['animations'].length; i++) {
        let bodyAnimation = modelGLTF['animations'][i];
        let bodyAnimationId = bodyAnimation.name;
        this.bodyAnimationIds.push(bodyAnimationId);
        this.bodyAnimationIdToIndexMap[bodyAnimationId] = i;
      }
      this.selectedAnimId = this.bodyAnimationIds[0];
      this.initializeSceneWithCombinedGLTF(this, this.modelGLTF);
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
    this.initializeSceneWithCombinedGLTF(this, this.modelGLTF);
  }

  initializeSceneWithCombinedGLTF(app, combinedGLTF) {
    var modelRootHeight = combinedGLTF.nodes[1].translation[1];
    if (modelRootHeight == 0) {
      modelRootHeight = 15.0;
    }
    if (app.camera.position.y == 0) {
      console.log("setting camera height to:" + modelRootHeight * 2);
      app.camera.position.y = modelRootHeight * 1.5;
      app.camera.position.z = Math.max(modelRootHeight * 2.5, 1000);
    }

    var gltfLoader = new THREE.GLTFLoader();
    gltfLoader.parse(JSON.stringify(combinedGLTF), app.BATTLE_LGP_BASE_URL, function (gltf) {
      addBlendingToMaterials(gltf)
      console.log("parsed gltf:", gltf);

      ////let modelHeight = gltf.nodes[1].translation[1];
      app.gltf = gltf;
      let model = gltf.scene;
      let rootNode = model.children[0];
      //rootNode.position.x = 0;
      //rootNode.position.y += modelHeight;
      //rootNode.position.z = 0;
      rootNode.rotation.y = -60 * Math.PI / 180.0; // rotate the model to a near-side view similar to battle screen
      app.scene = new THREE.Scene();
      ////app.camera = new THREE.PerspectiveCamera(90, app.SCENE_WIDTH/app.SCENE_HEIGHT, 0.1, 1000);

      app.scene.background = new THREE.Color(0xBBDDFF); //0x505050
      app.scene.add(app.camera);
      // add lights
      var addDirectionalLight = function (x, y, z) {
        let light = new THREE.DirectionalLight(0xc0c0c0);
        light.position.set(x, y, z).normalize();
        app.scene.add(light);
      }
      addDirectionalLight(4, 2, 3);
      addDirectionalLight(4, 2, 3);
      addDirectionalLight(0, -2, -3);
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

      app.controls = new THREE.OrbitControls(app.camera, app.renderer.domElement);
      app.controls.target = new THREE.Vector3(0, modelRootHeight, 0);
      app.controls.update();
      //app.controls.enablePan = true;

      app.startAnimation();

      app.renderer.render(app.scene, app.camera);

    }, undefined, function (error) {
      console.error('oops!', error);
    }); // end of three.js glotf loader
  }

  public startAnimation() {
    this.isAnimationEnabled = true;
    this.mixer = new THREE.AnimationMixer(this.gltf.scene);
    let animationIndex = this.bodyAnimationIdToIndexMap[this.selectedAnimId];
    this.mixer.clipAction(this.gltf.animations[animationIndex]).play();
  }

  public stopAnimation() {
    this.isAnimationEnabled = false;
  }
}
