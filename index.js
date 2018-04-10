//dependencies
const express = require('express');
var bodyParser = require('body-parser');
//get app
const app = express();
app.use(bodyParser.json());
/*var connection = mysql.createConnection({
    
});*/ //TODO finish

function queryDatabase(query){

}

function checkUsername(username){
    
}

//remove non alphanumeric characters from usernames for safe SQL parsing
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
