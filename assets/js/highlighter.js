	function EventHandlers(highlighter) {
		
		this.moveHandler = function(e) {
			e.preventDefault();
			if (e.originalEvent.touches && e.originalEvent.touches.length == 2) {
				if (highlighter.fingers_down) {
					highlighter.finger_1_start = { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY };
					highlighter.finger_2_start = { x: e.originalEvent.touches[1].clientX, y: e.originalEvent.touches[1].clientY };
					highlighter.fingers_down = false;
				} else {
					if (highlighter.finger_1_end) highlighter.finger_1_start = highlighter.finger_1_end;
					if (highlighter.finger_2_end) highlighter.finger_2_start = highlighter.finger_2_end;
					highlighter.finger_1_end = { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY };
					highlighter.finger_2_end = { x: e.originalEvent.touches[1].clientX, y: e.originalEvent.touches[1].clientY };
				}
				
				highlighter.calculatePinchZoom();
			} else {
				var x = e.pageX ? e.pageX : e.originalEvent.targetTouches[0].pageX;
				var y = e.pageY ? e.pageY : e.originalEvent.targetTouches[0].pageY;
				if (highlighter.isInDrawMode) {
					if (highlighter.isDrawing) {
						highlighter.addClick(x - highlighter.offsetX, y - highlighter.offsetY, true);
					}
				} else {
					if (highlighter.isDragging) {
						highlighter.dragEnd = [x, y];
						highlighter.calculateMovementCoords(x, y);
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
			var x = e.pageX ? e.pageX : e.originalEvent.targetTouches[0].pageX;
			var y = e.pageY ? e.pageY : e.originalEvent.targetTouches[0].pageY;
			if (highlighter.isInDrawMode) {
				highlighter.isDrawing = true;
				highlighter.addClick(x - highlighter.offsetX, y - highlighter.offsetY);
			} else {
				highlighter.isDragging = true;
				highlighter.dragStart = [x, y];
			}
			
		}
		
		this.upHandler = function(e) {
			e.preventDefault();
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
		
		var highlighter = this;
		this.isDrawing = false;
		this.isInDrawMode = false;
		this.mouseX = 0;
		this.mouseY = 0;
		this.clickX = [];
		this.clickY = [];
		this.clickDrag = [];
		this.clickEnd = [];
		
		/* some variables for calculating pinch zoom */
		this.finger_1_start = { x: 0, y: 0};
		this.finger_2_start = { x: 0, y: 0};
		this.finger_1_end   = { x: 0, y: 0};
		this.finger_2_end   = { x: 0, y: 0};
		this.fingers_down = false;
		this.ratio = 1;
				
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
		
		var canvas = this.canvas;
		var context = this.canvas.getContext("2d");
		
		// drag-related vars
		this.isDragging = false;
		
		// draw-related vars
		this.isDrawing = false;
		
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
			
//			console.log(highlighter.clickX);
//			console.log(highlighter.clickY);
			// AHHH
//			for(var i=0; i < highlighter.clickX.length; i++) {
//				highlighter.clickX[i] = parseInt(highlighter.clickX[i] + (highlighter.dragStart[0] - highlighter.dragEnd[0]));;
//				highlighter.clickY[i] = parseInt(highlighter.clickY[i] + (highlighter.dragStart[1] - highlighter.dragEnd[1]));
//			}
//			console.log(highlighter.clickX);
//			console.log(highlighter.clickY);
		}
		
		this.addClick = function(x, y, dragging, mouseup)
		{
			this.clickX.push(x);
			this.clickY.push(y);
			this.clickDrag.push(dragging);
			this.clickEnd.push(mouseup);
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
			context.clearRect(0, 0, window.InnerWidth, window.innerHeight);
			context.fillStyle = "#80807e";
		}
		
		// zoom-related vars
		var zoomIntensity = 0.2;
		var scale = 1;
		var originx = 0;
		var originy = 0;
		var visibleWidth;
		var visibleHeight;
		
		// handle zooming with scroll wheel
		this.canvas.onmousewheel = function (e){
			e.preventDefault();
		    // Get mouse offset.
		    var mx = e.clientX - canvas.offsetLeft;
		    var my = e.clientY - canvas.offsetTop;
		    
		    var wheel = event.wheelDelta/120;
		    var zoom = Math.exp(wheel*zoomIntensity);
		    
		    // Translate so the visible origin is at the context's origin.
		    context.translate(originx, originy);
		  
		    // zoom to the point that the mouse is currently on
		    originx -= mx/(scale*zoom) - mx/scale;
		    originy -= my/(scale*zoom) - my/scale;
		    
		    // Scale it (centered around the origin due to the trasnslate above).
		    context.scale(zoom, zoom);
		    // Offset the visible origin to it's proper position.
		    context.translate(-originx, -originy);

		    // Update scale and others.
		    scale *= zoom;
		    
		}
		
		this.calculatePinchZoom = function() {
			var distance_1 = Math.sqrt(Math.pow(this.finger_1_start.x - this.finger_2_start.x, 2) + Math.pow(this.finger_1_start.y - this.finger_2_start.y, 2));
			var distance_2 = Math.sqrt(Math.pow(this.finger_1_end.x - this.finger_2_end.x, 2) + Math.pow(this.finger_1_end.y - this.finger_2_end.y, 2));
  			if (distance_1 && distance_2) {
	  			this.ratio = (distance_2 / distance_1);
	  			context.scale(this.ratio, this.ratio);
	  			scale *= this.ratio; // redraws the empty rectangle at proper scaled size to avoid multiple instances of the image on the canvas
  			}
		}
		
		this.redrawCanvas = function(image) {
			highlighter.clear();
			context.fillRect(originx,originy,canvas.width/scale,canvas.height/scale);
			context.drawImage(image,-highlighter.mouseX, -highlighter.mouseY, image.width, image.height);
			
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