import { environment } from '../../environments/environment'
import { Component, OnInit } from '@angular/core'
import { Router } from "@angular/router"
import { HttpClient } from '@angular/common/http'
import { of } from 'rxjs'

@Component({
    selector: 'sound-details',
    templateUrl: './sound-details.component.html',
    styleUrls: ['./sound-details.component.css']
})
export class SoundDetailsComponent implements OnInit {

    public soundMetadata = []
    public fetchStatus = "NONE"
    public Object = Object // so the html can call Object.keys()
    public playingSound

    columnDefs = []
    rowData = of([])
    friendlyColumnNames = {
        "fieldName": "Field",
        "entityName": "Entity",
        "scriptType": "Script",
        "lineNo": "Line",
        "opType": "Op",
        "direction": "Direction",
        "soundId": "Sound ID",
        "playSound": "Play Sound"
    }
    columnWidths = {
        "direction": 100,
        "soundId": 150,
        "playSound": 150
    }
    public gridOptions

    constructor(private router: Router, private http: HttpClient) {
    }

    ngOnInit() {
        this.gridOptions = {
            rowData: this.rowData,
            columnDefs: this.columnDefs,
            //pagination: true,
            rowSelection: 'single',
            onRowClicked: function (event) { console.log('a row was clicked') },
            onColumnResized: function (event) { console.log('a column was resized') },
            onGridReady: function (event) { console.log('the grid is now ready') },
            //noRowsToShow: ""
            suppressNoRowsOverlay: true
        }
        this.init()
    }
    addColumnDef(columnName, width) {
        let columnDef = {
            headerName: this.friendlyColumnNames[columnName] || columnName,
            field: columnName,
            width: width,
            sortable: true,
            filter: true,
            resizable: true,
            onCellClicked: undefined,
            cellStyle: undefined,
            sort: undefined,
            cellRenderer: undefined
        }
        if (columnName === 'soundId') {
            columnDef.sort = 'asc'
        }
        if (columnName === 'fieldName') {
            columnDef.onCellClicked = (params) => {
                this.router.navigateByUrl('/scene-details/' + params.value)
            }
            columnDef.cellStyle = {
                color: '#007bff',
                textDecoration: 'underline',
                cursor: 'pointer'
            }
        }
        if (columnName === 'playSound') {
            columnDef.onCellClicked = (params) => {
                this.playSound(params.data.soundId)
            }
            columnDef.cellStyle = {
                color: '#007bff',
                textDecoration: 'underline',
                cursor: 'pointer'
            }
            columnDef.cellRenderer = (params) => { return `<i class="fa fa-play-circle"></i> Play sound: ${params.value}` }

        }
        this.columnDefs.push(columnDef)
    }
    playSound(soundId) {
        const url = `${environment.KUJATA_DATA_BASE_URL}/media/sounds/${soundId}.ogg`
        console.log(`Play sound - ${soundId} - ${url}`)
        if (soundId === 0) {
            window.alert('Play sound 0 in game actually stops current sounds playing')
            return
        }
        if (this.playingSound) {
            this.playingSound.pause()
            this.playingSound.currentTime = 0
        }
        this.playingSound = new Audio(url)
        this.playingSound.play()
    }
    init() {
        this.fetchStatus = "FETCHING"
        if (this.gridOptions.api) {
            this.gridOptions.api.showLoadingOverlay()
        }
        let url = environment.KUJATA_DATA_BASE_URL + '/metadata/sound-list.json'
        this.http.get<any[]>(url).subscribe(soundMetadata => {
            this.soundMetadata = soundMetadata
            this.soundMetadata.map(s => {
                delete s.entityId
                delete s.scriptIndex
                s.playSound = s.soundId
            })
            console.log('soundMetadata', soundMetadata)
            this.rowData = of(this.soundMetadata)

            this.fetchStatus = 'SUCCESS'
            if (this.soundMetadata.length > 0) {
                for (let columnName of Object.keys(this.friendlyColumnNames)) {
                    this.addColumnDef(columnName, this.columnWidths[columnName] || 75)
                }
            }
        }, error => {
            this.fetchStatus = "ERROR"
        })
    }
}
