JSSynthUI
==========
A library of HTML5 canvas widgets for building synths and audio applications
----------------------------------------------------------------------------

JSSynthUI is a library of widgets for building interfaces for synthesizers and other audio related apps. The look of the library was inspired by the look of Ableton Live and Max-for-Live components. Currently the components are implemented using the HTML5 canvas, but SVG implementation is also planned. 

Adding a Widget 
-------------
Each widget should be placed inside a wrapping html element

**HTML**
```html
<div id="dial-container"></div>
```
The dimensions of the wrapping element should be explicitely specified

**CSS**
```css
#dial-container {
    width: 50px;
    height: 50px;
}
```
The widget is constructed from its class with an optional arguments object (see below).
At the least, the arguments object should have a `container` field, specifying the DOM container to use as the wrap for the widget.

**JavaScript**
```javascript
const myDial = new Dial({ container: document.getElementById("dial-container") });
```

Note that creating a widget without explicitely providing a container will by default place the widget inside `document.body`, and will give it the full width and height of the body.

Widget Events
-------------
Each widget stores the value of its state, and can be asked to report it using the `.subscribe(context, callback)` method.
The subscribe method takes two arguments - a `context` attached to the callback function, and the `callback` function itself.
For example, the following snippet will call the printVal function every time the dial is moved, and print the new value of the dial to the console. 

```javascript
const myDial = new Dial({ container: document.getElementById("dial-container") });
myDial.subscribe(this, printVal);

function printVal(val) {
    console.log(val);
}
```
Common Options
==============
The following options are common for all widgets


Common Methods
==============
The following methods are implemented in all widget classes

`subscribe(Object context, function callback(newValue))
- context: the context which calls the the callback function
- callback: the callback function invoked when the widget's state changes
- newValue: the new value of the widget passed to the callback function`






