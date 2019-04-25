import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'field-op-codes',
  templateUrl: './field-op-codes.component.html',
  styleUrls: ['./field-op-codes.component.css']
})
export class FieldOpCodesComponent implements OnInit {

  public opCodes = [];
  public opMetadata;
  public Object = Object; // so the html can call Object.keys()

  constructor(private http: HttpClient) {
  }

  ngOnInit() {
    let url = environment.KUJATA_DATA_BASE_URL + '/metadata/op-metadata.json';
    this.http.get(url).subscribe(opMetadata => {
      this.opMetadata = opMetadata;
      for (let hex of Object.keys(opMetadata)) {
        this.opCodes.push(hex);
      }
      this.opCodes.sort();
      console.log(this.opCodes);
    });
  }

}
