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
import { FieldOpCodeDetailsComponent } from './field-op-code-details/field-op-code-details.component';
import { FieldModelDetailsComponent } from './field-model-details/field-model-details.component';
import { FieldModelsComponent } from './field-models/field-models.component';

const appRoutes: Routes = [
  { path: 'field-scenes', component: FieldScenesComponent },
  { path: 'scene-details/:name', component: SceneDetailsComponent },
  { path: 'field-models', component: FieldModelsComponent },
  { path: 'field-model-details/:hrcId', component: FieldModelDetailsComponent },
  { path: 'field-op-codes', component: FieldOpCodesComponent },
  { path: 'field-op-code-details/:hex', component: FieldOpCodeDetailsComponent },
  { path: 'stage-viewer', redirectTo: 'field-models' }, // "stage-viewer" was the old name
  { path: '**', component: FieldScenesComponent }
];

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    FieldModelsComponent,
    FieldModelDetailsComponent,
    FieldScenesComponent,
    SceneDetailsComponent,
    FieldOpCodesComponent,
    FieldOpCodeDetailsComponent
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
