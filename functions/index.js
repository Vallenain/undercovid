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
    return db.collection('words').get().then(querySnapshot => {
      let randomIdx = Math.floor(Math.random() * querySnapshot.docs.length);
      let words = querySnapshot.docs[randomIdx].data();
      let word1or2 = Math.floor(Math.random() * 2);
      let pangolinWord = word1or2 === 0 ? words.word1 : words.word2;
      let batWord = word1or2 === 1 ? words.word1 : words.word2;

      console.log(`[${gameId}] Words have been picked: batWord=${batWord}, pangolinWord=${pangolinWord}`)

      // 3 : assign words to player roles + tell who's first to play
      let nbBats = nbPangolins = nbGoodVirus = 0;
      let firstToPlay;
      players.forEach(p => {
        if(p.role === PLAYER_ROLE.GOOD_VIRUS) {
          p.word = "";
          nbGoodVirus += 1;
        } else if(p.role === PLAYER_ROLE.BAT) {
          p.word = batWord;
          nbBats += 1;
          if(!firstToPlay)
            firstToPlay = p.id;
        } else if(p.role === PLAYER_ROLE.PANGOLIN) {
          p.word = pangolinWord;
          nbPangolins += 1;
          if(!firstToPlay)
            firstToPlay = p.id;
        }
        db.doc('games/'+gameId+'/playerRoles/'+p.id).update({
          role: p.role,
          word: p.word
        })
      })

      return db.doc('games/'+gameId).update({
        startedAt: new Date(),
        status: GAME_STATUS.PLAYING,
        nbBats: nbBats,
        nbPangolins: nbPangolins,
        nbGoodVirus: nbGoodVirus,
        firstToPlay: firstToPlay
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
        return player;
      })

      let survivingPangolins = playersWithRoles.filter(p => !p.eliminated && p.role === PLAYER_ROLE.PANGOLIN).length;
      let survivingBats = playersWithRoles.filter(p => !p.eliminated && p.role === PLAYER_ROLE.BAT).length;
      let survivingVirus = playersWithRoles.filter(p => !p.eliminated && p.role === PLAYER_ROLE.GOOD_VIRUS).length;
      let survivors = {
        nbPangolins: survivingPangolins,
        nbBats: survivingBats,
        nbGoodVirus: survivingVirus
      }
      let survivorsNb = survivingPangolins + survivingBats + survivingVirus;
      console.log(`[${gameId}] There ${survivingPangolins} survivingPangolins, ${survivingBats} survivingBats, ${survivingVirus} survivingVirus`);

      if(survivingPangolins > 0) {
        if(survivingBats > 0 || survivingVirus > 0) {
          if(survivingBats > 0 && survivingVirus > 0) {
            // game is not over yet
            return updateGameSurvivors(gameId, survivors, playersWithRoles.length);
          } else if(survivorsNb === 2) {
            if(survivingBats > 0) {
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
      } else if (survivingVirus === 0) {
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
