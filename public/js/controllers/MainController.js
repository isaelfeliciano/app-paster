app.controller('MainController', ['$scope', '$http', '$window', function ($scope, $http, $window){

	var ip_address = '192.168.88.5';
	if (true) {
		var serverURL = "https://facilcopy.herokuapp.com";
	} else {	
		var serverURL = "http://192.168.88.3:3333";
	}
	$scope.devicelist = "Just you";

	$(document)
		.one('focus.textarea', '.autoExpand', function(){
			var savedValue = this.value;
			this.value = '';
			this.baseScrollHeight = this.scrollHeight;
			this.value = savedValue;
		})
		.on('input.textarea', '.autoExpand', function(){
			var minRows = this.getAttribute('data-min-rows')|0,
				 rows;
			this.rows = minRows;
      // console.log(this.scrollHeight , this.baseScrollHeight);
			rows = Math.ceil((this.scrollHeight - this.baseScrollHeight) / 33);
			this.rows = minRows + rows;
		});

		// Modal-
	$scope.modal = function(){
		// $('#reader').html5_qrcode_stop();
		var timeout;
		var isHidden = false;
		el = document.getElementById('modal');
		el.style.visibility = (el.style.visibility == "visible") ? "hidden" : "visible";
		joinOthers();

		document.addEventListener("mousemove", hideMouse);
		function hideMouse(){
			if (timeout){
				clearTimeout(timeout);
			}
			timeout = setTimeout(function(){
				if (!isHidden){
					$(".close, .text-top, .modal-btn-container")
						.toggleClass('notVisible');
					$("body").toggleClass('notMouse');	
					isHidden = true;
				}
			}, 2000);
			if (isHidden){
				$(".close, .text-top, .modal-btn-container")
						.toggleClass('notVisible');
				$("body").toggleClass('notMouse');	
				isHidden = false;
			}
		};
	};

	// -Modal

	$scope.scanQr = function(){
		$('#open-modal').toggleClass('notVisible');
		$('#scan-modal').toggleClass('notVisible');
		$('#reader').html5_qrcode(function(data){
			$scope.modal();
			joinToRoomFromQr(data);
			$('#reader').html5_qrcode_stop();
		}, function(error){
			// flashMessage(error);
		}, function(videoError){
			// flashMessage(videoError)
		});
	}
	

	// Flash Message
	function flashMessage(msg){
		if(hideFlashMessage)
			clearTimeout(hideFlashMessage);
		$('.flashmessage').removeClass('notVisible')
		.html('<p>'+msg+'</p>');
		var hideFlashMessage = setTimeout(function(){
			$('.flashmessage').addClass('notVisible').
			html('');
		}, 3000);
	}
	// Flash Message

	
	
	/*var socket = io();
	var opts = {peerOpts: {trickle: false}, autoUpgrade: false};
	var socketp2p = new Socketiop2p(socket, opts, function(){
		p2psocket.emit('peer-obj', 'Hello there. I am ' + p2psocket.peerId);
	});*/

	// var P2P = require('socket.io-p2p');
	// var io = require('sock.io-client');
	var socket = io.connect(serverURL);
	var opts = {autoUpgrade: false, peerOpts: {numClients: 10}};
	var socketp2p = new P2P(socket, opts);
	socketp2p.on('peer-msg', function(data){
		console.log('From a peer %s ' + data.text);
	});

	var list = document.getElementById('log-list');
	var localStorage = window.localStorage;

  if (window.localStorage.getItem('room')){
		var room = window.localStorage.getItem('room');
		var desp = window.localStorage.getItem('desp');
		socketStarter(room);
	}
	else {
    var oReq = new XMLHttpRequest();
    oReq.addEventListener('load', socketStarter);
    oReq.open('GET', serverURL+'/getuuid');
    oReq.send();
  }

  function socketStarter(data){
  	console.log("socketStarter");
  	if (typeof(data) == 'object')
  		var uuid = data.target.responseText;
  	else
  		var uuid = data;
  	window.localStorage.setItem('room', uuid);
  	var deviceId = localStorage.getItem('device-id');
  	socketOn(function(deviceId) {
	  	socketp2p.emit('leave-default-room', {});
	  	socketp2p.emit('joinmeto', {
	  		room: uuid, 
	  		desp: 'desktop', 
	  		deviceId: deviceId
	  	});
  	});
  }

  function joinToRoomFromQr(data){
  	console.log("joinToRoomFromQr");
  	if (typeof(data) == 'object')
  		var uuid = data.target.responseText;
  	else
  		var uuid = data;
  	window.localStorage.setItem('room', uuid);
  	var deviceId = localStorage.getItem('device-id');
  	socketp2p.emit('leave-default-room', {});
  	socketp2p.emit('joinmeto', {
  		room: uuid, 
  		desp: 'desktop', 
  		deviceId: deviceId
  	});
  }

  $scope.openDeviceList = function() {
  	$('.device-list').toggleClass('device-list--hide')
  		.toggleClass('device-list--visible');
  }

  $scope.showNav = function() {
  	$('nav').toggle(function() {
  		$('nav').css("visibility", "hidden");
  	}, function() {
  		$('nav').css("visibility", "visible");
  	});

  }

  $scope.sendTextToRoom = function(){
  	var text = document.getElementsByName('textarea')[0].value;
  	$('textarea').val('');
  	$('.middle-content__messages').append(`
  		<div class="message-from-me">
  			<p class="box-radius">${text}</p>
  		</div>
  		`);
  	// var room = document.cookie.replace(/(?:(?:^|.*;\s*)room\s*\=\s*([^;]*).*$)|^.*$/, "$1");
  	var room = getRoom();
  	socketp2p.emit('to-room', {room: room, text: text, id: getDeviceId()});
  	// socketp2p.emit('peer-msg', {room: room, text: text});
  }

  function getRoom (){
  	if (localStorage.getItem('room')){
  		var room;
  		return room = localStorage.getItem('room');
  	}
  }

  function getSocketId (){
  	if (localStorage.getItem('socketId')){
  		var socketId;
  		return socketId = localStorage.getItem('socketId');
  	}
  }

  function getDeviceId (){
  	return localStorage.getItem('device-id');
  }

  function socketOn(callback){
		socketp2p.on('connect', function(){
			flashMessage('Event: connect');
			localStorage.setItem('socketId', socket.id);
			if (!localStorage.getItem('device-id')) {
				socketp2p.emit('get-device-id');
				console.log("Event: Get Device ID");
			} else {
				// socketp2p.emit('get-device-list');
				callback(localStorage.getItem('device-id'));
			}
		});
		socketp2p.on('device-id', function(data){
			console.log("Received Device ID");
			localStorage.setItem('device-id', data);
			callback(data);
			// callback from top function in this scope
		});
		socketp2p.on('connect_error', function(){
			console.log('Event: connect_error');
		});
		socketp2p.on('connect_timeout', function(){
			console.log('Event: connect_timeout');
		});
		socketp2p.on('reconnect_attempt', function(){
			console.log('Event: reconnect_attempt');
		});
		socketp2p.on('reconnecting', function(){
			console.log('Event: reconnecting');
		});
		socketp2p.on('reconnect_failed', function(){
			console.log('Event: reconnect_failed');
		});
	  socketp2p.on('message', function(data){
	  	// document.getElementById('text-received').innerHTML = data.msg;
	  	// $scope.sender = data.sender;
	  	// $scope.$apply();
	  	$('.middle-content__messages').append(`
	  		<div class="message-from-others">
		  		<p class="box-radius">${data.msg}</p>
		  	</div>	
	  		`);
	  });
	  socketp2p.on('reconnect', function(){
	  	/*socketp2p.emit('leave-default-room', {});
			var room = getRoom();
			var deviceId = localStorage.getItem('device-id');
			socketp2p.emit('joinmeto', {
				room: room, 
				desp: 'desktop', 
				deviceId: deviceId,
				reconnect: true
			});*/
			console.log("Reconnected");			
	  });
	  socketp2p.on('user-disconnected', function(data){
			console.log('Usuario desconectado: '+ data.id);
			// $("td[socket-id='"+ data.id + "']").parent().remove();
		});
		socketp2p.on('joinedToRoom', function(data){
			let room = getRoom();
			socketp2p.emit('get-device-list', {room: room});
		});

		socketp2p.on('other-device-joined-room', function(data){
			let room = getRoom();
			socketp2p.emit('get-device-list', {room: room});
		});	

		socketp2p.on('updateData', function(data){
			updateDeviceList(data);
		});
	}

	function updateDeviceList(data){
		/*var deviceId = localStorage.getItem('device-id');
		var devicelist = data.devicelist;
		var index = devicelist.indexOf(deviceId);*/
		// devicelist.splice(index, 1);
		if (data.length < 2) {
			let oneDevice = data[0];
			$scope.devicelist = 'Just you';
			$('.device-list ul').html(
				`<li><p>${oneDevice.description}</p>
				<span>this device</span></li>`
			);
		} else {
			$('.device-list ul').html("");
			$scope.devicelist = `You + ${data.length - 1}`;
			$.each(data, function(index, device) {
				let myDeviceId = getDeviceId();
				if (device.deviceId == myDeviceId) {
					device.status = "My device";
				}
				$('.device-list ul').append(
					`<li><p>${device.description}</p>
					<span>${device.status}</span></li>`
				);
			});
		}
		// console.log($scope.devicelist);
		$scope.$apply();
		console.log("Update device list");
	}	

	$scope.addDevice = function(){
		var desp = document.getElementsByName('device-desp')[0].value;
		var room = '757704ca-28a2-48e0-8a79-c6d02e7486e3';
		var deviceId = localStorage.getItem('device-id');
		// var room = document.getElementsByName('room')[0].value;
		socketp2p.emit('joinmeto', {room: room, desp: desp, deviceId: deviceId});
		console.log("Join me to 3");
		// document.cookie = "room="+room;
		// document.cookie = "desp="+desp;
		window.localStorage.setItem('room', room);
		window.localStorage.setItem('desp', desp);
		console.log(window.localStorage.getItem('room'));
	}

	joinOthers = function(){
		$('#qrcode').empty();
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
			qrcode.callback = function(data){
			console.log(data);
			if (data === 'error decoding QR Code'){
				flashMessage(data);
			}else {
				socketStarter(data);
			}
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

	if(socketp2p){
		$("td[socket-id='"+ socketp2p.id +"']").text('This Device');
	}
}]);