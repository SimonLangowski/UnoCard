//Dependencies
const express = require('express');
var bodyParser = require('body-parser');
//Firebase Database
const admin = require('firebase-admin');
var serviceAccount = require('./unocard-4576b-firebase-adminsdk-zypmv-763eaf0cfb.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://unocard-4576b.firebaseio.com'
});
var database = admin.database();
//Get App
const app = express();
var parser = bodyParser.json();
var bcrypt = require('bcrypt-nodejs');
var gameLogic = require('./gameLogic.js');
var server = require('http').Server(app);
var io = require('socket.io')(server);

//Resolve Register Button Click
function registerCheck(usrname, passwd, res) {
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(usrname).exists()) {
            //Username Taken
            var response = {
                status: 'failure',
                error: 'Username Already Taken'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            //Registering New User
            var hash = bcrypt.hashSync(passwd);
            usersRef.update({
                [usrname]: {
                    password: hash,
                    signedIn: 'false',
                    inLobby: 'false',
                    lobbyID: 0
                }
            });
            //console.log(hash);
            var response = {
                status: 'success',
                message: 'User Registered'
            };
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

//Resolve Sign In Button Click
function signInCheck(usrname, passwd, res) {
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(usrname).exists()){
            /*if (snapshot.child(usrname).child("signedIn").val() == 'true'){
                //User Already Signed In
                var response = {
                    status: 'failure',
                    error: 'User Already Signed In'
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
                return;
            }*/
            var hash = snapshot.child(usrname).child("password").val();
            //console.log(hash);
            if (bcrypt.compareSync(passwd, hash)){
                //User Exists And Not Already Signed In
                 var currentUserRef = database.ref("users/" + usrname);
                currentUserRef.update({
                    signedIn: 'true'
                });
                var response = {
                    status: 'success',
                    message: 'User Signed In',
                    userID: usrname
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
                return;
            }
        }
        //Username or Password Didnt Match
        var response = {
            status: 'failure',
            error: 'Username or Password Didn\'t Match'
        }
        console.log(JSON.stringify(response));
        res.send(JSON.stringify(response));
                
    });
}

//Resolve Sign Out Button Click
function signOutCheck(userID, res) {
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists()) {
            var currentUserRef = database.ref("users/" + userID);
            currentUserRef.update({
                signedIn: 'false'
            });
            var response = {
                status: 'success',
                message: 'User Signed Out'
            }
            if (snapshot.child(userID).child("inLobby").val() == 'true') {
                var gameID = snapshot.child(userID).child("lobbyID").val();
                currentUserRef.update({
                    inLobby: 'false',
                    lobbyID: 0
                });
                var gamesRef = database.ref("games");
                gamesRef.once("value").then(function (snapshot) {
                    var currentGameRef = database.ref("games/" + gameID)
                    var players = snapshot.child(gameID).child("names").val();
                    if (players.length == 1) {
                        console.log(players);
                        currentGameRef.set(null);
                    } else {
                        players.splice(players.indexOf(userID), 1);
                        console.log(players);
                        if (snapshot.child(gameID).child("partyLeader").val() == userID) {
                            currentGameRef.update({
                                partyLeader: players[0]
                            });
                        }
                        currentGameRef.update({
                            names: players
                        });
                    }
                });
                res.updateAllLobbies();
            }
            console.log(JSON.stringify(response));
            res.send(response);
        } else {
            var response = {
                status: 'failure',
                error: 'User Does Not Exist'
            };
            console.log(JSON.stringify(response));
            res.send(response);
        }
    });
}

//Resolve Create Lobby Click
function createLobbyCheck(userID, res) {
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            //Create New Lobby
            var gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                var generatedID = createGameID();
                while (snapshot.child(generatedID).exists() == true) {
                    generatedID = createdGameID();
                }
                var currentUserRef = database.ref("users/" + userID);
                currentUserRef.update({
                    inLobby: 'true',
                    lobbyID: generatedID
                })
                var players = [];
                players.push(userID);
                gamesRef.update({
                    [generatedID]: {
                        names: players,
                        gameID: generatedID,
                        isStarted: false,
                        partyLeader: userID
                    }
                });
                var response = {
                    status: 'success',
                    message: 'Lobby Created',
                    gameID: Number(generatedID)
                }
                res.updateAllLobbies();
                console.log(JSON.stringify(response));
                res.send(response);
            });
        } else {
            var response = {
                status: 'failure',
                error: 'You Are Already In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        }
    });
}

//GameID is a random 5 number int (11111-99999)
function createGameID() {
    var gameID = "";
    var possibleChars = "123456789";
    for (var i = 0; i < 5; i++) {
        gameID += possibleChars.charAt(Math.floor(Math.random() * Math.floor(possibleChars.length)));
    }
    console.log("GameID: ", gameID);
    return gameID;
}

function lobbyInfoCheck(userID, res) {
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true') {
            var lobbies = [];
            var gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                snapshot.forEach(function (childSnapshot) {
                    var childData = childSnapshot;
                    var lobby = {
                        names: childData.child("names").val(),
                        gameID: Number(childData.child("gameID").val()),
                        isStarted: childData.child("isStarted").val(),
                        partyLeader: childData.child("partyLeader").val()
                    }
                    lobbies.push(lobby);
                });
                var response = {
                    status: 'success',
                    message: 'Current Lobbies',
                    lobbies: lobbies
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
            });
        } else {
            var response = {
                status: 'failure',
                error: 'User Not Signed In or User Does Not Exist'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

function lobbyJoinCheck(userID, gameID, res){
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            var gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().length <= 3 &&
                    snapshot.child(gameID).child("isStarted").val() == false) {
                    var currentUserRef = database.ref("users/" + userID);
                    var currentGameRef = database.ref("games/" + gameID);
                    currentUserRef.update({
                        inLobby: 'true',
                        lobbyID: gameID
                    });
                    var players = snapshot.child(gameID).child("names").val();
                    if (players.indexOf(userID) < 0) {
                        players.push(userID);
                        currentGameRef.update({
                            names: players
                        });
                        var response = {
                            status: 'success',
                            message: 'User Joined Lobby',
                            gameID: gameID
                        }
                        res.updateAllLobbies();
                        console.log(JSON.stringify(response));
                        res.send(response);
                    } else {
                        var response = {
                            status: 'failure',
                            error: 'Player Already In This Lobby'
                        }
                        console.log(JSON.stringify(response));
                        res.send(response);
                    }
                } else if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().length >= 4) {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Is Full'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                } else if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("isStarted").val() == true) {
                    var response = {
                        status: 'failure',
                        error: 'Game Already Started'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                } else {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Exist'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                }
            });
        } else if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            var response = {
                status: 'failure',
                error: 'User Already In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        } else {
            var response = {
                status: 'failure',
                error: 'User Not Signed In or User Does Not Exist'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        }
    });
}

function getCurrentLobby(userID, res){
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
    if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
        snapshot.child(userID).child("inLobby").val() == 'true') {
        var response = {
            status: 'success',
            gameID: Number(snapshot.child(userID).child("lobbyID").val())
        }
        console.log(JSON.stringify(response));
        res.send(response);
    } else {
        var response = {
            status: 'failure',
            error: 'User Not In A Lobby'
        }
        console.log(JSON.stringify(response));
        res.send(response);
    }
    }
    )
}

function lobbyLeaveCheck(userID, gameID, res) {
    var userRef = database.ref("users");
    userRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().indexOf(userID) > -1) {
                    var currentUserRef = database.ref("users/" + userID);
                    var currentGameRef = database.ref("games/" + gameID);
                    currentUserRef.update({
                        inLobby: 'false',
                        lobbyID: 0
                    });
                    var players = snapshot.child(gameID).child("names").val();
                    if (players.length == 1) {
                        console.log(players);
                        currentGameRef.set(null);
                    } else {
                        players.splice(players.indexOf(userID), 1);
                        console.log(players);
                        if (snapshot.child(gameID).child("partyLeader").val() == userID) {
                            currentGameRef.update({
                                partyLeader: players[0]
                            });
                        }
                        currentGameRef.update({
                            names: players
                        });
                        moreStepsIfGameStarted(snapshot, userID, gameID);
                    }
                    var response = {
                        status: 'success',
                        message: 'User Left Lobby'
                    }
                    res.updateAllLobbies();
                    console.log(JSON.stringify(response));
                    res.send(response);
                    
                } else if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().indexOf(userID) < 0) {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Contain This User'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                } else {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Exist'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                }
            });
        } else if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            var response = {
                status: 'failure',
                error: 'User Not In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        } else {
            var response = {
                status: 'failure',
                error: 'User Not Signed In or User Does Not Exist'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        }
    });
}

function moreStepsIfGameStarted(snapshot, userID, gameID) {
    if (snapshot.child(gameID).child("isStarted").val() == true && snapshot.child(gameID).child("isFinished").val() == false) {
        var player = getPlayerBasedOnUserID(snapshot, userID, gameID);
        var deck = snapshot.child(gameID).child("gameInfo").child("deck").val();
        if (deck == null)
            deck = [];
        var hand = snapshot.child(gameID).child("gameInfo").child(player).child("hand").val();
        var gameInfoRef = database.ref("games/" + gameID + "/gameInfo");
        var playerRef = database.ref("games/" + gameID + "/gameInfo/" + player);
        gameLogic.putHandIntoDeck(deck, hand);
        var emptyArray = [];
        gameInfoRef.update({
            deck: deck
        });
        playerRef.update({
            hasLost: true,
            cardCount: 0,
            hand: emptyArray
        })
        var placeToUpdate;
        if (snapshot.child(gameID).child("gameInfo").child("fourthPlace").val() == null) {
            placeToUpdate = "fourthPlace";
        } else if (snapshot.child(gameID).child("gameInfo").child("thirdPlace").val() == null) {
            placeToUpdate = "thirdPlace";
        } else {
            placeToUpdate = "secondPlace";
        }
        if (placeToUpdate == "secondPlace") {
            var remaining = snapshot.child(gameID).child(names).val();
            remaining.splice(snapshot.child(gameID).child("gameInfo").child("fourthPlace").val(), 1);
            remaining.splice(snapshot.child(gameID).child("gameInfo").child("thirdPlace").val(), 1);
            remaining.splice(userID, 1);
            gameInfoRef.update({
                finished: true,
                firstPlace: remaining[0]
            });
        }
        if (snapshot.child(gameID).child("gameInfo").child("currentTurn").val() == getPlayerIDBasedOnName(player)) {
            var playerTurn = getPlayerIDBasedOnName(player);
            if (snapshot.child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
                while (true) {
                    playerTurn++;
                    if (playerTurn > 4)
                        playerTurn = 1;
                    if (snapshot.child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                        child("hasLost").val() == false)
                        break;
                }
            } else {
                while (true) {
                    playerTurn--;
                    if (playerTurn < 1)
                        playerTurn = 4;
                    if (snapshot.child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                        child("hasLost").val() == false)
                        break;
                }
            }
            gameInfoRef.update({
                currentTurn: playerTurn
            });
        }
    }
}

function startGameCheck(userID, gameID, res) {
    var userRef = database.ref("users");
    userRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            var gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                if (snapshot.child(gameID).child("partyLeader").val() == userID) {
                    var currentGameRef = database.ref("games/" + gameID);
                    currentGameRef.update({
                        isStarted: true
                    });
                    var response = {
                        status: 'success',
                        message: 'Game Start'
                    }
                    //res.updateAllLobbies();
                    setUpNewGame(gameID, 4 - snapshot.child(gameID).child("names").val().length);
                    res.start(gameID);
                    console.log(JSON.stringify(response));
                    res.send(response);
                } else {
                    var response = {
                        status: 'failure',
                        error: 'User Not The Party Leader'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                }
            })
        } else if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            var response = {
                status: 'failure',
                error: 'User Not In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        } else {
            var response = {
                status: 'failure',
                error: 'User Not Signed In or User Does Not Exist'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        }
    });
}

function setUpNewGame(gameID, numCPUs) {
    var currentGameRef = database.ref("games/" + gameID);
    currentGameRef.once("value").then(function (snapshot) {
        var deck = gameLogic.getNewDeck();
        gameLogic.shuffle(deck);
        var topCard = deck[0];
        var i = 1;
        while (!(topCard.number >= 1 && topCard.number <= 6)) {
            topCard = deck[i];
            i++;
        }
        deck.splice(i, 1);
        var handOne = [];
        gameLogic.drawCard(deck, handOne, 7);
        var handTwo = [];
        gameLogic.drawCard(deck, handTwo, 7);
        var handThree = [];
        gameLogic.drawCard(deck, handThree, 7);
        var handFour = [];
        gameLogic.drawCard(deck, handFour, 7);
        if (numCPUs == 0){
            currentGameRef.update({
                gameInfo: {
                    finished: false,
                    deck: deck,
                    playDirection: "increasing",
                    currentPlayer: 1,
                    attackCount: 0,
                    topCard: topCard,
                    firstPlace: null,
                    secondPlace: null,
                    thirdPlace: null,
                    fourthPlace: null,
                    playerOne: {
                        userID: snapshot.child("names").val()[0],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handOne
                    },
                    playerTwo: {
                        userID: snapshot.child("names").val()[1],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handTwo
                    },
                    playerThree: {
                        userID: snapshot.child("names").val()[2],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handThree
                    },
                    playerFour: {
                        userID: snapshot.child("names").val()[3],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handFour
                    }
                }
            });
        } else if (numCPUs == 1){
                        currentGameRef.update({
                gameInfo: {
                    finished: false,
                    deck: deck,
                    playDirection: "increasing",
                    currentPlayer: 1,
                    attackCount: 0,
                    topCard: topCard,
                    firstPlace: null,
                    secondPlace: null,
                    thirdPlace: null,
                    fourthPlace: null,
                    playerOne: {
                        userID: snapshot.child("names").val()[0],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handOne
                    },
                    playerTwo: {
                        userID: snapshot.child("names").val()[1],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handTwo
                    },
                    playerThree: {
                        userID: snapshot.child("names").val()[2],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handThree
                    },
                    playerFour: {
                        userID: "CPU1",
                        hasLost: false,
                        isCPU: true,
                        cardCount: 7,
                        hand: handFour
                    }
                }
            });
        } else if (numCPUs == 2){
            currentGameRef.update({
                gameInfo: {
                    finished: false,
                    deck: deck,
                    playDirection: "increasing",
                    currentPlayer: 1,
                    attackCount: 0,
                    topCard: topCard,
                    firstPlace: null,
                    secondPlace: null,
                    thirdPlace: null,
                    fourthPlace: null,
                    playerOne: {
                        userID: snapshot.child("names").val()[0],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handOne
                    },
                    playerTwo: {
                        userID: "CPU1",
                        hasLost: false,
                        isCPU: true,
                        cardCount: 7,
                        hand: handTwo
                    },
                    playerThree: {
                        userID: snapshot.child("names").val()[1],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handThree
                    },
                    playerFour: {
                        userID: "CPU2",
                        hasLost: false,
                        isCPU: true,
                        cardCount: 7,
                        hand: handFour
                    }
                }
            });    
        } else if (numCPUs == 3){
            currentGameRef.update({
                gameInfo: {
                    finished: false,
                    deck: deck,
                    playDirection: "increasing",
                    currentPlayer: 1,
                    attackCount: 0,
                    topCard: topCard,
                    firstPlace: null,
                    secondPlace: null,
                    thirdPlace: null,
                    fourthPlace: null,
                    playerOne: {
                        userID: snapshot.child("names").val()[0],
                        hasLost: false,
                        isCPU: false,
                        cardCount: 7,
                        hand: handOne
                    },
                    playerTwo: {
                        userID: "CPU1",
                        hasLost: false,
                        isCPU: true,
                        cardCount: 7,
                        hand: handTwo
                    },
                    playerThree: {
                        userID: "CPU2",
                        hasLost: false,
                        isCPU: true,
                        cardCount: 7,
                        hand: handThree
                    },
                    playerFour: {
                        userID: "CPU3",
                        hasLost: false,
                        isCPU: true,
                        cardCount: 7,
                        hand: handFour
                    }
                }
            });   
        } else {
            console.log("Invalid number of CPUs");
        }
    });
}

function setUpPlayer(userID, gameID, res) {
    var ref = database.ref();
    ref.once("value").then(function (snapshot) {
        if (snapshot.child("users").child(userID).child("lobbyID").val() == gameID) {
            var nameOne = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("userID").val();
            var nameTwo = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("userID").val();
            var nameThree = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("userID").val();
            var nameFour = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("userID").val();
            var response = {
                status: 'success',
                message: 'Player Initialized',
                myPlayerID: null,
                username1: nameOne,
                username2: nameTwo,
                username3: nameThree,
                username4: nameFour
            }
            if (nameOne == userID) {
                response.myPlayerID = Number("1");
            } else if (nameTwo == userID) {
                response.myPlayerID = Number("2");
            } else if (nameThree == userID) {
                response.myPlayerID = Number("3");
            } else {
                response.myPlayerID = Number("4");
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            var response = {
                status: 'failure',
                error: 'Player Not In The Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

function searchForHand(userID, gameID, res) {
    var ref = database.ref();
    ref.once("value").then(function (snapshot) {
        if (snapshot.child("users").child(userID).child("lobbyID").val() == gameID) {
            var nameOne = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("userID").val();
            var nameTwo = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("userID").val();
            var nameThree = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("userID").val();
            var nameFour = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("userID").val();
            var response = {
                status: 'success',
                message: 'Hand',
                hand: null
            }
            if (nameOne == userID) {
                response.hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("hand").val();
            } else if (nameTwo == userID) {
                response.hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("hand").val();
            } else if (nameThree == userID) {
                response.hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("hand").val();
            } else {
                response.hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("hand").val();
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            var response = {
                status: 'failure',
                error: 'Player Not In The Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

function getBoard(userID, gameID, res) {
    var ref = database.ref();
    ref.once("value").then(function (snapshot) {
        if (snapshot.child("users").child(userID).child("lobbyID").val() == gameID) {
            if (snapshot.child("games").child(gameID).child("gameInfo").child("finished").val() == true) {
                var response = {
                    status: 'finished',
                    message: 'Game Finished'
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
            } else {
                var playerTurn = snapshot.child("games").child(gameID).child("gameInfo").child("currentPlayer").val();
                var response = {
                    status: 'success',
                    message: null,
                    topCard: snapshot.child("games").child(gameID).child("gameInfo").child("topCard").val(),
                    attackCount: snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val(),
                    player1CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("cardCount").val(),
                    player2CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("cardCount").val(),
                    player3CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("cardCount").val(),
                    player4CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("cardCount").val(),
                    playerTurnID: playerTurn
                }
                if (playerTurn == 1) {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("userID").val() +
                        "\'s turn";
                } else if (playerTurn == 2) {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("userID").val() +
                        "\'s turn";
                } else if (playerTurn == 3) {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("userID").val() +
                        "\'s turn";
                } else {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("userID").val() +
                        "\'s turn";
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
            }
        } else {
            var response = {
                status: 'failure',
                error: 'Player Not In The Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

function calculateResults(userID, gameID, res) {
    var ref = database.ref();
    ref.once("value").then(function (snapshot) {
        if (snapshot.child("users").child(userID).child("lobbyID").val() == gameID) {
            var placeOne = snapshot.child("games").child(gameID).child("gameInfo").child("firstPlace").val();
            var placeTwo = snapshot.child("games").child(gameID).child("gameInfo").child("secondPlace").val();
            var placeThree = snapshot.child("games").child(gameID).child("gameInfo").child("thirdPlace").val();
            var placeFour = snapshot.child("games").child(gameID).child("gameInfo").child("fourthPlace").val();
            var resultsString = "1st Place: " + placeOne + "<br>2nd Place: " + placeTwo + "<br>3rd Place: " + placeThree +
                "<br>4th Place: " + placeFour;
            var response = {
                status: null,
                results: resultsString
            }
            if (placeOne == userID) {
                response.status = "victory";
            } else {
                response.status = "defeat";
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            var response = {
                status: 'failure',
                error: 'Player Not In The Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

function playCardCheck(userID, gameID, playedCard, res) {
    var ref = database.ref();
    ref.once("value").then(function (snapshot) {
        if (snapshot.child("users").child(userID).child("lobbyID").val() == gameID) {
            var playerID;
            var playerTurn = snapshot.child("games").child(gameID).child("gameInfo").child("currentPlayer").val();
            var currentPlayerUserID;
            if (playerTurn == 1) {
                currentPlayerUserID = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("userID").val();
                playerID = "playerOne";
            } else if (playerTurn == 2) {
                currentPlayerUserID = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("userID").val();
                playerID = "playerTwo";
            } else if (playerTurn == 3) {
                currentPlayerUserID = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("userID").val();
                playerID = "playerThree";
            } else {
                currentPlayerUserID = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("userID").val();
                playerID = "playerFour";
            }
            var topCard = snapshot.child("games").child(gameID).child("gameInfo").child("topCard").val();
            var attackCount = snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val();
            if (userID == currentPlayerUserID) {
                if (playedCard != -1 && (gameLogic.validateCard(topCard, playedCard, attackCount))) {
                    playCard(snapshot, userID, playerID, playerTurn, gameID, playedCard, topCard, res);
                } else if (playedCard == -1){
                    drawCard(snapshot, playerTurn, playerID, gameID, res, userID);
                } else {
                    var response = {
                        status: 'failure',
                        error: 'You Can\'t Play That Card'
                    }
                    console.log(JSON.stringify(response));
                    res.send(response);
                }
            } else {
                var response = {
                    status: 'failure',
                    error: 'It\'s Not Your Turn'
                }
                console.log(JSON.stringify(response));
                res.send(response);
            }
        } else {
            var response = {
                status: 'failure',
                error: 'Player Not In The Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(response);
        }
    })
}

function playCard(snapshot, userID, playerID, playerTurn, gameID, playedCard, topCard, res){
    //Player Played A Card
    var deck = snapshot.child("games").child(gameID).child("gameInfo").child("deck").val();
    if (deck == null)
        deck = [];
    var hand = snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("hand").val();
    if (hand.length != 1) {
        var currentGameInfoRef = database.ref("games/" + gameID + "/gameInfo/");
        if (playedCard.number != 17) {
            gameLogic.putCardIntoDeck(deck, topCard);
            currentGameInfoRef.update({
                topCard: playedCard,
                deck: deck
            });
        } else {
            gameLogic.putCardIntoDeck(deck, playedCard);
            currentGameInfoRef.update({
                deck: deck
            });
            res.messageUpdate(gameID, userID + " passed");
        }
        var indexOfCard;
        for (var i = 0; i < hand.length; i++) {
            if (hand[i].color == playedCard.color && hand[i].number == playedCard.number) {
                indexOfCard = i;
            }
        }
        var currentPlayerRef = database.ref("games/" + gameID + "/gameInfo/" + playerID);
        hand.splice(indexOfCard, 1);
        currentPlayerRef.update({
            hand: hand,
            cardCount: hand.length
        })
        updateBasedOnCard(snapshot, playerTurn, userID, gameID, playedCard, deck, hand, res);
    } else {
        updatePlacings(snapshot, userID, gameID, playerTurn);
    }
    var response = {
        status: 'success',
        message: 'Playing'
    }
    res.updateGame(gameID);
    console.log(JSON.stringify(response));
    res.send(response);
}

function drawCard(snapshot, playerTurn, playerID, gameID, res, userID){
    //Player Has To Draw Card(s)
    var drawNumber = 1;
    var deck = snapshot.child("games").child(gameID).child("gameInfo").child("deck").val();
    if (deck == null) {
        deck = [];
    }
    var hand = snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("hand").val();
    if (snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val() != 0)
        drawNumber = snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val();
    console.log(snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("cardCount").val() + drawNumber);
    if (snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("cardCount").val() + drawNumber <= 16) {
        //Player Has To Draw Cards and Hand Doesn't have More than 16 Cards
        var deckNullCheck = snapshot.child("games").child(gameID).child("gameInfo").child("deck").val();
        if (deckNullCheck != null && snapshot.child("games").child(gameID).child("gameInfo").child("deck").val().length >= drawNumber) {
            gameLogic.drawCard(deck, hand, drawNumber);
        } else if (deckNullCheck != null && snapshot.child("games").child(gameID).child("gameInfo").child("deck").val().length >= drawNumber){
            gameLogic.drawCard(deck, hand, snapshot.child("games").child(gameID).child("gameInfo").child("deck").val().length);
        }
        var currentGameUserRef = database.ref("games/" + gameID + "/gameInfo/" + playerID);
        currentGameUserRef.update({
            hand: hand,
            cardCount: hand.length
        });
        var currentGameInfoRef = database.ref("games/" + gameID + "/gameInfo/");
        if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
            while (true) {
                playerTurn++;
                if (playerTurn > 4)
                    playerTurn = 1;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        } else {
            while (true) {
                playerTurn--;
                if (playerTurn < 1)
                    playerTurn = 4;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        }
        currentGameInfoRef.update({
            deck: deck,
            attackCount: 0,
            currentPlayer: playerTurn
            
        });
        if (deckNullCheck != null) {
            var response = {
                status: 'success',
                message: 'Playing'
            }
            res.messageUpdate(gameID, userID + " drew from the deck");
        } else {
            var response = {
                status: 'success',
                message: 'Deck Has No More Cards'
            }
            res.messageUpdate(gameID, "The deck is out of cards");
        }
        res.updateGame(gameID);
        console.log(JSON.stringify(response));
        res.send(response);
    } else {
        //Player Lost From Drawing Too Many Cards
        var deck = snapshot.child("games").child(gameID).child("gameInfo").child("deck").val();
        var hand = snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("hand").val();
        var currentGameInfoRef = database.ref("games/" + gameID + "/gameInfo/");
        gameLogic.putHandIntoDeck(deck, hand);
        var currentPlayerRef = database.ref("games/" + gameID + "/gameInfo/" + playerID);
        var emptyArray = [];
        currentPlayerRef.update({
            hasLost: true,
            cardCount: 0,
            hand: emptyArray
        });
        var loop = playerTurn;
        if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
            while (true) {
                playerTurn++;
                if (playerTurn > 4)
                    playerTurn = 1;
                if (playerTurn == loop) {
                    break;
                }
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        } else {
            while (true) {
                playerTurn--;
                if (playerTurn < 1)
                    playerTurn = 4;
                if (playerTurn == loop) {
                    break;
                }
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        }
        var placeToUpdate;
        if (snapshot.child("games").child(gameID).child("gameInfo").child("fourthPlace").val() == null) {
            placeToUpdate = "fourthPlace";
        } else if (snapshot.child("games").child(gameID).child("gameInfo").child("thirdPlace").val() == null) {
            placeToUpdate = "thirdPlace";
        } else {
            placeToUpdate = "secondPlace";
        }
        currentGameInfoRef.update({
            deck: deck,
            attackCount: 0,
            currentPlayer: playerTurn,
            [placeToUpdate]: userID

        });
        if (placeToUpdate == "secondPlace") {
            var remaining = snapshot.child("games").child(gameID).child(names).val();
            remaining.splice(snapshot.child("games").child(gameID).child("gameInfo").child("fourthPlace").val(), 1);
            remaining.splice(snapshot.child("games").child(gameID).child("gameInfo").child("thirdPlace").val(), 1);
            remaining.splice(userID, 1);
            currentGameInfoRef.update({
                finished: true,
                firstPlace: remaining[0]
            });
        }
        var response = {
            status: 'success',
            message: 'Lost'
        }
        res.updateGame(gameID);
        console.log(JSON.stringify(response));
        res.send(response);
    }
    setTimeout(makeCPUMoveCheck.bind(null, playerTurn, gameID, res), 1000);
}

function updateBasedOnCard(snapshot, playerTurn, userID, gameID, playedCard, deck, hand, socket) {
    var possibleSkip = [];
    var attackCount = snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val();
    var direction = snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val();
    var currentGameInfoRef = database.ref("games/" + gameID + "/gameInfo/");
    if ((playedCard.number >= 1 && playedCard.number <= 7) || playedCard.number == 10) {
        //No Additional Effects
    } else if (playedCard.number == 8) {
        //Skip
        if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
            var skipped = 0;
            while (skipped == 0 || skipped == 1) {
                playerTurn++;
                if (playerTurn > 4) {
                    playerTurn = 1;
                }
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    skipped++;
            }
        } else {
            var skipped = 0;
            while (skipped == 0 || skipped == 1) {
                playerTurn--;
                if (playerTurn < 1) {
                    playerTurn = 4;
                }
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    skipped++;
            }
        }
        currentGameInfoRef.update({
            currentPlayer: playerTurn

        });
    } else if (playedCard.number == 9) {
        //Reverse
        if (direction == "increasing") {
            direction = "decreasing";
        } else {
            direction = "increasing";
        }
        if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
            while (true) {
                playerTurn--;
                if (playerTurn < 1)
                    playerTurn = 4;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        } else {
            while (true) {
                playerTurn++;
                if (playerTurn > 4)
                    playerTurn = 1;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        }
        currentGameInfoRef.update({
            currentPlayer: playerTurn

        });
    } else if (playedCard.number == 11) {
        attackCount += 2;
    } else if (playedCard.number == 12) {
        attackCount += 3;
    } else if (playedCard.number == 13) {
        possibleSkip = specialBlueCard(snapshot, playerTurn, userID, gameID, playedCard, deck, hand);
        socket.updateHands(gameID, "Two cards were gifted");
    } else if (playedCard.number == 14) {
        attackCount = 0;
    } else if (playedCard.number == 15) {
        specialGreenCard(snapshot, playerTurn, userID, gameID, playedCard, deck, hand);
        socket.updateHands(gameID, "Green Cards were removed");
    } else if (playedCard.number == 16) {
        attackCount += 5;
    }
    if (attackCount > 12)
        attackCount = 12;
    currentGameInfoRef.update({
        attackCount: attackCount,
        playDirection: direction
    });
    if (playedCard.number != 8 && playedCard.number != 9 && playedCard.number != 7 && possibleSkip.length == 0) {
        //Can Update Turn Normally
        if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
            while (true) {
                playerTurn++;
                if (playerTurn > 4)
                    playerTurn = 1;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        } else {
            while (true) {
                playerTurn--;
                if (playerTurn < 1)
                    playerTurn = 4;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false)
                    break;
            }
        }
        currentGameInfoRef.update({
            currentPlayer: playerTurn
        });
    } else if (playedCard.number == 13 && possibleSkip.length != 0) {
        //Update Based on Special Draw 2 Card
        var loop = playerTurn;
        if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
            while (true) {
                playerTurn++;
                if (playerTurn > 4)
                    playerTurn = 1;
                if (playerTurn == loop)
                    break;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false && possibleSkip.indexOf(getPlayerNumberBasedOnID(playerTurn)) == -1)
                    break;
            }
        } else {
            while (true) {
                playerTurn--;
                if (playerTurn < 1)
                    playerTurn = 4;
                if (playerTurn == loop)
                    break;
                if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).
                    child("hasLost").val() == false && possibleSkip.indexOf(getPlayerNumberBasedOnID(playerTurn)) == -1)
                    break;
            }
        }
        currentGameInfoRef.update({
            currentPlayer: playerTurn
        });
    }
    setTimeout(makeCPUMoveCheck.bind(null, playerTurn, gameID, socket), 1000);
}

function updatePlacings(snapshot, userID, gameID, playerTurn) {
    var currentGameInfoRef = database.ref("games/" + gameID + "/gameInfo/");
    currentGameInfoRef.update({
        finished: true,
        firstPlace: userID
    });
    if (snapshot.child("games").child(gameID).child("gameInfo").child("playDirection").val() == "increasing") {
        var considerOrder = [];
        var loop = playerTurn;
        while (true) {
            playerTurn++;
            if (playerTurn > 4)
                playerTurn = 1;
            if (playerTurn == loop) {
                break;
            }
            if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).child("hasLost").val() == false)
                considerOrder.push(getPlayerNumberBasedOnID(playerTurn));
        }
        while (considerOrder.length > 0) {
            var min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[0]).child("cardCount").val();
            var minIndex = 0;
            for (var i = 0; i < considerOrder.length; i++) {
                if (snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("cardCount").val() < min) {
                    min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("cardCount").val();
                    minIndex = i;
                }
            }
            var number = (4 - considerOrder.length) + 1;
            currentGameInfoRef.update({
                [getPlaceBasedOnNumber(number)]: snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[minIndex]).
                    child("userID").val()
            });
            considerOrder.splice(minIndex, 1);
        }
    } else {
        var considerOrder = [];
        var loop = playerTurn;
        while (true) {
            playerTurn--;
            if (playerTurn < 1)
                playerTurn = 4;
            if (playerTurn == loop) {
                break;
            }
            if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).child("hasLost").val() == false)
                considerOrder.push(getPlayerNumberBasedOnID(playerTurn));
        }
        while (considerOrder.length > 0) {
            var min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[0]).child("cardCount").val();
            var minIndex = 0;
            for (var i = 0; i < considerOrder.length; i++) {
                if (snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("cardCount").val() < min) {
                    min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("cardCount").val();
                    minIndex = i;
                }
            }
            var number = (4 - considerOrder.length) + 1;
            currentGameInfoRef.update({
                [getPlaceBasedOnNumber(number)]: snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[minIndex]).
                    child("userID").val()
            });
            considerOrder.splice(minIndex, 1);
        }
    }
}

function specialGreenCard(snapshot, playerTurn, userID, gameID, playedCard, deck, hand) {
    var gameInfoRef = database.ref("games/" + gameID + "/gameInfo");
    var considerOrder = [];
    var loop = playerTurn;
    considerOrder.push(getPlayerNumberBasedOnID(playerTurn));
    var playerHands = [];
    playerHands.push(hand);
    while (true) {
        playerTurn++;
        if (playerTurn > 4)
            playerTurn = 1;
        if (playerTurn == loop) {
            break;
        }
        if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).child("hasLost").val() == false) {
            considerOrder.push(getPlayerNumberBasedOnID(playerTurn));
            playerHands.push(snapshot.child("games").child(gameID).child("gameInfo").
                child(getPlayerNumberBasedOnID(playerTurn)).child("hand").val());
        }
    }
    for (var i = 0; i < considerOrder.length; i++) {
        console.log(considerOrder[i] + ":");
        console.log("BEFORE:" + JSON.stringify(playerHands[i]) + "\n\n");
        var gamePlayerRef = database.ref("games/" + gameID + "/gameInfo/" + considerOrder[i]);
        var greenCards = [];
        for (var j = 0; j < playerHands[i].length; j++) {
            if (playerHands[i][j].color == "green") {
                greenCards.push(playerHands[i][j]);
                playerHands[i].splice(j, 1);
                j--;
            }
        }
        gameLogic.putCardsIntoDeck(deck, greenCards, greenCards.length);
        gameInfoRef.update({
            deck: deck
        })
        gamePlayerRef.update({
            hand: playerHands[i],
            cardCount: playerHands[i].length
        })
    }
    var someoneWon = false;
    for (var i = 0; i < considerOrder.length; i++) {
        if (playerHands[i].length == 0) {
            someoneWon = true;
        }
    }
    if (someoneWon == true) {
        gameInfoRef.update({
            finished: true
        });
        //Update Rankings
        var number = 1;
        while (considerOrder.length > 0) {
            var min = playerHands[0].length;
            var minIndex = 0;
            for (var i = 0; i < considerOrder.length; i++) {
                if (playerHands[i].length < min) {
                    min = playerHands[i].length;
                    minIndex = i;
                }
            }
            gameInfoRef.update({
                [getPlaceBasedOnNumber(number)]: snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[minIndex]).
                    child("userID").val()
            });
            considerOrder.splice(minIndex, 1);
            playerHands.splice(minIndex, 1);
            number++;
        }
    }
}

function specialBlueCard(snapshot, playerTurn, userID, gameID, playedCard, deck, hand) {
    var considerOrder = [];
    var loop = playerTurn;
    while (true) {
        playerTurn++;
        console.log("PlayerTurn: " + playerTurn);
        if (playerTurn > 4)
            playerTurn = 1;
        if (playerTurn == loop) {
            break;
        }
        if (snapshot.child("games").child(gameID).child("gameInfo").child(getPlayerNumberBasedOnID(playerTurn)).child("hasLost").val() == false)
            considerOrder.push(getPlayerNumberBasedOnID(playerTurn));
    }
    var current4Place = snapshot.child("games").child(gameID).child("gameInfo").child("fourthPlace").val();
    var current3Place = snapshot.child("games").child(gameID).child("gameInfo").child("thirdPlace").val();
    var current2Place = snapshot.child("games").child(gameID).child("gameInfo").child("secondPlace").val();
    var skip = [];
    for (var i = 0; i < considerOrder.length; i++) {
        var currentPlayerRef = database.ref("games/" + gameID + "/gameInfo/" + considerOrder[i]);
        var gameInfoRef = database.ref("games/" + gameID + "/gameInfo");
        var currentHand = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("hand").val();
        if (snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("cardCount").val() + 2 <= 16) {
            if (deck.length >= 2) {
                gameLogic.drawCard(deck, currentHand, 2);
            } else {
                gameLogic.drawCard(deck, currentHand, deck.length);
            }
            currentPlayerRef.update({
                hand: currentHand,
                cardCount: currentHand.length
            });
            gameInfoRef.update({
                deck: deck
            });
        } else {
            gameLogic.putHandIntoDeck(deck, currentHand);
            var emptyArray = [];
            currentPlayerRef.update({
                hasLost: true,
                cardCount: 0,
                hand: emptyArray
            });
            gameInfoRef.update({
                deck: deck
            });
            var placeToUpdate;
            if (current4Place == null) {
                placeToUpdate = "fourthPlace";
            } else if (current3Place == null) {
                placeToUpdate = "thirdPlace";
            } else {
                placeToUpdate = "secondPlace";
            }
            if (placeToUpdate == "secondPlace") {
                var remaining = snapshot.child("games").child(gameID).child(names).val();
                remaining.splice(current4Place, 1);
                remaining.splice(current3Place, 1);
                remaining.splice(userID, 1);
                gameInfoRef.update({
                    finished: true,
                    secondPlace: remaining[0],
                    firstPlace: userID
                });
            } else {
                gameInfoRef.update({
                    [placeToUpdate]: snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("userID").val()
                });
            }
            skip.push(considerOrder[i]);
        }
    }
    
    return skip;
}

function getPlaceBasedOnNumber(number) {
    if (number == 1) {
        return "firstPlace";
    } else if (number == 2) {
        return "secondPlace";
    } else if (number == 3) {
        return "thirdPlace";
    } else {
        return "fourthPlace";
    }
}

function getPlayerNumberBasedOnID(playerID) {
    if (playerID == 1) {
        return "playerOne";
    } else if (playerID == 2) {
        return "playerTwo";
    } else if (playerID == 3) {
        return"playerThree";
    } else {
        return "playerFour";
    }

}

function getPlayerBasedOnUserID(snapshot, userID, gameID) {
    if (snapshot.child(gameID).child("gameInfo").child("playerOne").child("userID").val() == userID) {
        return "playerOne";
    } else if (snapshot.child(gameID).child("gameInfo").child("playerTwo").child("userID").val() == userID) {
        return "playerTwo";
    } else if (snapshot.child(gameID).child("gameInfo").child("playerThree").child("userID").val() == userID) {
        return "playerThree";
    } else {
        return "playerFour";
    }
}

function getPlayerIDBasedOnName(player) {
    if (player == "playerOne") {
        return 1;
    } else if (player == "playerTwo") {
        return 2;
    } else if (player == "playerThree") {
        return 3;
    } else {
        return 4;
    }
}

//checks if cpu and schedules cpu turn in one second
function makeCPUMoveCheck (playerTurn, gameID, socketWrapper){
    var currentGameRef = database.ref();
    currentGameRef.once("value").then(function (snapshot) {
        var isCPU = false;
        if (playerTurn == 1){
            isCPU = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("isCPU").val();
        } else if (playerTurn == 2){
            isCPU = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("isCPU").val();
        } else if (playerTurn == 3){
            isCPU = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("isCPU").val();
        } else if (playerTurn == 4){
            isCPU = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("isCPU").val();
        } else {
            console.log("Give player ID to CPU method rather than userID");
        }
        if (isCPU){
            var topCard = snapshot.child("games").child(gameID).child("gameInfo").child("topCard").val();
            var attackCount = snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val();
            var hand;
            var userID;
            if (playerTurn == 1){
                userID = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("userID").val();
                hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("hand").val();
            } else if (playerTurn == 2){
                userID = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("userID").val();
                hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("hand").val();
            } else if (playerTurn == 3){
                userID = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("userID").val();
                hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("hand").val();
            } else if (playerTurn == 4){
                userID = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("userID").val();
                hand = snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("hand").val();
            } else {
                console.log("Give player ID to CPU method rather than userID");
            }
            socketWrapper.route = null;
            makeCPUMoveInternal(snapshot, hand, topCard, attackCount, playerTurn, userID, gameID, socketWrapper);
        }
    });
}

//makes the cpu's move
function makeCPUMoveInternal(snapshot, hand, topCard, attackCount, playerTurn, userID, gameID, socketWrapper){
    var validHand = calculateValidCards(hand, topCard, attackCount);
    var playerID = getPlayerNumberBasedOnID(playerTurn);
    var card;
    if (validHand.length == 0){
        card = -1;
        drawCard(snapshot, playerTurn, playerID, gameID, socketWrapper, userID);
    } else {
        card = calculateBestMove(hand, validHand);
        if ((card.number == 10) || (card.number == 15)){
            //choose most common color in hand for wild cards
            card.setColor = countColors(hand)[0].color;
        }
        playCard(snapshot, userID, playerID, playerTurn, gameID, card, topCard, socketWrapper);
    } /*else {
        card = makeRandomMove(validHand);
    }*/
    console.log(userID + " played " + JSON.stringify(card));
}

function calculateValidCards(hand, topCard, attackCount){
    var validCards = [];
    var i = 0;
    for (i = 0; i < hand.length; i++){
        if(gameLogic.validateCard(topCard, hand[i], attackCount)){
            validCards.push(hand[i]);
        }
    }
    return validCards;
}

//prioritizes common colors in hand and non special effects cards
//but probably shouldn't play green cards cause they're likely to go away
function calculateBestMove(hand, validHand){
    var colorFrequencies = countColors(hand);
    var i = 0;
    var j = 0;
    var numberCards = [];
    var lowSpecialCards = [];
    var highSpecialCards = [];
    for (i = 0; i < validHand.length; i++){
        if (validHand[i].number <= 6){
            numberCards.push(validHand[i]);
        } else if (validHand[i].number <= 10){
            lowSpecialCards.push(validHand[i]);
        } else {
            highSpecialCards.push(validHand[i]);
        }
    }
    //priority 1 - numbers
        //break number with most common color
    for (j = 0; j < colorFrequencies.length; j++){
        for (i = 0; i < numberCards.length; i++){
            if (numberCards[i].color == colorFrequencies[j].color){
                return numberCards[i];
            }
        }
    }
    //priority 2 - not attack or special cards
        //break with most common color
    for (j = 0; j < colorFrequencies.length; j++){
        for (i = 0; i < lowSpecialCards.length; i++){
            if (lowSpecialCards[i].color == colorFrequencies[j].color){
                return lowSpecialCards[i];
            }
        }
    }
    //priority 3 anything you can play
        //break with most common color
    for (j = 0; j < colorFrequencies.length; j++){
        for (i = 0; i < highSpecialCards.length; i++){
            if (highSpecialCards[i].color == colorFrequencies[j].color){
                return highSpecialCards[i];
            }
        }
    }
    return validHand[0]; //the purple card will never match color
}

//makes a move randomly
function makeRandomMove(validHand){
    var choice = Math.floor(Math.random() * validHand.length);
    return validHand[choice];
}

//returns a list of the colors in order of count
function countColors(hand){
    var i = 0;
    var counts = [
    {color: "red", count: 0},
    {color: "yellow", count: 0},
    {color: "green", count: 0},    
    {color: "blue", count: 0}        
    ]
    for (i = 0; i < hand.length; i++){
        if (hand[i].color == "red"){
            counts[0].count++;
        } else if (hand[i].color == "yellow"){
            counts[1].count++;
        } else if (hand[i].color == "green"){
            counts[2].count++;
        } else if (hand[i].color == "blue"){
            counts[3].count++;
        }
    }
    counts.sort(function(a,b){
        return -(a.count - b.count);
    });
    return counts;
}

app.use(express.static('public'))

app.route('/profiles/:userId').get(function(req, res){
    console.log(req.params['userId']);
});

//User Clicked Register Button
app.post('/register', parser, function(req, res){
    console.log(req.body);
    var username = req.body.username;
    var password = req.body.password;
    if(typeof username !== 'undefined' &&  username !== null && typeof password !== 'undefined' && password !== null)
        registerCheck(username, password, res);
});

//User Clicked Sign In Button
app.post('/signIn', parser, function (req, res) {
    console.log(req.body);
    var username = req.body.username;
    var password = req.body.password;
    if (typeof username !== 'undefined' && username !== null && typeof password !== 'undefined' && password !== null)
        signInCheck(username, password, res);
});

//Display List of Lobbies
app.post('/lobby/info', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    lobbyInfoCheck(userID, res);
});

app.post('/game/init', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    var gameID = req.body.gameID;
    setUpPlayer(userID, gameID, res);
});

app.post('/game/hand', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    var gameID = req.body.gameID;
    searchForHand(userID, gameID, res);
});

app.post('/game/board', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    var gameID = req.body.gameID;
    getBoard(userID, gameID, res);
});

app.post('/game/results', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    var gameID = req.body.gameID;
    calculateResults(userID, gameID, res);
});

app.all("/", (req, res) => {
    res.redirect(301, "/login.html");
});

//Start Server
server.listen(8000, function(){
    console.log("Server Started"); 
});

//all socket io calls must originate within the following block of code

io.on('connection', function(socket){
    
    //I made this so I don't have to change so much code
    class SocketWrapper {
        constructor(socket, route){
            this.socket = socket;
            this.route = route;
        }
        
        //this takes the place of the response send method
        send(data){
            if (this.route != null){
                this.socket.emit(this.route, data);
            }
        }
        
        //these two methods are also included for convenience
        updateAllLobbies(){
            socket.broadcast.emit("Lobby Update"); //broadcast sends to all but calling socket
            this.socket.emit("Lobby Update"); //also send to calling socket
        }
        updateGame(gameID){
            socket.broadcast.emit("GameUpdate", gameID);
            this.socket.emit("GameUpdate", gameID);
        }
        updateHands(gameID, message){
            var data = {
                gameID: gameID,
                message: message
            }
            socket.broadcast.emit("GameUpdateHand", data);
            this.socket.emit("GameUpdateHand", data);
        }
        messageUpdate(gameID, message){
            var data = {
                gameID: gameID,
                message: message
            }
            socket.broadcast.emit("MessageUpdate", data);
            this.socket.emit("MessageUpdate", data);
        }
        
        start(gameID){
            socket.broadcast.emit("Start Game", gameID);
            this.socket.emit("Start Game", gameID);
        }
    }
        
    //User Asking To Join A Lobby
    socket.on('/lobby/join', function (data) {
        console.log(data);
        var gameID = data.gameID;
        var userID = data.userID;
        lobbyJoinCheck(userID, gameID, new SocketWrapper(socket, '/lobby/join'));
    });

    //User Asking To Leave A Lobby
    socket.on('/lobby/leave', function (data) {
        console.log(data);
        var gameID = data.gameID;
        var userID = data.userID;
        lobbyLeaveCheck(userID, gameID, new SocketWrapper(socket, '/lobby/leave'));
    });
    
    socket.on('/lobby/kick', function (data) {
        console.log(data);
        var gameID = data.gameID;
        var userID = data.userID;
        lobbyLeaveCheck(userID, gameID, new SocketWrapper(socket, '/lobby/kick'));
    });

    //Party Leader User Asking To Start Game
    socket.on('/lobby/startgame', function (data) {
        console.log(data);
        var gameID = data.gameID;
        var userID = data.userID;
        startGameCheck(userID, gameID, new SocketWrapper(socket, '/lobby/startgame'));
    });

    socket.on('/lobby/current', function(data) {
        console.log(data);
        var userID = data.userID;
        getCurrentLobby(userID, new SocketWrapper(socket, '/lobby/current'));
    });

    //User Clicked Create Lobby Button
    socket.on('/lobby/create', function(data){
        console.log(data);
        var userID = data.userID;
        createLobbyCheck(userID, new SocketWrapper(socket, '/lobby/create'));
    });

    
    //User Clicked Sign Out Button
    socket.on('/signOut', function (data) {
        console.log(data);
        var userID = data.userID;
        signOutCheck(userID, new SocketWrapper(socket, '/signOut'));
    });

    socket.on('/game/play', function (data){
        console.log(data);
        var userID = data.userID;
        var gameID = data.gameID;
        var playedCard = data.card;
        delete playedCard.$$hashKey;
        playCardCheck(userID, gameID, playedCard, new SocketWrapper(socket, '/game/play'));
    });

    socket.on('disconnect', function(){
        console.log(socket.id + " disconnected");
       //can store the sockets (they're just numbers) when they call register if you want to make them auto lose when they disconnect 
    });
});