import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';

import {GameService} from '../game.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {

  isBusy: boolean = false;

  constructor(private gameService: GameService,
  private router: Router,
  private snackbar: MatSnackBar) { }

  joinGame(username: string, gameId: string): void {
    if(!this.canJoinExistingGame(username, gameId))
      return;

    this.isBusy = true;
    this.gameService.findOpenGame(gameId).then(gameSnapshot => {
      this.gameService.joinGame(gameSnapshot, username).then(() => {
        this.isBusy = false;
        this.router.navigate(['/game']);
      }).catch(error => {
        console.error(error);
        this.isBusy = false;
      });
    }).catch(error => {
      console.error(error);
      this.isBusy = false;
      this.snackbar.open("La partie n'existe pas ou n'accepte plus de joueurs", undefined, {
        duration: 3000
      });
    });
  }

  createGame(username: string): void {
    if(!this.canCreateGame(username))
      return;

    this.isBusy = true;
    this.gameService.createAndJoinGame(username).then(() => {
      this.router.navigate(['/game']);
      this.isBusy = false;
    }).catch(error => {
      console.error(error);
      this.isBusy = false;
    })
  }

  canJoinExistingGame(username: string, gameId: string): boolean {
    return !this.isBusy
    && username
    && username.length >= 3
    && username.length < 24
    && gameId
    && gameId.length === 20;
  }

  canCreateGame(username: string): boolean {
    return !this.isBusy
    && username
    && username.length >= 3
    && username.length < 24;
  }

}
