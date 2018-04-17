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
//var gameLogic = require('./gameLogic.js');
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
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            var response = {
                status: 'failure',
                error: 'User Does Not Exist'
            };
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
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
                if (snapshot.child(gameID).exists() && snapshot.child(gameID).child("names").val().length <= 3) {
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
                            message: 'User Joined Lobby'
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
    userRef = database.ref("users");
    usersRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'true') {
            gamesRef = database.ref("games");
            gamesRef.once(value).then(function (snapshot) {
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
                    res.updateAllLobbies();
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

//Display List of Lobbies
app.post('/lobby/info', parser, function (req, res) {
    console.log(req.body);
    var userID = req.body.userID;
    lobbyInfoCheck(userID, res);
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
            //this.socket.emit("GameUpdate"); //gameUpdate method is already called on response in client so this isn't needed
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
        startGameCheck(userID, gameID, new SocketWrapper(socket, '/lobby/current'));
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