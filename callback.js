 * @param {Function} func the callback function
 * @param {Object} opts an object literal with the following
 * properties (all optional):
 * scope: the object to bind the function to (what the "this" keyword will refer to)
 * args: an array of arguments to pass to the function when it is called, these will be
 * appended after any arguments passed by the caller
 * suppressArgs: boolean, whether to supress the arguments passed
 * by the caller.  This default is false.
 */
function callback(func,opts){	
	var cb = function(){
		var args = opts.args ? opts.args : [];
		var scope = opts.scope ? opts.scope : this;
		var fargs = opts.supressArgs === true ?
			[] : toArray(arguments);
		func.apply(scope,fargs.concat(args));
	}
	return cb;
}

/* A utility function for callback() */
function toArray(arrayLike){
	var arr = [];
	for(var i = 0; i &lt; arrayLike.length; i++){
		arr.push(arrayLike[i]);
	}
	return arr;
}
