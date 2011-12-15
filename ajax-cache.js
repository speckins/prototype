/*

	Ajax Caching, affecting *all* Ajax.Request classes (Ajax.Request, Ajax.Updater); opting out is default

	To opt in, set {use_cache: true} in the options to Ajax.Request.
	To refresh an item, set {refresh_cache: true} ('use_cache' must be true, too).

	cache_prune() needs to be written.  It can be tailored to a particular site or application.
	There are a number of available metrics to use for pruning the cache -- cache count (number
	of items), cache size (sum of item lengths), item creation, item last accessed, item cache
	hits, and item content length.

	Should this be for GET requests ONLY?  Probably.

*/
// ----------------------------------------------------------------------------
var AjaxCacheRequestMethods = (function() {
// ----------------------------------------------------------------------------
// Some prerequsites
// ----------------------------------------------------------------------------

	var $request = Ajax.Request.prototype.request,
		$respond = Ajax.Request.prototype.respondToReadyState;

// ----------------------------------------------------------------------------
// Ajax Cache
// ----------------------------------------------------------------------------
	var Cache, count, size;

	function reset_cache() {
		Cache = {};
		count = 0;
		size = 0;
	}

	/** @param	{Ajax.Request} request
		@return	{string} */
	function generate_hash(request) {

		// Separate url into url + query string
		// Put query string into GET parameters
		// Put method into POST parameters iff it's not GET
		// Sort and remove duplicate key=value pairs
		// Join the three strings with '|' and return

		var
			url			= request.url || "",
			method		= request.method,
			parameters	= request.options.parameters || {},
			qs		= url.indexOf('?'),
			base	= qs == -1 ? url : url.substring(0,qs),
			query	= qs == -1 ? ''  : url.substring(qs),
			get		= Object.toQueryString(Object.extend(query.toQueryParams(), method == 'get' && parameters)).split('&').sort().uniq(true).join('&'),
			post	= Object.toQueryString(method == 'get' ? {} : Object.extend({_method:method},parameters)).split('&').sort().uniq(true).join('&');

		return [base,get,post].join('|');
	}

	/** @param	{Ajax.Request} request
		@return	{boolean} */
	function cache_contains(request) {
		return generate_hash(request) in Cache;
	}
	/** @param	{Ajax.Request} request */
	function cache_store(request) {
		var contentLength = request.transport.responseText.length;
		size += contentLength;
		count++;
		Cache[generate_hash(request)] = {
			transport:		request.transport,
			hits:			0,
			created:		new Date,
			lastAccess:		new Date,
			contentLength:	contentLength
		};
	}
	/** @param	{Ajax.Request} request
		@return	{XMLHttpRequest} */
	function cache_fetch(request) {
		var hash = generate_hash(request);
		if (hash in Cache) {
			Cache[hash].hits++;
			Cache[hash].lastAccess = new Date;
			return Cache[hash].transport;
		} else {
			return request.transport;
		}
	}
	function cache_prune() {
		/* customize me */
		if (count > 2000) reset_cache(); // simple, dumb cache cleaner
	}

// ----------------------------------------------------------------------------
// Initialize
	reset_cache();
	setInterval(cache_prune, 3*60*1000); // every 3 minutes
	return {
// ----------------------------------------------------------------------------
// Extentions to Ajax.Request
// ----------------------------------------------------------------------------
/** @this	{Ajax.Request} */
		request: function(url) {
// ----------------------------------------------------------------------------

			var response;

			this.url	= url;
			this.method	= this.options.method;

			// Use cache
			if (this.options.use_cache && !this.options.refresh_cache && cache_contains(this)) {
				try {
					this.transport = cache_fetch(this);
					response = new Ajax.Response(this);
					if (this.options.onCreate) this.options.onCreate(response);
					Ajax.Responders.dispatch('onCreate', this, response);
					this.respondToReadyState(4);
				} catch(e) {
					this.dispatchException(e);
				}
			// Act normally
			} else {
				$request.call(this, url);
			}
		},

// ----------------------------------------------------------------------------
/** @this	{Ajax.Request} */
		respondToReadyState: function(readyState) {
// ----------------------------------------------------------------------------

			$respond.call(this, readyState);

			if (this.options.use_cache && this._complete && this.success() && (this.options.refresh_cache || !cache_contains(this))) {
				cache_store(this);
			}
		}
	};
})();

// Extend Ajax.Request
Ajax.Request.addMethods(AjaxCacheRequestMethods);
