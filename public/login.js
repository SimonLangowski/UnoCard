angular.module('loginApp', [])
.controller('loginController', ['$scope', '$http', function($scope, $http){
    $scope.formData = {}; //  empty object to hold input data
    $scope.formData.isError = false; //set to no error message
    $scope.formData.isSuccess = false;
    $scope.register = function(){
        if (!$scope.login.$valid){
            $scope.formData.isError = true;
            $scope.formData.message = "Please fill in fields";
        } else {
            $http.post('/register', $scope.formData)
            .then(function(response) {
                if (response.data.status === "success"){
                    $scope.formData.isError = false;
                    $scope.formData.isSuccess = true;
                    $scope.formData.message = response.data.message;
                } else {
                    console.log(response.data);
                    $scope.formData.isError = true;
                    $scope.formData.isSuccess = false;
                    $scope.formData.message = response.data.error;
                }
            }),
            (function(response) {
                console.log('Error: ' + response);
            });
        }
    };
    
    $scope.signIn = function(){
        if (!$scope.login.$valid){
            $scope.formData.isError = true;
            $scope.formData.message = "Please fill in fields";
        } else {
            $http.post('/signIn', $scope.formData)
            .then(function(response) {
                if (response.data.status === "success"){
                    $scope.formData.isError =false;
                    $scope.formData.isSuccess = true;
                    $scope.formData.message = response.data.message;
                    //set cookie
                    document.cookie = "USER_ID=" + response.data.userID + ";path=/";
                    //redirect
                    window.location.href = "/lobby.html";
                } else {
                    $scope.formData.isError = true;
                    $scope.formData.isSuccess = false;
                    $scope.formData.message = response.data.error;
                }
            }),
            (function(data) {
                console.log('Error: ' + data);
            });
        }
        
    }
    
    $scope.testForLoggedIn = function(){
        if ($scope.getCookie("USER_ID")){
            window.location.href = "/lobby.html";
        }
    }
    
    // https://stackoverflow.com/questions/10730362/get-cookie-by-name
    $scope.getCookie = function(name){
        match = document.cookie.match(new RegExp(name + '=([^;]+)'));
        if (match) return match[1];
    }
    
}]);
