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
  public selectedOpCode = null;
  public usages = [];
  public fetchStatus = "NONE"; // NONE, FETCHING, SUCCESS, ERROR
  public Object = Object; // so the html can call Object.keys()

  columnDefs = [];
  rowData = of([]);
  friendlyColumnNames = {
    "fieldName": "Field",
    "entityName": "Entity",
    "scriptIndex": "Script",
    "opIndex": "Line",
    "raw": "Raw",
    "description": "Translation"
  };
  columnWidths = {
    "fieldName": 100,
    "entityName": 100,
    "op": 100,
    "description": 600
  };
  public gridOptions;

  constructor(private http: HttpClient) {
  }

  ngOnInit() {
    this.gridOptions = {
      rowData: this.rowData,
      columnDefs: this.columnDefs,
      //pagination: true,
      rowSelection: 'single',
      onRowClicked: function(event) { console.log('a row was clicked'); },
      onColumnResized: function(event) { console.log('a column was resized'); },
      onGridReady: function(event) { console.log('the grid is now ready'); },
      //noRowsToShow: ""
      suppressNoRowsOverlay: true
    }
    /*
    // show 'loading' overlay
    gridOptions.api.showLoadingOverlay()

    // show 'no rows' overlay
    gridOptions.api.showNoRowsOverlay()

    // clear all overlays
    gridOptions.api.hideOverlay()
    */

    let url = environment.KUJATA_DATA_BASE_URL + '/metadata/op-metadata.json';
    this.http.get(url).subscribe(opMetadata => {
      this.opMetadata = opMetadata;
      for (let hex of Object.keys(opMetadata)) {
        this.opCodes.push(hex);
      }
      this.opCodes.sort();
    });
    /*
    for (let opCode=0; opCode<256; opCode++) {
      let opHex = opCode.toString(16).padStart(2, "0");
      this.opCodes.push(opHex);
    }
    */
  }

  addColumnDef(columnName, width) {
    this.columnDefs.push({
      headerName: this.friendlyColumnNames[columnName] || columnName,
      field: columnName,
      width: width,
      sortable: true,
      filter: true,
      resizable: true
    });
  }

  onSelectOpCode(opCode) {
    this.selectedOpCode = opCode;
    this.fetchStatus = "FETCHING";
    if (this.gridOptions.api) {
      this.gridOptions.api.showLoadingOverlay();
    }
    let url = environment.KUJATA_DATA_BASE_URL + '/metadata/op-code-usages/' + opCode + '.json';
    this.http.get(url).subscribe(usages => {
      this.fetchStatus = "SUCCESS";
      this.usages = usages as any[];
      // set grid data
      this.rowData = of(this.usages);
      this.columnDefs = [];
      //this.addColumnDefs(["fieldName", "entityName", "scriptIndex", "opIndex", "raw"]);
      if (this.usages.length > 0) {
        let firstRow = this.usages[0];
        for (let columnName of Object.keys(firstRow)) {
          if (columnName == "op") {
            let rawLength = firstRow.raw.length;
            this.addColumnDef("raw", 60 + rawLength * 6); // put the "raw" column before the "op" and op-specific columns
          }
          if (columnName != "raw") {
            this.addColumnDef(columnName, this.columnWidths[columnName] || 75);
          }
        }
      }
      if (this.gridOptions.api) {
        this.gridOptions.api.hideOverlay();
      }
    }, error => {
      this.fetchStatus = "ERROR";
    });
  }

  exportToCsv() {
    this.gridOptions.api.exportDataAsCsv({});
  }

}
