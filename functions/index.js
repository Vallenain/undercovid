const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

function getPlayersWithRole(querySnapshot) {
  let nbPlayers = querySnapshot.docs.length;
  console.log(`Roles will be assigned to ${nbPlayers} players`);

  let hasGoodVirus = false;
  if(nbPlayers > 4) {
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

exports.startGame = functions.region('europe-west1').firestore
  .document('games/{gameId}')
  .onUpdate((change, context) => {
    let gameId = context.params.gameId;
    let afterData = change.after.data();
    let beforeData = change.before.data();

    if(afterData.status === "WORKING" && beforeData.status !== "WORKING") {
      console.log(`[${gameId}] Just moved to WORKING status`);

      // 1 : gives roles to players
      return db.collection('games/'+gameId+'/players').get().then(querySnapshot => {
        let nbPlayers = querySnapshot.docs.length;

        if(nbPlayers < 4) {
          db.doc('games/'+gameId).update({status: "OPEN"});
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
            if(p.role === "GOOD_VIRUS") {
              p.word = "";
              nbGoodVirus += 1;
            } else if(p.role === "BAT") {
              p.word = batWord;
              nbBats += 1;
              if(!firstToPlay)
                firstToPlay = p.id;
            } else if(p.role === "PANGOLIN") {
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
            status: "PLAYING",
            nbBats: nbBats,
            nbPangolins: nbPangolins,
            nbGoodVirus: nbGoodVirus,
            firstToPlay: firstToPlay
          })
        });
      })
    }

    return Promise.resolve();
  })

function winTheGame(gameId, playerId, winner) {
  console.log(`[${gameId}][${playerId}] ${winner} have won, updating game`);
  return db.doc('games/'+gameId).update({
    winner: winner,
    status: "CLOSED",
    finishedAt: new Date()
  });
}

exports.checkEndGame = functions.region('europe-west1').firestore
  .document('games/{gameId}/players/{playerId}')
  .onUpdate((change, context) => {
    let gameId = context.params.gameId;
    let playerId = context.params.playerId;
    let afterData = change.after.data();
    let beforeData = change.before.data();

    if(afterData.eliminated && !beforeData.eliminated) {
      // Player has been eliminated
      console.log(`[${gameId}][${playerId}] Has been eliminated!`);

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

          let survivingPangolins = playersWithRoles.filter(p => !p.eliminated && p.role === "PANGOLIN").length;
          let survivingBats = playersWithRoles.filter(p => !p.eliminated && p.role === "BAT").length;
          let survivingVirus = playersWithRoles.filter(p => !p.eliminated && p.role === "GOOD_VIRUS").length;
          let survivors = survivingPangolins + survivingBats + survivingVirus;
          console.log(`[${gameId}][${playerId}] There ${survivingPangolins} survivingPangolins, ${survivingBats} survivingBats, ${survivingVirus} survivingVirus`);

          if(survivingPangolins > 0) {
            if(survivingBats > 0 || survivingVirus > 0) {
              if(survivingBats > 0 && survivingVirus > 0) {
                // game is not over yet
                return Promise.resolve();
              } else if(survivors === 2) {
                if(survivingBats > 0) {
                  return winTheGame(gameId, playerId, "BAT");
                } else {
                  return winTheGame(gameId, playerId, "GOOD_VIRUS");
                }
              }
              return Promise.resolve();
            } else {
              // pangolins have won
              return winTheGame(gameId, playerId, "PANGOLIN");
            }
          } else if (survivingVirus === 0) {
            return winTheGame(gameId, playerId, "BAT");
          } else if(survivors === 2) {
            return winTheGame(gameId, playerId, "GOOD_VIRUS");
          }

          // game is not over yet
          return Promise.resolve();
        })
      });
    }
    return Promise.resolve();
  })
