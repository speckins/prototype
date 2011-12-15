/*
	Some methods to allow Ajax requests to timeout so your users don't wait
	indefinitely.  This implementation uses Ajax.Responders and also extends
	Ajax.Request with a cancel() method.  If you don't define an onTimeout
	callback, the onFailure one is used (unless it doesn't exist either).

	Example:

		var r = new Ajax.Request("http://www.example.com/example.php", {
			onSuccess: mySuccessCallback,
			onFailure: myFailureCallback,
			onTimeout: myTimeoutCallback,
			timeout: 10 // seconds
		}

*/

Ajax.Base.prototype.defaultTimeout = 8000; // msec

(function() {
	var AjaxTimeoutResponders = {

		onCreate: function(r) {
			r.timer = setTimeout(function() {
				// Just in case we've been delayed by intervening callbacks and the request completed in the meantime.
				if (r._complete) return;

				r.cancel();

				// For compatibility w/ onFailure
				var response = new Ajax.Response(r);

				// Use same arguments as onFailure expects, so we can use it as a fallback.
				(r.options.onTimeout || r.options.onFailure || Prototype.emptyFunction)(response, response.headerJSON);
			}, r.options.timeout > 0 ? r.options.timeout*1000 : r.defaultTimeout);
		},

		onComplete: function(r) {
			if (r.timer) clearTimeout(r.timer);
		}
	};

	var AjaxRequestMethods = {
		/** @this {Ajax.Request} */
		cancel: function() {
			if (!this._complete) {
				this.transport.onreadystatechange = Prototype.emptyFunction;
				this.transport.abort();
				var response = new Ajax.Response(this);
				try {
					(this.options['onComplete'] || Prototype.emptyFunction)(response, response.headerJSON);
					Ajax.Responders.dispatch('onComplete', this, response, response.headerJSON);
				} catch(e) {
					this.dispatchException(e);
				}
			}
		}
	};

	// Extend Ajax.Request with the cancel() method and register responders
	Ajax.Request.addMethods( AjaxRequestMethods );
	Ajax.Responders.register( AjaxTimeoutResponders );
})();
