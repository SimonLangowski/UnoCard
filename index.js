//dependencies
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
//get app
const app = express();
var parser = bodyParser.json();

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
                    password: passwd
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
        if (snapshot.child(usrname).exists() && snapshot.child(usrname).child("password").val() == passwd) {
            //User Exists
            var response = {
                status: 'success',
                message: 'User Signed In',
                userID: usrname
            }
            console.log(JSON.stringify(response));
            res.send(JSON.stringify(response));
        } else {
            //User Doesn't Exist
            var response = {
                status: 'failure',
                error: 'Username or Password Didn\'t Match'
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


app.post('/register', parser, function(req, res){
    console.log(req.body);
    var username = req.body.username;
    var password = req.body.password;
<<<<<<< HEAD
    registerCheck(username, password, res);
});

app.post('/signIn', parser, function (req, res) {
    console.log(req.body);
    var username = req.body.username;
    var password = req.body.password;
    signInCheck(username, password, res);
});

app.all("/", (req, res) => {
    res.redirect(301, "/login.html");
});

//start server
app.listen(8000, function(){
    console.log("Server started"); 
});
