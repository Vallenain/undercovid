import { Injectable } from '@angular/core';

export enum PLAYER_ROLE {
  PANGOLIN = "PANGOLIN",
  BAT = "BAT",
  GOOD_VIRUS = "GOOD_VIRUS",
  UNASSIGNED = "UNASSIGNED"
}

export interface Player {
  id ?: string;
  name: string;
  isMaster: boolean;
  eliminated: boolean;
  joinedAt: Date;
}

export interface PlayerRole {
  name: string;
  role ?: PLAYER_ROLE;
  word ?: string;
  id ?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  constructor() { }
}
