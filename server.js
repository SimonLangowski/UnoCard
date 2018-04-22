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

function startGameCheck(userID, gameID, res) {
    var userRef = database.ref("users");
    userRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            var gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                if (snapshot.child(gameID).child("partyLeader").val() == userID &&
                    snapshot.child(gameID).child("names").val().length == 4) {
                    var currentGameRef = database.ref("games/" + gameID);
                    currentGameRef.update({
                        isStarted: true
                    });
                    var response = {
                        status: 'success',
                        message: 'Game Start'
                    }
                    //res.updateAllLobbies();
                    setUpNewGame(gameID);
                    res.start(gameID);
                    console.log(JSON.stringify(response));
                    res.send(response);
                } else if (snapshot.child(gameID).child("partyLeader").val() == userID &&
                    snapshot.child(gameID).child("names").val().length != 4) {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Have 4 Players'
                    }
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

function setUpNewGame(gameID) {
    var currentGameRef = database.ref("games/" + gameID);
    currentGameRef.once("value").then(function (snapshot) {
        var deck = gameLogic.getNewDeck();
        gameLogic.shuffle(deck);
        var handOne = [];
        gameLogic.drawCard(deck, handOne, 7);
        var handTwo = [];
        gameLogic.drawCard(deck, handTwo, 7);
        var handThree = [];
        gameLogic.drawCard(deck, handThree, 7);
        var handFour = [];
        gameLogic.drawCard(deck, handFour, 7);
        var topCard = deck[0];
        deck.slice(0, 1);
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
                var response = {
                    status: 'success',
                    message: null,
                    topCard: snapshot.child("games").child(gameID).child("gameInfo").child("topCard").val(),
                    attackCount: snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val(),
                    player1CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("cardCount").val(),
                    player2CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("cardCount").val(),
                    player3CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("cardCount").val(),
                    player4CardCount: snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("cardCount").val(),
                }
                var playerTurn = snapshot.child("games").child(gameID).child("gameInfo").child("currentPlayer").val();
                if (playerTurn == 1) {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerOne").child("userID").val() +
                        " turn";
                } else if (playerTurn == 2) {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerTwo").child("userID").val() +
                        " turn";
                } else if (playerTurn == 3) {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerThree").child("userID").val() +
                        " turn";
                } else {
                    response.message = "It's " + snapshot.child("games").child(gameID).child("gameInfo").child("playerFour").child("userID").val() +
                        " turn";
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
            var resultsString = "1st Place: " + placeOne + "\n2nd Place: " + placeTwo + "\n3rd Place: " + placeThree +
                "\n4th Place: " + placeFour;
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
            if (userID == currentPlayerUserID) {
                if (playedCard != -1 && (topCard == null || gameLogic.validateCard(topCard, playedCard))) {
                    //Player Played A Card
                    var deck = snapshot.child("games").child(gameID).child("gameInfo").child("deck").val();
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
                        }
                        var indexOfCard;
                        for (i = 0; i < hand.length; i++) {
                            if (hand[i].color == playedCard.color && hand[i].number == playedCard.number) {
                                indexOfCard = i;
                            }
                        }
                        var currentPlayerRef = database.ref("games/" + gameID + "/gameInfo/" + playerID);
                        hand.splice(indexOfCard, 1);
                        currentPlayerRef.update({
                            hand: hand
                        })
                        updateBasedOnCard(userID, gameID, playedCard);
                        //Update Next Players Turn
                        // update deck, hand, attackCount, etc
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
                } else if (playedCard == -1) {
                    //Player Has To Draw Card(s)
                    var drawNumber = 1;
                    var deck = snapshot.child("games").child(gameID).child("gameInfo").child("deck").val();
                    var hand = snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("hand").val();
                    if (snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val() != 0)
                        drawNumber = snapshot.child("games").child(gameID).child("gameInfo").child("attackCount").val();
                    if (snapshot.child("games").child(gameID).child("gameInfo").child(playerID).child("cardCount").val() + drawNumber <= 16) {
                        //Player Has To Draw Cards and Hand Doesn't have More than 16 Cards
                        if (snapshot.child("games").child(gameID).child("gameInfo").child("deck").val().length >= drawNumber) {
                            gameLogic.drawCard(deck, hand, drawNumber);
                        } else {
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
                        var response = {
                            status: 'success',
                            message: 'Playing'
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
                        currentPlayerRef.update({
                            hasLost: true,
                            cardCount: 0,
                            hand: null
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

function updateBasedOnCard(userID, gameID, playedCard) {

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
            var min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[0]).child("handCount").val();
            var minIndex = 0;
            for (i = 0; i < considerOrder.length; i++) {
                if (snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("handCount").val() < min) {
                    min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("handCount").val();
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
            var min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[0]).child("handCount").val();
            var minIndex = 0;
            for (i = 0; i < considerOrder.length; i++) {
                if (snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("handCount").val() < min) {
                    min = snapshot.child("games").child(gameID).child("gameInfo").child(considerOrder[i]).child("handCount").val();
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

function getPlaceBasedOnNumber(number) {
    if (number == 2) {
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
            this.socket.emit(this.route, data);
        }
        
        //these two methods are also included for convenience
        updateAllLobbies(){
            socket.broadcast.emit("Lobby Update"); //broadcast sends to all but calling socket
            this.socket.emit("Lobby Update"); //also send to calling socket
        }
        updateGame(gameID){
            socket.in(String(gameID)).emit("GameUpdate");
            this.socket.emit("GameUpdate"); //gameUpdate method is already called on response in client so this isn't needed
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
        playCardCheck(userID, gameID, playedCard, new SocketWrapper(socket, '/game/play'));
    });

    socket.on('Register', function(data){
        socket.join(String(data.gameID));
        console.log(socket.id + " joined " + data.gameID);
        //socket io makes sockets leave rooms automatically upon disconnect.  Game page will call this upon page load
    });

    socket.on('disconnect', function(){
        console.log(socket.id + " disconnected");
       //can store the sockets (they're just numbers) when they call register if you want to make them auto lose when they disconnect 
    });
});