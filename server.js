var http = require('express').createServer();
var io = require('socket.io').listen(http),
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    openid = require('openid'),
    mongoose = require('mongoose');

/* production settings for socket.io */
//io.enable('browser client minification');  // send minified client
//io.enable('browser client etag');          // apply etag caching logic based on version number
//io.set('log level', 1);                    // reduce logging

io.set('transports',['websocket','flashsocket']);
/*,'htmlfile','xhr-polling','jsonp-polling'*/


callback = function(func,opts){	  //http://onemarco.com/2008/11/12/callbacks-and-binding-and-callback-arguments-and-references/
	var cb = function(){
		var args = opts.args ? opts.args : [];
		var scope = opts.scope ? opts.scope : this;
		var fargs = opts.supressArgs === true ?
			[] : toArray(arguments);
		func.apply(scope,fargs.concat(args));
	}
	return cb;
};
toArray = function(arrayLike){  //A utility function for callback()
	var arr = [];
	for(var i = 0; i < arrayLike.length; i++){
		arr.push(arrayLike[i]);
	}
	return arr;
};



//connect to the database
mongoose.connect('mongodb://localhost/game');
var Schema = mongoose.Schema;
var Player = new Schema({playerid:String,playername:String});
var playerModel = mongoose.model('playerModel',Player);

getPlayerFromDB = function(playerid,func) { //get the player from the database
  playerModel.findOne({'playerid':playerid},callback(function(err,player) {
    func(err,player);
  },{'args':func}));
};
addPlayerToDB = function(playerid,playername,func) { //add the player to the database
  getPlayerFromDB(playerid,function(err,player){
    if (!player) {
      console.log('creating a new player in the database');
      var player = new playerModel();
    }
    player.playerid = playerid;
    player.playername = playername;
    player.save(callback(function (err) {
      func(err);
    },{'args':func}));
  });
};

addPlayerToDB('321','asdf',function(err){
  if (err) { console.log('error adding player to db'); }
  else {
    getPlayerFromDB('1234',function(err,player) {
      if (err) { console.log('error getting player from db'); }
      else { console.log('Player '+player.playerid+', '+player.playername); }
    });
  }
});


var randomOrder = function(){ return (Math.round(Math.random())-0.5); };

function checkTiles(tiles) {
  var tempTiles = [], x, y, number, jx, jy, res = 1;
  for (var i=0,len=tiles.length; i<len; ++i) {  //create the tempTiles arrray containing all 6s and 8s
    if ((tiles[i][3] == '8')||(tiles[i][3] == '6')) { tempTiles.push(tiles[i]);  }
  }
  for (var i=0,len=tempTiles.length; i<len; ++i) {
    x = tempTiles[i][0];
    y = tempTiles[i][1];
    number = tempTiles[i][3];
    for (var j=0,lenn=tempTiles.length; j<lenn; ++j) {
      //check for nearby 6s and 8s...
      jx = tempTiles[j][0];
      jy = tempTiles[j][1];
      if (x == jx) {
       if (eval(y-4) == jy) { res = 0; }
       if (eval(y+4) == jy) { res = 0; }
      }
      if ((eval(x+2) == jx)||(eval(x-2) == jx)) {
        if (eval(y-2) == jy) { res = 0; }
        if (eval(y+2) == jy) { res = 0; }
      }
    }
  }
  return res;
};

var boardData = function() {
  this.basic = {
    fixedTiles: [[3,12,"sea",0],[5,10,"sea",0],[7,8,"sea",0],[9,6,"sea",0],[11,8,"sea",0],[13,10,"sea",0],[15,12,"sea",0],[15,16,"sea",0],[15,20,"sea",0],[15,24,"sea",0],[13,26,"sea",0],[11,28,"sea",0],[9,30,"sea",0],[7,28,"sea",0],[5,26,"sea",0],[3,24,"sea",0],[3,20,"sea",0],[3,16,"sea",0]],
    positions: [[5,14],[7,12],[9,10],[11,12],[13,14],[13,18],[13,22],[11,24],[9,26],[7,24],[5,22],[5,18],[7,16],[9,14],[11,16],[11,20],[9,22],[7,20],[9,18]],
    types: ['desert','sheep','sheep','sheep','sheep','brick','brick','brick','wheat','wheat','wheat','wheat','ore','ore','ore','wood','wood','wood','wood'],
    numbers: [11,12,9,4,6,5,10,3,11,4,8,8,10,9,3,5,2,6]
  };
  this.sea = {
    fixedTiles: [[3,12,"sea",0],[5,10,"sea",0],[7,8,"sea",0],[9,6,"sea",0],[11,8,"sea",0],[13,10,"sea",0],[15,12,"sea",0],[15,16,"sea",0],[5,26,"sea",0],[3,24,"sea",0],[3,20,"sea",0],[3,16,"sea",0],[7,24,"sea",0],[9,22,"sea",0],[11,20,"sea",0],[13,18,"sea",0],[5,30,"sea",0],[7,32,"sea",0],[9,34,"sea",0],[11,32,"sea",0],[13,30,"sea",0],[15,28,"sea",0],[17,26,"sea",0],[17,22,"sea",0],[17,18,"sea",0],[3,28,"sea",0],[17,14,"sea",0],[11,24,"sea",0],[13,26,"sea",0]],
    positions: [[5,14],[7,12],[9,10],[11,12],[13,14],[13,22],[9,26],[5,22],[5,18],[7,16],[9,14],[11,16],[7,20],[9,18],[7,28],[15,20],[9,30],[11,28],[15,24]],
    types: ['desert','sheep','sheep','sheep','sheep','brick','brick','brick','wheat','wheat','wheat','wheat','ore','ore','ore','wood','wood','wood','wood'],
    numbers: [11,12,9,4,6,5,10,3,11,4,8,8,10,9,3,5,2,6]
  };
};
var generateTiles = function(board) {
  var boards = new boardData();
  if (!(board)) { board = 'basic'; }
  console.log('Generating a '+board+' board');
  var fixedTiles = boards[board].fixedTiles;
  var positions = boards[board].positions;
  var types = boards[board].types;
  var numbers = boards[board].numbers;
  types.sort(randomOrder); numbers.sort(randomOrder);
  var type = '', tiles = [];
  for (var i=0,len=positions.length; i<len; ++i) {
    type = types.pop();
    if (type == 'desert') { number = 0; }
    else { number = numbers.pop(); }
    tiles[i] = [positions[i][0],positions[i][1],type,number];
  }
  if (!(checkTiles(tiles))) {
    tiles = generateTiles(board);
  } else {
    tiles = tiles.concat(fixedTiles);
  }
    return tiles;
};


var currentMode = function(gameid) { //returns the current mode (initializing/start/play/finished)
  if (games[gameid].currentTurn == -100) { return 'finished'; }
  else if (games[gameid].currentTurn < 0) { return 'initializing'; }
  else if (games[gameid].currentTurn <= games[gameid].maxPlayers*2) { return 'start'; }
  else { return 'play'; }
};
var currentPlayer = function(gameid) { //returns the number of the current player.
  gameid = Number(gameid);
  if (games[gameid].currentTurn <= 0) { return 0; }
  else if (games[gameid].currentTurn <= games[gameid].maxPlayers) { return games[gameid].currentTurn; }
  else if (games[gameid].currentTurn <= games[gameid].maxPlayers*2) { return eval((games[gameid].currentTurn-(games[gameid].maxPlayers*2)-1)*-1); }
  else { return eval((games[gameid].currentTurn-1)%games[gameid].maxPlayers+1); }
};

var endTurn = function(gameid) {
  games[gameid].currentTurn += 1;
  io.of('/'+gameid).emit('turn',games[gameid].currentTurn);
  konsole('debug','Turn '+games[gameid].currentTurn+' begins. Player '+currentPlayer(gameid)+' is the current player.');
  console.log('Game '+gameid+': Turn '+games[gameid].currentTurn+' begins. Player '+currentPlayer(gameid)+' is the current player.');
  sendCards(gameid,currentPlayer(gameid));
  for (playa in games[gameid].players) {
    games[gameid].players[playa].developmentCardsPending = [];
    games[gameid].players[playa].trade = {give:{},get:{},player:0};
  }
};

var rollDice = function(gameid) {
  var a = Math.floor(Math.random()*5)+1;
  var b = Math.floor(Math.random()*5)+1;
  io.of('/'+gameid).emit('dice',[a,b]);
  if (eval(a+b) == 7) {
    games[gameid].robberMoving = 1;
  } else {
    payNumber(gameid,a+b);
  }
};
var sendCards = function(gameid,player) {
  games[gameid].players[player-1].sock.emit('cards',games[gameid].players[player-1].cards);
  games[gameid].players[player-1].sock.emit('developmentCards',games[gameid].players[player-1].developmentCards,games[gameid].players[player-1].developmentCardsPending);
};
var sendStats = function(gameid,player) {
  if (typeof(player) == 'undefined') {
    for (playa in games[gameid].players) { io.of('/'+gameid).emit('stats',getStats(gameid,Number(playa)+1)); } //loop through all the players if the player was not specified
  }
  else {
    io.of('/'+gameid).emit('stats',getStats(gameid,player)); //send the stats for the player specified
  }
};
var getStats = function(gameid,player) {
  var stats = {
    'player':player,
    'playername':games[gameid].players[player-1].playername,
    'cards':0,
    'developments':games[gameid].players[player-1].developmentCards.length,
    'roads':0,
    'vp':0,
    'service':games[gameid].players[player-1].service
  };
  var card = 0, road = 0, settlement = 0, city = 0;
  for (card in games[gameid].players[player-1].cards) { stats.cards += games[gameid].players[player-1].cards[card]; } //add up the players cards
  for (road in games[gameid].roads) { if (games[gameid].roads[road][2] == player) { stats.roads += 1; } } //add up the players roads
  for (settlement in games[gameid].settlements) { if (games[gameid].settlements[settlement][2] == player) { stats.vp += 1; } } //add up the players settlements
  for (city in games[gameid].cities) { if (games[gameid].cities[city][2] == player) { stats.vp += 2; } } //add up the players cities
//TODO: if longest road or largest army  stats.vp += 2;
  for (devCard in games[gameid].players[player-1].developmentCards) { if (games[gameid].players[player-1].developmentCards[devCard] == 'freevp') { stats.vp += 1; } }
  return stats;
};

var payNumber = function(gameid,number) {
  if (number == 7) {
    //if (currentPlayer(gameid) == thisPlayer) { moveRobber(); }
  } else {
    for (tile in games[gameid].tiles) { if (games[gameid].tiles[tile][3] == number) {
      var x = games[gameid].tiles[tile][0];
      var y = games[gameid].tiles[tile][1];
      if (!((x == games[gameid].robberLocation[0])&&(y == games[gameid].robberLocation[1]))) { //if the robber isn't on this tile...
      var positions = [[x-1,y],[x-1,y-2],[x-1,y+2],[x+1,y],[x+1,y-2],[x+1,y+2]];
      for(position in positions) {
        var add = 0;
        var playa = 0;
        var type = '';
        for (settlement in games[gameid].settlements) {
          if ((games[gameid].settlements[settlement][0] == positions[position][0])&&(games[gameid].settlements[settlement][1] == positions[position][1])) {
            var tileObject = getTile(gameid,x,y)
            add=1; playa = games[gameid].settlements[settlement][2]; type = tileObject[2];
          }
        }
        for (city in games[gameid].cities) {
          if ((games[gameid].cities[city][0] == positions[position][0])&&(games[gameid].cities[city][1] == positions[position][1])) {
            add=2; playa = games[gameid].cities[city][2]; type = getTile(gameid,x,y)[2];
          }
        }
        if ((add)&&(playa)) {
          var playah = games[gameid].players[playa-1];
          if (type == 'ore') { playah.cards.ore += add; }
          if (type == 'wheat') { playah.cards.wheat += add; }
          if (type == 'brick') { playah.cards.brick += add; }
          if (type == 'wood') { playah.cards.wood += add; }
          if (type == 'sheep') { playah.cards.sheep += add; }
        }
      }
      }
    }}
  }
};
var payIntersection = function(gameid,x,y,player) { //x,y = the location of a city/settlement to payout
  x = Number(x);
  y = Number(y);
  var positions = [[x-1,y-2],[x-1,y+2],[x+1,y],[x-1,y],[x+1,y-2],[x+1,y+2]];
  for (i in positions) {
    for(tile in games[gameid].tiles) {
      if ((games[gameid].tiles[tile][0] == positions[i][0])&&(games[gameid].tiles[tile][1] == positions[i][1])) {
        if (games[gameid].tiles[tile][2] == 'ore') { games[gameid].players[player-1].cards.ore += 1; }
        if (games[gameid].tiles[tile][2] == 'wheat') { games[gameid].players[player-1].cards.wheat += 1; }
        if (games[gameid].tiles[tile][2] == 'brick') { games[gameid].players[player-1].cards.brick += 1; }
        if (games[gameid].tiles[tile][2] == 'wood') { games[gameid].players[player-1].cards.wood += 1; }
        if (games[gameid].tiles[tile][2] == 'sheep') { games[gameid].players[player-1].cards.sheep += 1; }
      }
    }
  }
};

var getTile = function(gameid,x,y) { //returns: [x,y,type,number]
  for (tile in games[gameid].tiles) {
    if ((games[gameid].tiles[tile][0] == x)&&(games[gameid].tiles[tile][1] == y)) {
      return games[gameid].tiles[tile];
    }
  }
  return [];
};
var getRoad = function(gameid,x,y) { //returns: [x,y,player]
  for (road in games[gameid].roads) {
    if ((games[gameid].roads[road][0] == x)&&(games[gameid].roads[road][1] == y)) {
      return games[gameid].roads[road];
    }
  }
  return [];
};
var getSettlement = function(gameid,x,y) { //returns: [x,y,player]
  for (settlement in games[gameid].settlements) {
    if ((games[gameid].settlements[settlement][0] == x)&&(settlements[settlement][1] == y)) {
      return games[gameid].settlements[settlement];
    }
  }
  return [];
};
var getCity = function(gameid,x,y) { //returns: [x,y,player]
  for (city in games[gameid].cities) {
    if ((games[gameid].cities[city][0] == x)&&(games[gameid].cities[city][1] == y)) {
      return games[gameid].cities[city];
    }
  }
  return [];
};
var konsole = function(gameid,type,msg) {
  io.of('/'+gameid).emit('console',[type,msg]);
};

var checkRoad = function(gameid,x,y,player) { //returns 1 if its ok to build a road here
  var res = 1;
  for (road in games[gameid].roads) { //is there a road already here?
    if ((games[gameid].roads[road][0] == x)&&(games[gameid].roads[road][1] == y)) { res = 0; }    
  }
  if (!(currentMode(gameid) == 'start')) {
    if ((games[gameid].players[player-1].cards.wood < 1)||(games[gameid].players[player-1].cards.brick < 1)) { res = 0; } //does this player have enough resources?
  }
  return res;
};
var buildRoad = function(gameid,x,y,player) {
  games[gameid].roads.push([x,y,player]);
  if (!(currentMode(gameid) == 'start')) {
    games[gameid].players[player-1].cards.wood -= 1;
    games[gameid].players[player-1].cards.brick -= 1;
  }
};
var checkSettlement = function(gameid,x,y,player) { //returns 1 if its ok to build a settlement here
  var res = 1;
  for (settlement in games[gameid].settlements) { //is there a settlement already here?
    if ((games[gameid].settlements[settlement][0] == x)&&(games[gameid].settlements[settlement][1] == y)) { res = 0; }
  }
  for (city in games[gameid].cities) { //is there a city already here?
    if ((games[gameid].cities[city][0] == x)&&(games[gameid].cities[city][1] == y)) { res = 0; }
  }
  if (!(currentMode(gameid) == 'start')) {
    if ((games[gameid].players[player-1].cards.wood < 1)||(games[gameid].players[player-1].cards.brick < 1)||(games[gameid].players[player-1].cards.wheat < 1)||(games[gameid].players[player-1].cards.sheep < 1)) { res = 0; } //does this player have enough resources?
  }
  return res;
};
var buildSettlement = function(gameid,x,y,player) {
  games[gameid].settlements.push([x,y,player]);
  if (!(currentMode(gameid) == 'start')) {
    games[gameid].players[player-1].cards.wood -= 1;
    games[gameid].players[player-1].cards.brick -= 1;
    games[gameid].players[player-1].cards.wheat -= 1;
    games[gameid].players[player-1].cards.sheep -= 1;
  } else if (games[gameid].currentTurn > games[gameid].maxPlayers) {
    payIntersection(gameid,x,y,player);
  }
};
var checkCity = function(gameid,x,y,player) { //returns 1 if its ok to build a city here
  var res = 0;
  for (settlement in games[gameid].settlements) {
    if (((games[gameid].settlements[settlement][0] == x)&&(games[gameid].settlements[settlement][1] == y))||(!(currentMode(gameid) == 'start'))) { //is there a settlement here?
      if (games[gameid].settlements[settlement][2] == player) { res = 1; } //is the settlement owned by this player?
    }
  }
  if (!(currentMode(gameid) == 'start')) {
    if ((games[gameid].players[player-1].cards.ore < 3)||(games[gameid].players[player-1].cards.wheat < 2)) { res = 0; } //does this player have enough resources?
  }
  return res;
};
var buildCity = function(gameid,x,y,player) {
  for (settlement in games[gameid].settlements) {
    if ((games[gameid].settlements[settlement][0] == x)&&(games[gameid].settlements[settlement][1] == y)) { //find the old settlement
      games[gameid].settlements.splice(settlement,1); //remove the old settlement
    }
  }
  games[gameid].cities.push([x,y,player]); //add the new city
  if (!(currentMode(gameid) == 'start')) {
    games[gameid].players[player-1].cards.ore -= 3;
    games[gameid].players[player-1].cards.wheat -= 2;
  }
};
var robberMove = function(gameid,player,x,y) {
  x = Number(x);
  y = Number(y);
  io.of('/'+gameid).emit('robber',[x,y]);
  games[gameid].robberLocation = [x,y];
  games[gameid].robberMove = 2;
};
var knightMove = function(gameid,player,x,y) {
  x = Number(x);
  y = Number(y);
  io.of('/'+gameid).emit('robber',[x,y]);
  games[gameid].robberLocation = [x,y];
  games[gameid].robberMove = 2;
  var d = 0, dcardstack = games[gameid].players[player-1].developmentCards;
  for (d in dcardstack) { if (dcardstack[d] == 'knight') { break; } }
  games[gameid].players[player-1].developmentCards.splice(d,1); //remove this card from the players stack
  sendCards(gameid,player);
};
var robberSteal = function(gameid,player,victim) {
  var cardz = [];
  victim = Number(victim);
  player = Number(player);
  if (victim > 0) {
  var cardstacks = games[gameid].players[victim-1].cards;
  for (cardstack in cardstacks) {
    for (i=0;i<cardstacks[cardstack];i++) { cardz.push(cardstack); }
  }
  if (!(cardz == [])) {
    var stealThis = cardz[Math.floor(Math.random()*cardz.length)];
console.log(gameid+': victim: '+victim);
console.log(gameid+': '+cardz);
console.log(gameid+': Stealing: '+stealThis);
    games[gameid].players[victim-1].cards[stealThis] = Number(games[gameid].players[victim-1].cards[stealThis]) - 1;
    games[gameid].players[player-1].cards[stealThis] = Number(games[gameid].players[player-1].cards[stealThis]) + 1;
    sendCards(gameid,player);
    sendCards(gameid,victim);
    sendStats(gameid,player);
    sendStats(gameid,victim);
  }
  }
  games[gameid].robberMove = 0;
};

var getDevelopment = function(gameid,player) {
if (currentPlayer(gameid) == player) { //is it this players turn?
  if (games[gameid].developmentCardStack.length) {  //if there are any development cards left...
    var devCard = games[gameid].developmentCardStack.pop();
    games[gameid].players[player-1].developmentCards.push(devCard);
    games[gameid].players[player-1].developmentCardsPending.push(devCard);
    games[gameid].players[player-1].cards.ore -= 1;
    games[gameid].players[player-1].cards.wheat -= 1;
    games[gameid].players[player-1].cards.sheep -= 1;
    sendStats(gameid,player);
  }
  sendCards(gameid,player);
  sendStats(gameid,player);
}
};

var generateDevelopmentCards = function() {
var devCards = ['knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','knight','freeroad','freevp','freeroad','freeres','freevp','freevp','freeres','freeroad'];
return devCards; //.sort(randomOrder);
};

var trade = function(gameid,player,data) {
  var bool = 1;
  for (i in data.give) {
    if (games[gameid].players[player-1].cards[i] < data.give[i]) { bool = 0; } //check that the player has enough cards to offer
  }
  if (bool) {
    if (data.player) { data.player = player; games[gameid].players[data.player-1].sock.emit('trade',data); }
    else {
      if (player == currentPlayer(gameid)) {
        data.player = player; io.of('/'+gameid).emit('trade',data);
      } else {
        data.player = player; games[gameid].players[currentPlayer(gameid)-1].sock.emit('trade',data);
      }
    }
  }
};
var tradeAccept = function(gameid,player,data) {
  games[gameid].players[player-1].trade = data;
  var matching = 1, enough = 1;
  for (i in data.give) {
    if (!(data.give[i] == games[gameid].players[data.player-1].trade.get[i])) { matching = 0; }
    if (!(data.get[i] == games[gameid].players[data.player-1].trade.give[i])) { matching = 0; }
    if (games[gameid].players[player-1].cards[i] < games[gameid].players[player-1].trade.give[i]) { enough = 0; } //check that the players have enough cards to trade
    if (games[gameid].players[data.player-1].cards[i] < games[gameid].players[data.player-1].trade.give[i]) { enough = 0; }
  }
  if (enough) {
    games[gameid].players[data.player-1].sock.emit('trade',{give:data.give,get:data.get,player:player});
  }
  if ((matching)&&(enough)) {
    console.log('matching');
    for (i in data.give) {
      games[gameid].players[data.player-1].cards[i] += data.give[i];
      games[gameid].players[player-1].cards[i] -= data.give[i];
    }
    for (i in data.get) {
      games[gameid].players[data.player-1].cards[i] -= data.get[i];
      games[gameid].players[player-1].cards[i] += data.get[i];
    }
    sendCards(gameid,player);
    sendCards(gameid,data.player);
    sendStats(gameid);
  }
};
var tradeDecline = function(gameid,player,data) {
  games[gameid].players[data.player-1].sock.emit('tradeDecline',{give:data.give,get:data.get,player:player});
};
var bank = function(gameid,player,data) {
  var i = 0, j = 0, x = '', y = '';
  for (k in data[0]) { if (data[0][k]) { i += 1; x = k; } }
  for (l in data[1]) { if (data[1][l]) { j += 1; y = l; } }
  if ((i == 1)&&(j == 1)&&(!(x == y))) {
    var ratio = 4;  //TODO: check for harbours and set this ratio
    if (data[0][x]>=eval(ratio*data[1][y])) {  //if the right amount of cards are selected
      games[gameid].players[player-1].cards[y] += data[1][y];
      games[gameid].players[player-1].cards[x] -= eval(ratio*data[1][y]);
      sendCards(gameid,player);
      sendStats(gameid);
    }
  }
};
var chat = function(gameid,player,playername,data) {
  io.of('/'+gameid).emit('chat',player,playername,data);
};
var lobbychatbuffer = [];
var lobbychat = function(playerid,playername,playerservice,data) {
  var date = new Date();
  var then, now, counter = 3;
  for (line in lobbychatbuffer) {
    if (lobbychatbuffer[line].playerid == playerid) {
      then = new Date(lobbychatbuffer[line].date).getTime();
      now = date.getTime();
      if (now-then<10000) { counter -= 1; } //if its been less than 10 seconds since this player last said something
    }
  }
  if (counter) {
    if (lobbychatbuffer.length >= 10) { lobbychatbuffer.splice(0,1); }
    var date = date.toUTCString();
    lobbychatbuffer.push({'playerid':playerid,'playername':playername,'playerservice':playerservice,'data':data,'date':date});
    io.of('/lobby').emit('chat',date,playerid,playername,playerservice,data);
  }
};


/*
var game = {
  tiles:[ [x,y,type,number] ],
  roads:[ [x,y,player] ],
  settlements:[ [x,y,player] ],
  cities:[ [x,y,player] ],
  players:[
    { cards:{ore:0,wheat:0,wood:0,brick:0}, developments:[] }
  ],
  currentTurn:0
  robber:1
  robberLocation:[x,y]
};
*/
var games = [];
var newGame = function(data){
var gameid = games.push({
  type:data.type,
  name:data.name,
  tiles:generateTiles(data.type),
  harbours:[[5,12,'coal'],[8,9,'ore'],[4,19,'wood'],[7,22,'wheat'],[10,19,'sheep']],
  roads:[],
  settlements:[],
  cities:[],
  players:[],
  currentTurn:0,
  robber:data.robber,
  maxPlayers:4,
  robberLocation:[-1,-1],
  robberMove:0,
  developmentCardStack:generateDevelopmentCards()
})-1;
console.log('Game '+gameid+': Initializing');
io.of('/'+gameid).on('connection', function (socket) {
  socket.emit('login');
  socket.on('login',function(data){
    var playername = '', playerid, key;
    for (p in players) {
      if ((encodeURIComponent(data.id) == players[p].id)&&(encodeURIComponent(data.key) == players[p].key)) {
        playername = players[p].nickname;
        playerid = encodeURIComponent(data.key);
        key = players[p].key;
        service = players[p].service;
      }
    }
    if (!(playername == '')) {
	  socket.set('playername',playername);
	  if (games[gameid].players.length < games[gameid].maxPlayers) {
	    var player = games[gameid].players.push({ cards:{ore:0,wheat:0,wood:0,brick:0,sheep:0}, developmentCards:[], developmentCardsPending:[], sock:socket, trade:{give:{},get:{},player:0}, 'playername':playername, 'playerid':playerid, 'service':service, 'key':key });
	    io.of('/lobby').emit('game',[games[gameid].type,games[gameid].name,games[gameid].players.length+'/'+games[gameid].maxPlayers,gameid]);
      console.log('Game '+gameid+': Player '+player+' connected');
	    socket.emit('init',{
	      player: player,
	      tiles: games[gameid].tiles,
	      harbours: games[gameid].harbours,
	      robber: games[gameid].robber
	    });
	    socket.set('player',player);
	    socket.set('gameid',gameid);
            sendStats(gameid);
            sendCards(gameid,player);
	    if ((games[gameid].currentTurn == 0)&&(games[gameid].players.length == games[gameid].maxPlayers)) { endTurn(gameid); } //start the game
	    socket.on('build',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		  if (!(games[gameid].robberMove)) {
		    var o = 0;
		    if (data[2] == 'road') { if (checkRoad(gameid,data[0],data[1],player)) { o = 1; buildRoad(gameid,data[0],data[1],player); console.log('Game '+gameid+': Player '+player+' built a road'); } }
		    if (data[2] == 'settlement') { if (checkSettlement(gameid,data[0],data[1],player)) { o = 1; buildSettlement(gameid,data[0],data[1],player); console.log('Game '+gameid+': Player '+player+' built a settlement'); } }
		    if (data[2] == 'city') { if (checkCity(gameid,data[0],data[1],player)) { o = 1; buildCity(gameid,data[0],data[1],player); console.log('Game '+gameid+': Player '+player+' built a city'); } }
		    if (o) {
		      games[gameid].players[player-1].sock.broadcast.emit('build',[data[0],data[1],data[2],player]);
		      sendStats(gameid,player);
		    }
		  }
	      });
	      });
	    });
	    socket.on('end',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      if (!(games[gameid].robberMove)) {
		        if (player == currentPlayer(gameid)) { endTurn(gameid); }
		        else { konsole('info','Its not your turn!'); }
		      }
	      });
	      });
	    });
	    socket.on('dice',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      if (!(games[gameid].robberMove)) {
		        rollDice(gameid);
		        sendStats(gameid);
		        console.log('Game '+gameid+': Player '+player+' rolled the dice');
		      }
	      });
	      });
	    });
	    socket.on('knightMove',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      if (data instanceof Array) {
		      if (data.length = 2) {
		        var x = sanitize(data[0]).toInt();
		        var y = sanitize(data[1]).toInt();
		        if (currentPlayer(gameid) == player) {
		          knightMove(gameid,player,x,y);
		        } else { console.log('Invalid data (wrong player): '+data); }
		      } else { console.log('Invalid data: '+data); }
		      } else { console.log('Invalid data: '+data); }
	      });
	      });
	    });
	    socket.on('robberMove',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      if (data instanceof Array) {
		      if (data.length = 2) {
		        var x = sanitize(data[0]).toInt();
		        var y = sanitize(data[1]).toInt();
		        if (currentPlayer(gameid) == player) {
		          knightMove(gameid,player,x,y);
		        } else { console.log('Invalid data (wrong player): '+data); }
		      } else { console.log('Invalid data: '+data); }
		      } else { console.log('Invalid data: '+data); }
	      });
	      });
	    });
	    socket.on('robberSteal',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      if (data) {
		        var victim = sanitize(data).toInt();
		        robberSteal(gameid,player,victim);
		      } else { console.log('Invalid data'); }
	      });
	      });
	    });
	    socket.on('getDevelopment',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      getDevelopment(gameid,player);
	      });
	      });
	    });
	    socket.on('trade',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      //if (data) {
		      //if ((data.player)&&(data.give)&&(data.get)) {
		        //data.player = sanitize(data.player).toInt();
		        //if ((data.player>0)&&(data.player<8)) {
		      trade(gameid,player,data);
		        //}
		      //} else { console.log('Invalid data: '+data); }
		      //} else { console.log('Invalid data'); }
	      });
	      });
	    });
	    socket.on('tradeAccept',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      tradeAccept(gameid,player,data);
	      });
	      });
	    });
	    socket.on('tradeDecline',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      tradeDecline(gameid,player,data);
	      });
	      });
	    });
	    socket.on('bank',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      bank(gameid,player,data);
	      });
	      });
	    });
	    socket.on('chat',function(data){
	      socket.get('player',function(err,player){
	      socket.get('playername',function(err,playername){
	      socket.get('gameid',function(err,gameid){
		      chat(gameid,player,playername,data);
	      });
	      });
	      });
	    });
	    socket.on('disconnect',function(data){
	      socket.get('player',function(err,player){
	      socket.get('gameid',function(err,gameid){
		      games[gameid].players[player-1].playerid = '';
		      var p, q = 0;
		      for (p in games[gameid].players) {
		        if (games[gameid].players[p].playerid == '') { q += 1; }
		      }
		      if ((q == games[gameid].players.length)&&(games[gameid].currentTurn > 0)) { games.splice(gameid,1); }
	      });
	      });
	    });
	  } else { //game full
	    console.log('Game full');
	    //socket.emit('gameid','/'+newGame()); //start a new game and redirect the client to it
	  }
	  if ((games[gameid].players.length == games[gameid].maxPlayers)&&(games[gameid].currentTurn == 0)) {
	    //Start the game
	    console.log('Game '+gameid+': Starting');
	    endTurn(gameid);
	  }
      }
    });
  });
return gameid;
};


//newGame(); //start a game as soon as the server starts
var lobby = io.of('/lobby').on('connection',function(socket){  //initial connection from the client
  socket.emit('login');
  socket.on('login',function(data){
    var playername = '';
    for (p in players) {
      if ((encodeURIComponent(data.id) == players[p].id)&&(encodeURIComponent(data.key) == players[p].key)) { playerid = players[p].id; playername = players[p].nickname; playerservice = players[p].service; }
    }
    if (!(playername == '')) {
	    socket.set('playerid',playerid);
	    socket.set('playername',playername);
	    socket.set('playerservice',playerservice);
	    var i, gameslist = [], playerslist = [];
	    for (i in games) {
	      gameslist.push([games[i].type,games[i].name,games[i].players.length+'/'+games[i].maxPlayers,i]);
	    }
      for (i in players) {
        playerslist.push({ 'id': players[i].id, 'nickname': players[i].nickname, 'service': players[i].service });
      }
	    socket.emit('games',gameslist);
	    io.of('/lobby').emit('players',playerslist);
      var line;
      for (line in lobbychatbuffer) {
        socket.emit('chat',lobbychatbuffer[line].date,lobbychatbuffer[line].playerid,lobbychatbuffer[line].playername,lobbychatbuffer[line].playerservice,lobbychatbuffer[line].data);
      }
	    socket.on('chat',function(data){
	      socket.get('playerid',function(err,playerid){
	      socket.get('playername',function(err,playername){
	      socket.get('playerservice',function(err,playerservice){
          data = sanitize(data).xss().trim();
          if (data.length) {
	          lobbychat(playerid,playername,playerservice,data);
          }
	      });
	      });
	      });
	    });
	    socket.on('joingame',function(data){
	      if (games[data].players.length < games[data].maxPlayers) {
	        socket.emit('gameid','/'+data); //tell the client to join the game
	      }
	    });
	    socket.on('newgame',function(data){
	      //data = {type:'sea',name:'asdfasdf',maxPlayers:4};
	      socket.emit('gameid','/'+newGame(data)); //tell the client to join the game
	    });
	    socket.on('disconnect',function(data){
	      socket.get('playerid',function(err,playerid){
          var p, plist = [];
          for (p in players) { if (players[p].id == playerid) { players.splice(p,1); } }
          console.log(players);
          for (i in players) {
            plist.push({ 'id': players[i].id, 'nickname': players[i].nickname, 'service': players[i].service });
          }
	        io.of('/lobby').emit('players',plist);
	      });
	    });
    }
  });
});




var players = [];
var relyingParty = new openid.RelyingParty(
  'http://bailus.no.de/verify', // Verification URL (yours)
  null, // Realm (optional, specifies realm for OpenID authentication)
  false, // Use stateless verification
  false, // Strict mode
  [
    new openid.SimpleRegistration({ "nickname" : true, "fullname" : true, "email": true }),
    new openid.AttributeExchange({ "http://axschema.org/namePerson/friendly": "required", "http://axschema.org/namePerson/first": "required", "http://axschema.org/namePerson/last": "required", "http://axschema.org/contact/email": "required" })
  ]
);

http.get('/', function(req, res){
  res.contentType('text/html');
  res.sendfile('login.htm');
});
http.get('/authenticate', function(req, res){
  relyingParty.authenticate(req.query.openid, false, function(error, authUrl) {
    if (error) {
      res.send('Authentication failed: ' + error);
    } else if (!authUrl) {
      res.send('Authentication failed');
    } else {
      res.redirect(authUrl);
    }
  });
});
http.get('/verify', function(req, res){
  relyingParty.verifyAssertion(req.url, function(error, result) {
    if (!error && result.authenticated) {
      res.contentType('text/html');
      var nickname;
      if (result.fullname) {
        nickname = result.fullname;
      } else if (result.nickname) {
	      nickname = result.nickname;
      } else if (result.firstname && result.lastname) {
	      nickname = result.firstname+' '+result.lastname;
      } else if (result.email) {
	      nickname = result.email.split('@',1)[0];
      } else {
	      nickname = result.claimedIdentifier;
      }
      var key = Math.floor(Math.random()*10000000000000000);
      var id = encodeURIComponent(result.claimedIdentifier);
      var s = 'openid';
      if (result.claimedIdentifier.substr(0,21) == 'https://me.yahoo.com/') { s = 'yahoo'; }
      else if (result.claimedIdentifier.substr(0,27) == 'https://live.anyopenid.com/') { s = 'live'; }
      else if (result.claimedIdentifier.substr(0,31) == 'https://facebook.anyopenid.com/') { s = 'facebook'; }
      else if (result.claimedIdentifier.substr(0,32) == 'https://www.google.com/accounts/') { s = 'google'; }
      players.push({'id':id,'nickname':nickname,'service':s,'key':key});
      console.log(result);
      console.log(players);
      res.redirect('http://bailus.no.de/game?id='+id+'&key='+key);
    } else {
      res.redirect('http://bailus.no.de/');
    }
  });
});
http.get('/game', function(req, res){
  var a = 0;
  for (p in players) {
    if ((encodeURIComponent(req.query.id) == players[p].id)&&(req.query.key == players[p].key)) { a = 1; }
  }
  if (a) {
    res.contentType('text/html');
    res.sendfile('index.htm');
  } else {
    res.redirect('http://bailus.no.de/');
  }
});
http.get('/themes/default.css', function(req, res){
  res.contentType('text/css');
  res.sendfile('themes/default.css');
});
http.get('/themes/login.css', function(req, res){
  res.contentType('text/css');
  res.sendfile('themes/login.css');
});
http.get('/lib.js', function(req, res){
  res.contentType('text/javascript');
  res.sendfile('lib.js');
});
http.get('/background.jpg', function(req, res){
  res.contentType('image/jpeg');
  res.sendfile('background.jpg');
});
/*http.get('/server.js', function(req, res){
  res.contentType('text/javascript');
  res.sendfile('server.js');
});*/

http.listen(80);







