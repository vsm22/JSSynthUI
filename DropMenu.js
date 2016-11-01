(function(){
  'use strict';

  /** Class representing a drop-down menu */
  class DropMenu {

    /**
     * Create a drop-down menu.
     * @param {object} [o] - Options object.
     * @param {object} [o.container=document.body] - The DOM element that wraps the widget canvas.
     * @param {string} [o.backgroundColor='#fff'] - The UI background color.
     * @param {string} [o.fontColor='#000'] - The UI font color.
     * @param {string} [o.fontSize='12px'] - The font size.
     * @param {string} [o.fontFamily='Arial'] - The font family.
     * @param {string} [o.menuItemFontSize='12px'] - The font size for items in the opened drop-down menu.
     * @param {string} [o.menuItemFontFamily='Arial'] - The font family for items in the opened drop-down menu.
     * @param {string} [o.selectedItemBackgroundColor='#ccc'] - The background cover for the selected (hovered) item in the opened drop-down menu.
     * @param {string} [o.selectedItemFontColor='#fff'] - The font color for the selected (hovered) item in the opened drop-down menu.
     * @return {object} this - Returns a reference to the new object instance.
     */
    constructor (o) {
      o = o || {};

      // observers
      this._observers = [];

      // menu items
      this._menuItems = o.menuItems || [];
      this._selectedItemNum = 0;
      this._hoverItemNum = -1;

      // UI styling options
      this._UIbackgroundColor = o.backgroundColor || o.UIbackgroundColor || '#555';
      this._UIfontColor = o.fontColor || o.UIfontColor || '#bbb';
      this._UIfontSize = o.fontSize || o.UIfontSize || '12px';
      this._UIfontFamily = o.fontFamily || o.UIfontFamily || 'Arial';
      this._UImenuItemFontSize = o.menuItemFontSize || o.UImenuItemFontSize || '12px';
      this._UImenuItemFontFamily = o.menuItemFontFamily || o.UImenuItemFontFamily || 'Arial';
      this._UIselectedItemBackgroundColor = o.selectedItemBackgroundColor || o.UIselectedItemBackgroundColor || '#ccc';
      this._UIselectedItemFontColor = o.selectedItemFontColor || o.UIselectedItemBackgroundColor || '#fff';

      // set up the main canvas
      this._container = o.container || document.body;
      this._canvas = document.createElement('canvas');
      this._ctx = this._canvas.getContext('2d');
      this._canvas.width = this._container.clientWidth;
      this._canvas.height = this._container.clientHeight;
      this._container.appendChild(this._canvas);

      /* set up the drop-down canvas */
      this._ddCanvas = document.createElement('canvas');
      this._ddCtx = this._ddCanvas.getContext('2d');
      this._ddCanvas.width = this._getDdCanvasDimensions().width;
      this._ddCanvas.height = this._getDdCanvasDimensions().height;
      document.body.appendChild(this._ddCanvas);
      this._ddCanvas.style.position = 'absolute';
      this._ddCanvas.style.visibility = 'hidden';
      this._ddCanvas.style.left = this._canvas.getBoundingClientRect().left + 'px';
      this._ddCanvas.style.top = this._canvas.getBoundingClientRect().bottom + 'px';

      // draw the UI
      this._drawUI();
      this._assignListeners();
      this._listenForResize();

      return this;
    }

    /* =========================== */
    /* --- Getters and setters --- */
    /* =========================== */

    /** An array of strings representing the items in the menu */
    get menuItems () {
      return this._menuItems;
    }
    set menuItems (newMenuItems) {
      this._menuItems = newMenuItems;

      let ddCanvasDims = this._getDdCanvasDimensions();

      this._ddCanvas.height = ddCanvasDims.height;
      this._ddCanvas.width = ddCanvasDims.width;

      this._drawUI();
      return this;
    }

    /** Value - the item number selected */
    get value () {
      return this._selectedItemNum;
    }
    set value (newValue) {
      this._selectedItemNum = newValue;
      this.notifyObservers();
      this._drawUI();
      return this;
    }

    /* ========================== */
    /* --- State manipulation --- */
    /* ========================== */

    /**
     * Add a menu item
     * @param {string} newItem - The new item to be added to the menu
     */
    addMenuItem (newItem) {
      this._menuItems.push(newItem);

      let ddCanvasDims = this._getDdCanvasDimensions();

      this._ddCanvas.height = ddCanvasDims.height;
      this._ddCanvas.width = ddCanvasDims.width;

      this._drawUI();
      return this;
    }

    /* ================== */
    /* --- UI drawing --- */
    /* ================== */

    /* Draw the UI */
    _drawUI () {
      this._drawClosedMenuBox();
      this._drawDropDownMenuBox();
    }

    /* Draw the closed menu box */
    _drawClosedMenuBox () {
      // draw the box
      this._ctx.fillStyle = this._UIbackgroundColor;
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

      // draw the selected menu item text
      this._ctx.font = this._UIfontSize + ' ' + this._UIfontFamily;
      this._ctx.fillStyle = this._UIfontColor;
      this._ctx.textBaseline = 'middle';
      this._ctx.fillText(this._menuItems[this._selectedItemNum], 10, this._canvas.height / 2);
    }

    /* Draw the drop-down box */
    _drawDropDownMenuBox() {
      const _this = this;
      const menuItemHeight = _this._getMenuItemHeight();

      // fill the background box
      this._ddCtx.fillStyle = this._UIbackgroundColor;
      this._ddCtx.fillRect(0, 0, this._ddCanvas.width, this._ddCanvas.height);

      // fill the menu items text
      this._ddCtx.font = this._UIfontSize + ' ' + this._UIfontFamily;
      for(let i = 0; i < this._menuItems.length; i++) {
        this._ddCtx.fillStyle = this._UIfontColor;

        // if item i is hovered, set the appropriate colors
        if(i === _this._hoverItemNum) {
          this._ddCtx.fillStyle = _this._UIselectedItemBackgroundColor;
          this._ddCtx.fillRect(0, i * menuItemHeight, this._ddCanvas.width, menuItemHeight);
          this._ddCtx.fillStyle = this._UIselectedItemFontColor;
        }

        this._ddCtx.textBaseline = 'middle';
        this._ddCtx.fillText(this._menuItems[i], 10, ((i + 1) * menuItemHeight) - (menuItemHeight/2));
      }
    }

    /* Get the dimensions for the drop-down canvas */
    _getDdCanvasDimensions () {
      const _this = this;

      let width = (function() {
        let maxWidth = 0;
        let itemWidth = 0;

        _this._menuItems.forEach(item => {
          itemWidth = _this._ddCtx.measureText(item).width;
          maxWidth = (itemWidth > maxWidth) ? itemWidth : maxWidth;
        });

        return maxWidth + 20;
      }());

      let height = this._getMenuItemHeight() * this._menuItems.length;

      return { width: width, height: height };
    }

    /* Get the height of each menu item */
    _getMenuItemHeight () {
      const menuItemHeight = parseInt(this._UImenuItemFontSize) * 2;
      return menuItemHeight;
    }

    /* ====================== */
    /* --- UI interaction --- */
    /* ====================== */

    /* Assign the listeners for UI interaction */
    _assignListeners () {
      const _this = this;

      // when mouse down on the closed menu box
      this._canvas.addEventListener('mousedown', mouseDownListener);

      function mouseDownListener() {
        // show the drop-down menu
        _this._ddCanvas.style.visibility = 'visible';

        _this._ddCanvas.addEventListener('mousemove', mouseMoveListener);
        document.addEventListener('mousedown', secondMouseDownListener);
      }

      function secondMouseDownListener (e) {
        if(e.target !== _this._canvas) {
          document.addEventListener('mouseup', mouseUpListener);
        }
      }

      function mouseMoveListener(e) {
        const ddCanvasY = e.clientY - _this._ddCanvas.getBoundingClientRect().top;
        _this._hoverItemNum = Math.trunc(ddCanvasY / _this._getMenuItemHeight());
        _this._drawUI();
      }

      function mouseUpListener(e) {
        // hide the drop-down menu
        _this._ddCanvas.style.visibility = 'hidden';
        if(_this._hoverItemNum !== -1 && e.target === _this._ddCanvas) {
          _this._selectedItemNum = _this._hoverItemNum;
          _this.notifyObservers();
        }
        _this._hoverItemNum = -1;

        document.removeEventListener('mouseup', mouseUpListener);

        _this._drawUI();
      }
    }

    /* ======================== */
    /* --- Observer support --- */
    /* ======================== */

    /**
     * Subscribe an observer function
     * @param {object} context
     * @param {function} function
     */
    subscribe (context, func) {
      this._observers.push({ context: context, func: func });
      return this;
    }

    /**
     * Unsubscribe an observer function
     * @param {object} context
     * @param {function} function
     */
    unsubscribe (context, func) {
      this._observers = this.observers.filter(observer => {
        return observer.context !== context || observer.func !== func;
      });
      return this;
    }

    /**
     * Notify the subscribed observers of the current selected item number
     */
    notifyObservers () {
      const _this = this;
      this._observers.forEach(observer => {
        observer.func.call(observer.context, _this._selectedItemNum);
      });
      return this;
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
        _this._ddCanvas.style.left = _this._canvas.getBoundingClientRect().left + 'px';
        _this._ddCanvas.style.top = _this._canvas.getBoundingClientRect().bottom + 'px';

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
      return DropMenu;
    });
  }

  // support for CommonJS libraries
  else if (typeof exports !== 'undefined') {
    exports.DropMenu = DropMenu;
  }

  // support for window global
  else if (typeof window !== 'undefined') {
    window.DropMenu = DropMenu;
  }
})();
