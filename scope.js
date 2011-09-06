var callback = function(func,opts){	  //http://onemarco.com/2008/11/12/callbacks-and-binding-and-callback-arguments-and-references/
	var cb = function(){
		var args = opts.args ? opts.args : [];
		var scope = opts.scope ? opts.scope : this;
		var fargs = opts.supressArgs === true ?
			[] : toArray(arguments);
		func.apply(scope,fargs.concat(args));
	}
	return cb;
};
var toArray = function(arrayLike){  //A utility function for callback()
	var arr = [];
	for(var i = 0; i < arrayLike.length; i++){
		arr.push(arrayLike[i]);
	}
	return arr;
};

var takesCallBack = function(c) {
  c();
};

var f = function() {
  var b = 'jkl';
  takesCallBack(callback(function(){
    console.log('b: '+b);
  },{'scope':this}));
};
f();
var g = function() {
  var c = 'asdf';
  takesCallBack(function(){
    console.log('c: '+c);
  });
};
g();

var cb = function(){
  console.log('d: '+d);
};
var h = function() {
  var d = 'qwerty';
  takesCallBack(callback(cb(),{'args':d}));
};
h();
