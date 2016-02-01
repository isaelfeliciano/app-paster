app.controller('QrCodeController2', ['$scope', '$http', '$window', function ($scope, $http, $window){
	/*$('#reader').html5_qrcode(function (data){
			console.log('QrCode: '+ data);
		},
		function (error){
			console.log('QrCode error: '+ error);
		},
		function (videoError){
			console.log('Video Error: '+ videoError);
		}
	);*/
	var list = document.getElementById('log-list');

	$scope.uploadFile = function (event){
		var canvas = document.getElementById('qr-canvas');
		var filename = event.target.files[0].name;
		var file = event.target.files[0];
		var fr = new FileReader();
		fr.onload = createImage;
		fr.readAsDataURL(file);
		console.log('File was selected: ' + filename);
		function createImage (){
			img = new Image();
			img.onload = imageLoaded;
			img.src = fr.result;
			console.log(fr.result);
		}
		function imageLoaded (){
			canvas.width = img.width;
			canvas.height = img.height;
			var ctx = canvas.getContext("2d");
			ctx.drawImage(img, 0,0);
			canvas.toDataURL("image/png");
			qrcode.decode(fr.result);
			qrcode.callback = function(a){
			console.log(a);
			var li = document.createElement('li');
			var textNode = document.createTextNode(a);
			li.appendChild(textNode);
			list.appendChild(li);
		}
			// $('#reader').css({'background-image': 'url('+fr.result+')'});
			/*$('#reader').html5_qrcode(function (data){
				console.log('QrCode: '+ data);
				},
				function (error){
					console.log('QrCode error: '+ error);
				},
				function (videoError){
					console.log('Video Error: '+ videoError);
				}
			);*/
		}
	};
}]);