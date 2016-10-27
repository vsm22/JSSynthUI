(function(){
  'use strict';

  class EnvelopeGraph {

    /* =================== */
    /* --- Constructor --- */
    /* =================== */

    /**
     * An EnvelopeGraph represents a customizable and editable line graph
     * @param {object} [o] - Options
     * @param {DOM object} [o.container=document.body] - The DOM element to contain the canvas for this widget. If not specified, document.body will be used
     * @param {DOM object} [canvas] - The canvas to contain the UI. If not specified, a new canvas will be created within the container.
     * @param {number} [o.minXValue=0] - Minimum X value
     * @param {number} [o.maxXValue=100] - Maximum X value
     * @param {number} [o.minYValue=0] - Minimum Y value
     * @param {number} [o.maxYValue=100] - Maximum Y value
     * @param {number} [o.quantizeX] - X quantization (the smallest grid interval between X values, to which vertices will snap)
     * @param {number} [o.quantizeY] - Y quantization (the smallest grid interval between Y values, to which vertices will snap)
     * @param {boolean} [o.hasFixedStartPoint=false] - Boolean value specifying whether the graph has a fixed vertex at the minimum X value
     * @param {boolen} [o.hasFixedEndPoint=false] - Boolean value specifying whether the graph has a fixed vertex at the maximum X value
     * @param {number} [o.fixedStartPointY=0] - Y value for the fixed starting vertex, if used
     * @param {number} [o.fixedEndPointY=0] - Y value for the fixed ending vertex, if used
     * @param {number} [o.maxNumVertices=-1] - The maximum number of allowed vertices. A value of -1 means no maximum number
     * @param {boolean} [o.isEditable=true] - Boolean value specifying whether the user can edit the graph via the UI
     * @param {string} [o.vertexColor='#000'] - Color of the vertex points
     * @param {string} [o.lineColor='#000'] - Color of lines connecting the vertices
     * @param {string} [o.backgroundColor='#fff'] - Background color
     * @param {number} [vertexRadius=3px] - Radius of the vertex points
     */
    constructor(o){
      o = o || {};

      this._observers = [];

      this._vertices = [];

      this._minXValue = o.minXValue || 0;
      this._maxXValue = o.maxXValue || 100;
      this._minYValue = o.minYValue || 0;
      this._maxYValue = o.maxYValue || 100;

      // quantize is the smallest incremental interval for data points
      this._quantizeX = o.quantizeX || (this._maxXValue - this._minXValue) / 1000;
      this._quantizeY = o.quantizeY || (this._maxYValue - this._minYValue) / 1000;

      // fixed start and end points
      this._hasFixedStartPoint = o.hasFixedStartPoint || false;
      this._hasFixedEndPoint = o.hasFixedEndPoint || false;

      this._fixedStartPointY = o.fixedStartPointY || o.fixedStartPoint || 0;
      this._fixedEndPointY = o.fixedEndPointY || o.fixedEndPoint || 0;

      // maximum number of vertices, -1 means no maximum
      this._maxNumVertices = o.maxNumVertices || -1;

      // can you edit by clicking?
      this._isEditable = o.isEditable || true;

      // create fixed start and end points, if used
      if (this._hasFixedStartPoint === true) {
        this._vertices.push([this._minXValue, this._fixedStartPointY]);
      }
      if (this._hasFixedEndPoint === true) {
        this._vertices.push([this._maxXValue, this._fixedEndPointY]);
      }

      this._UIVertexColor = o.vertexColor || o.UIVertexColor || '#000';
      this._UILineColor = o.lineColor || o.UILineColor || '#000';
      this._UIBackgroundColor = o.backgroundColor || o.UIBackgroundColor || '#FFF';
      this._UIVertexRadius = o.vertexRadius || o.UIVertexRadius || 3;

      this._canvas = o.canvas || window.document.createElement('canvas');

      if (o.canvas !== undefined) {
        this._canvas = o.canvas;
        this._container = this._canvas.parentElement;
      } else {
        this._container = o.container || window.document.body;
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

      this.assignListeners();
      this._listenForResize();
      this._drawUI();

      return this;
    }

    /* =============== */
    /* --- Options --- */
    /* =============== */

    set options (o) {
      o = o || {};

      if (o.canvasWidth) this.canvasWidth = o.canvasWidth;
      if (o.canvasHeight) this.canvasHeight = o.canvasHeight;

      if (o.container) this.container = o.container;

      if (o.minXValue) this.minXValue = o.minXValue;
      if (o.maxXValue) this.maxXValue = o.maxXValue;
      if (o.minYValue) this.minYValue = o.minYValue;
      if (o.maxYValue) this.maxYValue = o.maxYValue;

      if (o.fixedStartPointY) this.fixedStartPointY = o.fixedStartPointY;
      if (o.fixedEndPointY) this.fixedEndPointY = o.fixedEndPointY;
      if (o.hasFixedStartPoint) this.hasFixedStartPoint = o.hasFixedStartPoint;
      if (o.hasFixedEndPoint) this.hasFixedEndPoint = o.hasFixedEndPoint;

      if (o.vertexColor || o.UIVertexColor) this._UIVertexColor = o.vertexColor || o.UIVertexColor;
      if (o.lineColor || o.UILineColor) this._UILineColor = o.lineColor || o.UILineColor;
      if (o.backgroundColor || o.UIBackgroundColor) this._UIBackgroundColor = o.backgroundColor || o.UIBackgroundColor;
      if (o.vertexRadius || o.UIVertexRadius) this.UIVertexRadius = o.vertexRadius || o.UIVertexRadius;

      this.notifyObservers();
      this._drawUI();

      return this;
    }

    setOptions (o) {
      o = o || {};
      this.options = o;
      return this;
    }

    /* =========================== */
    /* --- Getters and setters --- */
    /* =========================== */

    /** Canvas */
    get canvas () {
      return this._canvas;
    }
    set canvas (newCanvas) {
      this._canvas = newCanvas;
      this._drawUI();
      return this;
    }

    /** Canvas width */
    set canvasWidth (newWidth) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._canvas.width = newWidth;
      this._drawUI()
      return this;
    }
    setCanvasWidth (newWidth) {
      this.canvasWidth = newWidth;
    }

    /** Canvas height */
    set canvasHeight (newHeight) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._canvas.height = newHeight;
      this._drawUI();
      return this;
    }
    setCanvasHeight (newHeight) {
      this.canvasHeight = newHeight;
    }

    /** Data points */
    get vertices () {
      return this._vertices;
    }
    set vertices (newVertices) {
      this._vertices  = newVertices;
      this._drawUI();
      this.notifyObservers();
      return this;
    }

    /** Editable */
    get isEditable () {
      return this._isEditable;
    }
    set isEditable (isEditable) {
      this._isEditable = isEditable;
      return this;
    }

    /** Minimum X Value */
    get minXValue () {
      return this._minXValue;
    }
    set minXValue (newVal) {
      this._minXValue = newVal;
      return this;
    }

    /** Maximum X Value */
    get maxXValue () {
      return this._maxXValue;
    }
    set maxXValue (newVal) {
      this._maxXValue = newVal;

      // update the fixed end point, if present
      if (this._hasFixedEndPoint === true) {
          this._vertices[this._vertices.length - 1][0] = this._maxXValue;
      }

      // get rid of points that fall outside the new range
      for (let i = this._vertices.length - 1; i > 0; i--) {
        if (this._vertices[i][0] > this._maxXValue) {
          this._vertices.splice(i, 1);
        }
      }

      return this;
    }

    /** Minimum Y Value */
    get minYValue () {
      return this._minYValue;
    }
    set minYValue (newVal) {
      this._minYValue = newVal;
      return this;
    }

    /** Maximum Y Value */
    get maxYValue () {
      return this._maxYValue;
    }
    set maxYValue (newVal) {
      this._maxYValue = newVal;
      return this;
    }

    /** X quantization (smallest interval between points) value */
    get quantizeX () {
      return this._quantizeX;
    }
    set quantizeX (newVal) {
      this._quantizeX = newVal;
      return this;
    }

    /** Y quantization quantization (smallest interval between points) value */
    get quantizeY () {
      return this._quantizeY;
    }
    set quantizeY (newVal) {
      this._quantizeY = newVal;
      return this;
    }

    /** Domain */
    get domain () {
      return this._maxXValue - this._minXValue;
    }

    /** Range */
    get range () {
      return this._maxYValue - this._minYValue;
    }

    get vertexColor () {
      return this._UIVertexColor;
    }
    set vertexColor (newColor) {
      this._UIVertexColor = newColor;
      this._drawUI();
      return this;
    }

    get lineColor () {
      return this._UILineColor;
    }
    set lineColor (newColor) {
      this._UILineColor = newColor;
      this._drawUI();
      return this;
    }

    get backgroundColor () {
      return this._UIBackgroundColor;
    }
    set backgroundColor (newColor) {
      this._UIBackgroundColor = newColor;
      this._drawUI();
      return this;
    }

    get vertexRadius () {
      var UIVertexRadius = Math.min(this._canvas.width, this._canvas.height)
                           * 0.015;
      this._UIVertexRadius = Math.max(UIVertexRadius, 2);
      return this._UIVertexRadius;
    }
    set vertexRadius (newRadius) {
      this._UIVertexRadius = newRadius;
      this._drawUI();
      return this;
    }

    /** Y-value of the fixed start point */
    get fixedStartPointY () {
      return this._fixedStartPointY;
    }
    set fixedStartPointY (newY) {
      this._fixedStartPointY = newY;

      if (this._hasFixedStartPoint === true) {
        this._vertices[0] = [this._minXValue, this._fixedStartPointY];
      }

      this._drawUI();
      return this;
    }
    setFixedStartPointY (newY) {
      this.fixedStartPointY = newY;
      return this;
    }

    /** Y-value of the fixed end point */
    get fixedEndPointY () {
      return this._fixedEndPointY;
    }
    set fixedEndPointY (newY) {
      this._fixedEndPointY = newY;

      if (this._hasFixedEndPoint === true) {
        this._vertices[this._vertices.length - 1] = [this._maxXValue, this._fixedEndPointY];
      }

      this._drawUI();
      return this;
    }
    setFixedEndPointY (newY) {
      this.fixedEndPointY = newY;
      return this;
    }

    set hasFixedStartPoint (isTrue) {
      if (this._hasFixedStartPoint === false && isTrue === true) {
        this._hasFixedStartPoint = true;
        this._vertices.push([this._minXValue, this._fixedStartPointY]);
        this.sortVertices();
        this.notifyObservers();
        this._drawUI();
      } else if (this._hasFixedStartPoint === true && isTrue === false) {
        this._hasFixedStartPoint = false;
        this._vertices.splice(0, 1);
        this.notifyObservers();
        this._drawUI();
      }
    }

    set hasFixedEndPoint (isTrue) {
      if (this._hasFixedEndPoint === false && isTrue === true) {
        this._hasFixedEndPoint = true;
        this._vertices.push([this._maxXValue, this._fixedEndPointY]);
        this.sortVertices();
        this.notifyObservers();
        this._drawUI();
      } else if (this._hasFixedEndPoint === true && isTrue === false) {
        this._hasFixedEndPoint = false;
        this._vertices.splice(this._vertices.length - 1, 1);
        this.notifyObservers();
        this._drawUI();
      }
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

    notifyObservers () {
      var _this = this;
      this._observers.forEach(observer => {
        observer.func.call(observer.context, _this._vertices.slice());
      });
      return this;
    }

    /* ========================= */
    /* --- Data manipulation --- */
    /* ========================= */

    /**
     * Add a vertex
     * @param {number} x
     * @param {number} y
     */
    addVertex (x, y) {
      if ( (this._vertices.length < this._maxNumVertices || this._maxNumVertices === -1)
          && (this._hasFixedStartPoint === false || x > this._minXValue )
          && (this._hasFixedEndPoint === false || x < this._maxXValue)
         ) {

        this._vertices.push([x, y]);
        this.sortVertices();
        this.notifyObservers();
      }

    }

    /**
     * Sort the vertices
     */
    sortVertices () {
      this._vertices.sort((a, b) => {
        var retVal = a[0] - b[0];
        if(retVal === 0) {
          var retVal = a[1] - b[1];
        }
        return retVal;
      });
    }

    /**
     * Delete a vertices
     * @param {number} vertexIndex
     */
    deleteVertex (vertexIndex) {
      this._vertices.splice(vertexIndex, 1);
      this.sortVertices();
      this._drawUI();
    }

    /* =============== */
    /* --- Utility --- */
    /* =============== */

    quantizeNum (rawVal, qFactor) {
      var lBoundRemainder = (rawVal % qFactor);
      var uBoundRemainder = ((rawVal -
                              (rawVal % qFactor))
                             + qFactor)
                            - rawVal;
      var result;

      function numFixedDigits (a) {
        if (!isFinite(a)) return 0;
        var e = 1, p = 0;
        while (Math.round(a * e) / e !== a) { e *= 10; p++; }
        return p;
      }

      if (lBoundRemainder < uBoundRemainder) {
        result = rawVal - (rawVal % qFactor);
      } else {
        result = (rawVal - (rawVal % qFactor)) + qFactor;
      }

      result = +(result.toFixed(numFixedDigits(qFactor)));

      return result;
    }

    _dataToCanvasX (x) {
      var canvasX = ((x - this._minXValue)
                  / this.domain)
                  * this._canvas.width;
      return canvasX;
    }

    _dataToCanvasY (y) {
      var canvasY = this._canvas.height -
                    (((y - this._minYValue)
                      / this.range)
                     * this._canvas.height);
      return canvasY;
    }

    _canvasToDataX (canvasX) {
      var dataX = ((canvasX / this._canvas.width)
                   * this.domain)
                  + this._minXValue;
      dataX = this.quantizeNum(dataX, this.quantizeX);
      return dataX;
    }

    _canvasToDataY (canvasY) {
      var canvasYinv = this._canvas.height - canvasY;

      var dataY = ((canvasYinv / this._canvas.height)
                   * this.range)
                  + this._minYValue;
      dataY = this.quantizeNum(dataY, this.quantizeY);
      return dataY;
    }

    /* Which point (vertex) is clicked on? */
    _whichPointIsSelected (dataX, dataY, xBuffer, yBuffer) {
      let dataPointIndex = -1; // -1 means not found

      dataPointIndex = this._vertices.findIndex(vertex => {
        if (   (vertex[0] < dataX + xBuffer)
            && (vertex[0] > dataX - xBuffer)
            && (vertex[1] < dataY + yBuffer)
            && (vertex[1] > dataY - yBuffer)
           ) {
          return true;
        } else {
          return false;
        }
      });

      return dataPointIndex;
    }

    /* Which line connecting vertices is clicked on? */
    _whichLineIsSelected (dataX, dataY, xBuffer, yBuffer) {
      const _this = this;

      let lineIndex = -1;

      // line is between which two points?
      let lowerBoundIndex = this._vertices.findIndex((vertex, i, vertices) => {
        if(vertices[i][0] < dataX && vertices[i+1][0] > dataX) {
          return true;
        } else {
          return false;
        }
      });
      let upperBoundIndex = lowerBoundIndex + 1;

      // if lower bound was not found, return -1 - we're done
      if(lowerBoundIndex === -1) {
        return -1;
      }

      // what should the value of y be at point x, calculated from the slope?
      let yValueAtDataX = (function () {
        let x1 = _this._vertices[lowerBoundIndex][0];
        let x2 = _this._vertices[upperBoundIndex][0];
        let y1 = _this._vertices[lowerBoundIndex][1];
        let y2 = _this._vertices[upperBoundIndex][1];

        let slope = (y2 - y1)/(x2 - x1);

        return slope * (dataX - x1) + y1;
      }());

      // is the y being clicked on (dataY) the same as calculated by yValueAtDataX (within the allowed buffer)?
      if (lowerBoundIndex !== -1
          && dataY > yValueAtDataX - yBuffer
          && dataY < yValueAtDataX + yBuffer) {
        lineIndex = lowerBoundIndex;
      }

      return lineIndex;
    }

    /* ================== */
    /* --- UI drawing --- */
    /* ================== */

    /**
     * Force a redraw
     */
    redraw () {
      this._drawUI();
    }

    _drawUI () {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      this._ctx.fillStyle = this._UIBackgroundColor;
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);

      for(let i = (this._vertices.length - 1); i > 0; i--) {
        this._drawLineBetweenPoints(this.vertices[i][0], this.vertices[i][1],
                                   this.vertices[i-1][0], this.vertices[i-1][1]);
      }
      for(let i = (this._vertices.length - 1); i > 0; i--) {
        this._drawPoint(this.vertices[i][0], this.vertices[i][1]);
      }
      if(this.vertices.length > 0) {
        this._drawPoint(this.vertices[0][0], this.vertices[0][1]);
      }
    }

    _drawPoint (x, y) {
        var canvasX = this._dataToCanvasX(x);
        var canvasY = this._dataToCanvasY(y);

        this._ctx.beginPath();
        this._ctx.arc(canvasX, canvasY, this.vertexRadius, 0, 2*Math.PI);
        this._ctx.fillStyle = this._UIVertexColor;
        this._ctx.fill();
    }

    _drawLineBetweenPoints (x1, y1, x2, y2) {
      var canvasX1 = this._dataToCanvasX(x1);
      var canvasX2 = this._dataToCanvasX(x2);
      var canvasY1 = this._dataToCanvasY(y1);
      var canvasY2 = this._dataToCanvasY(y2);

      this._ctx.beginPath();
      this._ctx.moveTo(canvasX1, canvasY1);
      this._ctx.lineTo(canvasX2, canvasY2);
      this._ctx.strokeStyle = this._UILineColor;
      this._ctx.stroke();
    }

    /* ====================== */
    /* --- UI interaction --- */
    /* ====================== */

    assignListeners () {
      const _this = this;

      let canvasBoundingRect = _this._container.getBoundingClientRect();
      let mouseX, mouseY;         // mouse X and Y on the canvasY
      let dataX, dataY;           // value of mouse X and Y
      let vertexIndex, lineIndex; // index of vertex or line being clicked on
      let linePrevY, lineDeltaY;  // coordinates used for moving a line

      // listen for a mousedown
      _this._container.addEventListener('mousedown', mouseDownListener);
      _this._container.addEventListener('touchstart', mouseDownListener);

      function mouseDownListener (e) {
        if(_this._isEditable === true) {
          e.preventDefault();

          canvasBoundingRect = _this._container.getBoundingClientRect();

          if (e.type === 'touchstart') {
            e.clientX = e.touches[0].clientX;
            e.clientY = e.touches[0].clientY;
          }

          mouseX = e.clientX - canvasBoundingRect.left;
          mouseY = e.clientY - canvasBoundingRect.top;
          dataX = _this._canvasToDataX(mouseX);
          dataY = _this._canvasToDataY(mouseY);

          vertexIndex = _this._whichPointIsSelected(dataX, dataY, _this._quantizeX * 10, _this._quantizeY * 10);
          lineIndex = _this._whichLineIsSelected(dataX, dataY, _this._quantizeX, _this._quantizeY * 5);

          // if a vertex has been clicked on, we delete it if mouse is up without being moved, or move it if mouse moves
          if (vertexIndex !== -1) {
            // if the vertex is not a fixed start or end point
            if ((_this._hasFixedStartPoint === false || vertexIndex > 0) && (_this._hasFixedEndPoint === false || vertexIndex < _this._vertices.length - 1)) {
              // if the mouse is up without being moved first, delete the vertex
              _this._container.addEventListener('mouseup', deleteVertex);
              _this._container.addEventListener('touchend', deleteVertex);
              // if no mouse up occurs, we are moving (dragging) the vertex
              _this._container.addEventListener('mousemove', moveVertex);
              _this._container.addEventListener('touchmove', moveVertex);
            }
          }
          // if a line connecting vertices is being clicked on
          else if (lineIndex !== -1) {
            linePrevY = dataY;
            _this._container.addEventListener('mousemove', moveLine);
            _this._container.addEventListener('touchmove', moveLine);
          }
          // if we're not clicking on an existing vertex or a line, we add a new vertex
          else {
            _this.addVertex(dataX, dataY);
          }

          function deleteVertex (e) {
            _this.deleteVertex(vertexIndex);
            _this._container.removeEventListener('mouseup', deleteVertex);
            _this._container.removeEventListener('touchend', deleteVertex);
            _this._container.removeEventListener('mousemove', moveVertex);
            _this._container.removeEventListener('touchmove', moveVertex);
          }

          function moveVertex (e) {
            // do not delete it when mouse is up, we are moving it
            _this._container.removeEventListener('mouseup', deleteVertex);
            _this._container.removeEventListener('touchend', deleteVertex);

            const verticesLength = _this._vertices.length;

            if (e.type === 'touchmove') {
              e.clientX = e.touches[0].clientX;
              e.clientY = e.touches[0].clientY;
            }

            // calculate where we are moving the mouse
            mouseX = e.clientX - canvasBoundingRect.left;
            mouseY = e.clientY - canvasBoundingRect.top;
            dataX = Math.max(Math.min(_this._canvasToDataX(mouseX), _this.maxXValue), _this.minXValue);
            dataY = Math.max(Math.min(_this._canvasToDataY(mouseY), _this.maxYValue), _this.minYValue);

            // move the vertex to where we moved the mouse
            _this._vertices[vertexIndex] = [dataX, dataY];

            // Reorder the vertices in _this._vertices[] if necessary
            let tempDataPoint; // used for temporary storage when reordering
            // if it's moved beyond the vertex directly to its right
            if ( _this._vertices[vertexIndex + 1]
                  && _this._vertices[vertexIndex][0] > _this._vertices[vertexIndex + 1][0]
                ) {
                    tempDataPoint = _this._vertices[vertexIndex + 1];
                    _this._vertices[vertexIndex + 1] = _this._vertices[vertexIndex];
                    _this._vertices[vertexIndex] = tempDataPoint;
                    vertexIndex = vertexIndex + 1;
            // if it's moved beyond the vertex directly to its left
            } else if ( _this._vertices[vertexIndex - 1]
                        && _this._vertices[vertexIndex][0] < _this._vertices[vertexIndex - 1][0]
                      ) {
                    tempDataPoint = _this._vertices[vertexIndex];
                    _this._vertices[vertexIndex] = _this._vertices[vertexIndex - 1];
                    _this._vertices[vertexIndex - 1] = tempDataPoint;
                    vertexIndex = vertexIndex - 1;
            }

            _this._drawUI();

            document.addEventListener('mouseup', mouseUpListener);
            document.addEventListener('touchend', mouseUpListener);
          }

          function moveLine(e) {
            if (e.type === 'touchmove') {
              e.clientY = e.touches[0].clientY;
            }

            // current mouse position
            mouseY = e.clientY - canvasBoundingRect.top;
            dataY = _this._canvasToDataY(mouseY);

            // how much has the line been moved?
            lineDeltaY = dataY - linePrevY;
            linePrevY = dataY;

            // move the apex vertices of the line by however much it moved, if not outside the max or min y value limits
            if(_this._vertices[lineIndex][1] + lineDeltaY < _this.maxYValue
               && _this._vertices[lineIndex + 1][1] + lineDeltaY < _this.maxYValue
               && _this._vertices[lineIndex][1] + lineDeltaY > _this.minYValue
               && _this._vertices[lineIndex + 1][1] + lineDeltaY > _this.minYValue) {
                _this._vertices[lineIndex][1] = Math.max(Math.min(_this._vertices[lineIndex][1] + lineDeltaY, _this.maxYValue), _this.minYValue);
                _this._vertices[lineIndex + 1][1] =  Math.max(Math.min(_this._vertices[lineIndex + 1][1] + lineDeltaY, _this.maxYValue), _this.minYValue);
            }

            _this.notifyObservers();
            _this._drawUI();

            document.addEventListener('mouseup', mouseUpListener);
            document.addEventListener('touchend', mouseUpListener);
          }

          function mouseUpListener() {
            _this._container.removeEventListener('mousemove', moveLine);
            _this._container.removeEventListener('touchmove', moveLine);
            _this._container.removeEventListener('mousemove', moveVertex);
            _this._container.removeEventListener('touchmove', moveVertex);
          }

          _this._drawUI();
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
        _this._canvas.width = _this._container.clientWidth;
        _this._canvas.height = _this._container.clientHeight;
        _this._canvas.style.position = 'absolute';
        _this._canvas.style.left = '0px';
        _this._canvas.style.top = '0px';

        _this._drawUI();
      }
    }
  }

  /* ============================= */
  /* --- Module loader support --- */
  /* ============================= */

  (function exportModule() {
    // support for AMD libraries
    if (typeof define === 'function') {
      define([], function () {
        return EnvelopeGraph;
      });
    }

    // support for CommonJS libraries
    else if (typeof exports !== 'undefined') {
      exports.EnvelopeGraph = EnvelopeGraph;
    }

    // support for window global
    else if (typeof window !== 'undefined') {
      window.EnvelopeGraph = EnvelopeGraph;
    }

    // support for Node.js global
    else if (typeof global !== 'undefined') {
      global.EnvelopeGraph = EnvelopeGraph;
    }
  }());
})();
