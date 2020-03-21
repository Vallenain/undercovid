import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {Game, GAME_STATUS, GameService} from '../game.service';
import {Player, PLAYER_ROLE} from '../user.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {

  game: Game;
  player: Player;
  players: Player[];

  constructor( private gameService: GameService, private router: Router) {}

  ngOnInit(): void {
    this.gameService.player.subscribe(player => {
      if(!player) {
        this.router.navigate(['/welcome']);
        return;
      }
      this.player = player
    });
    this.gameService.game.subscribe(game => {
      if(!game) {
        this.router.navigate(['/welcome']);
        return;
      }
      this.game = game
    });
    this.gameService.players.subscribe(players => {
      this.players = players;
    })
  }

}
