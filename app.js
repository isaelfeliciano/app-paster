/*if (color in colorObj){
  // Haz algo
}*/

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var uuid = require('uuid');
var shortId = require('shortId');
var uaParser = require('ua-parser-js');

var MongoClient = require('mongodb').MongoClient;
var mongoDbObj;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var dbUrl = require('mongodb://localhost:27017/remote-paster');

MongoClient.connect(dbUrl, function(err, db) {
  if (err)
    console.log(err);
  else {
    console.logIt("Connected to MongoDB");
    mongoDbObj = {db: db,
      rooms = db.collection('rooms');
    };
  };
});

var socketLocalStorage = {};
var devices = [];

var routes = require('./routes/index');
var users = require('./routes/users');

var rmkey = fs.readFileSync('remotepaster-key.pem');
var rmcert = fs.readFileSync('remotepaster-cert.pem');
var options = {
  key: rmkey,
  cert: rmcert
};

// Para ayudar a diferenciar los logs
console.logIt = function(str){
  console.log("BEGIN----");
  console.log(str);
  console.log("----END");
}

var socket_io = require('socket.io');
var app = express();
var io = socket_io();
app.io = io;
var p2p = require('socket.io-p2p-server').Server;
io.use(p2p);


/*var io = require('socket.io')({
  'close timeout': 606024
}, server);
io.use(p2pserver);*/
io.on('connection', function(socket){
  console.logIt('Socket connected: '+socket.id)
  var firstTime = false;
  if (socket.handshake.headers.cookie){
    firstTime = true;
  }

  socket.on('leave-default-room', function (){
    this.leave(this.id);
  });

  socket.on('get-device-id', function(){
    var deviceID = shortId.generate();
    socket.emit('device-id', deviceID);
  });

  socket.on('joinmeto', function (data){
    var roomObj = {};
    var room = data.room;
    console.logIt('joinmeto: '+ data.room);
    this.join(data.room);
    var deviceId = data.deviceId;
    var ua = uaParser(this.handshake.headers['user-agent']);
    var desc = ua.browser.name + ' On ' + ua.os.name + ' - '+ ua.os.version;
    if (!socketLocalStorage[data.room]){
      socketLocalStorage[data.room] = {}
    }
    socketLocalStorage[data.room][data.deviceId] = {
      'desc': desc,
      'socket-id': this.id,
      'status': 'online'
    }
    console.logIt(socketLocalStorage[data.room]);
    // var devices = socketLocalStorage[room]['devices'];
    devices = Object.keys(socketLocalStorage[data.room]);
    console.logIt('devices: '+devices);
    var deviceList = [];
    for (var i = 0; i < devices.length; i++) {
      deviceList.push(socketLocalStorage[data.room][devices[i]].desc);
    }

    this.broadcast.to(data.room).emit('joinedToRoom', {
      devicelist: deviceList
    });
    this.emit('joinedToRoom', {
      devicelist: deviceList
    });
  });


  socket.on('to-room', function (data){
    var thisRoom = Object.keys(this.adapter.rooms)[0];
    var clientsInRoom = this.adapter.rooms[thisRoom];
    var clientsInRoomArray = [];
    this.broadcast.to(thisRoom).emit('message', {
      msg: data.text,
      sender: socketLocalStorage[thisRoom][data.id].desc
    });
    console.logIt('send to room');
    for (client in clientsInRoom) {
      clientsInRoomArray.push(client);
    }
    /*for (var i = 0; i = clientsInRoomArray.length; i++){

    }*/
    console.logIt(clientsInRoomArray);
  });

  socket.on('disconnect', function(){
    /*var _socket = this;
    var thisRoom = this.adapter.rooms;
    var id = this.id;
    thisRoom = Object.keys(thisRoom)[0];
    console.logIt('User disconnected: '+ id + ' from this room: '+ thisRoom);
    io.to(thisRoom).emit('user-disconnected', {id: id}, {});
    if (thisRoom !== undefined) 
      socketLocalStorage.update(_socket);*/
  });
});

socketLocalStorage.update = function(_socket){
  var room = _socket.adapter.rooms;
  room = Object.keys(room)[0];
  console.logIt(room);
  var desc = socketLocalStorage[room]['storageBySocket'][_socket.id];
  delete socketLocalStorage[room]['storageBySocket'][_socket.id];
  delete socketLocalStorage[room]['storageByDesc'][desc];
  console.logIt(socketLocalStorage);
  var storageByDesc = socketLocalStorage[room]['storageByDesc'];
  // storageByDesc[desc] = _socket.id;
  // var storageBySocket = socketLocalStorage[room]['storageBySocket'];
  // storageBySocket[_socket.id] = desc;
  // socketLocalStorage[room][desc] = this.id;
  var devices = socketLocalStorage[room]['devices'];
  devices = Object.keys(storageByDesc);

  var devicesArrayOfObj = socketLocalStorage[room]['devicesArrayOfObj']; 
  // devicesArrayOfObj.push(storageByDesc);
  // devices.push({dev: desc});
  var objRoom = io.sockets.adapter.rooms[room];

  io.to(room).emit('updateData', {
    devicelist: devices,
    objDevices: socketLocalStorage[room],
    arrayDevices: devicesArrayOfObj
  });
}
/*io.on('emit-to-room', function (data){
    socket.to(data.room).emit('test');
  });*/

/*myhttp.listen(3334, function(){
  console.logIt('Http server listening on *:3334');
});*/

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/', routes);
app.use('/users', users);

app.use('/uuid', function (req, res){
  var roomUuid;
  // roomUuid = shortId.generate();
  roomUuid = uuid.v4();
  res.send(roomUuid);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
