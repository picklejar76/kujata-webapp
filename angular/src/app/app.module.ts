import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { AgGridModule } from 'ag-grid-angular';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { FieldScenesComponent } from './field-scenes/field-scenes.component';
import { SceneDetailsComponent } from './scene-details/scene-details.component';
import { FieldOpCodesComponent } from './field-op-codes/field-op-codes.component';
import { ModelViewerComponent } from './model-viewer/model-viewer.component';
import { StageViewerComponent } from './stage-viewer/stage-viewer.component';

const appRoutes: Routes = [
  { path: 'model-viewer/:id', component: ModelViewerComponent },
  { path: 'field-scenes', component: FieldScenesComponent },
  { path: 'scene-details/:name', component: SceneDetailsComponent },
  { path: 'stage-viewer', component: StageViewerComponent },
  { path: 'field-op-codes', component: FieldOpCodesComponent },
  { path: '**', component: FieldScenesComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    FieldScenesComponent,
    SceneDetailsComponent,
    FieldOpCodesComponent,
    StageViewerComponent,
    ModelViewerComponent
  ],
  imports: [
    RouterModule.forRoot(appRoutes),
    BrowserModule,
    HttpClientModule, // import after BrowserModule
    AgGridModule.withComponents([])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
