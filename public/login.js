angular.module('loginApp', [])
.controller('loginController', ['$scope', '$http', function($scope, $http){
    $scope.formData = {}; //  empty object to hold input data
    $scope.formData.isError = false; //set to no error message
    $scope.register = function(){
        
            $http.post('/register', $scope.formData)
            .then(function(response) {
                console.log(response.data);
                $scope.formData.isError = true;
                $scope.formData.error = response.data.error;
            }),
            (function(response) {
                console.log('Error: ' + response);
            });
           
    };
    
    $scope.signIn = function(){
        
            $http.post('/signIn', $scope.formData)
            .then(function(response) {
                if (response.data.status === "success"){
                    $scope.formData.isError=false;
                    //set cookie
                    document.cookie = "userID=" + response.data.userID + ";path=/";
                    //redirect
                    //window.location.href = "/lobby.html";
                } else {
                    $scope.formData.isError = true;
                    $scope.formData.error = response.data.error;
                }
            }),
            (function(data) {
                console.log('Error: ' + data);
            });
        
    }
}]);
