
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
        socket.emit('/lobby/create', {userID: $scope.userID});
    }
    socket.on('/lobby/create', function(response){
        //should not call updateLobbies because then there will be two sets of async calls running
        if (response.status === "success"){
            $scope.message = response.message;
            $scope.currentLobby = response.gameID;
            $scope.updateLobbies();
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
            $scope.currentLobby = gameID;
            $scope.updateLobbies();
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
            $scope.updateLobbies();
        } else {
            $scope.message = response.error;
        }
    })
    
    
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
        socket.emit('/lobby/startgame', data);
    }
    socket.on('/lobby/startgame', function(response){    
        if (response.status === "success"){
            $scope.message = response.message;
        } else {
            $scope.message = response.error;
        }
    })
    
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
    