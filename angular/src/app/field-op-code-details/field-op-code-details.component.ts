import { environment } from '../../environments/environment';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'field-op-code-details',
  templateUrl: './field-op-code-details.component.html',
  styleUrls: ['./field-op-code-details.component.css']
})
export class FieldOpCodeDetailsComponent implements OnInit {

  public opMetadata;
  public selectedOpCode = null;
  public selectedOpMetadata = null;
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

  constructor(private route: ActivatedRoute, private http: HttpClient) {
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
    let url = environment.KUJATA_DATA_BASE_URL + '/metadata/op-metadata.json';
    this.http.get(url).subscribe(opMetadata => {
      this.opMetadata = opMetadata;
      this.initialize();
    });
    this.route.paramMap.subscribe(params => {
      this.selectedOpCode = params.get("hex");
      this.initialize();
    });
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

  initialize() {
    if (!this.opMetadata) { return; }
    if (!this.selectedOpCode) { return; }
    this.selectedOpMetadata = this.opMetadata[this.selectedOpCode];
    this.fetchStatus = "FETCHING";
    if (this.gridOptions.api) {
      this.gridOptions.api.showLoadingOverlay();
    }
    let url = environment.KUJATA_DATA_BASE_URL + '/metadata/op-code-usages/' + this.selectedOpCode + '.json';
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
