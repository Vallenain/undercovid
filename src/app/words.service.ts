import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class WordsService {

  constructor(private afs: AngularFirestore) { }

  savePairs(pairs: string[][]): Promise<any> {
    let now = new Date();
    let promises = pairs.map(pair => {
      return this.afs.collection('words').add({
        word1: pair[0],
        word2: pair[1],
        addedAt: now
      });
    })
    return Promise.all(promises);
  }
}
