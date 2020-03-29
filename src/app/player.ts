export enum PLAYER_ROLE {
  PANGOLIN = "PANGOLIN",
  BAT = "BAT",
  GOOD_VIRUS = "GOOD_VIRUS",
  UNASSIGNED = "UNASSIGNED"
}

export enum VIRUS_GUESS {
  NULL = "NULL", // not guessed yet
  GUESSED_RIGHT = "GUESSED_RIGHT",
  GUESSED_WRONG = "GUESSED_WRONG"
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
  virusGuess ?: VIRUS_GUESS;
  guessWord ?: string;
}
