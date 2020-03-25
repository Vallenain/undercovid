import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatCardModule} from '@angular/material/card';
import {MatDialogModule} from '@angular/material/dialog';
import {MatSnackBarModule} from '@angular/material/snack-bar';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  exports: [
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule
  ]
})
export class UiComponentsModule { }
