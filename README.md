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
**CSS**
```css
#dial-container {
    width: 50px;
    height: 50px;
}
```
**JavaScript**
```javascript
var myDial = new Dial({ container: document.getElementById("dial-container");
```
  
  
