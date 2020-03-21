import { Component, OnInit } from '@angular/core';

import {Game, GAME_STATUS, GameService} from '../game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent {

  constructor( private gameService: GameService) {}

}
