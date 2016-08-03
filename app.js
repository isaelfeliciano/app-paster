/*if (color in colorObj){
  // Haz algo
}*/

if (process.env.NODE_ENV === "production") {
  var dbUrl = 'mongodb://isael:isael.db@ds139645.mlab.com:39645/facilcopy';
} else {
  var dbUrl = 'mongodb://localhost:27017/remote-paster';
}

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cookieToObj = require('cookie');
var bodyParser = require('body-parser');
var fs = require('fs');
var uuid = require('uuid');
var shortId = require('shortid');
var uaParser = require('ua-parser-js');

var MongoClient = require('mongodb').MongoClient;
var mongoDbObj;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

MongoClient.connect(dbUrl, function(err, db) {
  if (err)
    console.log(err);
  else {
    console.logIt("Connected to MongoDB");
    mongoDbObj = {db: db,
      rooms: db.collection('rooms')
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
// var p2p = require('socket.io-p2p-server').Server;
// io.use(p2p);


var insertDocument = function(filter, doc) {
  try {
    mongoDbObj.rooms.updateOne(filter, {$set: doc}, {upsert: true});
  } catch (e) {
    throw (e);
  }
};

var getDevicesInRoom = function(room, callback) {
  var myCursor = mongoDbObj.rooms.find( {"room": room})
    .toArray(function(err, result) {
      if (err) {
        return console.log("Error Getting Device List")
      }
      callback(result);
    });
} 

/*var io = require('socket.io')({
  'close timeout': 606024
}, server);
io.use(p2pserver);*/
io.on('connection', function(socket){
  console.logIt('Socket connected: '+socket.id);
  var firstTime = false;
  if (socket.handshake.headers.cookie){
    let cookie = socket.handshake.headers.cookie;
    // Is a Reconnection
    firstTime = true;
    socket.reconnection = true; // Just to mark it
    // to prevent the disconnect event change the
    // status to offline 
    /*let oldSocketId = cookieToObj.parse(cookie).io;
    insertDocument({ 'socketId': oldSocketId }, {
      'socketId': socket.id,
      'status': 'online'
    });*/
  }

  socket.on('disconnect', function() {
    console.logIt("Socket Disconnected");
    insertDocument({ 'socketId': socket.id }, {
      'status': 'offline'
    });

    let room = Object.keys(socket.adapter.rooms)[0];
    getDevicesInRoom(room, function(result) {
      socket.broadcast.to(room).emit('updateData', result);
    });
  });

  socket.on('leave-default-room', function (){
    this.leave(this.id);
  });

  socket.on('get-device-id', function(){
    console.logIt("Sending device id");
    socket.emit('device-id', shortId.generate());
  });

  socket.on('joinmeto', function (data){
    let socket = this;
    let roomObj = {};
    var room = data.room;
    var deviceId = data.deviceId;
    console.logIt('joinmeto: '+ data.room);
    this.join(data.room);
    var ua = uaParser(this.handshake.headers['user-agent']);
    var desc = ua.browser.name + ' On ' + ua.os.name;
    console.logIt(data);
    roomObj = {
      'room': room,
      'deviceId': deviceId,
      'description': desc,
      'socketId': this.id,
      'status': 'online'
    }
    insertDocument({
      'room': room,
      'deviceId': deviceId
    }, roomObj);

    console.logIt(roomObj);

    this.emit('joinedToRoom');

    this.broadcast.to(room).emit('other-device-joined-room');
  });

  socket.on("get-device-list", function() {
    let room = Object.keys(this.adapter.rooms)[0];
    getDevicesInRoom(room, function(result) {
      console.logIt("Update Data");
      console.logIt(result);
      socket.emit('updateData', result);
    });
  });

  socket.on('to-room', function (data){
    var thisRoom = Object.keys(this.adapter.rooms)[0];
    var clientsInRoom = this.adapter.rooms[thisRoom];
    var clientsInRoomArray = [];
    this.broadcast.to(thisRoom).emit('message', {
      msg: data.text
      // sender: socketLocalStorage[thisRoom][data.id].desc
    });
    console.logIt('send to room');
    for (client in clientsInRoom) {
      clientsInRoomArray.push(client);
    }
  });

  /*socket.on('disconnect', function() {
    let socket = this;
    insertDocument({ 'socketId': socket.id }, {
      'status': 'offline'
    });
    var _socket = this;
    var thisRoom = this.adapter.rooms;
    var id = this.id;
    thisRoom = Object.keys(thisRoom)[0];
    console.logIt('User disconnected: '+ id + ' from this room: '+ thisRoom);
    io.to(thisRoom).emit('user-disconnected', {id: id}, {});
    if (thisRoom !== undefined) 
      socketLocalStorage.update(_socket);
  });*/
});


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

app.use('/getuuid', function (req, res){
  var roomUuid;
  // roomUuid = shortId.generate();
  roomUuid = uuid.v4();
  res.send(uuid.v4());
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
