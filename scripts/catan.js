var turnCounter = 0;
var totalPlayers = 4;
var thisPlayer = 0;
//var cards = { 'ore': 7, 'wheat':8, 'wood':6, 'brick':6, 'sheep':4 };
var cards = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
var cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
var tradeCardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
var oldrobber = '';
var freeRoad = 0;
var freeSettlement = 0;
var freeCity = 0;
var pieces = {roads:15,settlements:5,cities:4};
var moverobber = 0;
var harbours = {};
var developmentCards = {
  knight:{
    title:'Yarrr',
    description:'Move the pirate',
    longdescription:'The pirate card lets you move the pirate.',
    play:function(){
      var stack = 0; pending = 0;
      for (i in developmentCardStack) { if (developmentCardStack[i] == 'knight') { stack += 1; } }
      for (j in developmentCardsPending) { if (developmentCardsPending[j] == 'knight') { pending += 1; } }
      if (currentPlayer() == thisPlayer) {
        if (stack > pending) {
          moveRobber(1);
          $(this).empty().remove();
        } else { dialog('Knight','You need to wait at least one turn before using a knight you just bought.'); }
      }
    }
  },
  freeroad:{
    title:'Expansion',
    description:'Two free roads',
    longdescription:'The road building card lets you build two roads for free.',
    play:function(){
      freeRoad = 2;
      refreshButtons();
      $(this).empty().remove();
    }
  },
  freeres:{
    title:'Harvest',
    description:'Two free resources',
    longdescription:'The year of plenty card gives you two free resources of your choice.',
    play:function(){
    }
  },
  freevp:{
    title:'Science!',
    description:'One victory point',
    longdescription:'This card gives you one free victory point. You do not need to play this card.'
  }
};
var developmentCardStack = [];
var developmentCardsPending = [];

function currentMode() { //returns the current mode (initializing/start/play/finished)
  if (turnCounter == -100) { return 'finished'; }
  if (turnCounter <= 0) { return 'initializing'; }
  else if (turnCounter <= totalPlayers*2) { return 'start'; }
  else { return 'play'; }
}

function currentPlayer() { //returns the number of the current player.
  if (turnCounter <= 0) { return 0; }
  else if (turnCounter <= totalPlayers) { return turnCounter; }
  else if (turnCounter <= totalPlayers*2) { return eval((turnCounter-(totalPlayers*2)-1)*-1); }
  else { return eval((turnCounter-1)%totalPlayers+1); }
}

function searchToObject() {
  var pairs = window.location.search.substring(1).split("&"),
    obj = {},
    pair,
    i;
  for ( i in pairs ) {
    if ( pairs[i] === "" ) continue;
    pair = pairs[i].split("=");
    obj[ decodeURIComponent( pair[0] ) ] = decodeURIComponent( pair[1] );
  }
  return obj;
}
var searchObject = searchToObject();
var id = searchObject.id, key = searchObject.key;

function startTurn(counter) {
  konsole('debug','Turn '+counter+' begins...');
  turnCounter = counter;
  $('#dice').empty().remove();
  if (currentPlayer() == thisPlayer) {
    if (currentMode() == 'start') {
      freeSettlement = 1;
      freeRoad = 1;
    }
    if (currentMode() == 'play') {
      refreshButtons();
      makeDiceButton();
    }
  }
  refreshCards();
  $('#playerspanel .trade').empty().remove();
  cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshCards();
  tradeCardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshTradeCards();
}

function endTurn() {
  var x = 1;
  if (moverobber == 1) {  x = 0; }
  if (freeRoad > 0) {  x = 0; konsole('warning','You need to build a road before ending your turn.'); }
  if (freeSettlement > 0) {  x = 0; konsole('warning','You need to build a settlement before ending your turn.'); }
  if (freeCity > 0) {  x = 0; konsole('warning','You need to build a city before ending your turn.'); }
  if (x) {
    cancelTrade();
    $('#cursor').removeClass();
    developmentCardsPending = [];
    cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshCards();
    tradeCardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshTradeCards();
    //startTurn(turnCounter+1);
    $('#playerspanel .trade').empty().remove();
    socket.emit('end');
  }
}

function konsole(type,text) {
  $('<div class="'+type+'">'+text+'</div>').hide().prependTo('#konsole').slideDown(300).delay(8000).fadeOut(2000,'linear');
}

function payout(number) {
if ((number == 7)&&($('#robber').length)) {
  if (currentPlayer() == thisPlayer) { moveRobber(0); }
} else {
  $('.number').each(function() {
    if ($(this).hasClass('n'+number)) {
      var id = $(this).parent().attr('id').split('_');
      var x = Number(id[1]);
      var y = Number(id[2]);
      var positions = [[x-1,y],[x-1,y-2],[x-1,y+2],[x+1,y],[x+1,y-2],[x+1,y+2]]
      for(x in positions) {
        var settlement = $('#settlement_'+positions[x][0]+'_'+positions[x][1]);
        var city = $('#city_'+positions[x][0]+'_'+positions[x][1]);
        var add = 0;
        var playa = 0;
        if (settlement.length) { add = 1; var playa = settlement.hasClass('player'+thisPlayer); }
        if (city.length) { add = 2; var playa = city.hasClass('player'+thisPlayer); }
        if ($(this).children('.robber').length) { add = 0; }
        if ((add)&&(playa)) {
          if ($(this).parent().hasClass('ore')) { cards.ore += add; }
          if ($(this).parent().hasClass('wheat')) { cards.wheat += add; }
          if ($(this).parent().hasClass('brick')) { cards.brick += add; }
          if ($(this).parent().hasClass('wood')) { cards.wood += add; }
          if ($(this).parent().hasClass('sheep')) { cards.sheep += add; }
        }
      }
    }
  });
  refreshCards();
}
}

/*
function stuffAroundTile(x,y) {  //returns array: [[x,y,'city'],[x,y,'settlement']]
  var positions = [[x-1,y],[x-1,y-2],[x-1,y+2],[x+1,y],[x+1,y-2],[x+1,y+2]]
  var result = [];
  for(x in positions) {
    if ($('#settlement_'+positions[x][0]+'_'+positions[x][1]).length) {  result.push([positions[x][0],positions[x][1],'settlement']);  }
    if ($('#city_'+positions[x][0]+'_'+positions[x][1]).length) {  result.push([positions[x][0],positions[x][1],'city']);  }
  }
  return result;
}
*/

function rule100(x,y,player,override) {  //Settlements must be connected to a player-owned road
  var a = $('#road_'+x+'_'+eval(y-1));
  var b = $('#road_'+x+'_'+eval(y+1));
  var c = $('#road_'+eval(x-1)+'_'+y);
  var d = $('#road_'+eval(x+1)+'_'+y);
  if ((a.hasClass('player'+player))||(b.hasClass('player'+player))||(c.hasClass('player'+player))||(d.hasClass('player'+player))) {
    return 1;
  } else {
    return 0;
  }
}

function rule200(x,y,player) {  //Settlements must be built at least 2 roads away from all other settlements/cities
  x = Number(x); y = Number(y);
  var a = 0;
  a += $('#settlement_'+x+'_'+eval(y-2)).length;
  a += $('#city_'+x+'_'+eval(y-2)).length;
  a += $('#settlement_'+x+'_'+eval(y+2)).length;
  a += $('#city_'+x+'_'+eval(y+2)).length;
  if (y%4==0) {
    if (x%4==0) { //x+2,y
      a += $('#settlement_'+eval(x+2)+'_'+y).length;
      a += $('#city_'+eval(x+2)+'_'+y).length;
    }
    else { //x-2,y
      a += $('#settlement_'+eval(x-2)+'_'+y).length;
      a += $('#city_'+eval(x-2)+'_'+y).length;
    }
  }
  if (eval(y+2)%4==0) {
    if (x%4==0) { //x-2,y
      a += $('#settlement_'+eval(x-2)+'_'+y).length;
      a += $('#city_'+eval(x-2)+'_'+y).length;
    }
    else { //x+2,y
      a += $('#settlement_'+eval(x+2)+'_'+y).length;
      a += $('#city_'+eval(x+2)+'_'+y).length;
    }
  }
  if (a) { return 0; } else { return 1; }
}

function rule300(x,y,player) {  //Roads must be connected to a road, city or settlement owned by the player [300]
  //Find all the roads around us...
  var a = $('#road_'+eval(x)+'_'+eval(y-2)).hasClass('player'+player);   //x,y-1
  var b = $('#road_'+eval(x)+'_'+eval(y+2)).hasClass('player'+player);   //x,y+1
  var c = $('#road_'+eval(x-1)+'_'+eval(y-1)).hasClass('player'+player); //x,y-1  x-1,y
  var d = $('#road_'+eval(x-1)+'_'+eval(y+1)).hasClass('player'+player); //x,y+1  x-1,y
  var e = $('#road_'+eval(x+1)+'_'+eval(y-1)).hasClass('player'+player); //x,y-1  x+1,y
  var f = $('#road_'+eval(x+1)+'_'+eval(y+1)).hasClass('player'+player); //x+1,y  x,y+1
  //Check for settlements in the way...
  //x,y-1
  if ($('#settlement_'+x+'_'+eval(y-1)).length) {  if (!$('#settlement_'+x+'_'+eval(y-1)).hasClass('player'+player)) {
    a = 0; c = 0; e = 0;
  } }
  if ($('#city_'+x+'_'+eval(y-1)).length) {  if (!($('#city_'+x+'_'+eval(y-1)).hasClass('player'+player))) {
    a = 0; c = 0; e = 0;
  } }

  //x,y+1
  if ($('#settlement_'+x+'_'+eval(y+1)).length) {  if (!($('#settlement_'+x+'_'+eval(y+1)).hasClass('player'+player))) {
    b = 0; d = 0; f = 0;
  } }
  if ($('#city_'+x+'_'+eval(y+1)).length) {  if (!($('#city_'+x+'_'+eval(y+1)).hasClass('player'+player))) {
    b = 0; d = 0; f = 0;
  } }

  //x-1,y
  if ($('#settlement_'+eval(x-1)+'_'+y).length) {  if (!($('#settlement_'+eval(x-1)+'_'+y).hasClass('player'+player))) {
    c = 0; d = 0;
  } }
  if ($('#city_'+eval(x-1)+'_'+y).length) {  if (!($('#city_'+eval(x-1)+'_'+y).hasClass('player'+player))) {
    c = 0; d = 0;
  } }

  //x+1,y
  if ($('#settlement_'+eval(x+1)+'_'+y).length) {  if (!($('#settlement_'+eval(x+1)+'_'+y).hasClass('player'+player))) {
    e = 0; f = 0;
  } }
  if ($('#city_'+eval(x+1)+'_'+y).length) {  if (!($('#city_'+eval(x+1)+'_'+y).hasClass('player'+player))) {
    e = 0; f = 0;
  } }

//find all the settlements around us...
  var g = $('#settlement_'+eval(x)+'_'+eval(y-1)).hasClass('player'+player);
  var h = $('#settlement_'+eval(x)+'_'+eval(y+1)).hasClass('player'+player);
  var i = $('#settlement_'+eval(x-1)+'_'+eval(y)).hasClass('player'+player);
  var j = $('#settlement_'+eval(x+1)+'_'+eval(y)).hasClass('player'+player);
//find all the cities around us...
  var k = $('#city_'+eval(x)+'_'+eval(y-1)).hasClass('player'+player);
  var l = $('#city_'+eval(x)+'_'+eval(y+1)).hasClass('player'+player);
  var m = $('#city_'+eval(x-1)+'_'+eval(y)).hasClass('player'+player);
  var n = $('#city_'+eval(x+1)+'_'+eval(y)).hasClass('player'+player);

  if ((a)||(b)||(c)||(d)||(e)||(f)||(g)||(h)||(i)||(j)||(k)||(l)||(m)||(n)) {
    return 1;
  } else {
    return 0;
  }
}

function payoutResources(x,y) { //x,y = the location of a city/settlement to payout
  var positions = [[x-1,y-2],[x-1,y+2],[x+1,y],[x-1,y],[x+1,y-2],[x+1,y+2]];
  var tileDiv;
  for(i in positions) {
    tileDiv = $('#tile_'+positions[i][0]+'_'+positions[i][1]);
    if (tileDiv.length) { //if there's a tile here...
      if (tileDiv.hasClass('ore')) { cards.ore += 1; }
      if (tileDiv.hasClass('wheat')) { cards.wheat += 1; }
      if (tileDiv.hasClass('brick')) { cards.brick += 1; }
      if (tileDiv.hasClass('wood')) { cards.wood += 1; }
      if (tileDiv.hasClass('sheep')) { cards.sheep += 1; }
    }
  }
  refreshCards();
}

function buttonSettlement() {
if ($('#cursor').hasClass('settlement')) { cancelBuild(); }
else {
cancelTrade();
if (((cards.wheat >=1)&&(cards.wood >=1)&&(cards.brick >=1)&&(cards.sheep >=1))||freeSettlement) {
  $('#board *').unbind('click');
  $('#cursor').removeClass().addClass('settlement').addClass('player'+thisPlayer); //add the settlement to the cursor
  if (freeSettlement<1) {
    cardsSelected = { 'ore': 0, 'wheat':1, 'wood':1, 'brick':1, 'sheep':1 }; refreshCards();
  }
  //$('.button').removeClass('highlight');
  //$('.button.settlement').addClass('highlight');
  refreshButtons();
  $('.intersection').each(function () {
      $(this).click(function () {
        var xy = $(this).attr('id').slice(13).split('_');
        var x = Number(xy[0]);
        var y = Number(xy[1]);
        if (buildSettlement(x,y,thisPlayer,freeSettlement)) {
          $('#board *').unbind('click');
          if (freeSettlement<1) {
            cards.wheat -= 1;
            cards.wood -= 1;
            cards.brick -= 1;
            cards.sheep -= 1;
            cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshCards();
          } else { freeSettlement -= 1; }
          if ((turnCounter > totalPlayers)&&(turnCounter <= totalPlayers*2)) { payoutResources(x,y); }  //payout resources on the second round
          $('#cursor').removeClass(); //remove the settlement from the cursor
          socket.emit('build',[x,y,'settlement']); //send the new settlement to the server
          refreshButtons();
        }
      });
  });
} else {
  konsole('warning','Not enough resources.');
}
}
}

function buildSettlement(x,y,player,override) {
  var id = x+'_'+y;
  //Settlements must be built on land
  if (isLand(tilesNearIntersection(x,y))) {
  //Settlements must be connected to a player-owned road **except at the start** [100]
  if ((rule100(x,y,player))||(override)) {
    //Settlements must be built 2 at least roads away from all other settlements/cities [200]
    if (rule200(x,y,player)) {
      //Settlements cannot be built on top of other cities or settlements
      if (($('#settlement_'+id).length == 0)&&($('#city_'+id).length == 0)) {
        $('<div id="settlement_'+id+'" class="settlement player'+player+'">&nbsp;</div>')
        .appendTo('#intersection_'+id);  //Build the settlement
        konsole('info','Player '+player+' built a settlement. <span class="debug">settlement_'+id+'</span>');
        return 1;
      } else {
        konsole('debug','<span class="debug">Player '+player+': cannot build settlement '+id+' </span>Settlements cannot be built on top of other cities or settlements.');
        return 0;
      }
    } else {
      konsole('warning','<span class="debug">Player '+player+': cannot build settlement '+id+' </span>Settlements must be at least 2 roads away from other settlements or cities.');
      return 0;
    }
  } else {
    konsole('warning','<span class="debug">Player '+player+': cannot build settlement '+id+' </span>Settlements must be connected to a player-owned road.');
    return 0;
  }
  } else {
    konsole('warning','<span class="debug">Player '+player+': cannot build settlement '+id+' </span>Settlements must be built on land.');
    return 0;
  }
}

function buttonCity() {
if ($('#cursor').hasClass('city')) { cancelBuild(); }
else {
cancelTrade();
if ((cards.ore >=3)&&(cards.wheat >=2)) {
  $('#board *').unbind('click');
  $('#cursor').removeClass().addClass('city').addClass('player'+thisPlayer); //add the city to the cursor
  if (freeRoad<1) {
    cardsSelected = { 'ore': 3, 'wheat':2, 'wood':0, 'brick':0, 'sheep':0 }; refreshCards();
  }
  //$('.button').removeClass('highlight');
  //$('.button.city').addClass('highlight');
  refreshButtons();
  $('.intersection').each(function () {
      $(this).click(function () {
        var xy = $(this).attr('id').slice(13).split('_');
        var x = Number(xy[0]);
        var y = Number(xy[1]);
        if (buildCity(x,y,thisPlayer)) {
          $('#board *').unbind('click');
          if (freeRoad<1) {
            cards.ore -= 3;
            cards.wheat -= 2;
            cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshCards();
          } else { freeRoad -= 1; }
          $('#cursor').removeClass();  //remove the city from the cursor
          socket.emit('build',[x,y,'city']); //send the new city to the server
          refreshButtons();
        }
      });
  });
} else {
  konsole('warning','Not enough resources.');
}
}
}
function buildCity(x,y,player) {
  var id = x+'_'+y;
  //Cities must be built on top of a settlement belonging to the player
  if (($('#settlement_'+id).length) && ($('#settlement_'+id).hasClass('player'+player))) {
    $('#settlement_'+id).remove();  //Remove the old settlement
    $('<div id="city_'+id+'" class="city player'+player+'">&nbsp;</div>')
    .appendTo('#intersection_'+id);  //Build the city
    konsole('info','Player '+player+' built a city. <span class="debug">settlement_'+id+'</span>');
    return 1;
  } else {
    konsole('debug','<span class="debug">Player '+player+': cannot build city '+id+' </span>Cities must be built on top of a settlement belonging to the player');
    return 0;
  }
}

function buttonRoad() {
if ($('#cursor').hasClass('road')) { cancelBuild(); }
else {
cancelTrade();
if (((cards.wood >=1)&&(cards.brick >=1))||freeRoad) {
  $('#board *').unbind('click');
  $('#cursor').removeClass().addClass('road').addClass('player'+thisPlayer); //add the road to the cursor
  if (freeRoad<1) {
    cardsSelected = { 'ore': 0, 'wheat':0, 'wood':1, 'brick':1, 'sheep':0 }; refreshCards();
  }
  refreshButtons();
  $('.edge').each(function () {
    if (!($(this).children('.road').length)) {
      $(this).click(function () {
        var xy = $(this).attr('id').slice(5).split('_');
        var x = Number(xy[0]);
        var y = Number(xy[1]);
        if ((rule300(x,y,thisPlayer))&&(buildRoad(x,y,thisPlayer))) {
          $('#board *').unbind('click');
          if (freeRoad<1) {
            cards.wood -= 1;
            cards.brick -= 1;
            cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 }; refreshCards();
          } else { freeRoad -= 1; }
          $('.button').removeClass('highlight');
          $('#cursor').removeClass();  //remove the road from the cursor
          socket.emit('build',[x,y,'road']); //send the new road to the server
          refreshButtons();
        }
      });
    }
  });
} else {
  konsole('warning','Not enough resources.');
}
}
}
function isLand(array) {
  var res = 0;
  for (i in array) {
    if (!(array[i] == 'sea')) { res = 1; }
  }
  return res;
}
function buildRoad(x,y,player) {
  var id = x+'_'+y;
  if (isLand(tilesNearEdge(x,y))) {
    //Roads cannot be built on top of other roads
    if (!($('#road_'+id).length)) {
      $('<div id="road_'+id+'" class="road player'+player+'">&nbsp;</div>')
      .appendTo('#edge_'+id);
      konsole('info','Player '+player+' built a road. <span class="debug">settlement_'+id+'</span>');
      return 1;
    } else {
      konsole('debug','<span class="debug">Player '+player+': cannot build road '+id+' </span>Roads cannot be built on top of other roads.');
      return 0;
    }
  }
}


function makeIntersections(x,y,width,height) {
  for (var ix=1;ix<=x;ix++) {
    for (var iy=4;iy<y;iy++) {
      if ((ix%2==0)&&(iy%2==0)&&(tilesNearIntersection(ix,iy).length)) {
	var intersectionId = ix+'_'+iy;
	var factor = -10;
	if (((iy%4==0)&&(ix%4==0))||(((iy-2)%4==0)&&((ix-2)%4==0)))  { factor = 29 }
	$('<div class="intersection" id="intersection_'+intersectionId+'"><div class="debug">'+intersectionId+'</div></div>')
	.css('left',(ix)*width*0.745*0.5+factor)
	.css('top',(iy-0.4)*height*0.25)
	.appendTo('#board');
      }
    }
  }
}

function makeEdges(x,y,width,height) {
  for (var ix=2;ix<=x;ix++) {
    for (var iy=4;iy<y;iy++) {
      if (ix%2 == 0) {
	if (!(iy%2 == 0)&&(tilesNearEdge(ix,iy).length)) {
	  var edgeLeft = (ix-0.1)*width*0.5*0.745;
	  var edgeTop = (iy-0.1)*height*0.25;
	  var edgeId = 'edge_' + ix + '_' + iy;
	  if (ix%4 == 0) {
	    if ((iy-1)%4 == 0) {
	      var rotate = 'rotate2';
	    } else {
	      var rotate = 'rotate1';
	    }
	  } else {
            if ((iy-1)%4 == 0) {
	      var rotate = 'rotate1';
	    } else {
	      var rotate = 'rotate2';
	    }
	  }
          $('<div class="edge '+rotate+'" id="'+edgeId+'"><div class="debug">'+edgeId+'</div></div>')
	  .css('left',edgeLeft)
	  .css('top',edgeTop)
	  .appendTo('#board');
	}
      } else {
	if ((((iy-2)%4 == 0)&&((ix+1)%4 == 0))||(((iy%4 == 0)&&((ix-1)%4 == 0)))) {
	if (tilesNearEdge(ix,iy).length) {
	  var edgeLeft = (ix-0.08)*width*0.745*0.5;
	  var edgeTop = (iy-0.17)*height*0.25;
	  var edgeId = 'edge_' + ix + '_' + iy;
	  $('<div class="edge" id="'+edgeId+'"><div class="debug">'+edgeId+'</div></div>')
	  .css('left',edgeLeft)
	  .css('top',edgeTop)
	  .appendTo('#board');
	}
	}
      }
    }
  }
}

function makeTiles(tiles,width,height,harbours) {
  $.each(tiles,function(index,value) {
    var tileId = value[0]+'_'+value[1],
      tileType = value[2],
      tileNumber = value[3],
      tileLeft = (value[0]-1)*width*0.745*0.5,
      tileTop = (value[1]-2)*height*0.25;
    var tileDiv = $('<div class="tile '+tileType+'" id="tile_'+tileId+'"><div class="debug">'+tileId+'</div><div class="number n'+tileNumber+'">&nbsp;</div></div>')
      .css('left',tileLeft)
      .css('top',tileTop)
      .appendTo('#board');
    if (tileType == 'sea') {
      var i, j,
        pos = {n:[value[0],value[1]-4],ne:[value[0]+2,value[1]-2],nw:[value[0]-2,value[1]-2],s:[value[0],value[1]+4],se:[value[0]+2,value[1]+2],sw:[value[0]-2,value[1]+2]},
        edgePos = {n:[value[0],value[1]-2],ne:[value[0]+1,value[1]-1],nw:[value[0]-1,value[1]-1],s:[value[0],value[1]+2],se:[value[0]+1,value[1]+1],sw:[value[0]-1,value[1]+1]};
      for (i in pos) {
        for (j in tiles) {
          if ((tiles[j][0] == pos[i][0])&&(tiles[j][1] == pos[i][1])&&(tiles[j][2] != 'sea')) {
            $('<div class="shore '+i+'">&nbsp;</div>').appendTo(tileDiv);
	    for (h in harbours) {
	      if ((harbours[h][0] == edgePos[i][0])&&(harbours[h][1] == edgePos[i][1])) {
		$('<div class="harbour '+i+' '+harbours[h][2]+'"><div class="icon '+harbours[h][2]+'">&nbsp;</div></div>').appendTo(tileDiv);
	      }
	    }
          }
        }
      }
    }
  });
}

function tilesNear(x,y,pos) {
  var res = [];
  for (i in pos) {
    var t = $('#tile_'+pos[i][0]+'_'+pos[i][1]);
    if (t.length) { 
      if (t.hasClass('ore')) { res.push('ore'); }
      if (t.hasClass('wheat')) { res.push('wheat'); }
      if (t.hasClass('wood')) { res.push('wood'); }
      if (t.hasClass('brick')) { res.push('brick'); }
      if (t.hasClass('sheep')) { res.push('sheep'); }
      if (t.hasClass('desert')) { res.push('desert'); }
      if (t.hasClass('sea')) { res.push('sea'); }
    }
  }
  return res;
}
function tilesNearEdge(x,y) {  //returns ['sea','desert']
  return tilesNear(x,y,[[x-1,y+1],[x-1,y-1],[x+1,y+1],[x+1,y-1],[x,y+2],[x,y-2]]);
}
function tilesNearIntersection(x,y) { //returns ['wheat','wheat','wood']
  return tilesNear(x,y,[[x-1,y+2],[x-1,y-2],[x+1,y],[x-1,y],[x+1,y-2],[x+1,y+2]]);
}

function makeRobber() {
  $('#board > .desert > .number').append('<div class="robber number">&nbsp;</div>');
  konsole('info','The robber is in play!');
}

//Sam's jQuery Blink Plugin
var doBlink = function(obj,durationOut,durationIn) {
  jQuery(obj).animate({opacity:0.1},durationOut,'linear',function () {
    jQuery(obj).animate({opacity:1},durationIn,'linear',function () { if ($(this).hasClass('blink')) { doBlink(obj,durationOut,durationIn); } });
  });
};
jQuery.fn.blink = function(durationOut,durationIn) {
  if (durationOut) {
    if (!(durationIn)) { var durationIn = durationOut; }
    return this.each(function() { $(this).addClass('blink'); doBlink(this,durationOut,durationIn); });
  } else {
    return this.each(function() { $(this).removeClass('blink'); });
  }
};


function moveRobber(knight) {
  moverobber = 1;
  refreshButtons();
  $('.robber').blink(300,300);
  $('.robber').click(function () {
    $('#cursor').addClass('robber').addClass('number');
    oldrobber = $(this).parent().parent().attr('id');
    $('.tile > .number').each(function () {
      if (!(oldrobber == $(this).parent().attr('id'))) {
        $(this).click(function() {
          $(this).append('<div class="robber number">&nbsp;</div>');
          $('.number').unbind('click');
          $('#cursor').removeClass();
          var xy = $(this).parent().attr('id').split('_');
	  if (knight) { socket.emit('knightMove',[xy[1],xy[2]]); }
	  else { socket.emit('robberMove',[xy[1],xy[2]]); }
          robberChoose(xy[1],xy[2]);
        });
      }
    });
    $(this).remove();
  });
}
function autoMoveRobber(x,y) {
  $('.robber').empty().remove();
  $('#tile_'+x+'_'+y+' > .number').append('<div class="robber number">&nbsp;</div>');
  konsole('info','The robber was moved!');
}
/*function robberChoose(x,y) {
  var positions = [[x-1,y],[x-1,y-2],[x-1,y+2],[x+1,y],[x+1,y-2],[x+1,y+2]];
  var thing;
  for (i in positions) {
    thing = 0;
    if ($('#settlement_'+positions[i][0]+'_'+positions[i][1]).length) {
      thing = $('#settlement_'+positions[i][0]+'_'+positions[i][1]);
    } else if ($('#city_'+positions[i][0]+'_'+positions[i][1]).length) {
      thing = $('#city_'+positions[i][0]+'_'+positions[i][1]);
    }
    if (!(thing == 0)) {
      //$(thing).blink(600,600);
      $(thing).click(function(event) {
        var playa = 0;
        if ($(this).hasClass('player1')) { playa = 1; }
        else if ($(this).hasClass('player2')) { playa = 2; }
        else if ($(this).hasClass('player3')) { playa = 3; }
        else if ($(this).hasClass('player4')) { playa = 4; }
        else if ($(this).hasClass('player5')) { playa = 5; }
        else if ($(this).hasClass('player6')) { playa = 6; }
        else if ($(this).hasClass('player7')) { playa = 7; }
        socket.emit('robberSteal',playa);
        moverobber = 0;
        $('#board .settlement').unbind();
        $('#board .city').unbind();
        refreshButtons();
      });
    }
  }
}*/
function robberChoose(x,y) {
  x = Number(x); y = Number(y);
  var positions = [[x-1,y],[x-1,y-2],[x-1,y+2],[x+1,y],[x+1,y-2],[x+1,y+2]];
  var things = [], city = '', settlement = '', position = 0, thing = 0;
  for (position in positions) {
    settlement = '#settlement_'+positions[position][0]+'_'+positions[position][1];
    city = '#city_'+positions[position][0]+'_'+positions[position][1];
    if ($(settlement).length) {
      if (!(getPlayer(settlement) == currentPlayer())) things.push(settlement);
    }
    if ($(city).length) {
      if (!(getPlayer(city) == currentPlayer())) things.push(city);
    }
  }
  if (things.length == 0) {
    socket.emit('robberSteal',0);
    moverobber = 0;
    refreshButtons();
  }
  for (thing in things) {
    $(things[thing]).blink(300,300);
    $(things[thing]).click(function() {
      var playa = 0;
      if ($(this).hasClass('player1')) { playa = 1; }
      else if ($(this).hasClass('player2')) { playa = 2; }
      else if ($(this).hasClass('player3')) { playa = 3; }
      else if ($(this).hasClass('player4')) { playa = 4; }
      else if ($(this).hasClass('player5')) { playa = 5; }
      else if ($(this).hasClass('player6')) { playa = 6; }
      else if ($(this).hasClass('player7')) { playa = 7; }
      socket.emit('robberSteal',playa);
      moverobber = 0;
      $('.intersection *').removeClass('blink');
      $('#board .settlement, #board .city').unbind();
      refreshButtons();
    });
  }
}

function getPlayer(obj) {
  var playa = 0;
  if ($(obj).hasClass('player1')) { playa = 1; }
  else if ($(obj).hasClass('player2')) { playa = 2; }
  else if ($(obj).hasClass('player3')) { playa = 3; }
  else if ($(obj).hasClass('player4')) { playa = 4; }
  else if ($(obj).hasClass('player5')) { playa = 5; }
  else if ($(obj).hasClass('player6')) { playa = 6; }
  else if ($(obj).hasClass('player7')) { playa = 7; }
  return playa;
}

function refreshDice(a,b) {
  var dice = $('#dice').empty();
  if ((a > 0)&&(a < 7)) {  $('<div id="dieA" class="die'+a+' die">'+a+'</div>').appendTo(dice);  }
  if ((b > 0)&&(b < 7)) {  $('<div id="dieB" class="die'+b+' die">'+b+'</div>').appendTo(dice);  }
  $(dice).children().each(function () { //move the dice a little randomly...
    var angle = Math.floor(Math.random()*360);
    if (this.id == 'dieA') {  var x = eval(Math.floor(Math.random()*20));  }
    else {  var x = eval(Math.floor(Math.random()*20)+50);  }
    var y = eval(Math.floor(Math.random()*30));
    var style = '-moz-transform:rotate('+angle+'deg); -webkit-transform:rotate('+angle+'deg); -o-transform:rotate('+angle+'deg); -ms-transform:rotate('+angle+'deg); top:'+y+'px; left:'+x+'px;';
    $(this).attr('style',style);
  });
}
function makeDiceButton() {
  var a = eval(Math.floor(Math.random()*5)+1);
  var b = eval(Math.floor(Math.random()*5)+1);
  $('#diceButton').empty().remove();
  refreshButtons();
  var dice = $('<div id="diceButton"></div>').appendTo('#bottompanel');
  if ((a > 0)&&(a < 7)) {  $('<div id="dieButtonA" class="die'+a+' die">'+a+'</div>').appendTo(dice);  }
  if ((b > 0)&&(b < 7)) {  $('<div id="dieButtonB" class="die'+b+' die">'+b+'</div>').appendTo(dice);  }
  $(dice).children().each(function () { //move the dice a little randomly...
    var angle = Math.floor(Math.random()*360);
    if (this.id == 'dieButtonA') {  var x = eval(Math.floor(Math.random()*5));  }
    else {  var x = eval(Math.floor(Math.random()*5)+25);  }
    var y = eval(Math.floor(Math.random()*10));
    var style = '-moz-transform:rotate('+angle+'deg); -webkit-transform:rotate('+angle+'deg); -o-transform:rotate('+angle+'deg);top:'+y+'px;left:'+x+'px;';
    $(this).attr('style',style);
  });
  $(dice).blink(300,300);
  $(dice).click(function() { //When the dice button is clicked...
    /*var a = Math.floor(Math.random()*5)+1;
    var b = Math.floor(Math.random()*5)+1;
    rollDice(a,b);*/
    socket.emit('dice'); //request dice roll from the server
    $('#diceButton').empty().remove();
    refreshButtons();
  });
}

function rollDice(a,b) {
  $('#dice').empty().remove();
  var dice = $('<div id="dice"></div>').appendTo('body');
  $('#diceButton').empty().remove();
  dice.animate({margin:0},{
    duration: 300,
    step: function(now, fx) {
      refreshDice(eval(Math.floor(Math.random()*5)+1),eval(Math.floor(Math.random()*5)+1));
    },
    complete: function(now, fx) {
      refreshDice(a,b);
      payout(a+b);
    }
  });
}

function buttonDevelopment() {
  cancelTrade();
  if ((cards.wheat>0)&&(cards.ore>0)&&(cards.sheep>0)) {
    socket.emit('getDevelopment');
    cards.wheat -= 1;
    cards.ore -= 1;
    cards.sheep -= 1;
    refreshCards();
  }
  else { konsole('info','You dont have enough resources to build a development card'); }
}

function refreshButtons() {
  var roadsLeft = pieces.roads-$('.road.player'+thisPlayer).length;
  var settlementsLeft = pieces.settlements-$('.settlement.player'+thisPlayer).length;
  var citiesLeft = pieces.cities-$('.city.player'+thisPlayer).length;
  var developmentsLeft = 0;
  $('#buttons').empty();
  var road = '', settlement = '', city = '', development = '', end = '', trade = '';
//disable stuff if you don't have enough resources...
  if ((roadsLeft < 1)||(cards.wood < 1)||(cards.brick < 1)) { road = ' disabled'; }
  if ((settlementsLeft < 1)||(cards.wood < 1)||(cards.brick < 1)||(cards.sheep < 1)||(cards.wheat < 1)) { settlement = ' disabled'; }
  if ((citiesLeft < 1)||(cards.ore < 3)||(cards.wheat < 2)) { city = ' disabled'; }
  if ((cards.ore < 1)||(cards.sheep < 1)||(cards.wheat < 1)) { development = ' disabled'; }

  var clearCards = ' disabled';
  if ($('#trade:visible').length) { trade = ' highlight'; }  //disable the trade button if the trade window is open
  if ((currentMode() != 'play')||($('#diceButton').length)) { trade = ' disabled'; } //disable the trade button if we're not playing or the dice button is visible
  if (!((cards.ore)||(cards.wood)||(cards.brick)||(cards.sheep)||(cards.wheat))) { trade = ' disabled'; } //disable the trade button if we have no cards to trade

  if (freeRoad||freeSettlement||freeCity||($('#diceButton').length)||(moverobber)) { var end = ' disabled'; }  //disable the end turn button if free stuff needs to be built or the dice button is visible
  if (!(currentPlayer() == thisPlayer)) { var end = ' disabled'; } //disable the end turn button if its not my turn

  if (currentMode() == 'start') {
    road = ' disabled'; settlement = ' disabled'; city = ' disabled'; development = ' disabled';
  }
  if ((freeRoad>0)&&(roadsLeft>0)) { road = ''; }
  if (freeSettlement>0) { settlement = ''; }

//highlight stuff
  if ($('#cursor').hasClass('road')) { road = road+' highlight'; }
  if ($('#cursor').hasClass('settlement')) { settlement = settlement+' highlight'; }
  if ($('#cursor').hasClass('city')) { city = city+' highlight'; }

  if (!(currentPlayer() == thisPlayer)||($('#diceButton').length)||(moverobber)) {  road = ' disabled'; settlement = ' disabled'; city = ' disabled'; development = ' disabled';  }  //disable everything if its not my turn or if the dice button is visible or if the robber is being moved
  if ($('#diceButton').length) {  $('#buttons').css('opacity','0.1');  } else {  $('#buttons').css('opacity','1'); }  //hide #buttons if the dice button is visible
//Create the buttons...
  var tradeDiv = $('<div class="trade smallButton'+trade+'"></div>').appendTo('#buttons');
  var roadDiv = $('<div class="roadButton button'+road+'"><div class="numberLeft">'+roadsLeft+'</div></div>').appendTo('#buttons');
  $('<div class="player'+thisPlayer+' road"></div>').appendTo(roadDiv);
  var settlementDiv = $('<div class="settlementButton button'+settlement+'"><div class="numberLeft">'+settlementsLeft+'</div></div>').appendTo('#buttons');
  $('<div class="player'+thisPlayer+' settlement"></div>').appendTo(settlementDiv);
  var cityDiv = $('<div class="cityButton button'+city+'"><div class="numberLeft">'+citiesLeft+'</div></div>').appendTo('#buttons');
  $('<div class="player'+thisPlayer+' city"></div>').appendTo(cityDiv);
  var developmentDiv = $('<div class="developmentButton button'+development+'"><div class="numberLeft">'+developmentsLeft+'</div></div>').appendTo('#buttons');
  var endDiv = $('<div class="smallButton end'+end+'">&nbsp;</div>').appendTo('#buttons');
//bind click handlers...
  if (trade != ' disabled') {  tradeDiv.click(tradeButton);  }
  if (road != ' disabled') {  roadDiv.click(buttonRoad);  }
  if (settlement != ' disabled') {  settlementDiv.click(buttonSettlement);  }
  if (city != ' disabled') {  cityDiv.click(buttonCity);  }
  if (development != ' disabled') {  developmentDiv.click(buttonDevelopment);  }
  if (end != ' disabled') {  endDiv.click(endTurn);  }
}

function refreshCards() {
  //var cards = { 'ore': 2, 'wheat':2, 'wood':2, 'brick':2, 'sheep':2 };
  //var cardsSelected = { 'ore': 0, 'wheat':0, 'wood':2, 'brick':1, 'sheep':0 };

//draw the cards...
  $('#cards').empty();
  $('#cardsSelected').empty();
  //draw the cards
  $.each(cards,function (type,number) {
    var cardStack = $('<div class="cardStack"></div>').appendTo('#cards');
    $(cardStack).append('<div class="'+type+' card bottom">&nbsp;</div>');
    number -= eval('cardsSelected.'+type);
    for (i=0;i<number;i++) {
      $(cardStack).append('<div class="'+type+' card">&nbsp;</div>');
    }
    if (cards[type] - cardsSelected[type] > 0) {
      $(cardStack).click(function () {  //bind click handler
        cardsSelected[type] += 1;
        refreshCards();
      });
    }
  });
  //draw the selected cards
  $.each(cardsSelected,function (type,number) {
    var cardStack = $('<div class="cardStack"></div>').appendTo('#cardsSelected');
    for (i=0;i<number;i++) {
      $(cardStack).append('<div class="'+type+' card">&nbsp;</div>');
    }
    if (cardsSelected[type] > 0) {
      $(cardStack).click(function () {  //bind click handler
        cardsSelected[type] -= 1;
        refreshCards();
      });
    }
  });
  //refresh the buttons
  refreshButtons();
  refreshTradeButtons();
}

function refreshDevelopmentCards() {
  $('#developmentCards').empty();
  $.each(developmentCardStack,function(index,data){
    $('<div class="developmentCard '+data+'" title="'+developmentCards[data].description+'">'+developmentCards[data].title+'</div>')
      .appendTo('#developmentCards')
      .click(function(){
        dialog(developmentCards[data].title,developmentCards[data].longdescription,developmentCards[data].play);
      });
  });
}

function refreshTradeButtons() {
  var tradeButtons = $('#tradeButtons').empty();
  $.each(tradeCardsSelected,function(type,value){
    $('<div class="smallButton '+type+'">&nbsp;</div>')
      .appendTo(tradeButtons)
      .click(function(){
        tradeCardsSelected[type] += 1;
        refreshTradeCards();
      })
  });
  var buttonBank = $('<div class="smallButton bank">&nbsp;</div>').appendTo(tradeButtons);
  var buttonSwap = $('<div class="smallButton cardSwap">&nbsp;</div>').appendTo(tradeButtons);
  if (!(bankCheck())) { buttonBank.addClass('disabled'); } else { buttonBank.click(bankButton); }
  if (!(swapCheck())) { buttonSwap.addClass('disabled'); } else { buttonSwap.click(swapButton); }
}

function bankCheck(trade) {
  var x = 0, i = 0;
  var y = '', j = '';
  $.each(tradeCardsSelected,function(index,value){ if (value) { x += 1; y = index; } })
  $.each(cardsSelected,function(index,value){ if (value) { i += 1; j = index; } })
  if ((x==1)&&(i==1)&&(!(y==j))) {  //if the correct cards are selected
    var ratio = 4;  //TODO: check for harbours and set this ratio
    if (cardsSelected[j]>=eval(ratio*tradeCardsSelected[y])) {  //if the right amount of cards are selected
      if (trade) {
	socket.emit('bank',[cardsSelected,tradeCardsSelected]);
        cards[y] += tradeCardsSelected[y];
        cards[j] -= eval(ratio*tradeCardsSelected[y]);
        cardsSelected = { 'ore':0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
        tradeCardsSelected = { 'ore':0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
        refreshCards();
        refreshTradeCards();
      }
      return 1;
    } else { return 0; }
  } else { return 0; }
}
function bankButton() {
  bankCheck(1);
}

function swapCheck() {
  return 1;
}
function swapButton() {
  socket.emit('trade',{'give':cardsSelected,'get':tradeCardsSelected});
  cardsSelected = { 'ore':0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  tradeCardsSelected = { 'ore':0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  refreshCards();
  refreshTradeCards();
  $('#trade').hide();
}
function drawTrade(player,giveCards,getCards,cancel,accept) {
  // drawTrade(1,{ore:2,wood:1},{wheat:3},function(){ alert('cancel'); },1)
  // cancel/accept = 1 for disabled, 2 for thumbs up/down, function(){} for a button
  if ($('#playerspanel .player'+player+' .trade').length) {
    var div = $('#playerspanel .player'+player+' .trade').empty();
  } else {
    if (!($('#playerspanel .player'+player).length)) { return 0; }
    var div = $('<div class="trade"></div>').appendTo('#playerspanel .player'+player);
  }
  var give = $('<div class="give"><div class="arrowDown green">&nbsp;</div></div>').appendTo(div);
  var get = $('<div class="get"><div class="arrowUp red">&nbsp;</div></div>').appendTo(div);
  var i, j;
  for (i in giveCards) {
    for (j=0;j<giveCards[i];j++) {
      $('<div class="card '+i+'">&nbsp;</div>').appendTo(give);
    }
  }
  for (i in getCards) {
    for (j=0;j<getCards[i];j++) {
      $('<div class="card '+i+'">&nbsp;</div>').appendTo(get);
    }
  }
  var buttons = $('<div class="buttons"></div>').appendTo(div);
  if (accept == 1) {
    $('<div class="smallButton accept disabled">&nbsp;</div>').appendTo(buttons);
  } else if (accept == 2) {
    $('<div class="thumbUp">&nbsp;</div>').appendTo(buttons);
  } else if (accept) {
    $('<div class="smallButton accept">&nbsp;</div>').click({give:giveCards,get:getCards,player:player},accept).appendTo(buttons);
  }
  if (cancel == 1) { 
    $('<div class="smallButton cancel disabled">&nbsp;</div>').appendTo(buttons);
  } else if (cancel == 2) {
    $('<div class="thumbDown">&nbsp;</div>').appendTo(buttons);
  } else if (cancel) {
    $('<div class="smallButton cancel">&nbsp;</div>').click({give:giveCards,get:getCards,player:player},cancel).appendTo(buttons);
  }
}
function displayTrade(data,decline) {
  if (data.player == thisPlayer) { //if this is a trade i just sent to the server...
    for (i=1;i<=totalPlayers;i++) {
      if (!(i == thisPlayer)) { drawTrade(i,data.get,data.give); }
    }
  } else { //this is a trade from someone else
    var cancel = function(event) {
      socket.emit('tradeDecline',{give:event.data.get,get:event.data.give,player:event.data.player});
      if ($('#playerspanel .player'+data.player+' .trade').length) { $('#playerspanel .player'+data.player+' .trade').empty().remove(); }
    };
    var accept = function(event) {
      socket.emit('tradeAccept',{give:event.data.get,get:event.data.give,player:event.data.player});
      $(this).addClass('disabled').unbind();
    };
    for (i in data.get) { if (data.get[i] > cards[i]) { accept = 1; } } //check that we have enough cards
    if (decline) { cancel = 2; accept = 0; }
    drawTrade(data.player,data.give,data.get,cancel,accept);
  }
}
/*function displayTrade(data,decline) {
if (!(data.player == thisPlayer)) {
  if ($('#playerspanel .player'+data.player+' .trade').length) { $('#playerspanel .player'+data.player+' .trade').empty().remove(); }
  var div = $('<div class="trade"></div>').appendTo('#playerspanel .player'+data.player);
  var give = $('<div class="give"><div class="arrowDown green">&nbsp;</div></div>').appendTo(div);
  var get = $('<div class="get"><div class="arrowUp red">&nbsp;</div></div>').appendTo(div);
  var i, j, enough = 1;
  for (i in data.give) {
    for (j=0;j<data.give[i];j++) {
      $('<div class="card '+i+'">&nbsp;</div>').appendTo(give);
    }
  }
  for (i in data.get) {
    for (j=0;j<data.get[i];j++) {
      $('<div class="card '+i+'">&nbsp;</div>').appendTo(get);
    }
    if (data.get[i] > cards[i]) { enough = 0; }
  }
  if (decline) {
    $('<div class="decline"></div>').appendTo(div);
  } else {
	    var buttons = $('<div class="buttons"></div>').appendTo(div);
	    var accept = $('<div class="smallButton accept">&nbsp;</div>').appendTo(buttons);
	    var cancel = $('<div class="smallButton cancel">&nbsp;</div>').appendTo(buttons);
	    if (enough) {
	      accept.click(data,function(){
		socket.emit('tradeAccept',{give:data.get,get:data.give,player:data.player});
		$(this).addClass('disabled').unbind();
	      });
	    } else {
	      accept.addClass('disabled');
	    }
	    cancel.click(data,function(){
	      $(this).parent().parent().empty().remove();
	      socket.emit('tradeDecline',{give:data.get,get:data.give,player:data.player});
	    });
  }
} else {
  if ($('#trade .trade').length) { $('#trade .trade').empty().remove(); }
  var div = $('<div class="trade"></div>').appendTo('#trade');
  var give = $('<div class="give"><div class="arrowUp red">&nbsp;</div></div>').appendTo(div);
  var get = $('<div class="get"><div class="arrowDown green">&nbsp;</div></div>').appendTo(div);
  var i, j, enough = 1;
  for (i in data.give) {
    for (j=0;j<data.give[i];j++) {
      $('<div class="card '+i+'">&nbsp;</div>').appendTo(give);
    }
  }
  for (i in data.get) {
    for (j=0;j<data.get[i];j++) {
      $('<div class="card '+i+'">&nbsp;</div>').appendTo(get);
    }
    if (data.get[i] > cards[i]) { enough = 0; }
  }
}
}*/
function refreshTradeCards() {
  var tradeCards = $('#tradeCards').empty();
  $('<div class="arrowDown green">&nbsp;</div>').appendTo(tradeCards);
  $.each(tradeCardsSelected,function(type,value){
    targetStack = $('<div class="cardStack"></div>').appendTo(tradeCards);
    for (i=0;i<value;i++) {
      $('<div class="card '+type+'">&nbsp;</div>').appendTo(targetStack);
    }
    $(targetStack).click(function(){
      tradeCardsSelected[type] -= 1;
      refreshTradeCards();
    });
  })
  refreshTradeButtons();
}

function cancelBuild() {
  $('#cursor').removeClass();
  $('#board .edge, #board .intersection').unbind('click');
  cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  refreshCards();
  refreshButtons();
}
function cardClear() {
  cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  tradeCardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  refreshCards();
}
function tradeButton() {
  if ($('#trade:visible').length) {  cancelTrade(); }
  else { openTrade(); }
}
function cancelTrade() {
  cardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  $('#trade').hide();
  refreshCards();
}
function openTrade() {
  tradeCardsSelected = { 'ore': 0, 'wheat':0, 'wood':0, 'brick':0, 'sheep':0 };
  refreshTradeCards();
  $('#trade').show();
  refreshButtons();
}

function setPlayer(playerid) {
  thisPlayer = playerid;
  $('#buttonRoad').removeClass();
  $('#buttonSettlement').removeClass();
  $('#buttonCity').removeClass();
  $('#buttonRoad').addClass('player'+playerid);
  $('#buttonSettlement').addClass('player'+playerid);
  $('#buttonCity').addClass('player'+playerid);
  $('#bottompanelcover').addClass('player'+playerid);
  konsole('info','Now playing as Player '+playerid+'.');
}

function refreshBoard(board,harbours) {
  $('#board').empty();
  var tileSize = [188,158];
  var boardSize = [18,37];
  makeTiles(board,tileSize[0],tileSize[1],harbours);
  makeEdges(boardSize[0],boardSize[1],tileSize[0],tileSize[1]);
  makeIntersections(boardSize[0],boardSize[1],tileSize[0],tileSize[1]);
}

function changeTheme(theme) {
  $('#themeCSS').empty().remove();
  $('<link rel="stylesheet" type="text/css" href="themes/'+theme+'.css" id="themeCSS">').appendTo('head');
}

function setStats(stats) {
  /*stats = {'player':1,'cards':0,'developments':0,'roads':0,'settlements':0,'cities':0}*/
  if ($('#playerspanel > .player'+stats.player).length) { //if this players statistics exist on the page...
    var statsDiv = $('#playerspanel .player'+stats.player).empty(); //empty the existing statsDiv
  } else {
    var statsDiv = $('<div></div>').addClass('player'+stats.player).appendTo('#playerspanel'); //create an empty statDiv
  }
  $('<div class="cards stats" title="Resources">'+stats.cards+'</div>').appendTo(statsDiv);
  $('<div class="knights stats" title="Knights">0</div>').appendTo(statsDiv);
  $('<div class="roads stats" title="Longest Road">'+stats.roads+'</div>').appendTo(statsDiv);
  $('<div class="developments stats" title="Development Cards">'+stats.developments+'</div>').appendTo(statsDiv);
  $('<div class="vp stats" title="Victory Points">'+stats.vp+'</div>').appendTo(statsDiv);
}
function setCards(data) {
  cards.ore = Number(data.ore);
  cards.wheat = Number(data.wheat);
  cards.wood = Number(data.wood);
  cards.brick = Number(data.brick);
  cards.sheep = Number(data.sheep);
  refreshCards();
}
function dialog(title,body,fn) {
  $('#modal')
    .hide()
    .empty()
    .click(function(){ $('#modal').hide().empty(); })
    .append('<div class="window"><div class="title">'+title+'</div><div class="body">'+body+'</div><div class="buttons"></div></div>')
    .show();
  var actions = $('#modal .buttons');
  if (fn) { $('<div class="smallButton accept">&nbsp;</div>').click({fn:fn},function(event){ $('#modal').hide().empty(); event.data.fn(); }).appendTo(actions); }
  $('<div class="smallButton cancel">&nbsp;</div>').click(function(){ $('#modal').hide().empty(); }).appendTo(actions);
}




var socket;
function connect(gameid) {
	socket = io.connect('http://'+window.location.hostname+gameid);
	socket.on('login',function(){
	  socket.emit('login',{'id':id,'key':key});
	});
	socket.on('init', function (data) {
	  setPlayer(data.player);
	  refreshBoard(data.tiles,data.harbours);
	  refreshTradeButtons();
	  refreshCards();
	  if (data.robber) { makeRobber(); }
	});
	socket.on('build',function(data){
	  if (data[2] == 'road') { buildRoad(data[0],data[1],data[3]); }
	  if (data[2] == 'settlement') { buildSettlement(data[0],data[1],data[3],1); }
	  if (data[2] == 'city') { buildCity(data[0],data[1],data[3]); }
	});
	socket.on('turn',function(data){
	  startTurn(data);
	});
	socket.on('dice',function(data){
	  rollDice(data[0],data[1]);
	});
	socket.on('robber',function(data){
	  autoMoveRobber(data[0],data[1]);
	});
	socket.on('konsole',function(data){
	  konsole(data[0],'Server: '+data[1]);
	});
	socket.on('gameid',function(data){
		connect(data);
	});
	socket.on('stats',function(data){
		setStats(data);
	});
	socket.on('cards',function(data){
		setCards(data);
	});
	socket.on('developmentCards',function(devCards,devCardsPending){
		developmentCardStack = devCards;
		developmentCardsPending = devCardsPending;
                refreshDevelopmentCards();
	});
	socket.on('trade',function(data){
		displayTrade(data);
	});
	socket.on('tradeDecline',function(data){
		displayTrade(data,1);
	});
	socket.on('chat',function(player,playername,data){
		chat(player,playername,data);
	});
}

var lobbysocket;
function lobby() {
	lobbysocket = io.connect('http://'+window.location.hostname+'/lobby');
	lobbysocket.on('login',function(){
		lobbysocket.emit('login',{'id':id,'key':key});
	});
	lobbysocket.on('games',function(data){
		var i, gamesDiv = $('#games').empty();
		for (i in data) {
			$('<div id="game'+data[i][3]+'"><div class="type">'+data[i][0]+'</div><div class="name">'+data[i][1]+'</div><div class="players">'+data[i][2]+'</div></div>').click(joinGame).prependTo(gamesDiv);
		}
	});
	lobbysocket.on('game',function(data){
		if ($('#game'+data[3]).length) { var thisgame = $('#game'+data[3]).empty(); }
		else { var thisgame = $('<div id="game'+data[3]+'">').click(joinGame).hide().prependTo('#games'); }
		$('<div class="type">'+data[0]+'</div><div class="name">'+data[1]+'</div><div class="players">'+data[2]+'</div>').appendTo(thisgame);
		thisgame.slideDown(200);
	});
	lobbysocket.on('gameid',function(data){
		$('#lobby').hide();
		connect(data);
	});
	lobbysocket.on('chat',function(player,data){
		lobbychat(player,data);
	});
}
function joinGame() {
  lobbysocket.emit('joingame',$(this).attr('id').slice(4));
}
function chat(player,playername,data) {
console.log(player);
console.log(playername);
  $('<div><span class="player'+player+'">'+playername+'</span>'+data+'</div>').hide().prependTo('#chat').slideDown(100);
  if ($('#sidepanel').hasClass('hide')) {
    $('<div class="chat player'+player+'">'+data+'</div>').click(function(){ $('#sidepanel').removeClass('hide'); $('#chatinput').focus(); }).hide().appendTo('#playerspanel .player'+player).slideDown(100).delay(4000).slideUp(100);
  }
}
function chatsend() {
  var input = $('#chatinput');
  socket.emit('chat',input.attr('value'));
  input.attr('value','');
  return false;
}
function lobbychat(player,data) {
  $('<div><span class="player">'+player+'</span>'+data+'</div>').hide().prependTo('#lobbychat').slideDown(100);
}
function lobbychatsend() {
  var input = $('#lobbychatinput');
  lobbysocket.emit('chat',input.attr('value'));
  input.attr('value','');
  return false;
}
function newgamebutton() {
  $('#newgame').show();
}
function newgamecancel() {
  $('#newgame').hide();
}
function makenewgame() {
  data = {type:$('#newgametype').attr('value'),name:$('#newgamename').attr('value'),maxPlayers:$('#newgameplayers').attr('maxPlayers'),robber:$('#newgamerobber').is(':checked')};
  lobbysocket.emit('newgame',data);
  return false;
}

$(document).ready(function(){
$('#boardcontainer').draggable({ scroll: false, cursor: 'move', distance:30 });
/*$('#boardcontainer').mousewheel(function(event,delta){
  delta = delta*10;
  $('#boardcontainer').css('zoom',$('#boardcontainer').css('zoom')*100+delta+'%');
});*/
$('#sidepanelhide').click(function(){ if ($('#sidepanel').width() < 30) { $('#sidepanel').animate({width:'460px'},400).removeClass('hide'); } else { $('#sidepanel').animate({width:'20px'},400).addClass('hide'); } });
$('#sidepanel form').submit(chatsend);
$('#lobby > form').submit(lobbychatsend);
$('#newgame form').submit(makenewgame);
$('#newgamebutton').click(newgamebutton);
$('#newgamecancel').click(newgamecancel);
$(document).mousemove(function(e){
  $('#cursor').css('left',eval(e.pageX+5));
  $('#cursor').css('top',eval(e.pageY-10));
});
lobby();
});






