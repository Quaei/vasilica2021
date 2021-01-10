const socket = io.connect();

// ? _utility functions
function addElement(parentId, elementTag, elementId, html) {
    const parent = document.getElementById(parentId);
    const newElement = document.createElement(elementTag);
    if (elementId != '') newElement.setAttribute('id', elementId);
    newElement.innerHTML = html;
    parent.appendChild(newElement);
}

function removeElement(elementId) {
    const element = document.getElementById(elementId);
    element.parentNode.removeChild(element);
}

function getRndDecimal(min, max) {
    return Math.random() * (max - min) + min
}

function getRnd(min, max) {
    return Math.floor(Math.random() * (max - min) + min)
}

const tl = gsap.timeline();

function castSnowflakes() {
    const snowflakesContainer = $('#snowflakesContainer');
    const width = snowflakesContainer.width();
    const height = snowflakesContainer.height();

    const snowflakes = 200;
    for (let i = 0; i < snowflakes; i++) {
        const id = 'snowflake'+i;
        addElement('snowflakesContainer', 'i', id, '');

        const el = $('#'+id);
        el.addClass('fas fa-snowflake');

        const negativeLeftOffset = -10;
        const negativeTopOffset = -450;
        const left = negativeLeftOffset + getRnd(0, width-negativeLeftOffset);
        const top = negativeTopOffset + getRnd(0, height);

        el.css({'position': 'fixed', 'left': left, 'top': top, 'color': '#3581d3'});
    }

    // const goLeft = getRnd(0, 2);
    const iters = 5;
    for (let j = 0; j < iters; j++) {
        for (let i = 0; i < snowflakes; i++) {    
            const newTop = getRnd(18, 22);
            const topStr = '+='+newTop+'%';
            let newLeft = getRnd(0, 5);

            // if (j % 2 == goLeft) newLeft *= -1;
            newLeft -= 2*newLeft*(1-getRnd(0, 2));
            const leftStr = '+='+newLeft+'%';

            const id = 'snowflake'+i;
            let overlap = '-=0';
            if (i != 0) overlap = '-=1';

            opacity = getRndDecimal(0.8, 1);
            if (j == iters-2) opacity = 0.7;
            if (j == iters-1) opacity = 0;
            tl.to('#'+id, {top: topStr, left: leftStr, opacity: opacity, duration: 1, ease: 'linear'}, overlap);
        }
    }

    tl.to('.snowflakesContainer', {top: '-200%', opacity: '0', duration: 2}, '-=1');
    // tl.to('.snowflakesContainer', {top: '-200%', opacity: '0', duration: 0.5}, '-=1');
    
    for (let i = 0; i < snowflakes; i++) {
        const id = 'snowflake'+i;
        tl.to('#'+id, {top: '-200%', duration: 0.1}, '-=0.1');
    }

    // second window
    // tl.fromTo('.rooms', {opacity: '0'}, {opacity: '1', duration: 1.5}, '-=0.5');
}

$('.hide').hide();
let user = {};

$('#inpLogin').focus();

$('#inpLogin').keydown(e => {
    if (e.which == 13) $('#btnLogin').click();
})

$('#btnLogin').click(() => {
    const name = $('#inpLogin').val();
    if (name !== null && name != '') {
        socket.emit('iWantToLogIn', name);
    }
})

socket.on('youCanLogIn', name => {
    $('#roomsLogin').hide();
    $('#roomsMain').show();
    user.name = name;
    $('#roomsWelcome').show();
    $('#txtRoomsWelcomeName').html(user.name);
})

$('#btnShowChooseRoomMain').click(() => {
    $('#chooseRoomHeading').hide();
    $('#becomeLeaderHeading').show();

    $('#becomeLeaderMain').hide();
    $('#chooseRoomMain').show();

    socket.emit('showMeTheRooms');
})

$('#btnShowBecomeLeaderMain').click(() => {
    $('#becomeLeaderHeading').hide();
    $('#chooseRoomHeading').show();
    
    $('#chooseRoomMain').hide();
    $('#becomeLeaderMain').show();

    $('#inpBecomeLeaderName').focus();
})

$('#btnBecomeLeader').click(() => {
    const name = $('#inpBecomeLeaderName').val();
    const pass = $('#inpBecomeLeaderPassword').val();

    if (name !== null && name != '') {
        if (pass === null) pass = '';
        socket.emit('iWantToBecomeALeader', user.name, name, pass);
    }
})

socket.on('youCanEnterTheRoomAsALeader', roomId => {
    user.roomId = roomId;
    $('#rooms').hide();
    $('#pie').show();

    $('#txtPieStatusName').html(user.name);

    // lo = leader option
    // take slice
    addElement('pieStatusLeaderOptions', 'div', 'loTakeSlice', '');
    addElement('loTakeSlice', 'div', 'circleTakeSlice', '');
    addElement('loTakeSlice', 'p', 'textTakeSlice', 'Земи парче<br>за друг');
    $('#circleTakeSlice').addClass('circleDesign');

    // add player
    addElement('pieStatusLeaderOptions', 'div', 'loAddPlayer', '');
    addElement('loAddPlayer', 'div', 'circleAddPlayer', '');
    addElement('loAddPlayer', 'p', 'textAddPlayer', 'Додади<br>играч');
    $('#circleAddPlayer').addClass('circleDesign');
    
    // kick player
    addElement('pieStatusLeaderOptions', 'div', 'loKickPlayer', '');
    addElement('loKickPlayer', 'div', 'circleKickPlayer', '');
    addElement('loKickPlayer', 'p', 'textKickPlayer', 'Исфрли<br>играч');
    $('#circleKickPlayer').addClass('circleDesign');
    
    // start game
    addElement('pieStatusLeaderOptions', 'div', 'loStartGame', '');
    addElement('loStartGame', 'div', 'circleStartGame', '');
    addElement('loStartGame', 'p', 'textStartGame', 'Започни<br>со делење');
    $('#circleStartGame').addClass('circleDesign');

    // search coin
    addElement('pieStatusLeaderOptions', 'div', 'loSearchCoin', '');
    addElement('loSearchCoin', 'div', 'circleSearchCoin', '');
    addElement('loSearchCoin', 'p', 'textSearchCoin', 'Барај ја<br>паричката');
    $('#circleSearchCoin').addClass('circleDesign');
})

socket.on('displayTheRooms', rooms => {
    $('#displayRooms').empty();
    for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];

        addElement('displayRooms', 'div', room.id, '');
        const el = $('#'+room.id);
        el.addClass('roomDesign primaryBtn');

        const nameId = 'name'+room.id;
        addElement(room.id, 'p', nameId, 'Име:<br>'+room.name);

        const leaderId = 'leader'+room.id;
        addElement(room.id, 'p', leaderId, '<br>Кум:<br>'+room.leader);
    }
})

$('#displayRooms').on('click', '.roomDesign', e => {
    let id = e.target.id;
    if (id.substring(0, 4) == 'name') id = id.substring(4);
    if (id.substring(0, 6) == 'leader') id = id.substring(6);

    socket.emit('iWantToJoinTheRoom', user.name, id, false);
})

socket.on('youCanJoinTheRoom', roomId => {
    user.roomId = roomId;
    $('#rooms').hide();
    $('#pie').show();

    $('#txtPieStatusName').html(user.name);
})

socket.on('displayThePlayers', players => {
    $('#thePlates').empty();
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (player.isLeader) continue;

        const singlePlateId = 'single'+player.plateId;
        addElement('thePlates', 'div', singlePlateId, '');

        addElement(singlePlateId, 'div', player.plateId, '');
        const plate = $('#'+player.plateId);
        plate.addClass('plateDesign circleDesign');
        
        if (player.disconnected) {
            plate.addClass('disconnected');
        }

        const nameId = 'name'+player.plateId;
        addElement(singlePlateId, 'p', nameId, player.name);
    }
})

// Leader Options
user.leaderChoosePermission = false;
$('#pieStatusLeaderOptions').on('click', e => {
    const id = e.target.id;
    if (id == 'circleTakeSlice') {
        user.leaderChoosePermission = true;
        $('#'+id).addClass('activated');
    }
    else if (id == 'circleAddPlayer') {
        const nameOfPlayer = prompt('Внеси го името на играчот за додавање:');
        if (nameOfPlayer !== null) {
            socket.emit('iWantToJoinTheRoom', nameOfPlayer, user.roomId, true);
        }
    }
    else if (id == 'circleKickPlayer') {
        const nameOfPlayer = prompt('Внеси го името на играчот за исфрлање:');
        if (nameOfPlayer !== null) {
            socket.emit('loKickPlayer', nameOfPlayer, user.roomId);
        }
    }
    else if (id == 'circleStartGame') {
        socket.emit('loStartGame', user.roomId);
        $('#'+id).addClass('activated');
    }
    else if (id == 'circleSearchCoin') {
        socket.emit('loSearchCoin', user.roomId);
        $('#'+id).addClass('activated');
    }
})

// start game
socket.on('startCutting', players => {
    const pie = $('#imgPie');
    const left = pie.position().left+5;
    const top = pie.position().top+5;
    
    const imgSize = 290;
    const lineSize = 3;
    const lineHeight = imgSize/2;
    const opacity = 1;
    const lineColor = '#0e0f0d';
    
    const middleLeft = left + imgSize/2 - lineSize/2;

    const temp = players.length-1;
    const subdivisions = Math.floor(400/temp);

    const translateVal = imgSize/4;
    for (let i = 0; i < temp; i++) {
        for (let j = 0; j < subdivisions; j++) {
            const id = 'cut'+(i*subdivisions+j);
            addElement('thePie', 'p', id, '');
            const el = $('#'+id);

            const class1 = 'cut'+(i+1);
            el.addClass(class1);
            if (j == 0) {
                el.addClass('cut');
                el.css({'position': 'absolute', 'left': middleLeft, 'top': top+translateVal, 'width': lineSize+'px', 'height': '0', 'background-color': lineColor, 'border-radius': '3px', 'opacity': opacity});
            }
            else {
                el.css({'position': 'absolute', 'left': middleLeft, 'top': top+translateVal, 'width': lineSize+'px', 'height': lineHeight+'px', 'background-color': lineColor, 'border-radius': '3px', 'opacity': '0'});
            }
            
            const rotate = 360/temp*i+(360/temp)/subdivisions*j;
            el.css('transform', 'rotateZ('+rotate+'deg) translateY(-'+translateVal+'px)');
        }
    }

    tl.to('.cut', {height: lineHeight+'px', duration: 0.05, stagger: '0.3'});
})

socket.on('displayPlayerOnTurn', playerOnTurn => {
    const plateId = playerOnTurn.plateId;
    const el = $('#'+plateId);
    el.addClass('onTurn');
})

$('#thePie').click(e => {
    const id = e.target.id;
    if (id.substring(0, 3) == 'cut') {
        const class1 = e.target.classList[0];

        const luckyNumberStr = class1.substring(3, class1.length);
        const luckyNumber = parseInt(luckyNumberStr);

        if (user.leaderChoosePermission) {
            socket.emit('iChoseASlice', '', user.roomId, luckyNumber);
        }
        else {
            socket.emit('iChoseASlice', user.name, user.roomId, luckyNumber);
        }
    }
});

socket.on('takeSlice', (luckyNumber) => {
    user.luckyNumber = luckyNumber;
});

socket.on('removeSlice', (luckyNumber, playerOnTurn) => {
    const class1 = 'cut'+luckyNumber;
    $('.'+class1).css('opacity', '1');

    const plateId = playerOnTurn.plateId;
    const el = $('#'+plateId);
    el.removeClass('onTurn');
    el.addClass('fullPlate');
});

// display winner
socket.on('searchAndDisplayWinner', winner => {
    for (let i = 0; i < 100; i++) {
        const id = '#plate'+i;
        const el = $(id);
        if (el.length == 0) continue;

        tl.call(() => {
            el.addClass('onTurn');
        })
        tl  .to(id, {opacity: 0.5, duration: 0.5})
            .to(id, {opacity: 1, duration: 0.5});
        tl.call(() => {
            el.removeClass('onTurn');
        })
    }

    const plateId = winner.plateId;
    const el = $('#'+plateId);

    tl.call(() => {
        el.addClass('onTurn');
    })
    tl.to('#'+plateId, {backgroundImage: 'url(./images/coin.png)', backgroundSize: 'cover', duration: 1});
})