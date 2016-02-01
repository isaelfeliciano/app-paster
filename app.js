var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var uuid = require('uuid');
var uaParser = require('ua-parser-js');

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

var app = express();

// var myhttp = require('http').Server(app);
var io = require('socket.io')({
  'close timeout': 606024
}).listen(3334);
io.on('connection', function(socket){
  console.log('Socket connected: '+socket.id)
  var firstTime = false;
  if (socket.handshake.headers.cookie){
    firstTime = true;
  }

  socket.on('leave-default-room', function (){
    var defaultRoom = this.id;
    this.leave(defaultRoom);
  });

  socket.on('joinmeto', function (data){
    this.join(data.room);
    var ua = uaParser(this.handshake.headers['user-agent']);
    var desc = ua.browser.name + ' On ' + ua.os.name + ' - '+ ua.os.version;
    !socketLocalStorage[data.room] ? socketLocalStorage[data.room] = {
      'storageByDesc': {},
      'storageBySocket': {},
      'devices': [],
      'devicesArrayOfObj': []
    } : null;
    var storageByDesc = socketLocalStorage[data.room]['storageByDesc'];
    storageByDesc[desc] = this.id;
    var storageBySocket = socketLocalStorage[data.room]['storageBySocket'];
    storageBySocket[this.id] = desc;
    // socketLocalStorage[data.room][desc] = this.id;
    var devices = socketLocalStorage[data.room]['devices'];
    devices = Object.keys(storageByDesc);
    console.log(devices);

    var devicesArrayOfObj = socketLocalStorage[data.room]['devicesArrayOfObj']; 
    devicesArrayOfObj.push(storageByDesc);
    console.log('devicesArrayOfObj: ');
    console.log(devicesArrayOfObj);
    // devices.push({dev: desc});
    console.log(this.id+ ' room: '+data.room);
    var room = io.sockets.adapter.rooms[data.room];
    console.log(Object.keys(room));
    console.log(socketLocalStorage);
    this.broadcast.to(data.room).emit('joinedToRoom', {
      devicelist: devices,
      objDevices: socketLocalStorage[data.room],
      arrayDevices: devicesArrayOfObj
    });
    this.emit('joinedToRoom', {
      devicelist: devices,
      objDevices: socketLocalStorage[data.room],
      arrayDevices: devicesArrayOfObj
    });
  });


  socket.on('to-room', function (data){
    var thisRoom = Object.keys(this.adapter.rooms)[0];
    var clientsInRoom = this.adapter.rooms[thisRoom];
    var clientsInRoomArray = [];
    this.broadcast.to(thisRoom).emit('message', {msg: data.text});
    console.log('send to room');
    for (client in clientsInRoom) {
      clientsInRoomArray.push(client);
    }
    /*for (var i = 0; i = clientsInRoomArray.length; i++){

    }*/
    console.log(clientsInRoomArray);
  });

  socket.on('disconnect', function(){
    var _socket = this;
    var thisRoom = this.adapter.rooms;
    var id = this.id;
    thisRoom = Object.keys(thisRoom)[0];
    console.log('User disconnected: '+ id + ' from this room: '+ thisRoom);
    io.to(thisRoom).emit('user-disconnected', {id: id}, {});
    socketLocalStorage.update(_socket);
  });
});

socketLocalStorage.update = function(_socket){
  var room = _socket.adapter.rooms;
  room = Object.keys(room)[0];
  console.log(room);
  var desc = socketLocalStorage[room]['storageBySocket'][_socket.id];
  delete socketLocalStorage[room]['storageBySocket'][_socket.id];
  delete socketLocalStorage[room]['storageByDesc'][desc];
  console.log(socketLocalStorage);
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
  console.log('Http server listening on *:3334');
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
