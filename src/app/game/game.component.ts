import{ Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {Mutex} from 'async-mutex';

import {Game, GAME_STATUS, GameService, CARDS_URL} from '../game.service';
import {Player, PLAYER_ROLE, PlayerRole} from '../player';
import {AreyousureDialogComponent} from '../areyousure-dialog/areyousure-dialog.component';
import {WinnerDialogComponent} from '../winner-dialog/winner-dialog.component';
import {EliminatedDialogComponent} from '../eliminated-dialog/eliminated-dialog.component';

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
  playersOrder: Object = {};
  private playersOrderMutex: Mutex = new Mutex();
  private _subscriptions: any[] = [];

  constructor( private gameService: GameService,
  private router: Router,
  private dialog: MatDialog) {}

  ngOnInit(): void {
    this._subscriptions.push(this.gameService.player.subscribe(player => {
      if(!player) {
        console.log("No player")
        this.router.navigate(['/welcome']);
        return;
      }
      this.player = player;
      if(this.player.eliminated) {
        this.openEliminatedDialog();
      }
    }));

    this._subscriptions.push(this.gameService.game.subscribe(game => {
      if(!game) {
        console.log("No game")
        this.router.navigate(['/welcome']);
        return;
      }
      this.game = game;

      if(this.game.status === GAME_STATUS.OPEN || this.game.status === GAME_STATUS.WORKING) {
        this.resetVars()
      } else if(this.game.status === GAME_STATUS.PLAYING) {
        if(!this.playerRole)
          this.gameService.getPlayerRole(this.player).then(pr => this.playerRole = pr);
        this.computePlayerOrder();
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
        this.computePlayerOrder();
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

  resetVars(): void {
    this.playerRole = undefined;
    this.playerRoles.length = 0;
    this.firstRoundIsOver = false;
    this.playersOrder = {}
  }

  get gameUrlToShare(): string {
    return window.origin + '/?join-game=' + this.game.id;
  }

  startGame(): void {
    this.firstRoundIsOver = false; // reset first round
    this.gameService.startGame();
  }

  reopenGame(): void {
    // difference with `startGame` is that game will go to OPEN status and so accept new players to join
    this.gameService.reopenGame();
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

  openEliminatedDialog(): void {
    const isGoodVirus = this.playerRole.role === PLAYER_ROLE.GOOD_VIRUS;
    const dialogRef = this.dialog.open(EliminatedDialogComponent, {
      data: {
        isGoodVirus: isGoodVirus
      },
      disableClose: isGoodVirus
    });

    if(isGoodVirus) {
      this._subscriptions.push(dialogRef.afterClosed().subscribe(result => {
        this.gameService.virusHasGuessed(result);
      }));
    }
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

  async computePlayerOrder() {
    const release = await this.playersOrderMutex.acquire()
    this.playersOrder = {};
    if(this.players && this.players.length && this.game && this.game.firstToPlay) {
      let firstToPlayIndex = this.players.findIndex(p => p.id === this.game.firstToPlay);
      let order = 1;
      let idx = firstToPlayIndex + 1;
      this.playersOrder[this.players[firstToPlayIndex]["id"]] = order++;
      do {
        if(idx === this.players.length)
          idx = 0;
        this.playersOrder[this.players[idx++]["id"]] = order++;
      }while(order <= this.players.length)
    }
    release();
  }

  getPlayerOrder(player: Player): number | undefined {
    return this.playersOrder[player.id];
  }

}
