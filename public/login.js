angular.module('loginApp', [])
.controller('loginController', ['$scope', '$http', function($scope, $http){
    $scope.formData = {}; //  empty object to hold input data

    $scope.register = function(){
        console.log($scope.formData);
        $http.post('/register', $scope.formData)
            .then(function(data) {
                if (data.status === "success"){
                    //set cookie
                    document.cookie = "userID=" + data.userID + ";path=/";
                    document.cookie = "userAuth=" + data.userAuth + ";path=/";
                    console.log(data);
                    //redirect
                    //window.location.href = "/lobby.html";
                } else {
                    
                    console.log(data);
                }
                
            }),
            (function(data) {
                console.log('Error: ' + data);
            });
            
    };
    
    $scope.signIn = function(){
        $http.post('/signIn', $scope.formData)
            .then(function(data) {
                console.log(data);
             
            }),
            (function(data) {
                console.log('Error: ' + data);
            });
        
    }
}]);
