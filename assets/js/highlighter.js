function EventHandlers(highlighter) {
	
	this.moveHandler = function(e) {
		e.preventDefault();
		if (e.originalEvent.touches && e.originalEvent.touches.length == 2) {
			if (highlighter.fingers_down) {
				highlighter.finger_1_start = { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY };
				highlighter.finger_2_start = { x: e.originalEvent.touches[1].clientX, y: e.originalEvent.touches[1].clientY };
				highlighter.origin = { x: (e.originalEvent.touches[0].clientX + e.originalEvent.touches[1].clientX) / 2, y: (e.originalEvent.touches[0].clientY + e.originalEvent.touches[1].clientY) / 2 }
				highlighter.fingers_down = false;
			} else {
				if (highlighter.finger_1_end) highlighter.finger_1_start = highlighter.finger_1_end;
				if (highlighter.finger_2_end) highlighter.finger_2_start = highlighter.finger_2_end;
				highlighter.finger_1_end = { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY };
				highlighter.finger_2_end = { x: e.originalEvent.touches[1].clientX, y: e.originalEvent.touches[1].clientY };
			}
			
			highlighter.calculatePinchZoom();
		} else {
			var x = e.clientX ? e.clientX : e.originalEvent.targetTouches[0].pageX;
			var y = e.clientY ? e.clientY : e.originalEvent.targetTouches[0].pageY;
			if (highlighter.isInDrawMode) {
				if (highlighter.isDrawing) {
					highlighter.addClick(x - highlighter.offsetX, y - highlighter.offsetY, true);
				}
			} else {
				if (highlighter.isDragging) {
					highlighter.dragEnd = [x, y];
					highlighter.calculateMovementCoords(x, y);
					highlighter.drawMoveStart = [x, y];
				}
			}
		}
	}
	
	this.downHandler = function(e) {
		e.preventDefault();
		if (e.originalEvent.touches) {
			// this is a pinch, not a click or a tap
			if (!highlighter.isInDrawMode) {
				highlighter.fingers_down = true;				
			}
		}
		var x = e.clientX ? e.clientX : e.originalEvent.targetTouches[0].pageX;
		var y = e.clientY ? e.clientY : e.originalEvent.targetTouches[0].pageY;
		if (highlighter.isInDrawMode) {
			highlighter.isDrawing = true;
			highlighter.clearClicks();
			highlighter.addClick(x - highlighter.offsetX, y - highlighter.offsetY);
		} else {
			highlighter.isDragging = true;
			highlighter.dragStart = [x, y];
			highlighter.drawMoveStart = [x, y];
		}
		
	}
	
	this.upHandler = function(e) {
		e.preventDefault();
		highlighter.origin = null;
		if (highlighter.isInDrawMode) {
			highlighter.isDrawing = false;
			var x = e.pageX ? e.pageX : e.originalEvent.changedTouches[0].pageX;
			var y = e.pageY ? e.pageY : e.originalEvent.changedTouches[0].pageY;
			highlighter.addClick(x - highlighter.offsetX, y - highlighter.offsetY, null, true);
		} else {
			highlighter.isDragging = false;
			highlighter.resetCanvasContentCoords(highlighter.mouseX, highlighter.mouseY);
		}
	}
	
	this.outHandler = function(e) {
		e.preventDefault();
		if (highlighter.isInDrawMode) {
			highlighter.isDrawing = false;
		} else {
			highlighter.isDragging = false;
			highlighter.resetCanvasContentCoords(highlighter.mouseX, highlighter.mouseY);
		}
	}
}

function Highlighter(img) {
	
	this.isDrawing = false;
	this.isInDrawMode = false;
	this.isDragging = false;
	this.mouseX = 0;
	this.mouseY = 0;
	this.clickX = [];
	this.clickY = [];
	this.clickDrag = [];
	this.clickEnd = [];
	
	/* some variables for calculating pinch zoom */
	this.finger_1_start = { x: 0, y: 0 };
	this.finger_2_start = { x: 0, y: 0 };
	this.finger_1_end   = { x: 0, y: 0 };
	this.finger_2_end   = { x: 0, y: 0 };
	this.fingers_down = false;
	this.ratio = 1;
	this.origin = null;
			
	this.eventHandlers = new EventHandlers(this);
	
	this.canvas = document.getElementById("highlighter");
	this.canvas.width  = window.innerWidth;
	this.canvas.height = window.innerHeight;
	var canvasOffset = $("#highlighter").offset();
	this.offsetX = canvasOffset.left;
	this.offsetY = canvasOffset.top;
	this.startX = this.offsetX;
	this.startY = this.offsetY;
	this.dragStart = [this.startX, this.startY];
	this.dragEnd = [this.startX, this.startY];
	
	this.matrix = [1,0,0,1,0,0];  // for tracking internal scaling/transform matrix (so we can calculate actual mouse position on zoomed canvas)\
	this.inverse_matrix = [];
	
	var matrix = [1,0,0,1,0,0];
	var inverse_matrix = [1,0,0,1];
	
	this.currentOrigin = { x: 0, y: 0 }; // track x & y origin for positioning mouse coordinates
	
	var canvas = this.canvas;
	var context = this.canvas.getContext("2d");
	
	// zoom-related vars
	var zoomIntensity = 0.2;
	var scale = 1;
	this.originx = 0;
	this.originy = 0;
	var visibleWidth;
	var visibleHeight;
	
	var highlighter = this;
	
	/** perform the translate on the canvas, but also update our internal matrix */
	this.translate = function(x,y) {
		this.matrix[4] += this.matrix[0] * x + this.matrix[2] * y;
	    this.matrix[5] += this.matrix[1] * x + this.matrix[3] * y;
	    context.translate(x,y);
	}
	
	/** perform the scale on the canvas, but also update our internal matrix */
	this.scale = function(x,y) {
		this.matrix[0] *= x;
	    this.matrix[1] *= x;
	    this.matrix[2] *= y;
	    this.matrix[3] *= y;
	    context.scale(x,y);
	}
	
	this.createMatrix = function(x,y,scale,rotate) {
		var m = matrix;
		var im = inverse_matrix;
		
		// create the rotation and scale parts of the matrix
	    m[3] =   m[0] = Math.cos(rotate) * scale;
	    m[2] = -(m[1] = Math.sin(rotate) * scale);

	    // add the translation
	    m[4] = x;
	    m[5] = y;

	    // calculate the inverse transformation

	    // first get the cross product of x axis and y axis
	    cross = m[0] * m[3] - m[1] * m[2];

	    // now get the inverted axis
	    im[0] =  m[3] / cross;
	    im[1] = -m[1] / cross;
	    im[2] = -m[2] / cross;
	    im[3] =  m[0] / cross;
	}
	
	this.setDrawMode = function(draw_mode) 
	{
		this.isInDrawMode = draw_mode;
		this.isDrawing = false;
	}
	
	this.resetCanvasContentCoords = function(clientX, clientY)
	{
		highlighter.startX = clientX;
		highlighter.startY = clientY;
	}
	
	this.calculateMovementCoords = function(clientX, clientY) 
	{
		//console.log(highlighter.dragStart[0] + "," + highlighter.dragEnd[0]);
		highlighter.mouseX = parseInt(highlighter.startX + (highlighter.dragStart[0] - highlighter.dragEnd[0]));
		highlighter.mouseY = parseInt(highlighter.startY + (highlighter.dragStart[1] - highlighter.dragEnd[1]));
		
		for(var i=0; i < highlighter.clickX.length; ++i) {
			highlighter.clickX[i] = parseInt(highlighter.clickX[i] - (highlighter.drawMoveStart[0] - highlighter.dragEnd[0]));
			highlighter.clickY[i] = parseInt(highlighter.clickY[i] - (highlighter.drawMoveStart[1] - highlighter.dragEnd[1]));
		}
	}
	
	/**
	 * Translates the coordinate values based on the current zoom level
	 * 
	 * @param x - the x coordinate
	 * @param y - the y coordinate
	 * @return Object
	 */
	this.translateCoordinate = function(x,y) {
		
		console.log("==========================");
		console.log("scale: " + scale);
		console.log('old coords');
		console.log([x,y]);
		
		var rect = this.canvas.getBoundingClientRect();
		console.log("offset X: " + this.originx);
		console.log("offset Y: " + this.originy);
		
//		(x + this.offsetX)
		
//		var newX = ((x - rect.left) * this.matrix[0] + (y - rect.top) * this.matrix[2] + this.matrix[4]);
//	    var newY = ((x - rect.left) * this.matrix[1] + (y - rect.top) * this.matrix[3] + this.matrix[5]);
		
//		var newX =  ((x + this.offsetX) * scale);
//		var newY =  ((y + this.offsetY) * scale);
		
//		var newX = (x - this.originx);
//		var newY = (y - this.originy);
		
//		var newX = (x - rect.left);
//		var newY = (y - rect.top);
		
		var newX = (x) / scale + this.originx;
		var newY = (y) / scale + this.originy;
		
		console.log('new coords');
		console.log([newX, newY]);
	    
		return {x: newX, y: newY};
	}
	
	this.addClick = function(x, y, dragging, mouseup)
	{
		var point = this.translateCoordinate(x,y)
		this.clickX.push(point.x);
		this.clickY.push(point.y);
		this.clickDrag.push(dragging);
		this.clickEnd.push(mouseup);
	}
	
	this.clearClicks = function() {
		this.clickX = [];
		this.clickY = [];
		this.clickDrag = [];
		this.clickEnd = [];
	}
	
	$("#highlighter").bind("mousemove touchmove", function(e) {
		highlighter.eventHandlers.moveHandler(e);
	});
	
	$("#highlighter").bind("mousedown touchstart", function(e) {
		highlighter.eventHandlers.downHandler(e);
	});
	
	$("#highlighter").bind("mouseup touchend touchcancel", function(e) {
		highlighter.eventHandlers.upHandler(e);
	});
	
	$("#highlighter").bind("mouseout", function(e) {
		highlighter.eventHandlers.outHandler(e);
	});
	
	this.clear = function() {
		context.clearRect(highlighter.originx, highlighter.originy, window.InnerWidth, window.innerHeight);
		context.fillStyle = "#80807e";
	}
	
	// handle zooming with scroll wheel
	this.canvas.onmousewheel = function (e){
		if (!highlighter.isDrawing) {
			e.preventDefault();
		    // Get mouse offset.
		    var mx = e.clientX - canvas.offsetLeft;
		    var my = e.clientY - canvas.offsetTop;
		    
		    var wheel = e.wheelDelta/120;
		    this.ratio = Math.exp(wheel*zoomIntensity);
		    
		    
		    var o = {x: highlighter.originx, y: highlighter.originy};
		    this.currentOrigin = $.extend( true, {}, o );
		    
		    console.log('at this point:')
		    console.log(this.currentOrigin);
		    
		    // Translate so the visible origin is at the context's origin.
		    highlighter.translate(highlighter.originx, highlighter.originy);
		  
		    // zoom to the point that the mouse is currently on
		    highlighter.originx -= mx/(scale*this.ratio) - mx/scale;
		    highlighter.originy -= my/(scale*this.ratio) - my/scale;
		    
		    
		    console.log('origin changed:')
		    console.log(this.currentOrigin);
		    
		    // Scale it (centered around the origin due to the previous translate).
		    highlighter.scale(this.ratio, this.ratio);
		    // Offset the visible origin to it's proper position.
		    highlighter.translate(-highlighter.originx, -highlighter.originy);
		    
		    // Update scale by scroll ratio
		    scale *= this.ratio;
	    
		}
	    
	}
	
	this.calculatePinchZoom = function() {
		var distance_1 = Math.sqrt(Math.pow(this.finger_1_start.x - this.finger_2_start.x, 2) + Math.pow(this.finger_1_start.y - this.finger_2_start.y, 2));
		var distance_2 = Math.sqrt(Math.pow(this.finger_1_end.x - this.finger_2_end.x, 2) + Math.pow(this.finger_1_end.y - this.finger_2_end.y, 2));
		if (distance_1 && distance_2) {
  			this.ratio = (distance_2 / distance_1);
  			
  			//context.translate(highlighter.origin.x, highlighter.origin.y)
  			
  			// if (highlighter.origin) {
	  		// 	highlighter.originx = highlighter.origin.x/(scale*this.ratio) - highlighter.origin.x/scale;
	  		// 	highlighter.originy = highlighter.origin.y/(scale*this.ratio) - highlighter.origin.y/scale;
	  		// 	highlighter.origin.x -= highlighter.origin.x/(scale*this.ratio) - highlighter.origin.x/scale;
	  		// 	highlighter.origin.y -= highlighter.origin.y/(scale*this.ratio) - highlighter.origin.y/scale;
	  		// 	console.log("zoom: " + this.ratio);
	    // 		console.log("x: " + highlighter.originx);
	    // 		console.log("y: " + highlighter.originy);
  			// }
  			
  			highlighter.scale(this.ratio, this.ratio);
  			
  			//context.translate(-highlighter.origin.x, -highlighter.origin.y)
  			
  			scale *= this.ratio; // redraw the empty rectangle at proper scaled size to avoid multiple instances of the image on the canvas

  			
		}
	}
	
	this.redrawCanvas = function(image) {
		highlighter.clear();
		context.fillRect(highlighter.originx,highlighter.originy,canvas.width/scale,canvas.height/scale);
		context.drawImage(image,-highlighter.mouseX + (canvas.width / 2 - image.width / 2), -highlighter.mouseY, image.width, image.height);
		
		context.strokeStyle = 'rgba(228, 244, 56, .8)';
		context.fillStyle = 'rgba(228, 244, 56, 0.35)';
		
		context.lineWidth = 5;
		
		var line_start = 0;
		context.beginPath();
		for(var i=0; i < highlighter.clickX.length; i++) {		
			if(!highlighter.clickDrag[i] && !i){
				context.moveTo(highlighter.clickX[i]-1, highlighter.clickY[i]);
			}
			
			if (highlighter.clickEnd[i] == true) {
				context.lineTo(highlighter.clickX[line_start], highlighter.clickY[line_start]);
				context.fill();
				context.stroke();
				context.closePath();
				context.beginPath();
				
				line_start = i+1;						
			}
			
			else {
				context.lineTo(highlighter.clickX[i], highlighter.clickY[i]);
				context.stroke();
//					context.fill();
			}
		}

	}
	
	this.image = new Image();
	
	var redrawCanvas = this.redrawCanvas;
	this.image.onload = function() {
		var img = this;
		highlighter.image = img;
		setInterval(function() { redrawCanvas(img); }, 1000/60); // always redraw canvas @ 60fps for best visuals
	}
	this.image.src = img;
}