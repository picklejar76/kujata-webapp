import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three-full';

import * as d3 from "d3";

@Component({
  selector: 'scene-details',
  templateUrl: './scene-details.component.html',
  styleUrls: ['./scene-details.component.css']
})
export class SceneDetailsComponent implements OnInit {

  public fetchStatus = "NONE"; // NONE, FETCHING, SUCCESS, ERROR
  public scene;
  public fieldLinks: any[] = null;
  public environment = environment;
  private mapList: any[] = null;
  private sceneGraph: any = null;
  private fieldIdToFieldMetadataMap: any = null;
  private fieldNameToFieldMetadataMap: any = null;
  public selectedFieldName: string = null;
  public selectedFieldMenuName: string = null;
  private graph;
  private nodeMap; // map node id to node object in graph
  public GRID_X = 150;
  public GRID_Y = 75;
  public NODE_SPACE_PROPORTION = 0.80;
  public LABEL_LINE_LENGTH = 18;
  // model visualization stuff
  public DISPLAY_WIDTH = 100;
  public DISPLAY_HEIGHT = 100;
  public rendererGlobal = new THREE.WebGLRenderer();
  public displayMap: any = null;
  public displays: any[];
  private clock;

  constructor(private route: ActivatedRoute, private http: HttpClient) {
    console.log("scene-details component constructor");
  }

  ngOnInit() {
    console.log("scene-details component ngOnInit()");
    this.clock = new THREE.Clock();
    let url = environment.KUJATA_DATA_BASE_URL + '/data/field/flevel.lgp/maplist.json';
    this.http.get(url).subscribe(mapList => {
      this.mapList = mapList as any[];
      console.log("this.mapList:", this.mapList);
      this.initialize();
    }, error => {
      this.fetchStatus = "ERROR";
    });
    url = environment.KUJATA_DATA_BASE_URL + '/metadata/scene-graph.json';
    this.http.get(url).subscribe(sceneGraph => {
      this.sceneGraph = sceneGraph;
      this.fieldIdToFieldMetadataMap = {};
      this.fieldNameToFieldMetadataMap = {};
      for (let metadata of this.sceneGraph.nodes) {
        this.fieldIdToFieldMetadataMap[metadata.id] = metadata;
        this.fieldNameToFieldMetadataMap[metadata.fieldName] = metadata;
      }
      this.initialize();
    }, error => {
      this.fetchStatus = "ERROR";
    });
    this.route.paramMap.subscribe(params => {
      let fieldName = params.get("name");
      this.selectedFieldName = fieldName;
      this.initialize();
    });
  }

  private idToMetadata(id) {
    return this.fieldIdToFieldMetadataMap[id];
  }

  private fieldNameToMetadata(name) {
    return this.fieldNameToFieldMetadataMap[name];
  }

  private idFor(fieldName) {
    return this.fieldNameToMetadata(fieldName).id;
  }

  private fieldNameFor(id) {
    return this.idToMetadata(id).fieldName;
  }

  private getFieldMenuName(metadata) {
    let mapNames = metadata.mapNames;
    return mapNames.length > 0 ? mapNames[0] : metadata.fieldName;
  }

  initialize() {
    if (this.mapList == null) { return; }
    if (this.sceneGraph == null) { return; }
    if (this.selectedFieldName == null) { return; }
    console.log("ready to initialize!");

    let selectedFieldMetadata = this.fieldNameToMetadata(this.selectedFieldName);
    let selectedFieldId = selectedFieldMetadata.id;
    this.selectedFieldMenuName = this.getFieldMenuName(selectedFieldMetadata);
    this.fieldLinks = [];
    let inboundLinksMap = {};
    let outboundLinksMap = {};
    for (let linkMetadata of this.sceneGraph.links) {
      if (linkMetadata.source == selectedFieldId) {
        let targetMetadata = this.idToMetadata(linkMetadata.target);
        outboundLinksMap[targetMetadata.id] = {
          "direction": "outbound",
          "sourceId": selectedFieldId,
          "sourceName": this.selectedFieldName,
          "targetId": targetMetadata.id,
          "targetName": targetMetadata.fieldName,
          "targetFieldMenuName": this.getFieldMenuName(targetMetadata)
        };
      }
      if (linkMetadata.target == selectedFieldId) {
        let sourceMetadata = this.idToMetadata(linkMetadata.source);
        inboundLinksMap[sourceMetadata.id] = {
          "direction": "inbound",
          "sourceId": sourceMetadata.id,
          "sourceName": sourceMetadata.fieldName,
          "sourceFieldMenuName": this.getFieldMenuName(sourceMetadata),
          "targetId": selectedFieldId,
          "targetName": this.selectedFieldName
        };
      }
    }
    for (let sourceFieldId of Object.keys(inboundLinksMap)) {
      this.fieldLinks.push(inboundLinksMap[sourceFieldId]);
    }
    for (let targetFieldId of Object.keys(outboundLinksMap)) {
      this.fieldLinks.push(outboundLinksMap[targetFieldId]);
    }
    console.log("this.fieldLinks:", this.fieldLinks);
    this.fetchStatus = "FETCHING";
    let url = environment.KUJATA_DATA_BASE_URL + '/data/field/flevel.lgp/' + this.selectedFieldName + '.json';
    this.http.get(url).subscribe(flevel => {
      this.fetchStatus = "SUCCESS";
      this.scene = flevel;

      // build displays
      this.displays = [];
      this.displayMap = {};
      let loaders = this.scene.model.modelLoaders;
      for (let i=0; i<loaders.length; i++) {
        let loader = loaders[i];
        let skeleton = {
          "id": loader.hrcId,
          "name": "TODO"
        }
        let containerId = 'model_display_' + i; // loader.hrcId;
        let display = this.createEmptyDisplay(skeleton, containerId, 200, 200);
        this.displays.push(display);
        this.displayMap[loader.hrcId] = display;
      }
      setTimeout(() => {
        this.recursiveLoadSkeletonAndAddToDisplay(0);
      }, 250);

      setTimeout(() => {
        this.buildGraph();
      }, 250);

    }, error => {
      this.fetchStatus = "ERROR";
    });
  }

  private createEmptyDisplay(skeleton, containerId, width, height) {
    let display = {
      containerId: containerId,
      skeleton: skeleton,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(45, this.DISPLAY_WIDTH/this.DISPLAY_HEIGHT, 0.1, 1000),
      renderer: null // new THREE.WebGLRenderer()
    };
    display.containerId = containerId;
    display.scene.background = new THREE.Color(0x505050);
    display.scene.add(display.camera);
    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(0, 0, 50).normalize();
    display.scene.add(light);
    var ambientLight = new THREE.AmbientLight(0x404040); // 0x404040 = soft white light
    display.scene.add(ambientLight);
    // display.camera.position.x = 0;
    // display.camera.position.y = 13.53;
    // display.camera.position.z = 50;
    display.camera.position.x = -40;
    display.camera.position.y = 13.53 + 20;
    display.camera.position.z = 60;
    display.camera.lookAt(new THREE.Vector3(0,13.53,0));
    //display.camera.up = new THREE.Vector3(0,0,1);
    //display.camera.rotation.x = (-15) * Math.PI/180.0;
    //display.camera.rotation.y = (-20) * Math.PI/180.0;
    //display.camera.rotation.z = 0 * Math.PI/180.0;
    return display;
  }

  public getDisplay(hrcId) {
    let display = this.displayMap[hrcId];
    return display;
  }

  public showDisplay(app, i, delay) {
    //setTimeout(() => {
      //console.log('showDisplay(), app:', app, 'i:', i);
      let display = app.displays[i];
      display.renderer = app.rendererGlobal; // new THREE.WebGLRenderer();
      display.renderer.setSize(this.DISPLAY_WIDTH, this.DISPLAY_HEIGHT);
      //display.renderer.preserveDrawingBuffer = true;
      var containerElement = document.getElementById(display.containerId);
      if (!containerElement) {
        console.log("WARN: Could not find element by display.containerId, display: ", display);
      } else {
        containerElement.appendChild(display.renderer.domElement);
        display.renderer.render(display.scene, display.camera);
        display.screenshotDataUrl = display.renderer.domElement.toDataURL();
        display.renderer.dispose();
        display.renderer = null;
      }
      //console.log('done, display.screenshotDataUrl:', display.screenshotDataUrl);
    //}, delay);
  }

  private recursiveLoadSkeletonAndAddToDisplay(i) {
    var app = this;
    if (i >= app.displays.length) {
      ////this.status = "Finished.";
      return; // stop recursion
    }
    var display = app.displays[i];
    var skeleton = display.skeleton;
    ////this.status = "Loading skeleton model " + skeleton.id + ' (' + skeleton.name + ')...';
    var gltfLoader = new THREE.GLTFLoader();
    //gltfLoader.setDRACOLoader( new THREE.DRACOLoader() );
    gltfLoader.load(environment.KUJATA_DATA_BASE_URL + '/data/field/char.lgp/' + skeleton.id.toLowerCase() + '.gltf', function ( gltf ) {
      //console.log('display:', display);
      let model = gltf.scene;
      let rootNode = model.children[0];
      rootNode.position.x = 0; // += 90.0 * Math.PI/180.0;
      rootNode.position.y = 0; // += 90.0 * Math.PI/180.0;
      rootNode.position.z = 0; // z;
      display.scene.add(model);
      //mixer = new THREE.AnimationMixer( model );
      //mixer.clipAction(gltf.animations[0]).play();
      //animate();
      //app.renderer.render(display.scene, display.camera);
      //console.log('skeleton has been added to display:', skeleton);
      app.showDisplay(app, i, 10);
      //setTimeout(() => {
        app.recursiveLoadSkeletonAndAddToDisplay(i + 1);
      //}, 10);
    }, undefined, function ( error ) {
      console.error( 'oops!', error );
      //setTimeout(() => {
        app.recursiveLoadSkeletonAndAddToDisplay(i + 1);
      //}, 10);
    });
  }

  private addNodeToGraphAndMap(node) {
    this.graph.nodes.push(node);
    this.nodeMap[node.id] = node;
  }

  private buildGraph() {
    let MVC = this;
    this.graph = {
      rows: [],
      nodes: [],
      links: []
    };
    this.nodeMap = {};
    let rowIndex = 0;
    let colIndex = 0;
    let unresolvedLinks = [];
    for (let e = 0; e < this.scene.script.entities.length; e++) {
      let entity = this.scene.script.entities[e];
      for (let s = 0; s < entity.scripts.length; s++) {
        let script = entity.scripts[s];
        if (script.ops.length <= 1) {
          console.log("Skipping script of length <= 1, ops = ", script.ops);
        } else {
          let row = [];
          colIndex = 0;
          let startNode = {
            type: "scriptStart",
            id:   "scriptStart|" + e + "|" + s,
            row: rowIndex,
            col: colIndex++,
            name: e + ":" + entity.entityName + ", Script " + s,
            labelLines: []
          };
          startNode.labelLines = this.stringToLines(startNode.name, MVC.LABEL_LINE_LENGTH);
          row.push(startNode);
          this.addNodeToGraphAndMap(startNode);
          for (let i=0; i<script.ops.length; i++) {
            let op = script.ops[i];
            let opNode = {
              type: op.op == "RET" ? "scriptEnd" : "op",
              id:   "op|" + e + "|" + s + "|" + i,
              row: rowIndex,
              col: colIndex++,
              name: op.description,
              pres: op.pres,
              labelLines: []
            };
            let label = opNode.pres ? opNode.pres : opNode.name;
            opNode.labelLines = this.stringToLines(label, MVC.LABEL_LINE_LENGTH);
            row.push(opNode);
            this.addNodeToGraphAndMap(opNode);
            // TODO: handle ifs properly
            let prevNode = this.graph.nodes[this.graph.nodes.length - 2];
            this.graph.links.push({
              source: prevNode,
              target: opNode,
              type: "script"
            });
            if (op.op == "REQ" || op.op == "REQSW" || op.op == "REQEW") {
              let reqLink = {
                source: opNode,
                targetId: "scriptStart|" + op.e + "|" + op.f,
                type: "REQ"
              };
              unresolvedLinks.push(reqLink);
            }
          }
          this.graph.rows.push(row);
          rowIndex++;
        } // end if script.length > 1
      } // end looping through scripts
    } // end looping through entities

    // At this point, we have created all the nodes, so now we can create any unresolved links between them
    for (let link of unresolvedLinks) {
      if (link.targetId && !link.target) {
        link.target = this.nodeMap[link.targetId];
        //link.targetId = undefined;
        if (link.target) {
          this.graph.links.push(link);
        } else {
          console.log("WARNING: Did not show link for execution of empty script:", link);
        }
      }
    }
    this.drawGraph();
  }

  private getNodeCenterX(d) {
    return (d.col + this.NODE_SPACE_PROPORTION) * this.GRID_X;
  }

  private getNodeCenterY(d) {
    return (d.row + this.NODE_SPACE_PROPORTION) * this.GRID_Y;
  }

  private getNodeWidth(d) {
    return this.GRID_X / 2 * this.NODE_SPACE_PROPORTION * 2;
  }

  private getNodeHeight(d) {
    return this.GRID_Y / 2 * this.NODE_SPACE_PROPORTION * 2;
  }

  private getNodeRightEdgeX(d) {
    return this.getNodeCenterX(d) + this.getNodeWidth(d) / 2;
  }

  private getNodeLeftEdgeX(d) {
    return this.getNodeCenterX(d) - this.getNodeWidth(d) / 2;
  }

  private lastIndexOfMulti(s, chars) {
    ////console.log('finding lastIndexOfMulti for s=' + s + ' and chars:', chars);
    let max = -1;
    for (let c of chars) {
      let pos = s.lastIndexOf(c);
      if (pos > max) {
        max = pos;
      }
    }
    ////console.log('returning max=' + max);
    return max;
  }

  private stringToLines(s, maxLineLength) {
    ////console.log('*** ' + s);
    if (!maxLineLength) {
      throw new Error("maxLineLength required");
    }
    let lines = [];
    let remainder = s;
    let maxLines = 10;
    while (lines.length < maxLines) {
      if (remainder.length <= maxLineLength) {
        lines.push(remainder);
        ////console.log('returning:', lines);
        return lines;
      }
      ////console.log("remainder.length=" + remainder.length);
      let nextLineMax = remainder.substring(0, maxLineLength);
      let pos = this.lastIndexOfMulti(nextLineMax, [" ", "{", "("]);
      if (pos == -1) {
        pos = maxLineLength;
      }
      let nextLine = remainder.substring(0, pos+1);
      lines.push(nextLine);
      remainder = remainder.substring(pos+1);
      ////console.log("nextLine='" + nextLine + "', remainder='" + remainder + "'");
    }
    console.log("WARNING: maxines reached!");
    return lines;
  }

  private drawGraph() {

    var MVC = this;

    console.log("graph:", this.graph);
    var svg = d3.select("svg");
    svg.selectAll("g").remove();
    var view = svg.append("g").attr("class", "view");

    var link = view.append("g").attr("class", "links")
      .selectAll("line")
      .data(this.graph.links)
      .enter()
      .append("line")
      .attr("stroke-width", function(d) {
        return 2;
      })
      .attr("stroke", function(d) {
        return "gray";
      })
    ;
    var node = view.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(this.graph.nodes)
      .enter()
      .append("g")
      .attr("transform", function(d) {
        let x = MVC.getNodeCenterX(d);
        let y = MVC.getNodeCenterY(d);
        return "translate(" + x + " " + y + ")";
      })
    ;

    link
      .attr("x1", function(d) { return MVC.getNodeRightEdgeX(d.source); })
      .attr("y1", function(d) { return MVC.getNodeCenterY(d.source); })
      .attr("x2", function(d) { return MVC.getNodeLeftEdgeX(d.target); })
      .attr("y2", function(d) { return MVC.getNodeCenterY(d.target); })
    ;

    var rects = node.append("rect")
      .attr("rx",     function(d) { return  MVC.GRID_X * 0.05;         })
      .attr("ry",     function(d) { return  MVC.GRID_X * 0.05;         })
      .attr("x",      function(d) { return -MVC.getNodeWidth(d) / 2;   })
      .attr("y",      function(d) { return -MVC.getNodeHeight(d) / 2;  })
      .attr("width",  function(d) { return  MVC.getNodeWidth(d);       })
      .attr("height", function(d) { return  MVC.getNodeHeight(d);      })
      .attr("stroke", function(d) { return d.type == "scriptStart" ? "#339933" : d.type == "scriptEnd" ? "#993333" : "gray"; })
      .attr("stroke-width", "2")
      .attr("fill", function(d) { return "white"; });

    var labels = node.append("text")
      .attr("fill", function(d) {
        return "#333";
      })
      .attr('x', 0)
      .attr('y', function(d) {
        if (!d.labelLines) {
          console.log("This does not have labelLines:", d);
        }
        return ((-(d.labelLines.length) / 2) - 1/2) + "em";
      })
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'central')
    ;

    for (let i=0; i<10; i++) {
      labels
        .filter(function(d) { return d.labelLines.length > i; })
        .append("tspan")
        .attr('x', 0)
        .attr('dy', '1em')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'central')
        .text(function(d) { return d.labelLines[i]; })
      ;
    }

    /*
    var zoom = d3.zoom()
      .scaleExtent([0.05 / 32, 50 * 32])
      //.translateExtent([[-width * 2, -height * 2], [width * 2, height * 2]])
      .on("zoom", zoomed);

    function zoomed() {
      let currentTransform = d3.event.transform;
      view.attr("transform", currentTransform);
      console.log("current transform is:", currentTransform);
      //gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
      //gY.call(yAxis.scale(d3.event.transform.rescaleY(yScale)));
    }

    svg.call(zoom);
    */

  }

  onSelectHrcId(hrcId) {

  }

}
