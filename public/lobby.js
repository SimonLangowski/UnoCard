
var app = angular.module('lobbyApp', [])
.controller('lobbyController', ['$scope', '$http', 'socket', function($scope, $http, socket){
    
    $scope.lobbies = [];
    $scope.message = "";
    $scope.currentLobby = 0;
    $scope.lobbyState = 0;
    
    $scope.init = function(){
        $scope.userID = $scope.getCookie("USER_ID");
        $scope.getCurrentLobby();
        $scope.updateLobbies();
    }
    
    $scope.getCurrentLobby = function(){
        $http.post('/lobby/current', {userID: $scope.userID})
        .then(function(response){
            if (response.data.status === "success"){
                $scope.currentLobby = response.data.gameID;
                document.cookie = "GAME_ID=" + $scope.currentLobby + ";path=/";
                console.log($scope.currentLobby);
            } else {
                console.log(response);
            }
        }),
        function(response){
            console.log("Error: " + response);
        }
    }
    
    socket.on('Lobby Update', function(){
        $scope.updateLobbies();
    });
    
    socket.on('Start Game', function(data){
        if (data.gameID === currentLobby){
           document.cookie = "GAME_ID=" + $scope.currentLobby + ";path=/";
            //redirect
            window.location.href = "/game.html";
        }
    });
    
    $scope.updateLobbies = function(){
        $http.post('/lobby/info', {userID: $scope.userID})
        .then(function(response){
            $scope.lobbyState = response.data.stateID;
            $scope.lobbies = response.data.lobbies;
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
                $scope.currentLobby = response.data.gameID;
                $scope.updateLobbies();
            } else {
                $scope.message = response.data.error;
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
                $scope.currentLobby = gameID;
                $scope.updateLobbies();
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
                $scope.currentLobby = 0;
                $scope.updateLobbies();
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
                $scope.deleteCookie("USER_ID");
                window.location.href = "/login.html";
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
    