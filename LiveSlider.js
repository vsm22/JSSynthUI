(function(){
  'use strict';

  class LiveSlider {
    constructor (o) {
      o = o || {};

      // observers get notified of changes to this.value
      this.observers = [];

      // value
      this._value = o.value || 0;
      this._minValue = o.minVal || o.minValue || 0;
      this._maxValue = o.maxVal || o.maxValue || 127;

      // display options
      this._sliderBarColor = o.sliderBarColor || 'black';
      this._triangleBorderColor = o.triangleBorderColor || 'black';
      this._triangleFillColor = o.triangleFillColor || 'black';

      // drawing context
      this.container = o.container || document.body;
      this.canvas = document.createElement('canvas');
      this.canvas.height = this.container.clientHeight;
      this.canvas.width = this.container.clientWidth;
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      // init
      this.drawUI();
      this.assignListeners();

      return this;
    }

    /* --- Observer methods --- */
    subscribe (context, func) {
      this.observers.push({
        func: func,
        context: context
      });
      return this;
    }

    unsubscribe (context, func) {
      this.observers = this.observers.filter(observer => {
        return observer.func !== func || observer.context !== context;
      });
      return this;
    }

    notify () {
      var _this = this;
      this.observers.forEach(observer => {
        observer.func.call(observer.context, _this._value);
      });
    }

    /* --- Getters and setters --- */
    set canvasWidth (newWidth) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._canvas.width = newWidth;
      this.drawUI()
      return this;
    }

    setCanvasWidth (newWidth) {
      this.canvasWidth = newWidth;
    }

    set canvasHeight (newHeight) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._canvas.height = newHeight;
      this.drawUI();
      return this;
    }

    setCanvasHeight (newHeight) {
      this.canvasHeight = newHeight;
    }

    get value () {
      return this._value;
    }

    set value (newValue) {
      this._value = Math.max(Math.min(newValue, this._maxValue), this._minValue);
      this.drawUI();
      this.notify();
      return this;
    }

    // setter used if needed to bind setValue as an observer
    setValue (newValue) {
      this.value = newValue;
    }

    /* --- UI DRAWING -- */
    get sliderBarXPos () {
      var cX = Math.trunc(this.sliderBarWidth);
      return cX;
    }

    get sliderBarWidth () {
      var sliderBarWidth = Math.trunc(this.canvas.height * 0.02);
      return sliderBarWidth;
    }

    get sliderBarYOffset () {
      var yOffset = 5;
      return yOffset;
    }

    get sliderBarHeight () {
      var sliderBarHeight = Math.trunc(this.canvas.height - (this.sliderBarYOffset * 2));
      return sliderBarHeight;
    }

    get triangleYPos () {
      var valuePortion = (this._value - this._minValue) / (this._maxValue - this._minValue);
      var valueScaledToSlider = valuePortion * this.sliderBarHeight;
      var triangleYPos = this.canvas.height - valueScaledToSlider - this.sliderBarYOffset;
      return triangleYPos;
    }

    get triangleMedianLength () {
      var triangleMedianLength = this.sliderBarHeight * 0.13;
      return triangleMedianLength;
    }

    get triangleHeight () {
      var triangleHeight = this.triangleMedianLength;
      return triangleHeight;
    }

    drawSliderBar () {
      var cX = this.sliderBarXPos;

      this.ctx.beginPath();
      this.ctx.moveTo(cX, this.sliderBarYOffset);
      this.ctx.lineTo(cX, this.canvas.height - this.sliderBarYOffset);
      this.ctx.strokeStyle = this._sliderBarColor;
      this.ctx.lineWidth = 2 * Math.round(this.sliderBarWidth / 2);
      this.ctx.stroke();
    }

    drawSliderTriangle () {
      var cX = this.sliderBarXPos;

      var sliderBarWidth = this.sliderBarWidth;
      var sliderBarHeight = this.sliderBarHeight;
      var triangleMedian = this.triangleMedianLength;
      var triangleYPos = this.triangleYPos;

      this.ctx.beginPath();
      this.ctx.moveTo(cX, triangleYPos);
      this.ctx.lineTo(cX + triangleMedian, triangleYPos - (this.triangleHeight*0.5));
      this.ctx.lineTo(cX + triangleMedian, triangleYPos + (this.triangleHeight*0.5));
      this.ctx.lineTo(cX, triangleYPos);
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.fill();
    }

    drawUI () {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawSliderBar();
      this.drawSliderTriangle();
    }

    /* --- UI INTERACTION --- */

    /**
     * Is (x, y) within the active area for the slider?
     */
    isWithinSliderBarActiveArea (x, y) {
      var xThreshold = 4;

      if (y <= (this.canvas.height - this.sliderBarYOffset) && y >= this.sliderBarYOffset) {
        if (x >= (this.sliderBarXPos - xThreshold) && x <= (this.sliderBarXPos + xThreshold)) {
          return true;
        }
      }
      return false;
    }

    /**
     * Is (x, y) inside the triangle handle?
     */
    isWithinTriangle (x, y) {
      var _this = this;

      var leftTriangleEdge = this.sliderBarXPos;
      var rightTriangleEdge = leftTriangleEdge + this.triangleMedianLength;
      var xWithinTriangle = x - leftTriangleEdge;

      function triangleHypotenuseY(x) {
        var angle = Math.atan((_this.triangleHeight * 0.5)/_this.triangleMedianLength);
        var hypY = Math.tan(angle) * x;
        return hypY;
      }

      if (x >= leftTriangleEdge && x <= rightTriangleEdge) {
        if (y >= this.triangleYPos - triangleHypotenuseY(xWithinTriangle) &&
            y <= this.triangleYPos + triangleHypotenuseY(xWithinTriangle)) {
          return true;
        }
      }
      return false;
    }

    assignListeners () {
      var _this = this;

      this.canvas.addEventListener('mousedown', mouseDownHandler);

      function mouseDownHandler(e) {
        var canvasBoundingClientRect = _this.canvas.getBoundingClientRect();
        var x = e.clientX - canvasBoundingClientRect.left;
        var y = e.clientY - canvasBoundingClientRect.top;

        if (_this.isWithinSliderBarActiveArea(x, y)) {
          setSliderValueByMousePos(e);
        }

        if (_this.isWithinTriangle(x, y)) {
          document.addEventListener('mousemove', setSliderValueByMousePos);
          document.addEventListener('mouseup', mouseUpHandler);
        };
      }

      function setSliderValueByMousePos(e) {
        e.preventDefault();

        var canvasTop = _this.canvas.getBoundingClientRect().top;
        var sliderBarHeight = _this.sliderBarHeight;
        var sliderY = sliderBarHeight - (e.clientY - canvasTop - _this.sliderBarYOffset);
        var newSliderValue = Math.trunc((sliderY/sliderBarHeight) * (_this._maxValue - _this._minValue) + _this._minValue);

        _this.value = newSliderValue;
      }

      function mouseUpHandler(e) {
        document.removeEventListener('mousemove', setSliderValueByMousePos);
      }
    }
  }

  /* --- Module loader and global support --- */

  // support for AMD libraries
  if (typeof define === 'function') {
    define([], function () {
      return LiveSlider;
    });
  }

  // support for CommonJS libraries
  else if (typeof exports !== 'undefined') {
    exports.LiveSlider = LiveSlider;
  }

  // support for window global
  else if (typeof window !== 'undefined') {
    window.LiveSlider = LiveSlider;
  }

  // support for Node.js global
  else if (typeof global !== 'undefined') {
    global.LiveSlider = LiveSlider;
  }
})();
