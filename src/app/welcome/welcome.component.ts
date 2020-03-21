import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import {UserService, User} from '../user.service';
import {GameService} from '../game.service';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {

  user: User;

  constructor(private userService: UserService, private gameService: GameService, private router: Router) { }

  ngOnInit(): void {
    this.userService.user.subscribe(user => {
      this.user = user;
    });
  }

  editName(newName) {
    if(!newName || newName.length < 3)
      return;

    this.userService.editName(newName);
  }

  joinGame(userName) {
    this.userService.createUser(userName).then(user => {
      this.gameService.joinOrCreateGame().then(game => {
        this.router.navigate(['/game']);
      })
    })
  }

}
