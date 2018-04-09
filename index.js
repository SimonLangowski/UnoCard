//dependencies
const express = require('express');

//get app
const app = express();

app.use(express.static('public'))

app.route('/profiles/:userId').get(function(req, res){
    console.log(req.params['userId']);
});

//start server
app.listen(8000, function(){
    console.log("Server started"); 
});
