function OivCanvasRenderArea(canvasId, serviceUrl, viewer, width, height) {
    this.id = canvasId;
    this.svcUrl = serviceUrl
	this.viewer = viewer
    this.img;
    this.source;
    this.canvas;
    this.ctx;
	
	// disable drag&drop
	document.getElementById(canvasId).ondragstart = function() { return false; };
	
	this.events = {};

    this.addMessageListener = function(handler) {
        if (this.events.hasOwnProperty("CommandEvent"))
            this.events["CommandEvent"].push(handler);
        else
            this.events["CommandEvent"] = [handler];
    };

    this.removeMessageListener = function(handler) {
        if (!this.events.hasOwnProperty("CommandEvent"))
            return;

        var index = this.events["CommandEvent"].indexOf(handler);
        if (index != -1)
            this.events["CommandEvent"].splice(index, 1);
    };
	
    this.fireMessage = function(args) {
        if (!this.events.hasOwnProperty("CommandEvent"))
            return;

        if (!args || !args.length)
            args = [];

        var evs = this.events["CommandEvent"], l = evs.length;
        for (var i = 0; i < l; i++) {
            evs[i].apply(null, args);
        }
    };
	
	var fireMessage = function(instance, args) {
		instance.fireMessage(args);
    };
	
	var ready = false;
    //  this.console;
    //this.console = document.getElementById("debugString");
    // this.console.innerHTML = this.svcUrl + "/view/" + this.id + "/" + action + "?date=" + unique.getTime() + "&id=" + id + "&x=" + parseInt(x) + "&y=" + parseInt(y);

	
    if (!window.WebSocket && window.MozWebSocket) {
        window.WebSocket = window.MozWebSocket;
    }else if (!window.WebSocket && !window.MozWebSocket) {
		alert('Your browser does not support WebSocket.');
	}

    var bind = function (objet, methode) {
        return function () {
            return methode.apply(objet, arguments);
        }
    }

    this.command = function (action) {
		if (ready && this.websocket!=null)
			this.websocket.send("command " + action);
    }

    this.resize = function (w, h) {
        var unique = new Date();
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
		if (ready && this.websocket!=null)
			this.websocket.send("resize " + w + " " + h);

    }

    this.sendMouseEvent = function (action, e) {
		var x = 0;
		var y = 0;
		if (this.canvas.offsetParent != null){
			x = e.clientX - (this.canvas.offsetParent.offsetLeft + this.canvas.offsetLeft);
			y = this.canvas.height - e.clientY + this.canvas.offsetParent.offsetTop + this.canvas.offsetTop;
		}else{
			x = e.clientX - this.canvas.offsetLeft;
			y = this.canvas.height - e.clientY + this.canvas.offsetTop;
		}
		
		if (ready && this.websocket!=null)
			this.websocket.send(action + " " + parseInt(x) + " " + parseInt(y));

    }

    this.sendKeyboardEvent = function (action, e) {
		if (ready && this.websocket!=null)
			this.websocket.send(action + " " + e.keyCode);
    }

    this.sendTouchEvent = function (action, event) {

        var touches = event.changedTouches;

        for (var n = 0; n < touches.length; n++) {
            var touch = touches[n];

            var id = touch.identifier;
			var x = 0;
			var y = 0;
			if (this.canvas.offsetParent != null){
				x = touch.clientX - (this.canvas.offsetParent.offsetLeft + this.canvas.offsetLeft);
				y = this.canvas.height - touch.clientY + this.canvas.offsetParent.offsetTop + this.canvas.offsetTop;
			}else{
				x = touch.clientX - this.canvas.offsetLeft;
				y = this.canvas.height - touch.clientY + this.canvas.offsetTop;
			}
			
			if (ready && this.websocket!=null)
				this.websocket.send(action + " " + id + " " + parseInt(x) + " " + parseInt(y));
        }

        event.preventDefault();
    }

    this.sendMSEvent = function (action, event) {
		if (action == "down")
			this.canvas.focus();
	
        var touch = event;
        var id = touch.pointerId;
		var x = 0;
		var y = 0;
		if (this.canvas.offsetParent != null){
			x = touch.clientX - (this.canvas.offsetParent.offsetLeft + this.canvas.offsetLeft);
			y = this.canvas.height - touch.clientY + this.canvas.offsetParent.offsetTop + this.canvas.offsetTop;
		}else{
			x = touch.clientX - this.canvas.offsetLeft;
			y = this.canvas.height - touch.clientY + this.canvas.offsetTop;
		}
		
		if (ready && this.websocket!=null)
			var finalaction = action;
			if (event.pointerType == event.MSPOINTER_TYPE_MOUSE){
				this.websocket.send("mouse" + finalaction + " " + parseInt(x) + " " + parseInt(y));
			}else if (event.pointerType == event.MSPOINTER_TYPE_TOUCH){
				if (action == "down")
					finalaction = "start";
				else if (action == "up" || action == "cancel")
					finalaction = "end";
				this.websocket.send("touch" + finalaction + " " + id + " " + parseInt(x) + " " + parseInt(y));
			}

        event.preventDefault();
    }

    this.canvas = document.getElementById(this.id);
    if (typeof this.canvas.style.msTouchAction != 'undefined') {
        this.canvas.style.msTouchAction = "none";
    }

    this.ctx = this.canvas.getContext("2d");

    this.redraw = function () {
        this.ctx.drawImage(this.img, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    }

    this.img = new Image();
    this.img.onload = bind(this, this.redraw);


    if (window.navigator.msPointerEnabled) {

        // the system will fire pointer events [ie 10]
        this.canvas.onmspointerdown = bind(this, function (e) { this.sendMSEvent("down", e); });
        this.canvas.onmspointermove = bind(this, function (e) { this.sendMSEvent("move", e); });
        this.canvas.onmspointerup = bind(this, function (e) { this.sendMSEvent("up", e); });
        this.canvas.onmspointercancel = bind(this, function (e) { this.sendMSEvent("cancel", e); });
		this.canvas.onmspointerout = bind(this, function (e) { this.sendMSEvent("leave", e); });
        this.canvas.onmspointerover = bind(this, function (e) { this.sendMSEvent("enter", e); });
    }
    else {
        this.canvas.ontouchstart = bind(this, function (e) { this.sendTouchEvent("touchstart", e); });
        this.canvas.ontouchmove = bind(this, function (e) { this.sendTouchEvent("touchmove", e); });
        this.canvas.ontouchend = bind(this, function (e) { this.sendTouchEvent("touchend", e); });
        this.canvas.ontouchcancel = bind(this, function (e) { this.sendTouchEvent("touchend", e); });

        this.canvas.onmousedown = bind(this, function (e) { this.sendMouseEvent("mousedown", e); });
        this.canvas.onmouseover = bind(this, function (e) { this.sendMouseEvent("mouseenter", e); });
        this.canvas.onmouseout = bind(this, function (e) { this.sendMouseEvent("mouseleave", e); });
        this.canvas.onmouseup = bind(this, function (e) { this.sendMouseEvent("mouseup", e); });
        this.canvas.onmousemove = bind(this, function (e) { this.sendMouseEvent("mousemove", e); });
    }

    this.canvas.onkeyup = bind(this, function (e) { this.sendKeyboardEvent("keyup", e); });
    this.canvas.onkeydown = bind(this, function (e) { this.sendKeyboardEvent("keydown", e); });
    this.canvas.setAttribute('tabindex', '0'); //http: //www.dbp-consulting.com/tutorials/canvas/CanvasKeyEvents.html
    this.canvas.focus();


    this.alive = function () {
		if (ready && this.websocket!=null)
			this.websocket.send('alive');
    };

    this.wsonopen = function () {
		// nothing
    };

    this.wsonclose = function () {
        //alert('connection closed with the oiv service');
    };
	
    this.wsonmessage = function (event) {

		if (this.websocket != null){
			var blob = event.data;
			var image = this.img;
			var instance = this;
			
			var readerText = new FileReader();
			readerText.onloadend = function(evnt) {
				if (readerText.result == "ready") {
					ready = true;
					instance.resize(width, height);
					setInterval(bind(instance, instance.alive), 5000);
				}else if (ready && readerText.result.substring(0,7) == "command"){
					setTimeout(function(){fireMessage(instance, [readerText.result.substring(7,readerText.result.length)]);},1);
				} else if (ready){
					instance.websocket.send('ack');
					var readerImg = new FileReader();
					readerImg.onloadend = function(evnt) {
						image.src = "data:image/jpg;base64," + readerImg.result.split("base64,")[1];
						instance.redraw();
					};
					readerImg.readAsDataURL(blob);
				}
			};
			readerText.onerror = function(evnt) {
				alert("error in readerText");
			};
			readerText.readAsText(blob);
					
		}
    };
	

	this.setViewer = function(viewer){
		
		this.viewer = viewer;	
		
		if (this.websocket != null){
			this.websocket.close();
			this.websocket = null;
			ready=false;
		}
		
		this.websocket = new WebSocket(this.svcUrl + '/?Name=' + this.viewer);
	
		this.websocket.onopen = bind(this, this.wsonopen);

		this.websocket.onclose = bind(this, this.wsonclose);

		this.websocket.onmessage = bind(this, this.wsonmessage);
		
	}

	this.websocket = new WebSocket(this.svcUrl + '/?Name=' + this.viewer);
	
	this.websocket.onopen = bind(this, this.wsonopen);

	this.websocket.onclose = bind(this, this.wsonclose);

	this.websocket.onmessage = bind(this, this.wsonmessage);
	
	

}