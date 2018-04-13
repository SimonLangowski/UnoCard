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
            var usersRef = database.ref("users");
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
                error: 'User Doesn\'t Exist or Not Signed In'
            };
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        }
    });
}

//Resolve Create Game Click
function createLobbyCheck(userID, res) {
    /*var usersRef = database.ref("users");
    userRef.once("value").then(function (snapshot) {
        if (snapshot.child(userID).exists() && snapshot.child(userID).child("signedIn").val() == 'true' &&
            snapshot.child(userID).child("inLobby").val() == 'false') { 
            var currentUserRef = database.ref("users/" + userID);
            currentUserRef.update({
                inLobby: 'true'
            })
            var response = {
                status: 'success',
                message: 'Game Created'
            }
        }
    });*/
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
    var userId = req.body.userID;
    signOutCheck(userId, res);
});

//User Clicked Create Game Button
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