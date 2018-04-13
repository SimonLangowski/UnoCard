angular.module('gameApp', [])
.controller('gameController', ['$scope', '$http', function($scope, $http){
    
    function Card(){
        this.index = 0;
        this.url = '/drawingResources/cardFaceDown.png';
    }
    
    function Table(){
        //the first seven cards will start face down, until the server deals them to us
        //the last 11 cards will be transparent
        this.topCard = new Card();
        this.hand = [new Card(), new Card(), new Card(), new Card(), new Card(), new Card(), new Card()];
        this.leftCount = 7;
        this.rightCount = 7;
        this.acrossCount = 7;
        this.myCount = 7;
        this.myPlayerId = 1;
        this.turnPlayerId = 0;
    }
    
    $scope.data = {};
    $scope.data.table = new Table();
    
    $scope.auth = {};
    $scope.auth.userID = 0;
    $scope.auth.gameID = 0;
    
    $scope.message = "";
    
    $scope.init = function(){
        $scope.getHand();
        $scope.getBoard();
        $scope.update();
    }
    
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
        
    }

    $scope.getBoard = function(){
        //make request to server
        $http.post('/game/board', $scope.auth)
        .then(function(response){
            $scope.data.table.topCard = response.data.topCard;
            $scope.data.table.turnPlayerId = response.data.turnPlayerID;
            $scope.data.table.myPlayerId = response.data.myPlayerID;
            $scope.calculateRotation(response.data.player1CardCount, response.data.player2CardCount, response.data.player3CardCount, response.data.player4CardCount);
        }),
        function(response){
            console.log("Error: " + reponse);
        }
    }
    
    $scope.getHand = function(){
        $http.post('/game/hand', $scope.auth)
        .then(function(response){
            $scope.data.table.hand = response.data.hand;
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.playCard = function(i){
        var data = { userID: $scope.auth.userID,
            gameID: $scope.auth.gameID,
            index: i
        }
        $http.post('/game/play', data)
        .then(function(response){
            $scope.message = response.data.message;
            if (response.data.status === "success"){
                $scope.getHand();
                $scope.getBoard();
                $scope.update();
            }
        }),
        function(response){
            console.log("Error: " + response);
        };
    }
    
    $scope.update = function(){
        $http.post('/game/update', $scope.auth)
        .then(function(response){
        if (response.data.status === "no change"){
            $scope.update();
        } else if (response.data.status === "update"){
            $scope.getBoard();
            if ($scope.data.table.myPlayerId != $scope.data.table.turnPlayerId){
                $scope.update();
            } else {
                $scope.message = "It's your turn";
            }
        } else if (response.data.status === "victory"){
            $scope.message = "You won!";
        } else if (response.data.status === "defeat"){
            $scope.message = response.data.victor + " won!";
        } else {
            console.log("Error: server gave status: " + response.data.status);
        }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
}]);