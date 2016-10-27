(function(){
  'use strict';

  class Histogram {
    constructor (o) {
      o = o || {};

      this._observers = [];

      this._numBins = o.numBins || o.numBars || o.numberOfBins || 10;

      this._dataBins = [];
      for (var i = 0; i < this._numBins; i++) {
        this._dataBins.push(0);
      }

      this._minVal = o.minVal || o.minValue || 0;
      this._maxVal = o.maxVal || o.maxValue || 100;

      this._UIBackgroundColor = o.backgroundColor || o.UIBackgroundColor || '#FFF';
      this._UIBarColor = o.barColor || o.UIBarColor || '#000';

      // create the canvas
      this._container = o.container || document.body;
      this._container.style.position = 'relative';
      this._canvas = document.createElement('canvas');
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
      this._container.appendChild(this._canvas);
      this._canvas.style.position = 'absolute';
      this._canvas.style.left = '0px';
      this._canvas.style.top = '0px'
      this._ctx = this._canvas.getContext('2d');

      this.init();

      return this;
    }

    init () {
      this.assignListeners();
      this.drawUI();
      this._listenForResize();
    }

    /* --- Options --- */
    set options (o) {
      o = o || {};

      if (o.canvasWidth) this.canvasWidth = o.canvasWidth;
      if (o.canvasHeight) this.canvasHeight = o.canvasHeight;

      if(o.numBins || o.numberOfBins) {
        this.setUpNewDataBins(o.numBins);
        this._numBins = o.numBins || o.numberOfBins || this.numBins;
      }

      if(o.minVal || o.minValue) this.minVal = o.minVal || o.minValue;
      if(o.maxVal || o.maxValue) this.maxVal = o.maxVal || o.maxValue;

      if(o.backgroundColor || o.UIBackgroundColor) this.UIBackgroundColor = o.backgroundColor || o.UIBackgroundColor;
      if(o.barColor || o.UIBarColor) this.UIBarColor = o.barColor || o.UIBarColor;

      this.notifyObservers();
      this.drawUI();
    }

    setOptions (o) {
      o = o || {};
      this.options = o;
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

    get numBins () {
      return this._numBins;
    }
    set numBins (newNum) {
      this.setUpNewDataBins(newNum);
      this._numBins = newNum;

      this.notifyObservers();
      this.drawUI();
      return this;
    }

    setUpNewDataBins (newNum) {
      if (newNum > this._numBins) {
        for (var i = this._numBins; i < newNum; i++) {
          this._dataBins.push(0);
        }
      } else if (newNum < this._numBins) {
        for (var i = this._numBins; i > newNum; i--) {
          this._dataBins.pop();
        }
      }
      return this;
    }

    get binWidth () {
      var binWidth = this._canvas.width / this.numBins;
      return binWidth;
    }

    get dataBins () {
      return this._dataBins;
    }
    set dataBins (newdataBins) {
      this._dataBins = newdataBins;
      this.notifyObservers();
      this.drawUI();
      return this;
    }

    get minVal () {
      return this._minVal;
    }

    set minVal (newVal) {
      this._minVal = newVal;
      this.drawUI();
      this.notifyObservers();
      return this;
    }

    get maxVal () {
      return this._maxVal;
    }
    set maxVal (newVal) {
      this._maxVal = newVal;
      this.drawUI();
      this.notifyObservers();
      return this;
    }

    setBinVal (binNum, val) {
      this._dataBins[binNum] = val;
      this.drawUI();
      return this;
    }

    get UIBackgroundColor () {
      return this._UIBackgroundColor;
    }

    set UIBackgroundColor (newColor) {
      this._UIBackgroundColor = newColor;
      this.drawUI();
      return this;
    }

    get UIBarColor () {
      return this._UIBarColor;
    }

    set UIBarColor (newColor) {
      this._UIBarColor = newColor;
      this.drawUI();
      return this;
    }

    /* --- Observer methods --- */
    subscribe (context, func) {
      this._observers.push({
        context: context,
        func: func
      });
      return this;
    }

    unsubscribe (context, func) {
      this._observers = this._observers.filter(observer => {
        return observer.context !== context || observer.func !== func;
      });
      return this;
    }

    notifyObservers () {
      var _this = this;
      this._observers.forEach(observer => {
        observer.func.call(observer.context, _this._dataBins);
      });
      return this;
    }

    /* --- Utility methods --- */
    setDataPointByCanvasPos (x, y) {
      var binNum = Math.floor((x / this._canvas.width) * this._numBins);
      var invY = this._canvas.height - y;
      var binVal = (   (this._maxVal - this._minVal)
                     * (invY / this._canvas.height)
                   ) + this._minVal;

      this._dataBins[binNum] = binVal;

      this.notifyObservers();
      this.drawUI();
    }

    binXPos (binNum) {
      return binNum * this.binWidth;
    }

    binYPos (binNum) {
      var binYPos = this._canvas.height
                    - ( (this._dataBins[binNum] - this._minVal)
                       /(this._maxVal - this._minVal)
                      ) * this._canvas.height;
      return binYPos;
    }

    /* --- UI drawing --- */
    drawUI () {
      let binXPos, binYPos;

      this._ctx.fillStyle = this._UIBackgroundColor;
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

      for(var i = 0; i < this._numBins; i++) {
        binXPos = this.binXPos(i) + 1;
        binYPos = this.binYPos(i);

        this._ctx.fillStyle = this._UIBarColor;
        this._ctx.fillRect(binXPos, binYPos, this.binWidth - 2, this._canvas.height - binYPos);
      }
    }

    /* --- UI interaction --- */
    assignListeners () {
      const _this = this;

      let boundingClientRect;
      let canvasX, canvasY;

      this._canvas.addEventListener('mousedown', mouseDownListener);
      this._canvas.addEventListener('touchstart', mouseDownListener);

      function mouseDownListener (e) {
        e.preventDefault();

        boundingClientRect = _this._canvas.getBoundingClientRect();

        if (e.type === 'touchstart') {
          e.clientX = e.touches[0].clientX;
          e.clientY = e.touches[0].clientY;
        }

        canvasX = e.clientX - boundingClientRect.left;
        canvasY = e.clientY - boundingClientRect.top;
        _this.setDataPointByCanvasPos(canvasX, canvasY);

        _this._canvas.addEventListener('mousemove', mouseMoveListener);
        _this._canvas.addEventListener('touchmove', mouseMoveListener);
      }

      function mouseMoveListener (e) {
        if (e.type === 'touchmove') {
          e.clientX = e.touches[0].clientX;
          e.clientY = e.touches[0].clientY;
        }

        canvasX = e.clientX - boundingClientRect.left;
        canvasY = e.clientY - boundingClientRect.top;
        _this.setDataPointByCanvasPos(canvasX, canvasY);

        document.addEventListener('mouseup', mouseUpListener);
        document.addEventListener('touchend', mouseUpListener);
      }

      function mouseUpListener () {
        _this._canvas.removeEventListener('mousemove', mouseMoveListener);
        _this._canvas.removeEventListener('touchmove', mouseMoveListener);
      }
    }

    /**
     * Listens for whether the container's dimensions changed and resize the canvas if they did
     */
    _listenForResize() {
      const _this = this;

      // on window resize, adjust the canvas size in case the container size changes
      window.addEventListener('resize', windowResizeThrottle);

      function windowResizeThrottle () {
        window.requestAnimationFrame(windowResize);
      }

      function windowResize () {
        _this._canvas.width = _this._container.clientWidth;
        _this._canvas.height = _this._container.clientHeight;

        _this.drawUI();
      }
    }
  }

  /* --- Module loader and global support --- */

  // support for AMD libraries
  if (typeof define === 'function') {
    define([], function () {
      return Histogram;
    });
  }

  // support for CommonJS libraries
  else if (typeof exports !== 'undefined') {
    exports.Histogram = Histogram;
  }

  // support for window global
  else if (typeof window !== 'undefined') {
    window.Histogram = Histogram;
  }

  // support for Node.js global
  else if (typeof global !== 'undefined') {
    global.Histogram = Histogram;
  }
})();
