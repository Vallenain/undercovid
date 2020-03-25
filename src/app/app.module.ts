import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { UiComponentsModule } from './ui-components/ui-components.module'
import { GameComponent } from './game/game.component';
import { WelcomeComponent } from './welcome/welcome.component';
import { AreyousureDialogComponent } from './areyousure-dialog/areyousure-dialog.component';
import { WinnerDialogComponent } from './winner-dialog/winner-dialog.component';
import { SuggestWordsComponent } from './suggest-words/suggest-words.component';



@NgModule({
  declarations: [
    AppComponent,
    GameComponent,
    WelcomeComponent,
    AreyousureDialogComponent,
    WinnerDialogComponent,
    SuggestWordsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    UiComponentsModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AppRoutingModule,
    FormsModule
  ],
  entryComponents: [
    AreyousureDialogComponent,
    WinnerDialogComponent
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
