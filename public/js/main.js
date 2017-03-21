$(document).ready(function () {
    var socket = io();
    var chatForm = $(".chat-form")
    var messageField = chatForm.find("#message-field");
    var messagesList = $('.messages-list');
    var chatUserName;
    var chatUsernameIndicator = $(".current-username");
    var usernameSubmit = $(".username-submit");
    var usernameField = $(".username");
    var usersList = $(".users-list");

    chatForm.on("submit", function (e) {
        e.preventDefault();
        var message = messageField.val();
        messagesList.append("<li>" + message + "</li>");
        socket.emit("message", message); // send to all connected clients, including the emitting socket
    });

    // user sends message: listen to for the 'message' event from any of the other sockets
    socket.on("message", function (message) {
        messagesList.append("<li>" + message + "</li>");
    });

    // display/retain message history stored in mongoDB
    socket.on("chatHistory", function (data) {
        messagesList.find("li").remove();
        $.each(data, function () {
            messagesList.append("<li>" + this.text + "<br>" + "<h6>" + "<em> sent: " + this.dateTime + "</em>" + "</h6>" + "</li>");
        })
    });

    socket.on("connect", function () {

        //check if a cookie with a chat username has been set
        if ($.cookie("node_chat_username")) {
            chatUserName = $.cookie("node_chat_username");
        } else {
            // create a new cookie with a unique string using the current date/time
            chatUserName = "Anonymous_" + (new Date()).getTime();
        }
        // $.cookie() called w/ 1 parameter sets the cookie; 2 parameters retrieves the cookie
        $.cookie("node_chat_username", chatUserName);
        chatUsernameIndicator.text(chatUserName);
        socket.emit("username", chatUserName);

        // get list of connected clients once username is emitted;
        // provide confirmation via confirmationCallback(connectedUsersList) in server.js
        socket.emit("askForConnectedClients", null, function (users) {
            usersList.empty();
            $.each(users, function () {
                usersList.append("<li>"+this.username+"</li>");
            });
        });
    });

    //display an updated list of users when the new user connects/disconnects, sans page refresh
    socket.on("newConnecteduser", function (users) {
        usersList.empty();
        $.each(users, function(){
            usersList.append("<li>" + this.username + "</li>");
        });
    });

    socket.on("newDisconnectedUser", function (users) {
        usersList.empty();
        $.each(users, function(){
            usersList.append("<li>" + this.username + "</li>");
        });
    });

       usernameSubmit.on("click", function () {
           chatUserName  = usernameField.val();
            $.cookie("node_chat_username", usernameField.val());
            chatUsernameIndicator.text(chatUserName);
           socket.emit("username", chatUserName);
        });

    //listen for "username" event coming from the server
    socket.on("username", function (data) {
        console.log(data);
    });
});