import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three-full';

@Component({
  selector: 'model-viewer',
  templateUrl: './model-viewer.component.html',
  styleUrls: ['./model-viewer.component.css']
})
export class ModelViewerComponent implements OnInit {

  constructor(private http: HttpClient) {
  }

  ngOnInit() {
  }

}
