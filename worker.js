void(function(){
"use strict";
var nativeWorker = window.Worker;
if(nativeWorker && nativeWorker.notNative) return;
if(nativeWorker && !nativeWorker.forceIframeWorker) return;
void(function(){
	var MessageEvent = function(data,target){
		this.data = data;
		this.type="message";
		if(typeof target !== typeof void(0)){
			this.currentTarget = target;
			this.timeStamp = (new Date()).getTime();
			this.srcElement = target;
			this.target = target;
		}
	};
	var toAbsPath = function(rPath){
		var div =document.createElement(div);
		div.innerHTML = '<a href="'+rPath+'">attr<\/a>';
		return div.getElementsByTagName('a')[0].href;
	};
	var pathJoin = function(left,right){
		var href;
		if(/^\//.test(right)){
			href = right;
		}else{
			href = (left.match(/[\s\S]+\//)||[''])[0] + right;
		}
		return toAbsPath(href);
	};
	var cXHR = function(){
		var contentWindow = this;
		var Xhr;
		if(typeof contentWindow.XMLHttpRequest !== typeof void 0){
			Xhr = function(){
				return new XMLHttpRequest();
			};
		}else if(typeof contentWindow.ActiveXObject !== typeof void 0){
			Xhr = function(){
				return new ActiveXObject('Microsoft.XMLHTTP');
			};
		}else{
			throw new Error('your client do not implement XMLHttpRequest');
		}
		return Xhr;
	};
//init------------------------------------------------------------------------------
	window.Worker = function (script) {
		var thisWorker = this;

		//some interfaces for worker object
		thisWorker.onmessage = thisWorker.onerror = null;

		// prepare and inject iframe
		thisWorker._currentPath = pathJoin(window.Worker.baseURI,script);//pach
		thisWorker._iframeEl = document.createElement('iframe');//iframe element
		thisWorker._quere = [];
		thisWorker._unloaded = false;

		//styles
		thisWorker._iframeEl.style.visibility = 'hidden';
		thisWorker._iframeEl.style.width = '1px';
		thisWorker._iframeEl.style.height = '1px';
		thisWorker._iframeEl.style.position = 'absolute';

		//onload
		thisWorker._iframeEl.onload = thisWorker._iframeEl.onreadystatechange = function () {
			if (this.readyState && this.readyState !== "loaded" && this.readyState !== "complete") return;
			thisWorker._iframeEl.onload = thisWorker._iframeEl.onreadystatechange = null;

			var contentWindow = this.contentWindow;//window object of iframe
			var getSync = (function(){
				var getXhr = cXHR.call(contentWindow);
				return function(url){
					var request = getXhr();
					request.open('GET',url,false);
					request.send(null);
					return request.responseText;
				};
			})();
			var loadScript = function(path){
				var outerFileCodes = 
				//'with({postMessage:workerPostMessage,close:workerClose}){'+getSync(path)+'}'+
				getSync(path)+
				'\n\n//# sourceURL='+path;
				try{
					contentWindow['eval'](outerFileCodes);
				}catch(er){
					console.error(er.stack||er);
					if(thisWorker.onerror){
						thisWorker.onerror(er);
					}
					if(contentWindow.onerror){
						contentWindow.onerror.call(contentWindow,er);
					}
				}
			};

			// Some interfaces within the Worker scope.
			contentWindow.Worker = window.Worker; // yes, worker could spawn another worker!
			contentWindow.importScripts = function () {
				for (var i = 0; i < arguments.length; i++) {
					//injectScript(pathJoin(worker._currentPath, arguments[i]));
					var path = pathJoin(thisWorker._currentPath, arguments[i]);
					loadScript(path);
				}
			};
			contentWindow.onmessage = contentWindow.onerror = null; // placeholder function
			contentWindow.workerPostMessage = function (data) {
				if (typeof thisWorker.onmessage === 'function') {
					thisWorker.onmessage.call(thisWorker,new MessageEvent(data,thisWorker));
				}
			};
			contentWindow.workerClose = function () {
				thisWorker.terminate();
			};

			// inject worker script into iframe
			setTimeout(function(){
				loadScript(toAbsPath(script));
				thisWorker._quere.push = function (callback) {
					if (!thisWorker._unloaded) {
						callback();
					}
				};
				if (!thisWorker._unloaded) {
					while (thisWorker._quere.length) {
						(thisWorker._quere.shift())();
					}
				}
			},0);
			/*var injectScript = function(script, callback) {
				var doc = contentWindow.document;
				var scriptEl = doc.createElement('script');
				scriptEl.src = script;
				scriptEl.type = 'text/javascript';
				scriptEl.onload = scriptEl.onreadystatechange = function () {
					if (scriptEl.readyState && scriptEl.readyState !== "loaded" && scriptEl.readyState !== "complete") return;
					scriptEl.onload = scriptEl.onreadystatechange = null;
					scriptEl = null;
					if (callback) {
						callback();
					}
				};
				doc.body.appendChild(scriptEl);
			};
			injectScript(thisWorker._currentPath, function () {
				thisWorker._quere.push = function (callback) {
					if (!thisWorker._unloaded) {
						callback();
					}
				};
				if (!thisWorker._unloaded) {
					while (thisWorker._quere.length) {
						(thisWorker._quere.shift())();
					}
				}
			});*/
		};

		//load iframe
		this._iframeEl.src = window.Worker.iframeURI;
		;(document.head||document.getElementsByTagName('head')[0]).appendChild(this._iframeEl);
	};
	window.Worker.prototype.postMessage = function (obj) {
		var thisWorker = this;
		setTimeout(function () {
			thisWorker._quere.push(function () {
				// IE8 throws an error if we call worker._iframeEl.contentWindow.onmessage() directly
				var win = thisWorker._iframeEl.contentWindow;
				if(win.onmessage){
					win.onmessage.call(win,new MessageEvent(obj));
				}
			});
		},0);
	};
	window.Worker.prototype.terminate = function () {
		if (!this._unloaded) {
			(document.head||document.getElementsByTagName('head')[0]).removeChild(this._iframeEl);
		}
		this._iframeEl = null;
		this._unloaded = true;
	};
	window.Worker.prototype.addEventListener = function () {};
	window.Worker.prototype.removeEventListener = function () {};

	window.Worker.notNative = true;
	window.Worker.iframeURI = 'about:blank';
	window.Worker.baseURI = pathJoin(location.pathname,'');
	if(nativeWorker){
		window.Worker.nativeWorker = nativeWorker;
	}
})();

})();
