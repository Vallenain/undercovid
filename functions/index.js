const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const MIN_PLAYERS = 4;

const GAME_STATUS = {
  OPEN: "OPEN", // accept players, not started yet
  CLOSED: "CLOSED", // cannot accept player, cannot be reopen
  WORKING: "WORKING", // some process running
  PLAYING: "PLAYING" // players are playing
}

const PLAYER_ROLE = {
  PANGOLIN: "PANGOLIN",
  BAT:  "BAT",
  GOOD_VIRUS: "GOOD_VIRUS",
  UNASSIGNED: "UNASSIGNED"
}

const VIRUS_GUESS = {
  NULL: "NULL", // not guessed yet
  GUESSED_RIGHT: "GUESSED_RIGHT",
  GUESSED_WRONG: "GUESSED_WRONG"
}

function getPlayersWithRole(querySnapshot) {
  let nbPlayers = querySnapshot.docs.length;
  console.log(`Roles will be assigned to ${nbPlayers} players`);

  let hasGoodVirus = false;
  if(nbPlayers > MIN_PLAYERS) {
    console.log(`There are enough players to have a GOOD_VIRUS guy !`);
    hasGoodVirus = true;
  }
  let nbBats = Math.floor(nbPlayers/3);
  let nbPangolins = nbPlayers - nbBats;
  if(hasGoodVirus)
    nbPangolins -= 1;
  console.log(`There will be ${nbBats} bats and ${nbPangolins} pangolins.`);

  let players = [];
  let rolesToGive = nbPlayers;

  while(rolesToGive > 0) {
    let randomIdx = Math.floor(Math.random() * rolesToGive);
    let roleToGive;
    if(hasGoodVirus) {
      roleToGive = "GOOD_VIRUS";
      hasGoodVirus = false;
    } else if(nbBats > 0) {
      roleToGive = "BAT";
      nbBats -= 1;
    } else if(nbPangolins > 0) {
      roleToGive = "PANGOLIN";
      nbPangolins -= 1;
    }
    let player = querySnapshot.docs.splice(randomIdx, 1);
    players.push({
      id: player[0].id,
      role: roleToGive
    });
    console.log(`Just added a new ${roleToGive} to the game !`)
    rolesToGive-=1;
  }

  return players;
}

function pickWords(gameId) {
  return db.collection('words').get().then(qs1 => {
    return db.collection('games/'+gameId+'/words').get().then(qs2 => {
      let words;
      let iterations = 0;
      let found = false;

      do {
        let randomIdx = Math.floor(Math.random() * qs1.docs.length);
        words = qs1.docs[randomIdx];
        if(!qs2.docs.find(d => d.id === words.id))
          found = true;
        iterations++;
      } while(!found && iterations < qs1.docs.length)

      if(!found) {
        console.log(`[${gameId}] Wow, hard to find a pair never used. Reusing a pair`);
      }

      let word1or2 = Math.floor(Math.random() * 2);
      let pangolinWord = word1or2 === 0 ? words.get('word1') : words.get('word2');
      let batWord = word1or2 === 1 ? words.get('word1') : words.get('word2');

      console.log(`[${gameId}] Words have been picked: batWord=${batWord}, pangolinWord=${pangolinWord}`)
      return db.doc('games/'+gameId+'/words/'+words.id).set(words.data()).then(() => {
        return {
          pangolinWord: pangolinWord,
          batWord: batWord
        }
      })
    })
  })
}

function startGame(gameId) {
  console.log(`[${gameId}] Just moved to WORKING status`);

  // 1 : gives roles to players
  return db.collection('games/'+gameId+'/players').get().then(querySnapshot => {
    let nbPlayers = querySnapshot.docs.length;

    if(nbPlayers < MIN_PLAYERS) {
      db.doc('games/'+gameId).update({status: GAME_STATUS.OPEN});
      throw new Error("Not enough players to start a game");
    }

    console.log(`[${gameId}] ${nbPlayers} are about to play. Assigning roles...`);
    let players = getPlayersWithRole(querySnapshot);
    console.log(`[${gameId}] Roles have been assigned: ${JSON.stringify(players)}`);

    // 2 : pick two words
    return pickWords(gameId).then(words => {

      // 3 : assign words to player roles + tell who's first to play
      let nbBats = nbPangolins = nbGoodVirus = 0;
      let firstToPlay;
      players.forEach(p => {
        if(p.role === PLAYER_ROLE.GOOD_VIRUS) {
          p.word = "";
          nbGoodVirus += 1;
        } else if(p.role === PLAYER_ROLE.BAT) {
          p.word = words.batWord;
          nbBats += 1;
          if(!firstToPlay)
            firstToPlay = p.id;
        } else if(p.role === PLAYER_ROLE.PANGOLIN) {
          p.word = words.pangolinWord;
          nbPangolins += 1;
          if(!firstToPlay)
            firstToPlay = p.id;
        }
        db.doc('games/'+gameId+'/playerRoles/'+p.id).update({
          role: p.role,
          word: p.word,
          virusGuess: VIRUS_GUESS.NULL
        })
        db.doc('games/'+gameId+'/players/'+p.id).update({
          eliminated: false
        })
      })

      return db.doc('games/'+gameId).update({
        startedAt: new Date(),
        status: GAME_STATUS.PLAYING,
        nbBats: nbBats,
        nbPangolins: nbPangolins,
        nbGoodVirus: nbGoodVirus,
        nbPlayers: nbPangolins + nbBats + nbGoodVirus,
        firstToPlay: firstToPlay,
        winner: null,
        finishedAt: null
      })
    });
  })
}

function winTheGame(gameId, winner, survivors) {
  console.log(`[${gameId}] ${winner} have won, updating game`);
  return db.doc('games/'+gameId).update({
    winner: winner,
    status: GAME_STATUS.CLOSED,
    finishedAt: new Date(),
    nbPangolins: survivors.nbPangolins,
    nbBats: survivors.nbBats,
    nbGoodVirus: survivors.nbGoodVirus
  });
}

function updateGameSurvivors(gameId, survivors, nbPlayers) {
  return db.doc('games/'+gameId).update({
    nbPangolins: survivors.nbPangolins,
    nbBats: survivors.nbBats,
    nbGoodVirus: survivors.nbGoodVirus,
    nbPlayers: nbPlayers
  });
}

function checkEndGame(gameId) {
  return db.collection('games/'+gameId+'/players').get().then(qs1 => {
    return db.collection('games/'+gameId+'/playerRoles').get().then(qs2 => {

      let playersWithRoles = qs1.docs.map(d => {
        let roleDoc = qs2.docs.find(dd => dd.id === d.id);
        if(!roleDoc)
          throw new Error("Unable to find a role for player " + d.id);
        let player = d.data();
        player.role = roleDoc.get("role");
        player.virusGuess = roleDoc.get("virusGuess");
        return player;
      })

      let survivingPangolinsNb = playersWithRoles.filter(p => !p.eliminated && p.role === PLAYER_ROLE.PANGOLIN).length;
      let survivingBatsNb = playersWithRoles.filter(p => !p.eliminated && p.role === PLAYER_ROLE.BAT).length;
      let survivingVirus = playersWithRoles.find(p => p.role === PLAYER_ROLE.GOOD_VIRUS && p.virusGuess !== VIRUS_GUESS.GUESSED_WRONG);
      let survivingVirusNb = survivingVirus ? 1 : 0;
      let survivors = {
        nbPangolins: survivingPangolinsNb,
        nbBats: survivingBatsNb,
        nbGoodVirus: survivingVirusNb
      }
      let survivorsNb = survivingPangolinsNb + survivingBatsNb + survivingVirusNb;
      console.log(`[${gameId}] There ${survivingPangolinsNb} survivingPangolins, ${survivingBatsNb} survivingBats, ${survivingVirusNb} survivingVirus`);

      if(survivingVirus && survivingVirus.virusGuess === VIRUS_GUESS.GUESSED_RIGHT)
        return winTheGame(gameId, PLAYER_ROLE.GOOD_VIRUS, survivors)

      if(survivingPangolinsNb > 0) {
        if(survivingBatsNb > 0 || survivingVirus) {
          if(survivingBatsNb > 0 && survivingVirus) {
            // game is not over yet
            return updateGameSurvivors(gameId, survivors, playersWithRoles.length);
          } else if(survivorsNb === 2) {
            if(survivingBatsNb > 0) {
              return winTheGame(gameId, PLAYER_ROLE.BAT, survivors);
            } else {
              return winTheGame(gameId, PLAYER_ROLE.GOOD_VIRUS, survivors);
            }
          }
          return updateGameSurvivors(gameId, survivors, playersWithRoles.length);
        } else {
          // pangolins have won
          return winTheGame(gameId, PLAYER_ROLE.PANGOLIN, survivors);
        }
      } else if (!survivingVirus) {
        return winTheGame(gameId, PLAYER_ROLE.BAT, survivors);
      } else if(survivorsNb === 2) {
        return winTheGame(gameId, PLAYER_ROLE.GOOD_VIRUS, survivors);
      }

      // game is not over yet
      return updateGameSurvivors(gameId, survivors, playersWithRoles.length);
    })
  });
}

function checkMultipleGameMasters(gameId, playerId) {
  console.log(`[${gameId}][${playerId}] Has been nominated game master`);

  return db.collection(`games/${gameId}/players`).get().then(querySnapshot => {
    let promises = [];
    querySnapshot.docs.forEach(snapshot => {
      if(snapshot.get("isMaster") && snapshot.id !== playerId) {
        promises.push(snapshot.ref.update({isMaster: false}));
      }
    });
    return Promise.all(promises);
  });
}

function checkIfGameMasterIsMissing(gameId, playerId) {
  console.log(`[${gameId}][${playerId}] Has left the game. He was game master...`);

  return db.collection(`games/${gameId}/players`).get().then(querySnapshot => {
    let hasGameMaster = false;
    let lastJoin, lastPlayer;
    querySnapshot.docs.some(snapshot => {
      if(snapshot.get("isMaster")) {
        hasGameMaster = true;
        return true;
      } else if(!lastJoin || snapshot.get("joinedAt") > lastJoin) {
        lastJoin = snapshot.get("joinedAt");
        lastPlayer = snapshot.ref;
      }
      return false;
    });
    if(!hasGameMaster) {
      return lastPlayer.update({isMaster: true});
    }
    return Promise.resolve();
  });
}

function updateNbPlayers(gameId) {
  return db.collection('games/'+gameId+'/players').get().then(querySnapshot => {
    let nbPlayers = querySnapshot ? querySnapshot.docs.length : 0;
    console.log(`[${gameId}] ${nbPlayers} players are now part of the game.`);
    return db.doc('games/'+gameId).update({nbPlayers: nbPlayers});
  });
}

function checkGuessedWord(gameId, playerId, guessWord) {
  return db.collection('games/'+gameId+'/playerRoles').get().then(querySnapshot => {
    let pangolin = querySnapshot.docs.find(d => d.get("role") === PLAYER_ROLE.PANGOLIN);
    if(!pangolin)
      throw new Error("Unable to find a pangolin in game " + gameId)

    let virusGuess = pangolin.get("word").toLowerCase() === guessWord.toLowerCase() ? VIRUS_GUESS.GUESSED_RIGHT : VIRUS_GUESS.GUESSED_WRONG;
    return db.doc('games/'+gameId+'/playerRoles/'+playerId).update({
      virusGuess: virusGuess
    });
  })
}

function countGames() {
  return db.collection('games').get().then(querySnapshot => {
    let totalGames = querySnapshot.size;
    let closedGames = querySnapshot.docs.filter(d => d.get('status') === GAME_STATUS.CLOSED).length;
    console.log(`TotalGames: ${totalGames} - closedGames: ${closedGames}`);

    return db.doc('stats/GENERAL').update({
      nbClosedGames: closedGames,
      nbOpenGames: totalGames - closedGames
    })
  })
}

exports.onStartGame = functions.region('europe-west1').firestore
  .document('games/{gameId}')
  .onCreate((snap, context) => {
    return countGames();
  })

exports.checkStartGame = functions.region('europe-west1').firestore
  .document('games/{gameId}')
  .onUpdate((change, context) => {
    let gameId = context.params.gameId;
    let afterData = change.after.data();
    let beforeData = change.before.data();

    if(afterData.status === GAME_STATUS.WORKING && beforeData.status !== GAME_STATUS.WORKING) {
      return startGame(gameId);
    }

    return Promise.resolve();
  })

exports.checkMultipleGameMasters = functions.region('europe-west1').firestore
  .document('games/{gameId}/players/{playerId}')
  .onCreate((snap, context) => {
    let gameId = context.params.gameId;
    let playerId = context.params.playerId;
    let data = snap.data();

    return updateNbPlayers(gameId).then(() => {
      if(data.isMaster) {
        return checkMultipleGameMasters(gameId, playerId);
      }
      return Promise.resolve();
    })
  })

exports.checkEndGame = functions.region('europe-west1').firestore
  .document('games/{gameId}/players/{playerId}')
  .onUpdate((change, context) => {
    let gameId = context.params.gameId;
    let playerId = context.params.playerId;
    let afterData = change.after.data();
    let beforeData = change.before.data();

    if(afterData.eliminated && !beforeData.eliminated) {
      // a player has been eliminated
      console.log(`[${gameId}][${playerId}] Has been eliminated!`);
      return checkEndGame(gameId);
    }

    return Promise.resolve();
  })

exports.checkVirusGuess = functions.region('europe-west1').firestore
  .document('games/{gameId}/playerRoles/{playerId}')
  .onUpdate((change, context) => {
    let gameId = context.params.gameId;
    let playerId = context.params.playerId;
    let afterData = change.after.data();
    let beforeData = change.before.data();

    if(beforeData.virusGuess === VIRUS_GUESS.NULL) {
      if(afterData.virusGuess !== beforeData.virusGuess) {
        console.log(`[${gameId}][${playerId}] Virus has made a guess: ${afterData.virusGuess}`);
        return checkEndGame(gameId);
      } else if(afterData.guessWord) {
        console.log(`[${gameId}][${playerId}] Virus has made a guess: ${afterData.guessWord}`);
        // this will call this same trigger just after because virusGuess ppty will be updated
        return checkGuessedWord(gameId, playerId, afterData.guessWord);
      }
    }

    return Promise.resolve();
  })

exports.checkIfGameMasterIsMissing = functions.region('europe-west1').firestore
  .document('games/{gameId}/players/{playerId}')
  .onDelete((snap, context) => {
      let gameId = context.params.gameId;
      let playerId = context.params.playerId;
      let data = snap.data();

      console.log(`[${gameId}][${playerId}] Has left !`);
      return db.doc('games/'+gameId).get().then(snapshot => {
        if(snapshot.get("status") === GAME_STATUS.PLAYING) {
          return checkEndGame(gameId).then(() => {
            if(data.isMaster)
              return checkIfGameMasterIsMissing(gameId, playerId)
            else
              return Promise.resolve()
          });
        } else {
          return updateNbPlayers(gameId).then(() => {
            return checkIfGameMasterIsMissing(gameId, playerId);
          });
        }
      })
    })

exports.countGamesFromCron = functions.region('europe-west1').https.onRequest((req, res) => {
  if(req.method !== 'POST')
    return res.status(405).end();

  countGames().then(()=>res.status(200).end()).catch(error => {
    console.error(error);
    return res.status(500).end()
  });
});

exports.closeOpenGamesFromCron = functions.region('europe-west1').https.onRequest((req, res) => {
  if(req.method !== 'POST')
    return res.status(405).end();

  db.collection('games').where('status', 'in', [GAME_STATUS.OPEN, GAME_STATUS.PLAYING]).get().then(querySnapshot => {
    let now = new Date();
    let THIRTY_MIN_IN_MS = 30 * 60 * 1000;
    let docsToUpdate = querySnapshot.docs.filter(d => {
      let mostRecentDate = d.get('startedAt') ? d.get('startedAt') : d.get('createdAt');
      return now - mostRecentDate > THIRTY_MIN_IN_MS
    });

    console.log(`Found ${docsToUpdate.length} games to close by cron.`)

    let promises = docsToUpdate.map(d => {
      return d.ref.update({status: GAME_STATUS.CLOSED, cronClosed: true, finishedAt: now});
    });

    return Promise.all(promises);
  }).then(()=>res.status(200).end()).catch(error => {
    console.error(error);
    return res.status(500).end();
  })

});
