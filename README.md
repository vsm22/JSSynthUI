JSSynthUI
==========
A library of HTML5 canvas widgets for building synths and audio applications
----------------------------------------------------------------------------

JSSynthUI is a library of widgets for building interfaces for synthesizers and other audio related apps. The look of the library was inspired by the look of Ableton Live and Max-for-Live components. Currently the components are implemented using the HTML5 canvas, but SVG implementation is also planned. 

Typical Usage
-------------
Each widget should be placed inside a wrapping html element

**HTML**
```html
<div id="dial-container"></div>
```
Define the 
**CSS**
```css
#dial-container {
    width: 50px;
    height: 50px;
}
```
**JavaScript**
```javascript
const myDial = new Dial({ container: document.getElementById("dial-container") });
```

Creating a widget without explicitely providing a container will place the widget inside `document.body`, and will give it the full width and height of the body.

Widget Events
-------------
Each widget stores the value of its state, and can be asked to report it using the `.subscribe(context, callback)` method.
The subscribe method takes two arguments - a `context` attached to the callback function, and the `callback` function itself.
For example, the following method subscribes a
