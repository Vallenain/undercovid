import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import {UserService, User} from '../user.service';
import {GameService} from '../game.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, OnDestroy {

  user: User;
  private _subscriptions: any[] = [];

  constructor(private userService: UserService, private gameService: GameService, private router: Router) { }

  ngOnInit(): void {
    this._subscriptions.push(this.userService.user.subscribe(user => {
      this.user = user;
    }));
  }

  ngOnDestroy() {
    // remove all subscriptions
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  joinGame(userName): void {
    if(!userName || userName.length < 3 || userName.length > 24)
      return;

    this.userService.createUser(userName).then(user => {
      this.gameService.joinOrCreateGame().then(game => {
        this.router.navigate(['/game']);
      })
    })
  }

}
