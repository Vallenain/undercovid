import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

export interface User {
  id ?: string;
  name ?: string;
  createdAt: Date;
}

export enum PLAYER_ROLE {
  PANGOLIN = "PANGOLIN",
  BAT = "BAT",
  GOOD_VIRUS = "GOOD_VIRUS",
  UNASSIGNED = "UNASSIGNED"
}

export interface Player {
  id: string;
  name: string;
  createdAt: Date;
  isMaster: boolean;
  nbPoints: number;
  role: PLAYER_ROLE;
  eliminated: boolean;
  joinedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private _user: User;
  private _userRef: DocumentReference;
  user: BehaviorSubject<User>;

  constructor(private afs: AngularFirestore) {
    this.user = new BehaviorSubject(undefined);
  }

  createUser(userName) {
    if(this._user !== undefined)
      return;

    let userToCreate = {
      createdAt: new Date(),
      name: userName
    };

    return this.afs.collection<User>('users').add(userToCreate).then(userRef => {
      console.log("User just created");
      this._userRef = userRef;
      this._user = userToCreate;
      this._user.id = userRef.id;
      this.user.next(JSON.parse(JSON.stringify(this._user)));
    }).catch(error => {
      console.error("Could not create the user...");
      console.error(error);
    });
  }

  editName(newName: string) {
    if(this._user === undefined)
      return;

    this._userRef.update({name: newName}).then(() => {
      this._user.name = newName;
      this.user.next(JSON.parse(JSON.stringify(this._user)));
    }).catch(error => {
      console.error("Unable to edit user name to " + newName);
      console.error(error);
    })
  }
}
