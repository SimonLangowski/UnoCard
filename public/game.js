angular.module('gameApp', ['ngCookies'])
.controller('gameController', ['$scope', '$http', '$cookies', function($scope, $http, $cookies){
    
    function Card(){
        this.color = "";
        this.number = 0;
        this.type = "";
        this.index = 0;
    }
    
    function Table(){
        //the first seven cards will start face down, until the server deals them to us
        //the last 11 cards will be transparent
        this.topCard = new Card();
        this.handSize = 7;
        this.hand = [new Card(), new Card(), new Card(), new Card(), new Card(), new Card(), new Card()];
    }
    
    $scope.data = {};
    $scope.data.table = new Table();
    
    $scope.auth = {};
    $scope.auth.userID = $cookies.get("USER_ID");
    $scope.auth.gameID = 0;
    
    $scope.addTestCard = function(){
        $scope.data.table.hand.push(new Card(""));
        console.log($scope.data.table.hand);
    }
    
    function removeCard(cardIndex){
        $scope.data.table.hand.splice(cardIndex, 1);
    }

    $scope.init = function(){
        //make request to server
        $http.post('/game', $scope.auth)
        .then(function(response){
            
            
        }),
        function(response){
            console.log("Error: " + reponse);
        }
    }
    
    $scope.playCard = function(i){
        var data = { userID: $scope.auth.userID,
            gameID: $scope.auth.gameID,
            index: i
        }
        $http.post('/cardPlay', data)
        .then(function(response){
            
        }),
        function(response){
            console.log("Error: " + response);
        };
    }
    
    function update(){
        
        
    }
    
}]);