(function(){
  'use strict';

  /** A class representing a piano keyboard widget */
  class Keyboard {

    /**
     * Create a keyboard
     * @param {object} [o] - Options object.
     * @param {object} [o.container=document.body] - The DOM element that wraps the widget canvas.
     * @param {number} [o.bottomNote=48] - The bottom note (MIDI pitch) of the keyboard.
     * @param {number} [o.topNote=71] - The top note (MIDI pitch) of the keyboard.
     * @param {string} [o.keyBorderColor='#000'] - The color of the border separating the keys.
     * @param {string} [o.blackKeyColor='#000'] - The color used for the black keys.
     * @param {string} [o.whiteKeyColor='#fff'] - The color used for the white keys.
     * @param {string} [o.blackKeyActiveColor='#555'] - The color used to represent an active black key.
     * @param {string} [o.whiteKeyActiveColor='#333'] - The color used to represent an active white key.
     * @param {string} [o.mode='monophonic'] - The polyphony mode. Possible values are 'monophonic' (only one active note at a time) or 'polyphonic' (can have several active notes at a time).
     * @param {boolean} [o.editable=true] - Boolean specifying whether the keyboard is editable by the mouse or touch interactions. A non-editable keyboard may be used as a visual diagram, for example.
     */
    constructor (o) {
      o = o || {};

      this.observers = [];

      // note range
      this._bottomNote = o.bottomNote || 48; //C3
      this._topNote = o.topNote || 71; //B4

      // prevent bottom or top notes being black keys
      this._bottomNote = (this.isBlackKey(this._bottomNote)) ? (this._bottomNote - 1) : this._bottomNote;
      this._topNote = (this.isBlackKey(this._topNote)) ? (this._topNote + 1) : this._topNote;

      this._numWhiteKeys =  this.numWhiteKeys();

      // colors
      this.keyBorderColor = o.keyBorderColor || '#000';
      this.blackKeyColor = o.blackKeyColor || '#000';
      this.whiteKeyColor = o.whiteKeyColor || '#FFF';
      this.whiteKeyActiveColor = o.whiteKeyActiveColor || o.keyActiveColor || '#555';
      this.blackKeyActiveColor = o.blackKeyActiveColor || o.keyActiveColor || '#333';

      this._mode = o.mode || 'monophonic'; // 'monophonic', 'polyphonic'
      this._editable = (typeof o.editable !== 'undefined') ? o.editable : true; // can you edit by clicking?

      this._activeChord = [];
      this.canvasKeyMap = [];

      // keyboard canvas
      this._container = o.container || document.body;
      this._container.style.position = 'relative';
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.left = '0px';
      this.canvas.style.top = '0px';
      this.canvas.width = this._container.clientWidth;
      this.canvas.height = this._container.clientHeight;
      this._container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      // overlay canvas
      this.overlayCanvas = document.createElement('canvas');
      this.overlayCanvas.width = this.canvas.width;
      this.overlayCanvas.height = this.canvas.height;
      this._container.appendChild(this.overlayCanvas);
      this.overlayCanvas.style.position = 'absolute';
      this.overlayCanvas.style.left = '0px';
      this.overlayCanvas.style.top = '0px';
      this.olCtx = this.overlayCanvas.getContext('2d');

      this.init();

      return this;
    }

    init () {
      this.createKeyboard();
      this.assignListeners();
      this._listenForResize();
    }

    /* --- OBSERVER METHODS --- */

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
        observer.func.call(observer.context, _this._activeChord);
      });
    }

    notifyPitch (midiPitchEvent) {
      var _this = this;
      this.observers.forEach(observer => {
        observer.func.call(observer.context, midiPitchEvent);
      });
    }

    /**
     * Set the options
     */
    setOptions (o) {
      o = o || {};

      // note range
      this._bottomNote = o.bottomNote || this._bottomNote;
      this._topNote = o.topNote || this._bottomNote;

      // colors
      this.keyBorderColor = o.keyBorderColor || this.keyBorderColor;
      this.blackKeyColor = o.blackKeyColor || this.blackKeyColor;
      this.whiteKeyColor = o.whiteKeyColor || this.whiteKeyColor;
      this.whiteKeyActiveColor = o.whiteKeyActiveColor || o.keyActiveColor || this.whiteKeyActiveColor;
      this.blackKeyActiveColor = o.blackKeyActiveColor || o.keyActiveColor || this.blackKeyActiveColor;

      this._mode = o.mode || this.mode; // monophonic or polyphonic
      this._editable = (typeof o.editable !== 'undefined') ? o.editable : this.editable; // can you edit by clicking?

      this.createKeyboard();
      this.assignListeners();
    }

    get mode () {
      return this._mode;
    }
    set mode (newMode) {
      if(newMode === 'monophonic' || newMode === 'polyphonic') {
        this._mode = newMode;
      }
      return this;
    }
    setMode (newMode) {
      this.mode = newMode;
    }

    setBottomNote (note) {
      this._bottomNote = note;
    }

    setTopNote (note) {
      this._topNote = note;
    }

    /**
     * Decide whether a given MIDI pitch is a black key
     */
    isBlackKey (midiPitch) {
      var midiPitchMod12 = midiPitch % 12;

      if(midiPitchMod12 === 1
         || midiPitchMod12 === 3
         || midiPitchMod12 === 6
         || midiPitchMod12 === 8
         || midiPitchMod12 === 10) {
        return true;
      }

      return false;
    }

    /**
     * Get the number of white keys on the keyboard
     */
    numWhiteKeys () {
      var topNote = this._topNote;
      var bottomNote = this._bottomNote;

      var numberOfNotes = topNote - bottomNote;
      var numberOfOctaves = Math.floor(numberOfNotes / 12);
      var numberOfWhiteKeys = (numberOfOctaves * 7) + 1;
      var noteRemainderBottom;
      var noteCache;

      // if the keyboard divides into an integer number of octaves,
      // the number of white keys is numberOfOctaves * 7 + 1, and we can return
      if(numberOfNotes % 12 === 0) {
        return numberOfWhiteKeys;
      }

      // otherwise count the remaining white keys that didn't divide into full octaves
      noteRemainderBottom = bottomNote + (numberOfOctaves * 12) + 1;
      for(var i = noteRemainderBottom; i <= topNote; i++) {
        if(!this.isBlackKey(i)) {
          numberOfWhiteKeys++;
        }
      }

      return numberOfWhiteKeys;
    }

    /**
     * Decide which key is beneath a mouse event
     */
    whichKeyIsPressed (e) {
      var canvasX, canvasY, canvasKeyMapIndex, midiNote;

      canvasX = e.clientX - this._container.getBoundingClientRect().left;
      canvasY = e.clientY - this._container.getBoundingClientRect().top;

      // which key was pressed
      canvasKeyMapIndex = Math.trunc((canvasX / this.canvas.width)
                                  * (this.canvas.width / (this.blackKeyWidth / 2)));

      // decide which key is pressed
      if (canvasY > this.blackKeyHeight) {
        if(canvasKeyMapIndex % 3 === 0) {
          midiNote = this.canvasKeyMap[canvasKeyMapIndex + 1];
        } else if (canvasKeyMapIndex % 3 === 2) {
          midiNote = this.canvasKeyMap[canvasKeyMapIndex - 1];
        } else {
          midiNote = this.canvasKeyMap[canvasKeyMapIndex];
        }
      } else {
        midiNote = this.canvasKeyMap[canvasKeyMapIndex];
      }

      return {midiNote: midiNote, canvasKeyMapIndex: canvasKeyMapIndex};
    }

    /**
     * Draw the static keyboard and assign the canvasKeyMap
     * The canvasKeyMap maps the spatial distribution of the keys to midi note numbers
     */
    createKeyboard () {
      var _this = this;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // set the keyboard dimensions
      this._numWhiteKeys = this.numWhiteKeys();
      this.whiteKeyWidth = this.canvas.width / this._numWhiteKeys;
      this.blackKeyWidth = (this.whiteKeyWidth/3) * 2;
      this.whiteKeyHeight = this.whiteKeyWidth * 3.5;
      this.blackKeyHeight = (this.whiteKeyHeight/3) * 1.8;

      // change the canvas and overlay height to match the key height
      this.canvas.height = this.whiteKeyHeight + 1;
      this.overlayCanvas.height = this.canvas.height;

      // change the container dims to match the canvas
      this._container.style.height = this.canvas.height + 'px';

      //draw the keys and change the keymap
      var curXPos = 0;
      var canvasKeyIndex = 0;
      var prevKeyWasBlack = false;

      for(var midiNote = this._bottomNote; midiNote <= this._topNote; midiNote++) {
        if (!this.isBlackKey(midiNote)) {

          // draw the white key
          this.ctx.fillStyle = this.whiteKeyColor;
          this.ctx.fillRect(curXPos, 0, this.whiteKeyWidth, this.whiteKeyHeight);
          this.ctx.strokeStyle = this.keyBorderColor;
          this.ctx.lineWidth = this.whiteKeyWidth * 0.08;
          this.ctx.strokeRect(curXPos, 0, this.whiteKeyWidth, this.whiteKeyHeight);

          // assign the key map
          if(!prevKeyWasBlack) {
            this.canvasKeyMap[canvasKeyIndex] = midiNote;
          } else {

            // draw the black key that comes before the current white key
            this.ctx.fillStyle = this.blackKeyColor;
            this.ctx.fillRect(curXPos-(this.blackKeyWidth/2), 0, this.blackKeyWidth, this.blackKeyHeight);
          }

          this.canvasKeyMap[canvasKeyIndex + 1] = midiNote;
          this.canvasKeyMap[canvasKeyIndex + 2] = midiNote;
          canvasKeyIndex += 3;
          prevKeyWasBlack = false;

          curXPos += this.whiteKeyWidth;
        } else {
          this.canvasKeyMap[canvasKeyIndex - 1] = midiNote;
          this.canvasKeyMap[canvasKeyIndex] = midiNote;

          //note: we don't need to advance the canvas key index here
          prevKeyWasBlack = true;
        }
      }
    }

    /**
     * Draw the active key overlay
     */
    drawKeyboardOverlay (midiNote, canvasKeyMapIndex, paintMethod) {
      var _this = this;

      var activeKeyXPos;

      if (this._mode === 'monophonic' || this._mode === 'mono') {
        this.olCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
      }

      // draw shadow for black keys
      if (_this.isBlackKey(midiNote)) {
        _this.olCtx.fillStyle = _this.blackKeyActiveColor;

        if (canvasKeyMapIndex % 3 === 0) {
          activeKeyXPos = (Math.floor(canvasKeyMapIndex / 3) * _this.whiteKeyWidth) - _this.blackKeyWidth/2;
        } else if (canvasKeyMapIndex % 3 === 2) {
          activeKeyXPos = (Math.floor(canvasKeyMapIndex / 3) * _this.whiteKeyWidth) + _this.blackKeyWidth;
        }

        if (paintMethod === 'draw') {
          _this.olCtx.fillRect(activeKeyXPos, 0, _this.blackKeyWidth, _this.blackKeyHeight);
        } else if (paintMethod === 'erase') {
          _this.olCtx.clearRect(activeKeyXPos, 0, _this.blackKeyWidth, _this.blackKeyHeight);
        }

      // draw shadow for white keys
      } else {
        activeKeyXPos = Math.floor(canvasKeyMapIndex / 3) * _this.whiteKeyWidth;
        _this.olCtx.fillStyle = _this.whiteKeyActiveColor;

        // if it's the first or last key on the keyboard, and if the key next to it is also a white key
        if ((Math.trunc(canvasKeyMapIndex/3) === 0 && (!_this.isBlackKey(_this.canvasKeyMap[3])))
            || (Math.trunc(canvasKeyMapIndex/3) === Math.trunc((_this.canvasKeyMap.length-1)/3)
            && (!_this.isBlackKey(_this.canvasKeyMap[_this.canvasKeyMap.length - 3])))) {

              if (paintMethod === 'draw') {
                _this.olCtx.fillRect(activeKeyXPos, 0, _this.whiteKeyWidth, _this.whiteKeyHeight);
              } else if (paintMethod === 'erase') {
                _this.olCtx.clearRect(activeKeyXPos, 0, _this.whiteKeyWidth, _this.whiteKeyHeight);
              }

        // TODO: needs to be refactored to only specify the draw and clear operations once
        // if it's not the first or last key on the keyboard, or it is, but the one next to it is not
        } else {
          // top part of white keys

          // if it's an E or a B
          if (midiNote % 12 === 4 ||  midiNote % 12 === 11) {

            if (paintMethod === 'draw') {
              _this.olCtx.fillRect(activeKeyXPos, _this.blackKeyHeight, _this.whiteKeyWidth, _this.whiteKeyHeight - _this.blackKeyHeight);
              _this.olCtx.fillRect(activeKeyXPos + (_this.blackKeyWidth/2), 0, _this.blackKeyWidth, _this.blackKeyHeight + 1);

              // re-stroke the border, right side
              _this.olCtx.beginPath();
              _this.olCtx.moveTo(activeKeyXPos + _this.whiteKeyWidth, 0);
              _this.olCtx.lineTo(activeKeyXPos + _this.whiteKeyWidth, _this.whiteKeyHeight);
              _this.olCtx.strokeStyle = _this.keyBorderColor;
              _this.olCtx.lineWidth = 1;
              _this.olCtx.stroke();
            } else if (paintMethod === 'erase') {
              _this.olCtx.clearRect(activeKeyXPos, _this.blackKeyHeight, _this.whiteKeyWidth, _this.whiteKeyHeight - _this.blackKeyHeight);
              _this.olCtx.clearRect(activeKeyXPos + (_this.blackKeyWidth/2), 0, _this.blackKeyWidth, _this.blackKeyHeight + 1);
            }

          // if it's a C or an F
          } else if (midiNote % 12 === 0 || midiNote % 12 === 5) {

            if (paintMethod === 'draw') {
              _this.olCtx.fillRect(activeKeyXPos, _this.blackKeyHeight, _this.whiteKeyWidth, _this.whiteKeyHeight - _this.blackKeyHeight);
              _this.olCtx.fillRect(activeKeyXPos, 0, _this.blackKeyWidth, _this.blackKeyHeight + 1);

              // re-stroke the border, left side
              _this.olCtx.beginPath();
              _this.olCtx.moveTo(activeKeyXPos, 0);
              _this.olCtx.lineTo(activeKeyXPos, _this.whiteKeyHeight);
              _this.olCtx.strokeStyle = _this.keyBorderColor;
              _this.olCtx.lineWidth = 1;
              _this.olCtx.stroke();
            } else if (paintMethod === 'erase') {
              _this.olCtx.clearRect(activeKeyXPos, _this.blackKeyHeight, _this.whiteKeyWidth, _this.whiteKeyHeight - _this.blackKeyHeight);
              _this.olCtx.clearRect(activeKeyXPos, 0, _this.blackKeyWidth, _this.blackKeyHeight + 1);
            }
          }


          if (paintMethod === 'draw') {
            _this.olCtx.fillRect(activeKeyXPos, _this.blackKeyHeight, _this.whiteKeyWidth, _this.whiteKeyHeight - _this.blackKeyHeight);
            _this.olCtx.fillRect(activeKeyXPos + (_this.blackKeyWidth/2), 0, _this.blackKeyWidth/2, _this.blackKeyHeight + 1);
          } else if (paintMethod === 'erase') {
            _this.olCtx.clearRect(activeKeyXPos, _this.blackKeyHeight, _this.whiteKeyWidth, _this.whiteKeyHeight - _this.blackKeyHeight);
            _this.olCtx.clearRect(activeKeyXPos + (_this.blackKeyWidth/2), 0, _this.blackKeyWidth/2, _this.blackKeyHeight + 1);
          }

          // re-stroke the border, right side
          _this.olCtx.beginPath();
          _this.olCtx.moveTo(activeKeyXPos + _this.whiteKeyWidth, _this.blackKeyHeight);
          _this.olCtx.lineTo(activeKeyXPos + _this.whiteKeyWidth, _this.whiteKeyHeight);
          _this.olCtx.strokeStyle = _this.keyBorderColor;
          _this.olCtx.lineWidth = 1;
          _this.olCtx.stroke();

          // re-stroke the border, left side
          _this.olCtx.beginPath();
          _this.olCtx.moveTo(activeKeyXPos, _this.blackKeyHeight);
          _this.olCtx.lineTo(activeKeyXPos, _this.whiteKeyHeight);
          _this.olCtx.strokeStyle = _this.keyBorderColor;
          _this.olCtx.lineWidth = 1;
          _this.olCtx.stroke();
        }
      }
    }

    _drawUI () {
      this.createKeyboard();
    }

    /**
     *
     */
    setActiveChord (activeChord) {
      this._activeChord = activeChord;
    }

    /**
     * Update the active chord array
     * If the new midi
     * @param {Number} newMidiNote - The midi pitch value for the new note
     */
    updateActiveChord (newActiveKey) {
      var newActiveNote = newActiveKey.midiNote;
      var newActiveCanvasKeyMapIndex = newActiveKey.canvasKeyMapIndex;
      var newActiveNoteIndex = this._activeChord.indexOf(newActiveNote);

      // if the value is not found, add it to the array. If found, remove it
      if (newActiveNoteIndex === -1) {
        if (this._mode === 'polyphonic') {
          this._activeChord.push(newActiveNote);
        } else {
          this._activeChord = [newActiveNote];
        }
        this.drawKeyboardOverlay(newActiveNote, newActiveCanvasKeyMapIndex, 'draw');

        /* ======= FIXME FIXME FIXME ======== */
        this.notifyPitch({ pitch: newActiveNote, velocity: 127 }); // <======= !!!!!!!!!
        /*=================================== */
      } else {
        this._activeChord.splice(newActiveNoteIndex, 1);
        this.drawKeyboardOverlay(newActiveNote, newActiveCanvasKeyMapIndex, 'erase')

        /* ======= FIXME FIXME FIXME ======== */
        this.notifyPitch({ pitch: newActiveNote, velocity: 0 }); // <======= !!!!!!!!!
        /*=================================== */
      }
      // this.notify(); <======= !!!!!!!!!
    }

    /**
     * Assign the mouse listeners
     */
    assignListeners () {
      const _this = this;

      let activeKey;
      let activeMidiNote;
      let activeCanvasKeyMapIndex;
      let prevMidiNote;

      if (this._editable) {
        this.overlayCanvas.addEventListener('mousedown', mouseDownListener);
      } else {
        this.overlayCanvas.removeEventListener('mousedown', mouseDownListener);
      }

      function mouseDownListener(e) {
        e.preventDefault();

        drawActiveKeyWrap(e);

        _this.overlayCanvas.addEventListener('mousemove', drawActiveKeyWrap);

        _this.overlayCanvas.addEventListener('mouseup', function() {
          _this.overlayCanvas.removeEventListener('mousemove', drawActiveKeyWrap);
        });
      }

      function drawActiveKeyWrap(e) {
        activeKey = _this.whichKeyIsPressed(e);
        activeMidiNote = activeKey.midiNote;
        activeCanvasKeyMapIndex = activeKey.canvasKeyMapIndex;

        if (e.type === 'mousedown' || activeMidiNote !== prevMidiNote) {
          _this.updateActiveChord(activeKey);
          prevMidiNote = activeMidiNote;
        }
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
        _this.canvas.width = _this._container.clientWidth;
        _this.canvas.height = _this._container.clientHeight;
        _this.overlayCanvas.width = _this.canvas.width;
        _this.overlayCanvas.height = _this.canvas.height;

        _this._drawUI();
      }
    }
  }

  /* ============================= */
  /* --- Module loader support --- */
  /* ============================= */

  // support for AMD libraries
  if (typeof define === 'function') {
    define([], function () {
      return Keyboard;
    });
  }

  // support for CommonJS libraries
  else if (typeof exports !== 'undefined') {
    exports.Keyboard = Keyboard;
  }

  // support for window global
  else if (typeof window !== 'undefined') {
    window.Keyboard = Keyboard;
  }

})();
