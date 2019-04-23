import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import * as d3 from "d3";

@Component({
  selector: 'field-scenes',
  templateUrl: './field-scenes.component.html',
  styleUrls: ['./field-scenes.component.css']
})
export class FieldScenesComponent implements OnInit {

  public environment = environment;
  public fetchStatus = "NONE"; // NONE, FETCHING, SUCCESS, ERROR
  private sceneGraph: any = null;
  private fieldIdToFieldMetadataMap: any = null;
  private fieldNameToFieldMetadataMap: any = null;
  //public scene;
  private mapList: any[];
  private fieldNameToIdMap: any;
  private chapters: any[];
  private selectedFieldName: string;
  private graph;
  public GRID_X = 150;
  public GRID_Y = 75;

  constructor(private http: HttpClient) {
  }

  createFieldNameToIdMap(mapList) {
    this.fieldNameToIdMap = {};
    for (let fieldId=0; fieldId<mapList.length; fieldId++) {
      let fieldName = mapList[fieldId];
      if (fieldName && fieldName.length > 0) {
        this.fieldNameToIdMap[fieldName] = fieldId;
      }
    }
  }

  public fieldNameToId(fieldName) {
    return this.fieldNameToIdMap[fieldName] || -1;
  }

  private fieldNameToMetadata(name) {
    return this.fieldNameToFieldMetadataMap[name];
  }

  private getFieldMenuName(metadata) {
    let mapNames = metadata.mapNames;
    return mapNames.length > 0 ? mapNames[0] : metadata.fieldName;
  }

  public getMenuName(fieldName) {
    let metadata = this.fieldNameToMetadata(fieldName);
    let menuName = this.getFieldMenuName(metadata);
    return menuName;
  }

  ngOnInit() {
    let url = environment.KUJATA_DATA_BASE_URL + '/data/field/flevel.lgp/maplist.json';
    this.http.get<any[]>(url).subscribe(mapList => {
      this.mapList = mapList;
      this.createFieldNameToIdMap(mapList);

      url = environment.KUJATA_DATA_BASE_URL + '/metadata/scene-graph.json';
      this.http.get(url).subscribe(sceneGraph => {
        this.sceneGraph = sceneGraph;
        this.fieldIdToFieldMetadataMap = {};
        this.fieldNameToFieldMetadataMap = {};
        for (let metadata of this.sceneGraph.nodes) {
          this.fieldIdToFieldMetadataMap[metadata.id] = metadata;
          this.fieldNameToFieldMetadataMap[metadata.fieldName] = metadata;
        }
        console.log('this.fieldNameToFieldMetadataMap:', this.fieldNameToFieldMetadataMap);

        url = environment.KUJATA_DATA_BASE_URL + '/metadata/chapters.json';
        this.http.get(url).subscribe(chapters => {
          this.chapters = chapters as any[];
          let remaining = {};
          for (let fieldId=65; fieldId<this.mapList.length; fieldId++) {
            let fieldName = this.mapList[fieldId];
            if (fieldName && fieldName.length > 0) {
              remaining[fieldName] = true;
            }
          }
          for (let chapter of this.chapters) {
            for (let fieldName of chapter.fieldNames) {
              remaining[fieldName] = undefined; // remove field from "remaining" if it's already in a chapter
            }
          }
          let remainingChapter = this.chapters[this.chapters.length - 3];
          /*
          {
            "name": "Remaining",
            "fieldNames": []
          };
          */
          for (let fieldName of Object.keys(remaining)) {
            if (remaining[fieldName] != undefined) {
              remainingChapter.fieldNames.push(fieldName);
            }
          }
          //this.chapters.push(remainingChapter);
        });

      });
    }, error => {
      this.fetchStatus = "ERROR";
    });
  }

}
