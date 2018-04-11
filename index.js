//dependencies
const express = require('express');
var bodyParser = require('body-parser');
//Firebase Database
const admin = require('firebase-admin');
var serviceAccount = require('./unocard-4576b-firebase-adminsdk-zypmv-763eaf0cfb.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});
var database = admin.firestore();
//get app
const app = express();
var parser = bodyParser.json();

function queryDatabase(query){

}

function checkUsername(username){
    
}

//remove non alphanumeric characters from usernames for safe SQL parsing (To Simon: Sill Needed?)
function cleanString(string){
    return string.replace(/[^a-zA-z0-9]/, '')
}


app.use(express.static('public'))

app.route('/profiles/:userId').get(function(req, res){
    console.log(req.params['userId']);
});



app.post('/register', parser, function(req, res){
    console.log(req.body);
    var username = req.body.username;
    var password = req.body.password;
    //check for username
    if (checkUsername(username)){
        
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
