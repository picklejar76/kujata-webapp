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
    "routerLink": "Router Link",
    "fieldName": "Field",
    "entityName": "Entity",
    "scriptIndex": "Script",
    "opIndex": "Line",
    "raw": "Raw",
    "mr": "Makou Reactor translation",
    "js": "Javascript translation (experimental)",
    "pres": "Dramatization (experimental)"
  };
  columnWidths = {
    "fieldName": 100,
    "entityName": 100,
    "op": 100,
    "mr": 400,
    "js": 400,
    "pres": 400
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
    url = environment.KUJATA_DATA_BASE_URL + '/metadata/op-metadata.json';
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
    let columnDef = {
      headerName: this.friendlyColumnNames[columnName] || columnName,
      field: columnName,
      width: width,
      sortable: true,
      filter: true,
      resizable: true,
      cellRenderer: undefined
    };
    if (columnName == "fieldName") {
      columnDef.cellRenderer = (params) => {
        // TODO: Find out how to make this a router link
        return '<a href="/scene-details/' + params.value + '">' + params.value + '</a>';
      };
    }
    this.columnDefs.push(columnDef);
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
    this.http.get<any[]>(url).subscribe(usages => {
      this.fetchStatus = "SUCCESS";
      this.usages = usages;
      /*
      for (let usage of usages) {
        usage.routerLink = '/scene-details/' + usage.fieldName;
        this.usages.push(usage);
      }
      */
      // set grid data
      this.rowData = of(this.usages);
      this.columnDefs = [];
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
