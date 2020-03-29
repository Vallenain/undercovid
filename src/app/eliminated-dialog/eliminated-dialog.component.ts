import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';


const MAX_SEC: number = 30;

@Component({
  selector: 'app-eliminated-dialog',
  templateUrl: './eliminated-dialog.component.html',
  styleUrls: ['./eliminated-dialog.component.scss']
})
export class EliminatedDialogComponent implements OnInit, OnDestroy {

  isGoodVirus: boolean;
  virusGuessWord: string;
  remainingTime: number;
  interval: number;

 constructor(
    public dialogRef: MatDialogRef<EliminatedDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data) {
      this.isGoodVirus = data.isGoodVirus;
    }

  ngOnInit() {
    if(this.isGoodVirus) {
      this.remainingTime = MAX_SEC;
      this.interval = setInterval(() => {
        this.remainingTime -= 1
        if(this.remainingTime === 0) {
          clearInterval(this.interval);
          this.interval = undefined;
          this.giveup();
        }
      }, 1000);
    }
  }

  ngOnDestroy() {
    if(this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  guess() {
    if(!this.virusGuessWord)
      return;

    this.dialogRef.close(this.virusGuessWord);
  }

  giveup() {
    this.dialogRef.close();
  }
}
