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

//var gameLogic = require('./gameLogic.js');

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
            usersRef.update({
                [usrname]: {
                    password: passwd,
                    signedIn: 'false',
                    inLobby: 'false'
                }
            });
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
        if (snapshot.child(usrname).exists() && snapshot.child(usrname).child("password").val() == passwd &&
            snapshot.child(usrname).child("signedIn").val() == 'false') {
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
        } else if (snapshot.child(usrname).exists() && snapshot.child(usrname).child("password").val() == passwd &&
            snapshot.child(usrname).child("signedIn").val() == 'true') {
            //User Already Signed In
            var response = {
                status: 'failure',
                error: 'User Already Signed In'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            //Username or Password Didnt Match
            var response = {
                status: 'failure',
                error: 'Username or Password Didn\'t Match'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

//Resolve Sign Out Button Click
function signOutCheck(userID, res) {
    var usersRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true') {
            var currentUserRef = database.ref("users/" + userID);
            currentUserRef.update({
                signedIn: 'false'
            });
            var response = {
                status: 'success',
                message: 'User Signed Out'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            var response = {
                status: 'failure',
                error: 'User Not Signed In'
            };
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

//Resolve Create Lobby Click
function createLobbyCheck(userID, res) {
    var usersRef = database.ref("users");
    userRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            //Create New Lobby
            var currentUserRef = database.ref("users/" + userID);
            currentUserRef.update({
                inLobby: 'true'
            })
            var gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                var generatedID = createGameID();
                while (snapshot.child(generatedID).exists() == true) {
                    generatedID = createdGameID();
                }
                var players = [];
                players.push(userID);
                gamesRef.update({
                    [generatedID]: {
                        names: players,
                        gameID: generatedID,
                        isStarted: false,
                        partyLeader: userID,
                        stateID: 1
                    }
                });
                var response = {
                    status: 'success',
                    message: 'Lobby Created',
                    gameID: Number(generatedID)
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
            });
        } else {
            var response = {
                status: 'failure',
                error: 'You Already Made A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
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
                    var childData = childSnapshot.val();
                    var lobby = {
                        names: childData.child("names").val(),
                        gameID: Number(childData.child("gameID").val()),
                        isStarted: childData.child("isStarted").val(),
                        partyLeader: childData.child("partyLeader").val(),
                        stateID: Number(childData.child("stateID").val())
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
                if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().length <= 3) {
                    var currentUserRef = database.ref("users/" + userID);
                    var currentGameRef = database.ref("games/" + gameID);
                    currentUserRef.update({
                        inLobby: 'true'
                    });
                    var players = currentGameRef.child("players").val();
                    players.push(userID);
                    currentGameRef.update({
                        stateID: currentUserRef.child("stateID").val() + 1,
                        names: players
                    });
                    var response = {
                        status: 'success',
                        message: 'User Joined Lobby'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                } else if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().length >= 4) {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Is Full'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                } else {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Exist'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                }
            });
        } else if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            var response = {
                status: 'failure',
                error: 'User Already In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
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

function lobbyLeaveCheck(userID, gameID, res) {
    var usersRef = database.ref("users");
    userRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            gamesRef = database.ref("games");
            gamesRef.once("value").then(function (snapshot) {
                if (gamesRef.child(gameID).exists() && gamesRef.child(gameID).child("players").val().indexOf(userID) > -1) {
                    var currentUserRef = database.ref("users/" + userID);
                    var currentGameRef = database.ref("games/" + gameID);
                    currentUserRef.update({
                        inLobby: 'false'
                    });
                    var players = currentGameRef.child("names").val();
                    players = players.splice(players.indexOf(userID), 1);
                    currentGameRef.update({
                        stateID: currentGameRef.child("stateID").val() - 1,
                        names: players
                    });
                    var response = {
                        status: 'success',
                        message: 'User Left Lobby'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                } else if (gamesRef.child(gameID).exists() && gamesRef.child(gameID).child("players").val().indexOf(userID) < 0) {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Contain This User'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                } else {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Exist'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                }
            });
        } else if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            var response = {
                status: 'failure',
                error: 'User Not In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
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

function startGameCheck(userID, gameID, res) {
    userRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            gamesRef = database.ref("games");
            gamesRef.once(value).then(function (snapshot) {
                if (gamesRef.child(gameID).child("partyLeader").val() == userID &&
                    gamesRef.child(gameID).child("names").val().length == 4) {
                    var currentGameRef = database.ref("games/" + gameID);
                    currentGameRef.update({
                        isStarted: true,
                        stateID: currentGameRef.child("stateId").val() + 1
                    });
                    var response = {
                        status: 'success',
                        message: 'Game Start'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                } else if (gamesRef.child(gameID).child("partyLeader").val() == userID &&
                    gamesRef.child(gameID).child("names").val().length != 4) {
                    var response = {
                        status: 'failure',
                        error: 'Lobby Does Not Have 4 Players'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                } else {
                    var response = {
                        status: 'failure',
                        error: 'User Not The Party Leader'
                    }
                    console.log(JSON.stringify(response));
                    res.send(JSON.stringify(response));
                }
            })
        } else if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') {
            var response = {
                status: 'failure',
                error: 'User Not In A Lobby'
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
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

//User Clicked Sign Out Button
app.post('/signOut', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    signOutCheck(userID, res);
});

//User Clicked Create Lobby Button
app.post('/lobby/create', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    createLobbyCheck(userID, res);
});

//Display List of Lobbies
app.post('/lobby/info', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    lobbyInfoCheck(userID, res);
});

//User Asking To Join A Lobby
app.post('/lobby/join', parser, function (req, res) {
    console.log(req.body);
    var gameID = req.body.gameID;
    var userID = req.body.userID;
    lobbyJoinCheck(userID, gameID, res);
});

//User Asking To Leave A Lobby
app.post('/lobby/leave', parser, function (req, res) {
    console.log(req.body);
    var gameID = req.body.gameID;
    var userID = req.body.userID;
    lobbyLeaveCheck(userID, gameID, res);
});

//Party Leader User Asking To Start Game
app.post('/lobby/startgame', parser, function (req, res) {
    console.log(req.body);
    var gameID = req.body.gameID;
    var userID = req.body.userID;
    startGameCheck(userID, gameID, res);
});

app.all("/", (req, res) => {
    res.redirect(301, "/login.html");
});

//Start Server
app.listen(8000, function(){
    console.log("Server Started"); 
});