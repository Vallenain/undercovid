import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/firestore';
import { map, take } from "rxjs/operators";
import { from, BehaviorSubject } from "rxjs"

import { User, UserService, Player, PLAYER_ROLE } from './user.service';

export enum GAME_STATUS {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
  IN_PROGRESS = "IN_PROGRESS"
}

export interface Game {
  startedAt: Date;
  status: GAME_STATUS;
  players ?: Array<User>;
  id ?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private user: User;
  private _player: Player;
  private _game: Game;
  private _gameRef: DocumentReference;
  game: BehaviorSubject<Game>;
  player: BehaviorSubject<Player>;
  players: BehaviorSubject<Player[]>;

  constructor(private afs: AngularFirestore, private userService: UserService) {
    userService.user.subscribe(user => {
      this.user = user;
    });
    this.game = new BehaviorSubject(undefined);
    this.player = new BehaviorSubject(undefined);
    this.players = new BehaviorSubject(undefined);
  }

  attachGameWatchers() {
    this.afs.doc<Game>("games/"+this._game.id).valueChanges().subscribe(game => {
      this._game.status = game.status;
      this.game.next(this._game);
    });
    this.afs.collection<Player>("games/"+this._game.id+"/players").valueChanges().subscribe(players => {
      this.players.next(players);
    })
  }

  joinGame(gameSnapshot, isMaster=false) {
    var playerToCreate = {
      id: this.user.id,
      name: this.user.name,
      createdAt: this.user.createdAt,
      isMaster: isMaster,
      nbPoints: 0,
      eliminated: false,
      joinedAt: new Date(),
      role: PLAYER_ROLE.UNASSIGNED
    }
    return this.afs.collection<Player>(`games/${gameSnapshot.id}/players`).doc(this.user.id).set(playerToCreate).then(() => {
      this._game = gameSnapshot.data();
      this._game.id = gameSnapshot.id;
      this._gameRef = gameSnapshot.ref;
      this._player = playerToCreate;
      this.game.next(this._game);
      this.player.next(this._player);
      this.attachGameWatchers();
    });
  }

  createAndJoinGame() {
    var gameToCreate = {
      startedAt: new Date(),
      status: GAME_STATUS.OPEN
    };
    return this.afs.collection<Game>('games').add(gameToCreate).then(gameRef => {
      return this.afs.doc<Game>('games/'+gameRef.id).snapshotChanges().pipe(take(1)).toPromise().then(action => {
        if(action)
          return this.joinGame(action.payload, true);
        return Promise.reject("Could not find newly created game " + gameRef.id);
      })
    })
  }

  joinOrCreateGame() {
    if(!this.user)
      return Promise.reject("No user found");

    return this.afs.collection<Game>('games', ref => ref.where("status", "==", GAME_STATUS.OPEN))
    .snapshotChanges().pipe(take(1)).toPromise().then(actions => {
        if(actions.length > 0) {
          return this.joinGame(actions[0].payload.doc);
        }
        return this.createAndJoinGame();
    })
  }
}
