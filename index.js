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
                    inLobby: 'false'
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
            if (snapshot.child(usrname).child("signedIn").val() == 'true'){
                //User Already Signed In
                var response = {
                    status: 'failure',
                    error: 'User Already Signed In'
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
                return;
            }
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
                error: 'User Doesn\'t Exist or Not Signed In'
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
                gamesRef.update({
                    [generatedID]: {
                        //TODO: LOBBY ELEMENTS
                    }
                });
                var response = {
                    status: 'success',
                    message: 'Game Created',
                    gameID: Number(generatedID)
                }
                console.log(JSON.stringify(response));
                res.send(JSON.stringify(response));
            });
        } //TODO: ELSE CREATE LOBBY FAILED
    });
}

function createGameID() {
    var gameID = "";
    var possibleChars = "123456789";
    for (var i = 0; i < 5; i++) {
        gameID += possibleChars.charAt(Math.floor(Math.random() * Math.floor(possibleChars.length)));
    }
    console.log("GameID: ", gameID);
    return gameID;
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

app.post('/lobby/info', parser, function (req, res) {
});

app.post('/lobby/join', parser, function (req, res) {
});

app.post('/lobby/leave', parser, function (req, res) {
});

app.all("/", (req, res) => {
    res.redirect(301, "/login.html");
});

//Start Server
app.listen(8000, function(){
    console.log("Server Started"); 
});