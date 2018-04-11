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
app.use(bodyParser.json());
/*To Simon: Still Needed?
var connection = mysql.createConnection({
    
});*/ //TODO finish

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



app.route('/register').post(function(req, res){
    var username = req.body.username;
    var password = res.body.password;
    //check for username
    if (checkUsername(username)){
        
    }
    console.log(username);
    console.log(password);
    //
    var test = {
        status : success,
        userId : 12490,
        userAuth : someHashThingy,
        error : none
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
