var io = require('socket.io').listen(1337);

var randomOrder = function(){ return (Math.round(Math.random())-0.5); }

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
}

var generateTiles = function() {
/*To generate a basic catan board:*/
  var positions = [[7,8],[5,10],[9,10],[3,12],[7,12],[11,12],[5,14],[9,14],[3,16],[7,16],[11,16],[5,18],[9,18],[3,20],[7,20],[11,20],[5,22],[9,22],[7,24]];
  var types = ['desert','sheep','sheep','sheep','sheep','brick','brick','brick','wheat','wheat','wheat','wheat','ore','ore','ore','wood','wood','wood','wood'];
  var numbers = [11,12,9,4,6,5,10,3,11,4,8,8,10,9,3,5,2,6];
  positions.sort(randomOrder); types.sort(randomOrder); numbers.sort(randomOrder);
  var type = '', tiles = [];
  for (var i=0,len=positions.length; i<len; ++i) {
    type = types.pop();
    if (type == 'desert') { number = 0; }
    else { number = numbers.pop(); }
    tiles[i] = [positions[i][0],positions[i][1],type,number];
  }
  if (!(checkTiles(tiles))) { tiles = generateTiles(positions,types,numbers); }
  return tiles;
}


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
};
*/
var games;
games.push(function(){

var game = {
  tiles:generateTiles(),
  roads:[],
  settlements:[],
  cities:[],
  players:[],
  currentTurn:0,
  robber:1,
  maxPlayers:4
};
game.currentMode = function() { //returns the current mode (initializing/start/play/finished)
  if (game.currentTurn == -100) { return 'finished'; }
  if (game.currentTurn <= 0) { return 'initializing'; }
  else if (game.currentTurn <= game.maxPlayers*2) { return 'start'; }
  else { return 'play'; }
}
game.currentPlayer = function() { //returns the number of the current player.
  if (game.currentTurn <= 0) { return 0; }
  else if (game.currentTurn <= game.maxPlayers) { return game.currentTurn; }
  else if (game.currentTurn <= game.maxPlayers*2) { return eval((game.currentTurn-(game.maxPlayers*2)-1)*-1); }
  else { return eval((game.currentTurn-1)%game.maxPlayers+1); }
}

game.endTurn = function() {
  game.currentTurn += 1;
  io.sockets.emit('turn',game.currentTurn);
  game.console('debug','Turn '+game.currentTurn+' begins. Player '+game.currentPlayer()+' is the current player.');
};

game.rollDice = function() {
  var a = Math.floor(Math.random()*5)+1;
  var b = Math.floor(Math.random()*5)+1;
  io.sockets.emit('dice',[a,b]);
  game.payNumber(a+b);
};

game.refreshStats = function() {
  var stats = {};
  for (player in game.players) {
    stats[player] = {};
    var cards = 0;
    for (card in game.players[player].cards) { cards += game.players[player].cards[card]; }
    stats[player].cards = cards;
    stats[player].developments = game.players[player].developments.length;
  }
  io.sockets.emit('stats',stats);
};

game.payNumber = function(number) {
  if (number == 7) {
    //if (currentPlayer() == thisPlayer) { moveRobber(); }
  } else {
    for (tile in game.tiles) { if (game.tiles[tile][3] == number) {
      var x = game.tiles[tile][0];
      var y = game.tiles[tile][1];
      var positions = [[x-1,y],[x-1,y-2],[x-1,y+2],[x+1,y],[x+1,y-2],[x+1,y+2]]
      for(position in positions) {
        var add = 0;
        var playa = 0;
        var type = '';
        for (settlement in game.settlements) {
          if ((game.settlements[settlement][0] == positions[position][0])&&(game.settlements[settlement][1] == positions[position][1])) {
            var tileObject = game.getTile(x,y)
            add=1; playa = game.settlements[settlement][2]; type = tileObject[2];
          }
        }
        for (city in game.cities) {
          if ((game.cities[city][0] == positions[position][0])&&(game.cities[city][1] == positions[position][1])) {
            add=2; playa = game.cities[city][2]; type = game.getTile(x,y)[2];
          }
        }
        if ((add)&&(playa)) {
          var playah = game.players[playa-1];
          if (type == 'ore') { playah.cards.ore += add; }
          if (type == 'wheat') { playah.cards.wheat += add; }
          if (type == 'brick') { playah.cards.brick += add; }
          if (type == 'wood') { playah.cards.wood += add; }
          if (type == 'sheep') { playah.cards.sheep += add; }
        }
      }
    }}
  }
};

game.getTile = function(x,y) { //returns: [x,y,type,number]
  for (tile in game.tiles) {
    if ((game.tiles[tile][0] == x)&&(game.tiles[tile][1] == y)) {
      return game.tiles[tile];
    }
  }
  return [];
};
game.getRoad = function(x,y) { //returns: [x,y,player]
  for (road in game.roads) {
    if ((game.roads[road][0] == x)&&(game.roads[road][1] == y)) {
      return game.roads[road];
    }
  }
  return [];
};
game.getSettlement = function(x,y) { //returns: [x,y,player]
  for (settlement in game.settlements) {
    if ((game.settlements[settlement][0] == x)&&(settlements[settlement][1] == y)) {
      return game.settlements[settlement];
    }
  }
  return [];
};
game.getCity = function(x,y) { //returns: [x,y,player]
  for (city in game.cities) {
    if ((game.cities[city][0] == x)&&(game.cities[city][1] == y)) {
      return game.cities[city];
    }
  }
  return [];
};
game.console = function(type,msg) {
  io.sockets.emit('console',[type,msg]);
}

io.sockets.on('connection', function (socket) {
  if (game.players.length < game.maxPlayers) {
    var player = game.players.push({ cards:{ore:0,wheat:0,wood:0,brick:0,sheep:0}, developments:[] });
    socket.emit('init',{
      player: player,
      tiles: game.tiles,
      robber: game.robber
    });
    socket.set('player',player);
    game.endTurn(); //tell the clients turn 1 has started
    socket.on('build',function(data){
      socket.get('player',function(err,player){
        if (data[2] == 'road') { game.roads.push([data[0],data[1],player]); }
        if (data[2] == 'settlement') { game.settlements.push([data[0],data[1],player]); }
        if (data[2] == 'city') { game.cities.push([data[0],data[1],player]); }
        socket.broadcast.emit('build',[data[0],data[1],data[2],player]);
      });
    });
    socket.on('end',function(data){
      socket.get('player',function(err,player){
        if (player == game.currentPlayer()) { game.endTurn(); }
        else { game.console('info','Its not your turn!'); }
      });
    });
    socket.on('dice',function(data){
      socket.get('player',function(err,player){
        game.rollDice();
      });
    });
    socket.on('robber',function(data){
      socket.get('player',function(err,player){
        socket.broadcast.emit('robber',[data[0],data[1]]);
      });
    });
  } else {
    console.log('Too many players!');
    socket.emit('fail','Too many players!')
  }
  if ((game.players.length == game.maxPlayers)&&(game.currentTurn == 0)) {
    //Start the game
    game.endTurn();
  }
});

}); //games.push(function(){


/*

init:
client requests to join a game or start a game
server starts game if needed
server puts client into game object
server sends the player the board as tiles:[], sets player and other crap

start:
build: client sends array build:[x,y,'road/settlement/city'], the server then broadcasts it to the other clients as build:[x,y,'road/settlement/city',player]
trade: ?
next turn: client asks to end turn (or timeout is reached), server then starts the next turn and broadcasts it to all the clients as turn:x

play:
roll dice: client sends dice:1 to the server, the server then sends dice:[a,b] to the clients
build
trade
next turn


*/












