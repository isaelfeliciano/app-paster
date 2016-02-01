app.controller('MainController', ['$scope', '$http', '$window', function ($scope, $http, $window){
	var list = document.getElementById('log-list');
	var localStorage = window.localStorage;
	$(document).foundation();

  if (window.localStorage.getItem('room')){
		var room = window.localStorage.getItem('room');
		var desp = window.localStorage.getItem('desp');
		socketStarter(room);
	}
	else {
    var oReq = new XMLHttpRequest();
    oReq.addEventListener('load', socketStarter);
    oReq.open('GET', 'http://10.0.0.219:3333/uuid');
    oReq.send();
  }

  function socketStarter(data){
  	if (typeof(data) == 'object')
  		var uuid = data.target.responseText;
  	else
  		var uuid = data;
  	window.localStorage.setItem('room', uuid);
  	if (true){
	  	socket = io('http://10.0.0.219:3334/');
	  	socket.emit('leave-default-room', {});
	  	socket.emit('joinmeto', {room: uuid, desp: 'desktop'});
	  	socketOn();
	  }
  }

  $scope.sendTextToRoom = function(){
  	var text = document.getElementsByName('textarea')[0].value;
  	var room = document.cookie.replace(/(?:(?:^|.*;\s*)room\s*\=\s*([^;]*).*$)|^.*$/, "$1");
  	socket.emit('to-room', {room: room, text: text});
  }

  function getRoom (){
  	if (localStorage.getItem('room')){
  		var room;
  		return room = localStorage.getItem('room');
  	}
  }

  function socketOn(){
		socket.on('connect', function(){
			console.log('Event: connect');
		});
		socket.on('connect_error', function(){
			console.log('Event: connect_error');
		});
		socket.on('connect_timeout', function(){
			console.log('Event: connect_timeout');
		});
		socket.on('reconnect', function(){
			console.log('Event: reconnect');
		});
		socket.on('reconnect_attempt', function(){
			console.log('Event: reconnect_attempt');
		});
		socket.on('reconnecting', function(){
			console.log('Event: reconnecting');
		});
		socket.on('reconnect_failed', function(){
			console.log('Event: reconnect_failed');
		});
	  socket.on('message', function(data){
	  	document.getElementsByName('textarea')[0].value = data.msg;
	  });
	  socket.on('reconnect', function(){
	  	socket.emit('leave-default-room', {});
			// var room = document.cookie.replace(/(?:(?:^|.*;\s*)room\s*\=\s*([^;]*).*$)|^.*$/, "$1");
			var room = getRoom();
			socket.emit('joinmeto', {room: room, desp: 'desktop'});
			/*var li = document.createElement('li');
			var textNode = document.createTextNode('Reconnection');
			li.appendChild(textNode);
			list.appendChild(li);*/
	  });
	  socket.on('user-disconnected', function(data){
			console.log('Usuario desconectado: '+ data.id);
			// $("td[socket-id='"+ data.id + "']").parent().remove();
		});
		socket.on('joinedToRoom', function(data){
			updateDeviceList(data);
		});	

		socket.on('updateData', function(data){
			updateDeviceList(data);
		});
	}

	function updateDeviceList(data){
		$scope.devicelist = data.devicelist;
		console.log($scope.devicelist);
		$scope.$apply();
		var storageByDesc = data.objDevices['storageByDesc'];
		for(i in data.devicelist){
			$("td:contains('"+ data.devicelist[i] +"')").attr('socket-id', storageByDesc[data.devicelist[i]]);
		}
		$("td[socket-id='"+ socket.id +"']").text('This Device');
	}	

	$scope.addDevice = function(){
		var desp = document.getElementsByName('device-desp')[0].value;
		var room = '757704ca-28a2-48e0-8a79-c6d02e7486e3';
		// var room = document.getElementsByName('room')[0].value;
		socket.emit('joinmeto', {room: room, desp: desp});
		// document.cookie = "room="+room;
		// document.cookie = "desp="+desp;
		window.localStorage.setItem('room', room);
		window.localStorage.setItem('desp', desp);
		console.log(window.localStorage.getItem('room'));
	}

	$scope.joinOthers = function(){
		var room = getRoom();
		var qrcode = new QRCode('qrcode', {
			text: room,
			width: 200,
			height: 200,
			colorDark: "#000000",
			colorLight: "#ffffff",
			correctLevel: QRCode.CorrectLevel.H
		});
	}

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
			socketStarter(a);
			// var li = document.createElement('li');
			// var textNode = document.createTextNode(a);
			// li.appendChild(textNode);
			// list.appendChild(li);
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

	$(window).on('closed.zf.reveal', function(){
		$('#qrcode').empty();
	});

	if(socket){
		$("td[socket-id='"+ socket.id +"']").text('This Device');
	}
}]);