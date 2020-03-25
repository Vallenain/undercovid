import { Component, Inject } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

import {PLAYER_ROLE} from '../player.service';

@Component({
  selector: 'app-winner-dialog',
  templateUrl: './winner-dialog.component.html',
  styleUrls: ['./winner-dialog.component.scss']
})
export class WinnerDialogComponent {

 role: string;
 hasWon: boolean;

 constructor(
    public dialogRef: MatDialogRef<WinnerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data) {
      this.role = data.role;
      this.hasWon = data.hasWon;
    }

  get imageUrl() {
    if(this.hasWon) {
      if(this.role === PLAYER_ROLE.GOOD_VIRUS)
        return "https://media.giphy.com/media/3o7TKHugNSa7sKlpFS/giphy.gif";
      else if(this.role === PLAYER_ROLE.PANGOLIN)
        return "https://media.giphy.com/media/pr3OTI1LtI6FG/giphy.gif";
      if(this.role === PLAYER_ROLE.BAT)
        return "https://media.giphy.com/media/8w3ksZxYqGvjAkoWPF/giphy.gif";
    } else {
      return "https://media.giphy.com/media/3o7TKr3nzbh5WgCFxe/giphy.gif";
    }
  }
}
