
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
    
    socket.on('error', function(response){
        console.log("Error: " + response);
    });
    
    $scope.getCurrentLobby = function(){
        socket.emit('/lobby/current', {userID: $scope.userID}, );
    }
    socket.on('/lobby/current', function(response){
        if (response.status === "success"){
            $scope.currentLobby = response.gameID;
            document.cookie = "GAME_ID=" + $scope.currentLobby + ";path=/";
            console.log($scope.currentLobby);
        } else {
            console.log(response);
        }
    });
    
    socket.on('Lobby Update', function(){
        $scope.updateLobbies();
    });
    
    $scope.updateLobbies = function(){
        $http.post('/lobby/info', {userID: $scope.userID})
        .then(function(response){
            $scope.lobbyState = response.data.stateID;
            $scope.lobbies = response.data.lobbies;
            for (var i = 0; i < $scope.lobbies.length; i++){
                if (($scope.lobbies[i].gameID === $scope.currentLobby) && ($scope.lobbies[i].isStarted)){
                    $scope.goToGame();
                }
            }
        }),
        function(response){
            console.log("Error: " + response);
        }
        
    }
    
    
    
    $scope.createLobby = function(){
        socket.emit('/lobby/create', {userID: $scope.userID});
    }
    socket.on('/lobby/create', function(response){
        //should not call updateLobbies because then there will be two sets of async calls running
        if (response.status === "success"){
            $scope.message = response.message;
            $scope.currentLobby = response.gameID;
            //$scope.updateLobbies();
        } else {
            $scope.message = response.error;
        }
    })
    
    
    $scope.joinLobby = function(gameId){
        var data = {
            userID: $scope.userID,
            gameID: gameId
        }
        socket.emit('/lobby/join', data);
    }
    socket.on('/lobby/join', function(response){
        if (response.status === "success"){
            $scope.message = response.message;
            $scope.currentLobby = response.gameID;
            //$scope.updateLobbies();
        } else {
            $scope.message = response.error;
        }
    })
    
    
    $scope.leaveLobby = function(gameId){
        var data = {
            userID: $scope.userID,
            gameID: gameId
        }
        socket.emit('/lobby/leave', data);
    }
    socket.on('/lobby/leave', function(response){
        if (response.status === "success"){
            $scope.message = response.message;
            $scope.currentLobby = 0;
            //$scope.updateLobbies();
        } else {
            $scope.message = response.error;
        }
    })
    
    
    $scope.signOut = function(){
        socket.emit('/signOut', {userID: $scope.userID});
    }
    socket.on('/signOut', function(response){
        if (response.status === "success"){
            $scope.message = response.message;
            //need to remove cookie
            $scope.deleteCookie("USER_ID");
            window.location.href = "/login.html";
        } else {
            $scope.message = response.error;
            $scope.deleteCookie("USER_ID");
            window.location.href = "/login.html";
        }
    });
    
    $scope.startGame = function(gameId){
        var data = {
            userID: $scope.userID,
            gameID: gameId
        }
        socket.emit('/lobby/startgame', data);
    }
    socket.on('/lobby/startgame', function(response){    
        if (response.status === "success"){
            $scope.message = response.message;
        } else {
            $scope.message = response.error;
        }
    })
    
    $scope.goToGame = function(){
        document.cookie = "GAME_ID=" + $scope.currentLobby + ";path=/";
        //redirect
        window.location.href = "/game.html";
    }
    
    socket.on('Start Game', function(gameID){
        console.log(gameID);
        if (gameID === $scope.currentLobby){
           $scope.goToGame();
        }
    });
    
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
    