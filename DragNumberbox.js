define(['require'], function(require){
  'use strict';


  class DragNumberbox {

    /**
     * A draggable number box
     */
    constructor (o) {
      o = o || {}

      this._observers = [];

      this._container = o.container || document.body;
      this._containerStyle = window.getComputedStyle(this._container);

      this._value = o.value || 0;
      this._minValue = o.minValue;
      this._maxValue = o.maxValue;

      this._dragDelta = o.dragDelta || 1;

      this._appendString = o.appendString || '';

      this._UIBackgroundColor = o.backgroundColor || this._containerStyle.backgroundColor;
      this._UIFontColor = o.fontColor || this._containerStyle.color;
      this._UIFontFamily = o.fontFamily || this._containerStyle.fontFamily;
      this._UIFtonSize = o.fontSize || this._containerStyle.fontSize;

      this._canvas = o.canvas || window.document.createElement('canvas');
      if(o.canvas === undefined) {
        this._canvas.width = this._container.clientWidth;
        this._canvas.height = this._container.clientHeight;
        this._canvas.style.position = 'absolute';
        this._canvas.style.left = '0px';
        this._canvas.style.top = '0px';
        this._canvas.style.width = this._container.clientWidth;
        this._canvas.style.height = this._container.clientHeight;
        this._container.appendChild(this._canvas);
      }
      this._ctx = this._canvas.getContext('2d');

      this._drawUI();
      this._assignListeners();

      return this;
    }

    /* =========================== */
    /* --- Getters and setters --- */
    /* =========================== */

    /** Append string */
    get appendString (){
      return this._appendString;
    }
    set appendString (newString) {
      this._appendString = newString;
      this._drawUI();
      return this;
    }

    /** Value */
    get value () {
      return this._value;
    }
    set value (newVal) {

      if(this._minValue !== undefined) {
        newVal = Math.max(newVal, this._minValue);
      }
      if(this._maxValue !== undefined) {
        newVal = Math.min(newVal, this._maxValue);
      }

      this._value = newVal;
      this._drawUI();
      return this;
    }

    /** Drag delta */
    get dragDelta () {
      return this._dragDelta;
    }
    set dragDelta (newVal) {
      this._dragDelta = newVal;
      return this;
    }

    /* ======================== */
    /* --- Observer support --- */
    /* ======================== */

    subscribe (context, func) {
      this._observers.push({
        context: context,
        func: func
      });
      return this;
    }

    unsubscribe (context, func) {
      this.observers = this.observers.filter(observer => {
        return observer.context !== context || observer.func !== func;
      });
      return this;
    }

    _notifyObservers () {
      var _this = this;
      this._observers.forEach(observer => {
        observer.func.call(observer.context, _this._value);
      });
      return this;
    }

    /* ================== */
    /* --- UI drawing --- */
    /* ================== */

    _drawUI () {
      let textWidth = this._ctx.measureText(this._value + this._appendString).width;
      let textHeight = 6;

      this._ctx.fillStyle = this._UIBackgroundColor;
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

      this._ctx.font = this._UIfontSize + ' ' + this._UIFontFamily;
      this._ctx.fillStyle = this._UIFontColor;
      this._ctx.fillText(this._value + this._appendString, (this._canvas.width/2) - (textWidth/2), (this._canvas.height/2) + (textHeight/2));
    }

    /* ====================== */
    /* --- UI interaction --- */
    /* ====================== */

    _assignListeners () {
      const _this = this;

      let mousedownY;
      let originalValue;

      this._canvas.addEventListener('mousedown', mousedown);

      function mousedown (e) {
        e.preventDefault();

        originalValue = _this._value;

        mousedownY = e.clientY;

        document.addEventListener('mousemove', continueDragging);
      }

      function continueDragging (e) {
        let mouseDeltaY = mousedownY - e.clientY;

        _this.value = originalValue + _this._dragDelta * mouseDeltaY;

        _this._notifyObservers();
        _this._drawUI();

        document.addEventListener('mouseup', finishDragging);
      }

      function finishDragging () {
        document.removeEventListener('mousemove', continueDragging)
      }
    }

  }

  return DragNumberbox;

});
