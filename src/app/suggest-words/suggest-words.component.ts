import { Component, OnDestroy } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {MatSnackBar} from '@angular/material/snack-bar';

import {WordsService} from '../words.service';
import {AreyousureDialogComponent} from '../areyousure-dialog/areyousure-dialog.component';

@Component({
  selector: 'app-suggest-words',
  templateUrl: './suggest-words.component.html',
  styleUrls: ['./suggest-words.component.scss']
})
export class SuggestWordsComponent implements OnDestroy {

  wordsList: string;
  pairs: string[][] = [];
  private _subscriptions: any[] = [];

  constructor(private wordsService: WordsService, private dialog: MatDialog, private snackbar: MatSnackBar) { }

  ngOnDestroy(): void {
    // remove all subscriptions
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  getCombinations(words: string[]): string[][] {
    if(words.length <= 1)
      return []
    let arr = [];
    for(let i = 1; i < words.length; i++)
      arr.push([words[0], words[i]])
    words.splice(0, 1);
    arr.push(...this.getCombinations(words));
    return arr;
  }

  generatePairs(): void {
    let words = this.wordsList.split(/,|\n/).map(s => {
      s = s.trim();
      if(s) {
        s = s[0].toUpperCase() + s.slice(1).toLowerCase();
      }
      return s;
    }).filter(s => s !== "");
    this.pairs = this.getCombinations(words);
  }

  deletePair(pairIdx: number): void {
    if(pairIdx >= 0 && pairIdx < this.pairs.length)
      this.pairs.splice(pairIdx, 1);
  }

  savePairs(): void {
    if(this.pairs.length > 0) {
      const dialogRef = this.dialog.open(AreyousureDialogComponent, {
        data: {
          areyousureAction: "soumettre ces paires"
        },
        disableClose: true
      });

      this._subscriptions.push(dialogRef.afterClosed().subscribe(result => {
        if(result){
          this.wordsService.savePairs(this.pairs).then(() => {
            this.snackbar.open("Les paires ont bien été sauvegardées", undefined, {
              duration: 3000
            });
            this.pairs.length = 0;
            this.wordsList = "";
          }).catch(error => {
            this.snackbar.open("Erreur lors de la sauvegarde", undefined, {
              duration: 3000
            });
            console.error(error);
          })
        } else {
          console.log("Abort! abort!");
        }
      }));
    }
  }

}
