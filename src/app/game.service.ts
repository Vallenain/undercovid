import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/firestore';
import { map, take } from "rxjs/operators";
import { from, BehaviorSubject } from "rxjs"

import { Player, PLAYER_ROLE, PlayerRole, VIRUS_GUESS } from './player';

export enum GAME_STATUS {
  OPEN = "OPEN", // accept players, not started yet
  CLOSED = "CLOSED", // cannot accept player, cannot be reopen
  WORKING = "WORKING", // some process running
  PLAYING = "PLAYING" // players are playing
}

export interface Game {
  createdAt: Date;
  startedAt ?: Date;
  status: GAME_STATUS;
  players ?: Array<Player>;
  id ?: string;
  nbBats ?: number;
  nbPangolins ?: number;
  nbGoodVirus ?: number;
  winner ?: PLAYER_ROLE;
  finishedAt ?: Date;
  firstToPlay ?: string;
  nbPlayers: number;
}

export const CARDS_URL = {
  BACK_CARD: "https://storage.googleapis.com/undercovid.appspot.com/cards/back-card.png",
  BAT_CARD: "https://storage.googleapis.com/undercovid.appspot.com/cards/bat-card.png",
  PANGOLIN_CARD: "https://storage.googleapis.com/undercovid.appspot.com/cards/pangolin-card.png",
  GOOD_VIRUS_CARD: "https://storage.googleapis.com/undercovid.appspot.com/cards/good-virus-card.png"
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  MAX_PLAYERS: number = 9;
  MIN_PLAYERS: number = 4;

  private _player: Player;
  private _game: Game;
  game: BehaviorSubject<Game>;
  player: BehaviorSubject<Player>;
  players: BehaviorSubject<Player[]>;

  constructor(private afs: AngularFirestore) {
    this.game = new BehaviorSubject(undefined);
    this.player = new BehaviorSubject(undefined);
    this.players = new BehaviorSubject(undefined);
  }

  attachGameWatchers() {
    this.afs.doc<Game>("games/"+this._game.id).valueChanges().subscribe(game => {
      console.log("Game has changed", game)
      game.id = this._game.id;
      this._game = game;
      this.game.next(this._game);
    });
    this.afs.collection<Player>("games/"+this._game.id+"/players").valueChanges().subscribe(players => {
      console.log("players have changed", players)
      this.players.next(players);
    });
    this.afs.doc<Player>("games/"+this._game.id+"/players/"+this._player.id).valueChanges().subscribe(player => {
      console.log("player has changed", player);
      if(player) {
        player.id = this._player.id;
      }
      this._player = player;
      this.player.next(this._player);
    });
  }

  joinGame(gameSnapshot, username: string, isMaster=false) {
    var playerToCreate = {
      name: username,
      isMaster: isMaster,
      eliminated: false,
      joinedAt: new Date()
    }
    var playerRoleToCreate = {
      name: username,
      role: PLAYER_ROLE.UNASSIGNED
    }
    return this.afs.collection<Player>(`games/${gameSnapshot.id}/players`).add(playerToCreate).then(playerRef => {
      return playerRef.update({id: playerRef.id}).then(() => {
        this._game = gameSnapshot.data();
        this._game.id = gameSnapshot.id;
        playerToCreate['id'] = playerRef.id;
        this._player = playerToCreate;
        this.game.next(this._game);
        this.player.next(this._player);
        this.attachGameWatchers();
        return this.afs.collection<PlayerRole>(`games/${gameSnapshot.id}/playerRoles`).doc(this._player.id).set(playerRoleToCreate);
      })
    });
  }

  createAndJoinGame(username: string) {
    var gameToCreate = {
      createdAt: new Date(),
      status: GAME_STATUS.OPEN,
      nbPlayers: 0
    };
    return this.afs.collection<Game>('games').add(gameToCreate).then(gameRef => {
      return this.afs.doc<Game>('games/'+gameRef.id).snapshotChanges().pipe(take(1)).toPromise().then(action => {
        if(action)
          return this.joinGame(action.payload, username, true);
        return Promise.reject("Could not find newly created game " + gameRef.id);
      })
    })
  }

  findOpenGame(gameId: string) {
    return this.afs.doc<Game>(`games/`+gameId).get().pipe(take(1)).toPromise().then(snapshot => {
      if(!snapshot.exists)
        return Promise.reject("Game has not been found");
      if(snapshot.get("status") !== GAME_STATUS.OPEN)
        return Promise.reject("Game is not open");
      if(snapshot.get("nbPlayers") >= 10)
        return Promise.reject("Max number of players reached");
      return snapshot;
    })
  }

  startGame() {
    // let the Cloud Function do the job on status update
    return this.afs.doc<Game>('games/'+this._game.id).update({status: GAME_STATUS.WORKING});
  }

  getPlayerRole(player: Player, withAllData: boolean = false) {
    player = player || this._player
    return this.afs.doc<PlayerRole>('games/'+this._game.id+'/playerRoles/'+player.id).get().toPromise().then(snapshot => {
      if(!snapshot.exists)
        return Promise.reject("Player role not found")
      let ret = {
        name: snapshot.get("name"),
        word: snapshot.get("word"),
        role: undefined,
        id: player.id
      };
      if(snapshot.get("role") === PLAYER_ROLE.GOOD_VIRUS || withAllData)
        ret.role = snapshot.get("role")
      return ret;
    });
  }

  eliminatePlayer(player: Player) {
    return this.afs.doc<Player>('games/'+this._game.id+'/players/'+player.id).update({
      eliminated: true
    });
  }

  kickPlayer(player: Player) {
    console.log("Deleting player")
    return this.afs.doc<Player>('games/'+this._game.id+'/players/'+player.id).delete().then(() => {
      console.log("Player deleted, deleting role")
      return this.afs.doc<Player>('games/'+this._game.id+'/playerRoles/'+player.id).delete();
    });
  }

  virusHasGuessed(guessWord: string) {
    if(guessWord) {
      return this.afs.doc<PlayerRole>('games/'+this._game.id+'/playerRoles/'+this._player.id).update({guessWord: guessWord});
    } else {
      return this.afs.doc<PlayerRole>('games/'+this._game.id+'/playerRoles/'+this._player.id).update({virusGuess: VIRUS_GUESS.GUESSED_WRONG});
    }
  }

  reopenGame() {
    return this.afs.doc<Game>('games/'+this._game.id).update({status: GAME_STATUS.OPEN}).then(() => {
      return this.afs.collection<Player>('games/'+this._game.id+'/players').get().pipe(take(1)).toPromise().then(snapshot => {
        console.log(snapshot);
        let promises = snapshot.docs.map(d => d.ref.update({eliminated: false}));
        return Promise.all(promises);
      })
    });
  }
}
