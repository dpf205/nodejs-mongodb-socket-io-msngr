var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://admin:password@ds137090.mlab.com:37090/nodejs-mongodb-socketio-msngr';

app.use(express.static('public'));
// app.use(express.static(__dirname + '/public'));

MongoClient.connect(url, function (err, db) {
    var messagesCollection = db.collection('messages');
    var connectedSockets = [];

    io.on("connection", function (socket) {
        console.log('A user connected!');

        // check for connected users and push() to connectedSockets array
        if (connectedSockets.indexOf(socket) === -1) {
            connectedSockets.push(socket);
        }

        messagesCollection.find().toArray().then(function (docs) {
            socket.emit('chatHistory', docs)
        });

        socket.on("message", function (message) {
            console.log("message: " + message);
            var date = new Date();

            messagesCollection.insertOne({text: message, dateTime: date.toUTCString()}, function (err, res) {
                console.log('inserted document into messages collection');
            });

            socket.broadcast.emit("message", message); // send to  other connected clients, excluding the emitting socket
        });

        socket.on("username", function (username) {
            socket.chatUsername = username; // chatUsername from public/js/main.js

            //notify other connected sockets that a new user has set their username
            socket.broadcast.emit("username", {
                username: username,
                id: socket.id     //retrieve the unique id of the socket object
            });
        });

        //display an updated list of users when the new user connects, sans page refresh
        var updatedConnectedUsersList  = connectedSockets.map(function (item) {
            return {
                id: item.id,
                username: item.chatUsername
            }
        });

        socket.broadcast.emit("newConnectedUser", updatedConnectedUsersList);


        // create event handler for the "askForConnectedClients" event
        socket.on("askForConnectedClients", function (nothingReturned, confirmationCallback) {
            var connectedUsersList = connectedSockets.map(function (item) {
                return {
                    id: item.id,
                    username: item.chatUsername
                }
            });

            confirmationCallback(connectedUsersList);
        });

        //create an event for user/socket disconnection
        socket.on("disconnect", function () {
            console.log("\n socket/client disconnected");
            var index = connectedSockets.indexOf(socket);
            connectedSockets.splice(index, 1);
            console.log('\n There are currently ' + connectedSockets.length + ' clients/sockets connected');

            //display an updated list of users when a user disconnects, sans page refresh
            var updatedDisconnectedUsersList  = connectedSockets.map(function (item) {
                return {
                    id: item.id,
                    username: item.chatUsername
                }
            });

            socket.broadcast.emit("newDisconnectedUser", updatedDisconnectedUsersList);
        });
    });
});


http.listen(port, function () {
    console.log('\n*Express server listening on port ' + port);
});