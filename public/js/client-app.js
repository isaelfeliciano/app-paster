var app = angular.module("RemotePaster", ['ngRoute']);
app.config(function ($routeProvider, $locationProvider){
	$routeProvider
		.when('/', {
			templateUrl: 'js/views/mainpage.html',
			controller: 'MainController'
		})
		.when('/adddevice', {
			templateUrl: 'js/views/adddevice.html',
			controller: 'MainController'
		})
		.when('/scanmode', {
			templateUrl: 'js/views/scanmode.html',
			controller: 'MainController'
		})
		.when('/dashboard', {
			templateUrl: 'js/views/dashboard.html',
			controller: 'MainController'
		})
		.when('/qrscanner', {
			templateUrl: 'js/views/qrscanner.html',
			controller: 'QrCodeController'
		})
		.when('/qrscanner2', {
			templateUrl: 'js/views/qrscanner2.html',
			controller: 'QrCodeController2'
		});
}); 
