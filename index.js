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

function checkUsername(username) {
    var usersRef = database.ref("users");
    ref.once("value").then(function (snapshot) {
        return snapshot.child(username).exists();
    }
    
}

function registerUser(username, password) {
    var usersRef = database.ref("users");
    usersRef.set({
        username: {
            password: password
        }
    });
}

/*remove non alphanumeric characters from usernames for safe SQL parsing
function cleanString(string){
    return string.replace(/[^a-zA-z0-9]/, '')
}*/


app.use(express.static('public'))

app.route('/profiles/:userId').get(function(req, res){
    console.log(req.params['userId']);
});


app.post('/register', parser, function(req, res){
    console.log(req.body);
    var username = req.body.username;
    var password = req.body.password;
    //check for username
    if (checkUsername(username)) {
        registerUser(username, password);
    }
    console.log(username);
    console.log(password);
    //
    var test = {
        status : 'failure',
        userId : 12490,
        userAuth : 'someHashThingy',
        error : 'test'
    }
    res.send(JSON.stringify(test));
});

app.all("/", (req, res) => {
    res.redirect(301, "/login.html");
});

//start server
app.listen(8000, function(){
    console.log("Server started"); 
});
