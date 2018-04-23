var app = angular.module('gameApp', [])
.controller('gameController', ['$scope', '$http', 'socket', function($scope, $http, socket){
    
    function Card(){
        this.url = '/drawingResources/cardFaceDown.png';
    }
    
    function Table(){
        //the first seven cards will start with the face down image, until the server deals them to us
        this.topCard = new Card();
        this.hand = [[]];
        this.leftCount = 7;
        this.leftName = "Loading..";
        this.rightCount = 7;
        this.rightName = "Loading..";
        this.acrossCount = 7;
        this.acrossName = "Loading..";
        this.myCount = 7;
        this.myName = "Loading..";
        this.myPlayerId = 1;
        this.turnPlayerId = 0;
        this.attackCount = 0;
    }
    
    $scope.data = {};
    $scope.data.table = new Table();
   
    $scope.auth = {};
    $scope.auth.userID = "Loading..";
    $scope.auth.gameID = 0;
    
    $scope.message = "Loading...";
    $scope.message2 = "";
    $scope.message2TurnsRemaining = 0;
    
    $scope.init = function(){
        $scope.auth.userID = $scope.getCookie("USER_ID");
        $scope.auth.gameID = $scope.getCookie("GAME_ID");
        var auth = {userID: $scope.auth.userID,
            gameID: $scope.auth.gameID};
        $http.post('/game/init', auth)
        .then(function(response){
            $scope.data.table.myPlayerId = response.data.myPlayerID;
            $scope.calculateRotationNames(response.data.username1, response.data.username2, response.data.username3, response.data.username4);
            $scope.getHand();
            $scope.getBoard();
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    // https://stackoverflow.com/questions/10730362/get-cookie-by-name
    $scope.getCookie = function(name){
        match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    }
    
    
    
    $scope.calculateRotationNames = function(p1,p2,p3,p4){
        if ($scope.data.table.myPlayerId == 1){
            $scope.data.table.leftName = p4;
            $scope.data.table.myName = p1;
            $scope.data.table.rightName = p2;
            $scope.data.table.acrossName = p3;
        } else if ($scope.data.table.myPlayerId == 2){
            $scope.data.table.leftName = p1;
            $scope.data.table.myName = p2;
            $scope.data.table.rightName = p3;
            $scope.data.table.acrossName = p4;
        } else if ($scope.data.table.myPlayerId == 3){
            $scope.data.table.leftName = p2;
            $scope.data.table.myName = p3;
            $scope.data.table.rightName = p4;
            $scope.data.table.acrossName = p1;
        } else if ($scope.data.table.myPlayerId == 4){
            $scope.data.table.leftName = p3;
            $scope.data.table.myName = p4;
            $scope.data.table.rightName = p1;
            $scope.data.table.acrossName = p2;
        } else {
            console.log("Error: myPlayerId is " + $scope.data.table.myPlayerId);
        }
    };
    
    $scope.calculateRotation = function(p1,p2,p3,p4){
        if ($scope.data.table.myPlayerId == 1){
            $scope.data.table.leftCount = p4;
            $scope.data.table.myCount = p1;
            $scope.data.table.rightCount = p2;
            $scope.data.table.acrossCount = p3;
        } else if ($scope.data.table.myPlayerId == 2){
            $scope.data.table.leftCount = p1;
            $scope.data.table.myCount = p2;
            $scope.data.table.rightCount = p3;
            $scope.data.table.acrossCount = p4;
        } else if ($scope.data.table.myPlayerId == 3){
            $scope.data.table.leftCount = p2;
            $scope.data.table.myCount = p3;
            $scope.data.table.rightCount = p4;
            $scope.data.table.acrossCount = p1;
        } else if ($scope.data.table.myPlayerId == 4){
            $scope.data.table.leftCount = p3;
            $scope.data.table.myCount = p4;
            $scope.data.table.rightCount = p1;
            $scope.data.table.acrossCount = p2;
        } else {
            console.log("Error: myPlayerId is " + $scope.data.table.myPlayerId);
        }
        
    };
    
    $scope.calculateHandRows = function(hand){
        var width = window.innerWidth;
        var cardWidth = 68.0 + 10; // actual width is 68, let's give 10 for padding
        var maxCardsPerRow = Math.floor(width / cardWidth);
        var rowsNeeded = Math.ceil(hand.length / maxCardsPerRow);
        var cardsPerRow = [];
        $scope.data.table.hand = [[]];
        for (var i = 0; i < rowsNeeded; i++){
            cardsPerRow[i] = 0;
            $scope.data.table.hand[i] = [];
        }
        for (var i = 0; i < hand.length; i++){
            cardsPerRow[i % rowsNeeded]++;
        }
        var currentRow = 0;
        var currentPos = 0;
        for (var i = 0; i < hand.length; i++){
            if (cardsPerRow[currentRow] > 0){
                cardsPerRow[currentRow]--;
            } else {
                currentRow++;
                currentPos = 0;
            }
            $scope.data.table.hand[currentRow][currentPos] = hand[i];
            currentPos++;
        }
    }
    
    $scope.calculateHandRows([new Card(), new Card(), new Card(), new Card(), new Card(), new Card(), new Card()]);
    
    socket.on("GameUpdate", function(gameID){
        if (gameID === $scope.auth.gameID){
            $scope.getBoard();
            if ($scope.message2TurnsRemaining > 0){
                $scope.message2TurnsRemaining--;
            }
        }
    });
    
    socket.on("GameUpdateHand", function(response){
        if (response.gameID === $scope.auth.gameID){
            $scope.message2 = response.message;
            $scope.message2TurnsRemaining = 2;
            $scope.getHand();
        }
    });
    
    $scope.getBoard = function(){
        //make request to server
        var auth = {userID: $scope.auth.userID,
            gameID: $scope.auth.gameID};
        $http.post('/game/board', auth)
        .then(function(response){
            $scope.data.table.topCard = response.data.topCard;
            $scope.data.table.turnPlayerID = response.data.playerTurnID;
            $scope.calculateRotation(response.data.player1CardCount, response.data.player2CardCount, response.data.player3CardCount, response.data.player4CardCount);
            $scope.data.table.attackCount = response.data.attackCount;
            $scope.message = response.data.message;
            if (response.data.status === "finished"){
                $scope.getResults();
            } else if ($scope.data.table.turnPlayerID == $scope.data.table.myPlayerId){
                $scope.message = "It's your turn";
            }
        }),
        function(response){
            console.log("Error: " + reponse);
        }
    }
    
    $scope.getHand = function(){
        var auth = {userID: $scope.auth.userID,
            gameID: $scope.auth.gameID};
        $http.post('/game/hand', auth)
        .then(function(response){
            $scope.calculateHandRows(response.data.hand);
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.drawCard = function(){
        $scope.playCard(-1);
    }
    
    $scope.playCard = function(c){  
        var data = { userID: $scope.auth.userID,
            gameID: $scope.auth.gameID,
            card: c
        }
        if ((c.number == 10) || (c.number == 15)){
            $scope.popup(c);
        } else {
            $scope.showColorChooser = false;
            socket.emit('/game/play', data);
        }
    }
    socket.on('/game/play', function(response){
        if (response.status === "success"){
            $scope.message = response.message;
            $scope.getHand();
        } else {
            $scope.message = response.error;
        }
    });
    
    $scope.showColorChooser = false;
    
    $scope.popup = function(c){
        $scope.temp = c;
        $scope.showColorChooser = true;
    }
    
    $scope.playPopup = function(colorChosen){
        $scope.showColorChooser = false;
        $scope.temp.setColor = colorChosen;
        var data = { userID: $scope.auth.userID,
            gameID: $scope.auth.gameID,
            card: $scope.temp
        }
        socket.emit('/game/play', data);
    }
    
    $scope.getResults = function(){
        var auth = {userID: $scope.auth.userID,
            gameID: $scope.auth.gameID};
        $http.post('/game/results', auth)
        .then(function(response){
            $scope.message = response.data.results;
            $scope.deleteCookie("GAME_ID"); //remove cookie to allow making other games
        }),
        function(response){
            console.log("Error: " + response);
        };
    }
    
    $scope.deleteCookie = function(name) {
        document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    
    // https://stackoverflow.com/questions/10730362/get-cookie-by-name
    $scope.getCookie = function(name){
        match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    }
    
    $scope.quit = function(){
        var data = {userID: $scope.auth.userID,
                    gameID: $scope.auth.gameID};
        socket.emit('/lobby/leave', data);
    }
    socket.on('/lobby/leave', function(response){
        if (response.status === "success"){
            $scope.message = response.message;
            //need to remove cookie
            $scope.deleteCookie("GAME_ID");
            window.location.href = "/lobby.html";
        } else {
            $scope.message = response.error;
            $scope.deleteCookie("GAME_ID");
            window.location.href = "/lobby.html";
        }
    });
    
}]);

// https://www.html5rocks.com/en/tutorials/frameworks/angular-websockets/
app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});