import { Component, Inject } from '@angular/core';
import {MatDialog, MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

@Component({
  selector: 'app-areyousure-dialog',
  templateUrl: './areyousure-dialog.component.html',
  styleUrls: ['./areyousure-dialog.component.scss']
})
export class AreyousureDialogComponent {

 areyousureAction: string;
 imgUrl: string;

 constructor(
    public dialogRef: MatDialogRef<AreyousureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data) {
      this.areyousureAction = data.areyousureAction;
      this.imgUrl = data.imgUrl;
    }
}
