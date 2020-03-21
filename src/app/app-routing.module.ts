import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import {GameComponent} from './game/game.component';
import {WelcomeComponent} from './welcome/welcome.component';

const routes: Routes = [
  {
    path: 'game',
    component: GameComponent
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
