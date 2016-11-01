(function(){
  'use strict';

  /** A class representing a volume meter */
  class Meter {

    /**
     * Create a meter
     * @param {object} [o] - Options object.
     * @param {object} [o.container=document.body] - The DOM element that wraps the widget canvas.
     * @param {object} [o.audioCtx=new AudioContext] - The audio context the meter is to be used in.
     * @param {string} [o.borderColor='#000'] - The border color.
     * @param {string} [o.backgroundColor='#000'] - The background color.
     * @param {number} [o.initAmplitude=0] - The initial amplitude to be displayed (range of 0. - 1.)
     */
    constructor(o) {
      var _this = this;

      o = o || {};

      this._audioCtx = o.audioCtx || this._audioCtx || new AudioContext();

      // style options
      this._borderColor = o.borderColor || 'black';
      this._backgroundColor = o.backgroundColor || 'black';

      // init amplitude values
      this._amplitude = o.initAmplitude || 0;
      this._peak = o.initPeak || -1;
      this._prevAmplitude = 0;

      // create the canvas context
      this.container = o.container || document.body;
      this.canvas = document.createElement('canvas');
      this.container.appendChild(this.canvas);
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
      this.ctx = this.canvas.getContext('2d');

      this.drawMeter();

      this.analyser = this._audioCtx.createAnalyser();
      this.analyser.fftSize = 1024;

      this.input = this.analyser;

      this._peakSetTime = this._audioCtx.currentTime;

      this.scriptProcessor = this._audioCtx.createScriptProcessor(2048, 1, 1);

      this.analyser.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this._audioCtx.destination);

      this.scriptProcessor.onaudioprocess = function() {
        _this.calculateAmplitude();
      }
    }

    /* =================== */
    /* --- Audio setup --- */
    /* =================== */

    connectTo(audioSource) {
      audioSource.connect(this.analyser);
      return this;
    }

    calculateAmplitude () {
      let _this = this;

      let data = new Float32Array(1024);

      _this.analyser.getFloatTimeDomainData(data);

      // calculate the rms over the 1024 samples
      _this._amplitude = Math.sqrt(data.reduce((prev, cur) => {
        return prev + (cur * cur);
      }, 0)/ data.length);

      // scale up
      _this._amplitude = _this._amplitude * 5; // <-FIXTHIS

      // calculate the peak position
      // special cases - peak = -1 means peak expired and waiting for amplitude to rise
      // peak = 0 means amplitude is rising, waiting for peak
      if (_this._amplitude < _this._prevAmplitude && _this._peak < _this._prevAmplitude && _this._peak !== -1) {
        _this._peak = _this._prevAmplitude;
        _this._peakSetTime = _this._audioCtx.currentTime;
      } else if (_this._amplitude > _this._prevAmplitude) {
        _this._peak = 0;
      }

      // draw the peak for 2 seconds, then remove it
      if (_this._audioCtx.currentTime - _this._peakSetTime > 2 && _this._peak !== 0) {
        _this._peak = -1;
      }

      _this._prevAmplitude = _this._amplitude;

      _this.drawMeter();
    }

    /* =========================== */
    /* --- Getters and setters --- */
    /* =========================== */

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

    /* ================== */
    /* --- UI Drawing --- */
    /* ================== */

    ledGradient () {
      var gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0);
      gradient.addColorStop(0, 'green');
      gradient.addColorStop(0.6, 'lightgreen');
      gradient.addColorStop(0.8, 'yellow');
      gradient.addColorStop(1, 'red');

      return gradient;
    }

    drawBorder() {
      var width = this.canvas.width;
      var height = this.canvas.height;
      var yOffset = 5;

      this.ctx.strokeStyle = this._borderColor;
      this.ctx.fillStyle = this._backgroundColor;
      this.ctx.fillRect(0, yOffset, width, height - (2 * yOffset));
      this.ctx.strokeRect(0, yOffset, width, height - (2 * yOffset));
    }

    drawLed(amplitude) {
      var ledHeight = this.canvas.height * amplitude;

      this.ctx.fillStyle = this.ledGradient();
      this.ctx.fillRect(0, this.canvas.height - ledHeight, this.canvas.width, ledHeight);
    }

    drawPeak(amplitude) {
      var ledHeight = this.canvas.height * amplitude;

      this.ctx.fillStyle = this.ledGradient();
      this.ctx.fillRect(0, this.canvas.height - ledHeight, this.canvas.width, 1);
    }

    drawMeter(amplitude) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawBorder();
      this.drawLed(this._amplitude);
      this.drawPeak(this._peak);
    }
  }

  /* ======================================== */
  /* --- Module loader and global support --- */
  /* ======================================== */

  // support for AMD libraries
  if (typeof define === 'function') {
    define([], function () {
      return Meter;
    });
  }

  // support for CommonJS libraries
  else if (typeof exports !== 'undefined') {
    exports.Meter = Meter;
  }

  // support for window global
  else if (typeof window !== 'undefined') {
    window.Meter = Meter;
  }

  // support for Node.js global
  else if (typeof global !== 'undefined') {
    global.Meter = Meter;
  }
})();
