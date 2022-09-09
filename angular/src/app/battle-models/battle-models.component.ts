import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three-full';
//import * as THREE from 'GLTFLoader';
import { addBlendingToMaterials } from '../helpers/gltf-helper'

@Component({
  selector: 'battle-models',
  templateUrl: './battle-models.component.html',
  styleUrls: ['./battle-models.component.css']
})
export class BattleModelsComponent implements OnInit {

  public environment = environment;
  public battleModelList;
  public status: string;
  public status2: string;
  public uniqueBoneCounts: number[];
  public boneCountSet: Set<number>;
  // THREE.js objects
  public clock;
  public rendererGlobal = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  public displays: any[];
  public isDestroyed = false;

  constructor(private http: HttpClient) {
  }

  ngOnInit() {
    this.displays = [];
    this.status = "Loading skeleton info from database...";
    this.http.get(environment.KUJATA_DATA_BASE_URL + '/metadata/ff7-battle-database.json').subscribe(battleModelList => {
      this.battleModelList = battleModelList;
      // this.sortDatabaseRows();
      // this.createUniqueBoneCounts();
      this.clock = new THREE.Clock();
      var app = this;
      for (var i = 0; i < this.battleModelList.length; i++) { // skeletonsToLoad.length;
        var skeleton = this.battleModelList[i];
        // skeleton.friendlyName = skeletonFriendlyNames[skeleton.id.toLowerCase()];
        //skeleton.friendlyName2 = skeletonFriendlyNames2[skeleton.id.toLowerCase()];
        // skeleton.ifalna = ifalna[skeleton.id.toUpperCase()];
        var display = this.createEmptyDisplay(skeleton, 'ff7_scene_container' + i, 200, 200);
        this.displays.push(display);

        // if (i<12) {
        //   this.delayShowDisplay(app, i, 5000 + 500*(i+1));
        // }
        //setTimeout(() => {app.showDisplays(app, i);}, 2000*(i+1));
      }
      // this.displays = this.displays.slice(0, 25);

      // console.log('displays', this.displays)
      this.recursiveLoadSkeletonAndAddToDisplay(0);
      // this.recursiveDisplayNextSkeleton(0);
      //setTimeout(() => {this.showDisplays();}, 250);
    });
  }

  ngOnChanges(simpleChanges) {
    console.log('simpleChanges:', simpleChanges);
  }

  ngOnDestroy() {
    console.log("ngOnDestroy() called");
    this.isDestroyed = true;
  }

  public showDisplay(app, i, delay) {
    //setTimeout(() => {
    //console.log('showDisplay(), app:', app, 'i:', i);
    let display = app.displays[i];


    display.renderer = app.rendererGlobal; // new THREE.WebGLRenderer();
    display.renderer.setSize(150, 150);
    //display.renderer.preserveDrawingBuffer = true;
    var containerElement = document.getElementById(display.containerId);
    containerElement.appendChild(display.renderer.domElement);
    display.renderer.render(display.scene, display.camera);
    display.screenshotDataUrl = display.renderer.domElement.toDataURL();
    display.renderer.dispose();
    display.renderer = null;
    //console.log('done, display.screenshotDataUrl:', display.screenshotDataUrl);
    //}, delay);
  }

  // for full screen, width=window.innerWidth, height=window.innerHeight
  private createEmptyDisplay(skeleton, containerId, width, height) {
    let display = {
      containerId: containerId,
      skeleton: skeleton,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(90, width / height, 0.1, 1000),
      renderer: null // new THREE.WebGLRenderer()
    };
    display.containerId = containerId;
    display.scene.background = new THREE.Color(0x505050);
    display.scene.add(display.camera);
    // add lights
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 50).normalize();
    display.scene.add(light);
    var ambientLight = new THREE.AmbientLight(0x404040); // 0x404040 = soft white light
    display.scene.add(ambientLight);

    display.camera.position.x = 0;
    display.camera.position.y = 0;
    display.camera.position.z = 0;
    display.camera.rotation.x = 0 * Math.PI / 180.0;

    return display;
  }

  private fitCameraToCenteredObject(camera, object, offset, orbitControls) {
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(object);

    var middle = new THREE.Vector3();
    var size = new THREE.Vector3();
    boundingBox.getSize(size);


    const fov = camera.fov * (Math.PI / 180);
    const fovh = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
    let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
    let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
    let cameraZ = Math.max(dx, dy);

    // offset the camera, if desired (to avoid filling the whole canvas)
    if (offset !== undefined && offset !== 0) cameraZ *= offset;

    camera.position.set(0, size.y / 2, cameraZ);

    // set the far plane of the camera so that it easily encompasses the whole object
    const minZ = boundingBox.min.z;
    const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;

    camera.far = cameraToFarEdge * 3;
    camera.updateProjectionMatrix();

    if (orbitControls !== undefined) {
      // set camera to rotate around the center
      orbitControls.target = new THREE.Vector3(0, 0, 0);

      // prevent camera from zooming out far enough to create far plane cutoff
      orbitControls.maxDistance = cameraToFarEdge * 2;
    }
  };


  private recursiveLoadSkeletonAndAddToDisplay(i) {
    var app = this;
    if (!app || app.isDestroyed) {
      console.log("stopping recursive loading");
      return;
    }
    if (i >= app.displays.length) {
      this.status = "Finished.";
      return; // stop recursion
    }
    var display = app.displays[i];
    var skeleton = display.skeleton;
    this.status = "Loading skeleton model " + skeleton.id + ' (' + skeleton.name + ')...';
    var gltfLoader = new THREE.GLTFLoader();
    //gltfLoader.setDRACOLoader( new THREE.DRACOLoader() );
    gltfLoader.load(environment.KUJATA_DATA_BASE_URL + '/data/battle/battle.lgp/' + skeleton.id + '.hrc.gltf', function (gltf) {
      if (!app || app.isDestroyed) {
        console.log("ignoring gltf load() callback");
        return;
      }
      addBlendingToMaterials(gltf)
      //console.log('display:', display);
      let model = gltf.scene;
      let rootNode = model.children[0];
      rootNode.position.x = 0; // += 90.0 * Math.PI/180.0;
      rootNode.position.y = 0; // += 90.0 * Math.PI/180.0;
      rootNode.position.z = 0; // z;


      display.scene.add(model);
      app.fitCameraToCenteredObject(display.camera, model, undefined, undefined)
      //mixer = new THREE.AnimationMixer( model );
      //mixer.clipAction(gltf.animations[0]).play();
      //animate();
      //app.renderer.render(display.scene, display.camera);
      //console.log('skeleton has been added to display:', skeleton);
      app.showDisplay(app, i, 10);
      //setTimeout(() => {
      app.recursiveLoadSkeletonAndAddToDisplay(i + 1);
      //}, 10);
    }, undefined, function (error) {
      console.error('oops!', error);
      //setTimeout(() => {
      app.recursiveLoadSkeletonAndAddToDisplay(i + 1);
      //}, 10);
    });
  }

  // private sortDatabaseRows() {
  /*
  this.database.skeletons.sort((s1,s2) => {
    return (s1.numBones - s2.numBones) || (s1.name < s2.name ? -1 : s1.name > s2.name ? 1 : 0);
  });
  this.database.animations.sort((a1, a2) => {
    let cmpNumBones = a1.numBones - a2.numBones;
    let cmpNumFrames = a1.numFrames - a2.numFrames;
    let cmpRotOrder = (a1.rotationOrder < a2.rotationOrder ? -1 : a1.rotationOrder > a2.rotationOrder ? 1 : 0);
    return cmpRotOrder || cmpNumBones || cmpNumFrames;
  });
  */
  // }

  // private createUniqueBoneCounts() {
  //   this.boneCountSet = new Set<number>();
  //   for (let skeleton of this.database.skeletons) {
  //     this.boneCountSet.add(skeleton.numBones);
  //   }
  //   console.log('this.boneCountSet:', this.boneCountSet);
  //   this.uniqueBoneCounts = [];
  //   this.boneCountSet.forEach((value) => {
  //     this.uniqueBoneCounts.push(value);
  //   });
  //   this.uniqueBoneCounts.sort((c1, c2) => { return c1 < c2 ? -1 : c1 > c2 ? 1 : 0; });
  // }

  /*
  var animate = function () {
    requestAnimationFrame( animate );
    var delta = clock.getDelta();
    if (model) {
      rootNode = model.children[0];
      //rootNode.rotation.y += 0.02; // 0.04;
      //mixer.update(delta);
    }
    renderer.render( scene, camera );
  };
  */

}
