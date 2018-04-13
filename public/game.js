angular.module('gameApp', [])
.controller('gameController', ['$scope', '$http', function($scope, $http){
    
    function Card(){
        this.index = 0;
        this.url = '/drawingResources/cardFaceDown.png';
    }
    
    function Table(){
        //the first seven cards will start with the face down image, until the server deals them to us
        this.topCard = new Card();
        this.hand = [new Card(), new Card(), new Card(), new Card(), new Card(), new Card(), new Card()];
        this.leftCount = 7;
        this.leftName = "";
        this.rightCount = 7;
        this.rightName = "";
        this.acrossCount = 7;
        this.acrossName = "";
        this.myCount = 7;
        this.myName = "";
        this.myPlayerId = 1;
        this.turnPlayerId = 0;
        this.displayTurnId = -1;
    }
    
    $scope.data = {};
    $scope.data.table = new Table();
    
    $scope.auth = {};
    $scope.auth.userID = 0;
    $scope.auth.gameID = 0;
    
    
    
    $scope.message = "";
    
    $scope.init = function(){
        $scope.auth.userID = $scope.getCookie("USER_ID");
        $scope.auth.gameID = $scope.getCookie("GAME_ID");
        $http.post('/game/init', $scope.auth)
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

    $scope.getBoard = function(){
        //make request to server
        $http.post('/game/board', $scope.auth)
        .then(function(response){
            $scope.data.table.displayTurnId = response.data.turnID;
            $scope.data.table.topCard = response.data.topCard;
            $scope.data.table.turnPlayerId = response.data.turnPlayerID;
            $scope.data.table.myPlayerId = response.data.myPlayerID;
            $scope.calculateRotation(response.data.player1CardCount, response.data.player2CardCount, response.data.player3CardCount, response.data.player4CardCount);
            if ($scope.data.table.myPlayerId != $scope.data.table.turnPlayerId){
                setTimeout($scope.update(), 1000); // Let's give them a second to make a move
            } else {
                $scope.message = "It's your turn";
            }
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
            }
        }),
        function(response){
            console.log("Error: " + response);
        };
    }
    
    $scope.update = function(){
        $http.post('/game/getTurn', $scope.auth)
        .then(function(response){
        if (response.data.turnID == $scope.data.table.displayTurnId){
            setTimeout($scope.update(), 1000); // Let's wait a second before asking the server again
        } else {
            $scope.getBoard();
        }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.getResults = function(){
        $http.post('/game/results', $scope.auth)
        .then(function(response){
            $scope.message = response.data.results;
        }),
        function(response){
            console.log("Error: " + response);
        };
    }
    
}]);