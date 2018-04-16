angular.module('lobbyApp', [])
.controller('lobbyController', ['$scope', '$http', function($scope, $http){
    
    $scope.lobbies = {};
    $scope.message = "";
    $scope.currentLobby = 0;
    $scope.lobbyState = 0;
    
    $scope.init = function(){
        $scope.userID = $scope.getCookie("USER_ID");
        $scope.updateLobbies;
    }
    
    $scope.updateLobbies = function(){
        $http.post('/lobby/info', {userID: $scope.userID})
        .then(function(response){
            $scope.lobbyState = response.data.stateID;
            $scope.lobbies = response.data.lobbies;
            for (i = 0; i < $scope.lobbies.length; i++){
                if (($scope.lobbies[i].gameID == currentLobby) && ($scope.lobbies[i].isStarted == true)){
                    document.cookie = "GAME_ID=" + $scope.currentLobby + ";path=/";
                    //redirect
                    window.location.href = "/game.html";
                    return;
                }
            }
            setTimeout($scope.checkLobbyState, 1000);
        }),
        function(response){
            console.log("Error: " + response);
        }
        
    }
    
    $scope.createLobby = function(){
        $http.post('/lobby/create', {userID: $scope.userID})
        .then(function(response){
            //should not call updateLobbies because then there will be two sets of async calls running
            if (response.data.status === "success"){
                $scope.message = response.data.message;
                $scope.lobbies.push(gameId);
            } else {
                $scope.message = response.data.error;
            }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    $scope.checkLobbyState = function(){
        $http.post('/lobby/getState', {userID: $scope.userID})
        .then(function(response){
            if (response.data.stateID == $scope.lobbyState){
                setTimeout($scope.checkLobbyState, 1000); //check back in a second
            } else {
                $scope.updateLobbies();
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
            if (response.data.status === "success"){
                $scope.message = response.data.message;
                $scope.currentLobbies.push(gameId);
            } else {
                $scope.message = response.data.error;
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
            if (response.data.status === "success"){
                $scope.message = response.data.message;
                var index = $scope.currentLobbies.indexof(gameId);
                $scope.currentLobbies.splice(index, 1);
            } else {
                $scope.message = response.data.error;
            }
        }),
        function(response){
            console.log("Error: " + message);
        }
        
    }
    
    $scope.signOut = function(){
        $http.post('/signOut', {userID: $scope.userID})
        .then(function(response){
            if (response.data.status === "success"){
                $scope.message = response.data.message;
                //need to remove cookie
                $scope.deleteCookie("USER_ID");
                window.location.href = "/login.html";
            } else {
                $scope.message = response.data.error;
            }
        }),
        function(response){
            console.log("Error: " + response);
        };
        
    }
    
    $scope.startGame = function(gameId){
        var data = {
            userID: $scope.userID,
            gameID: gameId
        }
        $http.post('/lobby/startgame', data)
        .then(function(response){    
            if (response.data.status === "success"){
                $scope.message = response.data.message;
            } else {
                $scope.message = response.data.error;
            }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    // https://stackoverflow.com/questions/10593013/delete-cookie-by-name
    $scope.deleteCookie = function(name) {
        document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    
    // https://stackoverflow.com/questions/10730362/get-cookie-by-name
    $scope.getCookie = function(name){
        match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    }
    
}]);
    