var socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log(socket.connected); // true

    socket.removeListener('vorpal.commands');
    socket.removeListener('vorpal.done');
    socket.removeListener('vorpal.log');
    socket.removeListener('spinner');
    socket.removeListener('opn');
    socket.removeListener('prompt');
    socket.removeListener('disconnect');
    socket.removeListener('error');
    
    // socket.emit('chat message', 'Hello');    
    socket.on('vorpal.log', (msg) => {
        console.log(`${msg}`);
    });
    socket.on('vorpal.commands', (msg) => {
        console.log(`${msg}`);
    });
    socket.on('vorpal.done', () => {
        console.log(`VORPAL DONE`);
    });
    socket.on('spinner', (flag) => {
        console.log(`${flag? 'LOADING DATA....':'FINISH LOADING DATA'}`);
    });
    socket.on('opn', (url) => {
        console.log(`${url}`);
    });
    socket.on('prompt', (data) => {
        console.log(`${data}`);
    });
    socket.on('error', (data) => {
        console.warn(`${e}`);
    });
});

socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.removeListener('vorpal.commands');
        socket.removeListener('vorpal.done');
        socket.removeListener('vorpal.log');
        socket.removeListener('spinner');
        socket.removeListener('opn');
        socket.removeListener('prompt');
        socket.removeListener('disconnect');
        socket.removeListener('error');
        io.removeListener('connection');

        socket.connect();
    }
    // else the socket will automatically try to reconnect
});

socket.on('connect_error', (e) => {
    console.log('connect_error', e);
});

socket.on('connect_timeout', () => {
    console.log('connect_timeout',);
});

socket.on('reconnect', (attemptNumber) => {
    console.log('reconnect', attemptNumber);
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('reconnect_attempt', attemptNumber);
});

socket.on('reconnecting', (attemptNumber) => {
    console.log('reconnecting', attemptNumber);
});

socket.on('reconnect_error', (error) => {
    console.log('reconnect_error', error);
});

socket.on('reconnect_failed', () => {
    console.log('reconnect_failed');
});

socket.on('ping', () => {
    console.log('ping');
});

socket.on('pong', () => {
    console.log('pong');
});