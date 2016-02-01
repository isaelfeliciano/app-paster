app.controller('QrCodeController', ['$scope', '$http', '$window', function ($scope, $http, $window){
	var video = document.querySelector('#videoElement');
	video.setAttribute('autoplay','');

	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;

	if (navigator.getUserMedia){
		navigator.getUserMedia({video: true}, handleVideo, videoError);
	}

	function handleVideo(stream){
		video.src = window.URL.createObjectURL(stream);
	}

	function videoError(e){
		//Do Something
	}
}])