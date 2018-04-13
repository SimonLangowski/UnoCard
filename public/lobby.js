angular.module('lobbyApp', [])
.controller('lobbyController', ['$scope', '$http', function($scope, $http){
    
    $scope.lobbies = {};
    $scope.message = "";
    $scope.currentLobbies = [];
    
    $scope.init = function(){
        $scope.userID = $scope.getCookie("USER_ID");
        $http.post('/lobby/info', $scope.userID)
        .then(function(response){
            $scope.lobbies = response.data.lobbies;
            setTimeout($scope.updateLobbies, 1000);
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.createLobby = function(){
        $http.post('/lobby/create', $scope.userID)
        .then(function(response){
            //should not call updateLobbies because then there will be two sets of async calls running
            $scope.message = response.data.message;
            if (response.data.status === "success"){
                $scope.lobbies.push(gameId);
            }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.updateLobbies = function(){
        $http.post('/lobby/update', $scope.userID)
        .then(function(response){
            if (response.data.status === "no change"){
                setTimeout($scope.updateLobbies, 1000); //check back in a second
            } else if (response.data.status === "update"){
                $http.post('/lobby/info', $scope.userID)
                .then(function(response){
                    $scope.lobbies = response.data.lobbies;
                    setTimeout($scope.updateLobbies, 1000);
                }),
                function(response){
                    console.log("Error: " + response);
                }
            } else {
                console.log("Unknown server status: " + response.data.status);
            }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.joinLobby = function(gameId){
        var data = {
            userID: $scope.userID,
            gameID: gameId
        }
        $http.post('/lobby/join', data)
        .then(function(response){
            $scope.message = response.data.message;
            if (response.data.status === "success"){
                $scope.currentLobbies.push(gameId);
            }
        }),
        function(response){
            console.log("Error: " + message);
        }
    }
    
    $scope.leaveLobby = function(gameId){
        var data = {
            userID: $scope.userID,
            gameID: gameId
        }
        $http.post('/lobby/leave', data)
        .then(function(response){
            $scope.message = response.data.message;
            if (response.data.status === "success"){
                var index = $scope.currentLobbies.indexof(gameId);
                $scope.currentLobbies.splice(index, 1);
            }   
        }),
        function(response){
            console.log("Error: " + message);
        }
        
    }
    
    // https://stackoverflow.com/questions/10730362/get-cookie-by-name
    $scope.getCookie = function(name){
        match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    }
    
}]);
    