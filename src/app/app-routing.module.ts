import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {GameComponent} from './game/game.component';
import {WelcomeComponent} from './welcome/welcome.component';
import {SuggestWordsComponent} from './suggest-words/suggest-words.component';

const routes: Routes = [
  {
    path: 'game',
    component: GameComponent
  },
  {
    path: 'suggest-words',
    component: SuggestWordsComponent
  },
  {
    path: 'welcome',
    component: WelcomeComponent,
  },
  { path: '**',
    redirectTo: '/welcome'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
