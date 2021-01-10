const express = require('express');
const socketIO = require('socket.io');

const PORT = process.env.PORT || 3000;

const app = express();

function requireHTTPS(req, res, next) {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== undefined) {
        return res.redirect('https://' + req.get('host') + req.url);
    }
    next();
}
app.use(requireHTTPS);

const server = app.listen(PORT, () => {
    console.log('Server started...');
})

app.use(express.static('public'));

const io = socketIO(server);

// ? _util functions
function getRnd(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

let users = [];
let usersMini = []; // with socket.id instead of full socket
let rooms = [];

io.on('connection', socket => {
    socket.on('iWantToLogIn', name => {
        const nameMini = name.toLowerCase();
        let userIdx = users.map(e=>e.name).indexOf(name);

        if (users[userIdx] === undefined) {
            users.push({
                name: name,
                nameMini: nameMini,
                socket: socket,
                disconnected: false,
                roomId: ''
            })
            socket.emit('youCanLogIn', name);
        }
        else {
            if (users[userIdx].disconnected) {
                users[userIdx].disconnected = false;
                users[userIdx].socket = socket;

                socket.emit('youCanLogIn', name);
            }
            else {
                // user exists and is connected, choose another name
            }
        }
    })

    socket.on('disconnect', () => {
        const userIdx = users.map(e=>e.socket).indexOf(socket);
        if (users[userIdx] !== undefined) {
            users[userIdx].disconnected = true;

            const roomIdx = rooms.map(e=>e.id).indexOf(users[userIdx].roomId);
            if (rooms[roomIdx] !== undefined) {
                const playerIdx = rooms[roomIdx].players.map(e=>e.name).indexOf(users[userIdx].name);
                if (rooms[roomIdx].players[playerIdx] !== undefined) {
                    rooms[roomIdx].players[playerIdx].disconnected = true;
                    io.in(users[userIdx].roomId).emit('displayThePlayers', rooms[roomIdx].players)
                }
            }
        }
    })

    socket.on('iWantToBecomeALeader', (userName, roomName, pass) => {
        const roomNameMini = roomName.toLowerCase();
        let roomIdx = rooms.map(e=>e.name).indexOf(roomName);

        if (rooms[roomIdx] === undefined) {
            const roomId = 'room'+rooms.length;
            rooms.push({
                id: roomId,
                name: roomName,
                nameMIni: roomNameMini,
                locked: false,
                ended: false,
                spectatorsAllowed: true,
                hasDisconnetedPlayers: false,
                leader: userName,
                luckyNumber: -1,
                turnIdx: 1,
                players: [{
                    name: userName,
                    disconnected: false,
                    isLeader: true,
                    plateId: 'plate0',
                    luckyNumber: -1,
                    gotTheCoin: false
                }],
                password: pass
            });

            const userIdx = users.map(e=>e.name).indexOf(userName);
            if (users[userIdx] !== undefined) {
                users[userIdx].socket.join(roomId);
                users[userIdx].roomId = roomId;

                socket.emit('youCanEnterTheRoomAsALeader', roomId);
                io.in(roomId).emit('displayThePlayers', rooms[rooms.length-1].players);
            }

            io.emit('displayTheRooms', rooms);
        }
        else {
            // room already exists.
        }
    })

    socket.on('showMeTheRooms', () => {
        socket.emit('displayTheRooms', rooms);
    })

    socket.on('iWantToJoinTheRoom', (userName, roomId, addedByLeader) => {
        const roomIdx = rooms.map(e=>e.id).indexOf(roomId);
        if (rooms[roomIdx] !== undefined) {
            const playerIdx = rooms[roomIdx].players.map(e=>e.name).indexOf(userName);
            if (rooms[roomIdx].players[playerIdx] !== undefined) {
                if (!addedByLeader) {
                    if (rooms[roomIdx].players[playerIdx].disconnected) {
                        rooms[roomIdx].players[playerIdx].disconnected = false;
                        if (rooms[roomIdx].players[playerIdx].isLeader) {
                            socket.emit('youCanEnterTheRoomAsALeader', roomId);
                        }
                        else {
                            socket.emit('youCanJoinTheRoom', rooms[roomIdx].id);
                        }
                        socket.join(roomId);
                    }
                }
            }
            else {
                if (!rooms[roomIdx].locked) {
                    const plateId = 'plate'+rooms[roomIdx].players.length;
                    let isDisconnected = false;
                    if (addedByLeader) isDisconnected = true;
                    rooms[roomIdx].players.push({
                        name: userName,
                        disconnected: isDisconnected,
                        isLeader: false,
                        plateId: plateId,
                        luckyNumber: -1,
                        gotTheCoin: false
                    })
                    const userIdx = users.map(e=>e.name).indexOf(userName);
                    if (users[userIdx] !== undefined && !addedByLeader) {
                        users[userIdx].socket.join(roomId);
                        users[userIdx].roomId = roomId;
    
                        users[userIdx].socket.emit('youCanJoinTheRoom', rooms[roomIdx].id);
                    }
                }
            }
            io.in(roomId).emit('displayThePlayers', rooms[roomIdx].players);
        } 
    })

    // leader options
    socket.on('loKickPlayer', (name, roomId) => {
        const roomIdx = rooms.map(e=>e.id).indexOf(roomId);
        if (rooms[roomIdx] !== undefined) {
            const playerIdx = rooms[roomIdx].players.map(e=>e.name).indexOf(name);
            if (rooms[roomIdx].players[playerIdx] !== undefined) {
                rooms[roomIdx].players.splice(playerIdx, 1);

                io.in(roomId).emit('displayThePlayers', rooms[roomIdx].players);
            }
        }
    })

    socket.on('loStartGame', roomId => {
        const roomIdx = rooms.map(e=>e.id).indexOf(roomId);
        if (rooms[roomIdx] !== undefined) {
            io.in(roomId).emit('startCutting', rooms[roomIdx].players);

            rooms[roomIdx].locked = true;

            while (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                if (rooms[roomIdx].players[rooms[roomIdx].turnIdx].disconnected) {
                    rooms[roomIdx].turnIdx++;
                }
                else {
                    break;
                }
            }
            
            if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                io.in(roomId).emit('displayPlayerOnTurn', rooms[roomIdx].players[rooms[roomIdx].turnIdx]);
            }
            else {
                rooms[roomIdx].turnIdx = 1;
                if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                    io.in(roomId).emit('displayPlayerOnTurn', rooms[roomIdx].players[rooms[roomIdx].turnIdx]);
                }
            }
        }
    })

    socket.on('loSearchCoin', roomId => {
        searchForTheCoin(roomId);
    })

    // slice choosing
    socket.on('iChoseASlice', (name, roomId, luckyNumber) => { // if name == '', the leader chooses for the player on turn.
        const roomIdx = rooms.map(e=>e.id).indexOf(roomId);
        if (rooms[roomIdx] !== undefined) {
            const numberIdx = rooms[roomIdx].players.map(e=>e.luckyNumber).indexOf(luckyNumber);
            if (numberIdx == -1) {
                let leaderChoosePermission = false;
                if (name == '') {
                    leaderChoosePermission = true;
    
                    if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                        if (rooms[roomIdx].players[rooms[roomIdx].turnIdx].disconnected) {
                            name = rooms[roomIdx].players[rooms[roomIdx].turnIdx].name;
                        }
                        
                        if (rooms[roomIdx].turnIdx >= rooms[roomIdx].players.length-1) {
                            // everyone connected and disconnected has chosen.
                        }
                    }
                }
    
                const turnIdx = rooms[roomIdx].turnIdx;
                if (rooms[roomIdx].players[turnIdx] !== undefined) {
    
                    const playerOnTurnName = rooms[roomIdx].players[turnIdx].name;
                    if (name == playerOnTurnName || leaderChoosePermission) {
                        rooms[roomIdx].players[turnIdx].luckyNumber = luckyNumber;
                        io.in(roomId).emit('removeSlice', luckyNumber, rooms[roomIdx].players[turnIdx]);
                        if (!leaderChoosePermission) {
                            socket.emit('takeSlice', luckyNumber, rooms[roomIdx].players[turnIdx]);
    
                            rooms[roomIdx].turnIdx++;
                            if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                                while (rooms[roomIdx].players[rooms[roomIdx].turnIdx].disconnected) {
                                    rooms[roomIdx].turnIdx++;
                                    if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] === undefined) break;
                                }
        
                                const turnIdx = rooms[roomIdx].turnIdx;
                                if (rooms[roomIdx].players[turnIdx] !== undefined) {
                                    const playerOnTurn = rooms[roomIdx].players[turnIdx];
                                    io.in(roomId).emit('displayPlayerOnTurn', playerOnTurn);
                                }
                            }
        
                            if (rooms[roomIdx].turnIdx >= rooms[roomIdx].players.length) {
                                // everyone connected has chosen.
                                rooms[roomIdx].turnIdx = 0;
    
                                while (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                                    if (rooms[roomIdx].players[rooms[roomIdx].turnIdx].disconnected) {
                                        name = rooms[roomIdx].players[rooms[roomIdx].turnIdx].name;
                                        break;
                                    }
                                    else {
                                        rooms[roomIdx].turnIdx++;
                                    }
                                }
    
                                if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                                    io.in(roomId).emit('displayPlayerOnTurn', rooms[roomIdx].players[rooms[roomIdx].turnIdx]);
                                }
                            }
                        }
                        else {
                            roomId.hasDisconnetedPlayers = true;
    
                            rooms[roomIdx].turnIdx++;
                            while (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                                if (rooms[roomIdx].players[rooms[roomIdx].turnIdx].disconnected) {
                                    name = rooms[roomIdx].players[rooms[roomIdx].turnIdx].name;
                                    break;
                                }
                                else {
                                    rooms[roomIdx].turnIdx++;
                                }
                            }
    
                            if (rooms[roomIdx].players[rooms[roomIdx].turnIdx] !== undefined) {
                                io.in(roomId).emit('displayPlayerOnTurn', rooms[roomIdx].players[rooms[roomIdx].turnIdx]);
                            }
                        }
                    }
                }
            }
        }
    })
})

function searchForTheCoin(roomId) {
    const roomIdx = rooms.map(e=>e.id).indexOf(roomId);
    if (rooms[roomIdx] !== undefined) {
        rooms[roomIdx].turnIdx = rooms[roomIdx].players.length;
        rooms[roomIdx].ended = true;
        
        const luckyDraw = getRnd(1, rooms[roomIdx].players.length+1);
        
        const winnerIdx = rooms[roomIdx].players.map(e=>e.luckyNumber).indexOf(luckyDraw);
        if (rooms[roomIdx].players[winnerIdx] !== undefined) {
            const winner = rooms[roomIdx].players[winnerIdx];
            io.in(roomId).emit('searchAndDisplayWinner', winner);
        }
    }
}