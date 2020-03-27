import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import {MatDialog} from '@angular/material/dialog';

import {Game, GAME_STATUS, GameService, CARDS_URL} from '../game.service';
import {Player, PLAYER_ROLE, PlayerRole} from '../player.service';
import {AreyousureDialogComponent} from '../areyousure-dialog/areyousure-dialog.component';
import {WinnerDialogComponent} from '../winner-dialog/winner-dialog.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {

  game: Game;
  player: Player;
  playerRole: PlayerRole;
  players: Player[];
  playerRoles: PlayerRole[] = [];
  firstRoundIsOver: boolean = false;
  private _subscriptions: any[] = [];

  constructor( private gameService: GameService, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this._subscriptions.push(this.gameService.player.subscribe(player => {
      if(!player) {
        console.log("No player")
        this.router.navigate(['/welcome']);
        return;
      }
      this.player = player;
    }));

    this._subscriptions.push(this.gameService.game.subscribe(game => {
      if(!game) {
        console.log("No game")
        this.router.navigate(['/welcome']);
        return;
      }
      this.game = game;

      if(this.game.status === GAME_STATUS.WORKING) {
        if(this.playerRole)
          this.playerRole = undefined;
        if(this.playerRoles.length > 0)
          this.playerRoles.length = 0;
        this.firstRoundIsOver = false;
      } else if(this.game.status === GAME_STATUS.PLAYING && !this.playerRole) {
        this.gameService.getPlayerRole(this.player).then(pr => this.playerRole = pr);
      } else if(this.game.status === GAME_STATUS.CLOSED) {
        if(this.game.winner !== undefined) {
          this.fetchMissingPlayerRoles(true);
          this.gameService.getPlayerRole(this.player, true).then(pr => {
            this.playerRole = pr;
            this.openWinnerDialog();
          });
        } else {
          console.log("Game manually closed")
          this.router.navigate(['/welcome']);
        }
      }
    }));

    this._subscriptions.push(this.gameService.players.subscribe(players => {
      this.players = players;
      if(this.players && this.players.length > 0) {
        if(this.players.find(p => p.id === this.player.id) === undefined) {
          console.log("Current player not in players list")
          this.router.navigate(['/welcome']);
          return;
        }
        this.fetchMissingPlayerRoles();
      }
    }));
  }

  ngOnDestroy() {
    // remove all subscriptions
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  @HostListener('window:beforeunload', ['$event'])
  preventLeavingGame($event: any) {
    if(this.game.status === GAME_STATUS.WORKING || this.game.status === GAME_STATUS.PLAYING)
      $event.returnValue = true;
  }

  @HostListener('window:unload', ['$event'])
  kickLeavingPlayer($event: any) {
    // few chance it goes to the end but well, worth trying...
    this.gameService.kickPlayer(this.player);
  }

  startGame(): void {
    this.gameService.startGame();
  }

  getCardImage(player: Player): string {
    if((this.game && this.game.status === GAME_STATUS.CLOSED)
    || (player.eliminated && player.id)) {
      let playerRole = this.playerRoles.find(r => r.id === player.id);
      if(playerRole) {
        if(playerRole.role === PLAYER_ROLE.GOOD_VIRUS)
          return CARDS_URL.GOOD_VIRUS_CARD;
        if(playerRole.role === PLAYER_ROLE.BAT)
          return CARDS_URL.BAT_CARD;
        if(playerRole.role === PLAYER_ROLE.PANGOLIN)
          return CARDS_URL.PANGOLIN_CARD;
      }
    }

    return CARDS_URL.BACK_CARD;
  }

  getCardAlt(player: Player): string {
    if((this.game && this.game.status === GAME_STATUS.CLOSED)
    || (player.eliminated && player.id)) {
      let playerRole = this.playerRoles.find(r => r.id === player.id);
      if(playerRole) {
        if(playerRole.role === PLAYER_ROLE.GOOD_VIRUS)
          return "Carte du bon virus";
        if(playerRole.role === PLAYER_ROLE.BAT)
          return "Carte de chauve-souris";
        if(playerRole.role === PLAYER_ROLE.PANGOLIN)
          return "Carte de pangolin";
      }
    }

    return "Dos de la carte";
  }

  eliminatePlayer(player: Player): void {
    const dialogRef = this.dialog.open(AreyousureDialogComponent, {
      data: {
        areyousureAction: `éliminer (démocratiquement) ${player.name}`,
        imgUrl: "https://media.giphy.com/media/2Y9KUyYNmXcfNMBJQB/giphy.gif"
      },
      disableClose: true
    });

    this._subscriptions.push(dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.gameService.eliminatePlayer(player);
      } else {
        console.log("Abort! abort!");
      }
    }));
  }

  kickPlayer(player: Player): void {
    const dialogRef = this.dialog.open(AreyousureDialogComponent, {
      data: {
        areyousureAction: `exclure ${player.name} de la partie`
      },
      disableClose: true
    });

    this._subscriptions.push(dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.gameService.kickPlayer(player);
      } else {
        console.log("Abort! abort!");
      }
    }));
  }

  fetchMissingPlayerRoles(force: boolean = false): void {
    this.players.forEach(p => {
      if(force || p.eliminated) {
        this.firstRoundIsOver = true;
        if(this.playerRoles.find(pr => pr.id === p.id) === undefined) {
          this.gameService.getPlayerRole(p, true).then(pr => this.playerRoles.push(pr));
        }
      }
    })
  }

  openWinnerDialog(): void {
    const dialogRef = this.dialog.open(WinnerDialogComponent, {
      data: {
        role: this.playerRole.role,
        hasWon: this.game.winner === this.playerRole.role
      },
      disableClose: false
    });
  }

  getFirstToPlayName(): string {
    let firstToPlay = this.players.find(p => p.id === this.game.firstToPlay);
    if(!firstToPlay)
      throw new Error("First to play does not exist anymore...")
    return firstToPlay.name;
  }

  get minPlayers(): number {
    return this.gameService.MIN_PLAYERS;
  }

  get maxPlayers(): number {
    return this.gameService.MAX_PLAYERS;
  }

}
