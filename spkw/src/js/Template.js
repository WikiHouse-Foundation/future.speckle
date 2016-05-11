
// require your modules here
var $   = require('jquery'); 
var SPK = require('./modules/SPK.jsx').default;

// init your magic in here
$( function() { 
  var mySPK  = new SPK( 
  {
    canvasid : 'spk-canvas'
  });
});