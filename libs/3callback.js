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
