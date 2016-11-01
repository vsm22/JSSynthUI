(function(){
  'use strict';

  /** Class representing a dial widget */
  class Dial {

    /**
     * Create a dial
     * @param {object} [o] - Options object.
     * @param {object} [o.container=document.body] - The DOM element that wraps the widget canvas.
     * @param {number} [o.value=0] - Inital value.
     * @param {number} [o.minVal=0] - Minimum possible value.
     * @param {number} [o.maxVal=127] - Maximum possible value.
     * @param {string} [o.needleColor='#000'] - Dial needle color.
     * @param {string} [o.activeColor='#f40'] - Color of the arc that shows the current dial value.
     */
    constructor (o) {
      o = o || {};

      this.observers = [];

      // value
      this._value = o.value || 0;
      this._minValue = o.minVal || o.minValue || 0;
      this._maxValue = o.maxVal || o.maxValue || 127;

      // display options
      this._needleColor = o.needleColor || '#000';
      this._activeColor = o.activeColor || '#f40';

      // set up the canvas
      this._container = o.container || document.body;
      this._canvas = document.createElement('canvas');
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
      this._container.appendChild(this._canvas);
      this._ctx = this._canvas.getContext('2d');

      this.init();

      return this;
    }

    init () {
      this.drawUI();
      this.assignListeners();
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

    set value (newValue) {
      this._value = Math.max(Math.min(newValue, this._maxValue), this._minValue);
      this.drawUI();
      this.notify();
      return this;
    }

    get value () {
      return this._value;
    }

    setValue (newValue) {
      this.value = newValue;
    }

    getValue () {
      return this._value;
    }

    /* --- UI DRAWING --- */
    get r () {
      return Math.trunc(Math.min(this.cX, this.cY) * 0.9);
    }

    get cX () {
      return Math.trunc(this._canvas.width / 2);
    }

    get cY () {
      return Math.trunc(this._canvas.height / 2);
    }

    drawUI () {
      this._ctx.clearRect(0,0, this._canvas.width, this._canvas.height);

      var cX = this.cX;
      var cY = this.cY;

      var dialRadius = this.r;

      // calculate the needle angle
      var needleAngle = ((this._value - this._minValue) / (this._maxValue - this._minValue)) * 1.7*Math.PI + (1.15 * Math.PI);
      var needleEndX = cX + (Math.sin(needleAngle) * dialRadius);
      var needleEndY = cY - (Math.cos(needleAngle) * dialRadius);

      // draw the background circle
      this._ctx.beginPath();
      this._ctx.arc(cX, cY, dialRadius, 0.65*Math.PI, 2.35*Math.PI);
      this._ctx.lineWidth = dialRadius / 5;
      this._ctx.strokeStyle = this._needleColor;
      this._ctx.stroke();

      // draw the active circle
      this._ctx.beginPath();
      this._ctx.arc(cX, cY, dialRadius, 0.64*Math.PI, needleAngle - 0.51*Math.PI);
      this._ctx.lineWidth = dialRadius / 5;
      this._ctx.strokeStyle = this._activeColor;
      this._ctx.stroke();

      // draw the needle
      this._ctx.beginPath();
      this._ctx.moveTo(cX, cY);
      this._ctx.lineTo(needleEndX, needleEndY);
      this._ctx.lineCap = 'round';
      this._ctx.lineWidth = dialRadius / 5;
      this._ctx.strokeStyle = this._needleColor;
      this._ctx.stroke();
    }

    /* --- UI INTERACTION --- */

    /** Leeway threshold (in px) for which a click is considered to be within boundary */
    get clickThresh() {
      return 3;
    }

    assignListeners () {
      let _this = this;

      const canvasBoundingClientRect = this._canvas.getBoundingClientRect();
      let turnStartVal, turnStartY, turnDelta, newVal;

      this._canvas.addEventListener('mousedown', beginTurningListener);
      this._canvas.addEventListener('touchstart', beginTurningListener);

      function beginTurningListener(e) {
        let canvasX = e.clientX - canvasBoundingClientRect.left;
        let canvasY = e.clientY - canvasBoundingClientRect.top;
        let clickRadius = Math.hypot(canvasX - _this.cX, canvasY - _this.cY);

        // if the click is within radius from the center
        if(clickRadius < _this.r + _this.clickThresh
           && clickRadius > _this.r - _this.clickThresh) {
             console.log('click on dial radius');
        }

        if (e.type === 'touchstart') {
          e.clientY = e.touches[0].clientY;
        }

        turnStartY = e.clientY;
        turnStartVal = _this._value;

        document.addEventListener('mousemove', continueTurningListener);
        document.addEventListener('touchmove', continueTurningListener);
      }

      function continueTurningListener (e) {
        e.preventDefault()

        if (e.type === 'touchmove') {
          e.clientY = e.touches[0].clientY;
        }

        turnDelta = Math.trunc((turnStartY - e.clientY) * (_this._maxValue - _this._minValue)/200);

        if((turnStartVal + turnDelta > _this._maxValue) || (turnStartVal + turnDelta < _this._minValue)) {
            turnStartY = e.clientY;
            turnStartVal = _this._value;
        } else {
          _this.setValue(turnStartVal + turnDelta);
        }

        document.addEventListener('mouseup', endTurningListener);
        document.addEventListener('touchend', endTurningListener);
      }

      function endTurningListener (e) {
        document.removeEventListener('mousemove', continueTurningListener);
        document.removeEventListener('touchmove', continueTurningListener);
        document.removeEventListener('mouseup', endTurningListener);
        document.removeEventListener('touchend', endTurningListener);
      }
    }
  }

  /* --- Module loader and global support --- */

  // support for AMD libraries
  if (typeof define === 'function') {
    define([], function () {
      return Dial;
    });
  }

  // support for CommonJS libraries
  else if (typeof exports !== 'undefined') {
    exports.Dial = Dial;
  }

  // support for window global
  else if (typeof window !== 'undefined') {
    window.Dial = Dial;
  }

  // support for Node.js global
  else if (typeof global !== 'undefined') {
    global.Dial = Dial;
  }
})();
