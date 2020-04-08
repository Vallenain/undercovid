import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { take } from "rxjs/operators";


export interface Stats {
  nbClosedGames: number,
  nbOpenGames: number
}


@Injectable({
  providedIn: 'root'
})
export class StatsService {

  constructor(private afs: AngularFirestore) { }

  getStats(): Promise<Stats> {
    return this.afs.doc<Stats>('stats/GENERAL').get().pipe(take(1)).toPromise().then(doc => {
      return <Stats>doc.data()
    })
  }
}
