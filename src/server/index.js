const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: { origin: '*' }
});

var users = [];

io.on('connection', (socket) => {

    socket.on('connect', () => {
        io.emit(users);
    });

    socket.on('register', (user) => {
        users.push({
            id: socket.id,
            name: user.name
        });
        console.log('a user connected');
        io.emit('users', users);

    });

    socket.on('disconnect', function () {

        var i = users.findIndex(x => x.id == socket.id);
        users.splice(i, 1);
        console.log('a user disconnected');
        io.emit('users', users);

    });

    socket.on('exchange', (user) => {
        socket.join(user.id);
        socket.to(user.id).emit('exchange', user);
        socket.leave(user.id);
    });

    socket.on('finaliseExchange', (user) => {
        socket.join(user.id);
        socket.to(user.id).emit('finaliseExchange', user);
        socket.leave(user.id);
    });

    socket.on('message', (user) => {
        console.log(user);
        io.to(user.id).emit('message', user);
        io.to(user.initiator).emit('message', user);
    });
});

http.listen(process.env.PORT);