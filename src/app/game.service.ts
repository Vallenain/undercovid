import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { map, take } from "rxjs/operators";
import { from } from "rxjs"

import { User, UserService } from './user.service';

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

  constructor(private afs: AngularFirestore, private userService: UserService) {
    userService.user.subscribe(user => {
      this.user = user;
    })
  }

  joinGame(gameRef) {
    return this.afs.collection<User>(`games/${gameRef.id}/players`).doc(this.user.id).set({
      name: this.user.name,
      createdAt: this.user.createdAt
    });
  }

  createAndJoinGame() {

  }

  joinOrCreateGame() {
    if(!this.user)
      return Promise.reject("No user found");

    return this.afs.collection<Game>('games', ref => ref.where("status", "==", GAME_STATUS.OPEN))
    .snapshotChanges().pipe(take(1)).toPromise().then(gameRefs => {
        if(gameRefs.length > 0) {
          return this.joinGame(gameRefs[0].payload.doc);
        }
        return this.createAndJoinGame();
    })
  }
}
