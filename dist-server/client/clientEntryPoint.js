"use strict";

var _queryString = _interopRequireDefault(require("query-string"));

var _lanceGg = require("lance-gg");

var _CovidGameEngine = _interopRequireDefault(require("../common/CovidGameEngine"));

var _CovidClientEngine = _interopRequireDefault(require("../client/CovidClientEngine"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var qsOptions = _queryString.default.parse(location.search); // default options, overwritten by query-string options
// is sent to both game engine and client engine


var defaults = {
  traceLevel: _lanceGg.Lib.Trace.TRACE_NONE,
  delayInputCount: 3,
  scheduler: 'fixed',
  //'render-schedule',
  syncOptions: {
    sync: qsOptions.sync || 'extrapolate',
    remoteObjBending: 1.0,
    localObjBending: 0.8
  }
};
var options = Object.assign(defaults, qsOptions); // create a client engine and a game engine

var gameEngine = new _CovidGameEngine.default(options);
var clientEngine = new _CovidClientEngine.default(gameEngine, options);
document.addEventListener('DOMContentLoaded', function (e) {
  clientEngine.start();
});
//# sourceMappingURL=clientEntryPoint.js.map