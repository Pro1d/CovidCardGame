"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lanceGg = require("lance-gg");

var _CovidRenderer = _interopRequireDefault(require("../client/CovidRenderer"));

var _Card = _interopRequireDefault(require("../common/Card"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var game = null;

var CovidClientEngine =
/*#__PURE__*/
function (_ClientEngine) {
  _inherits(CovidClientEngine, _ClientEngine);

  function CovidClientEngine(gameEngine, options) {
    var _this;

    _classCallCheck(this, CovidClientEngine);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(CovidClientEngine).call(this, gameEngine, options, _CovidRenderer.default));
    game = gameEngine;
    return _this;
  }

  _createClass(CovidClientEngine, [{
    key: "start",
    value: function start() {
      var _this2 = this;

      document.addEventListener("keydown", function (e) {
        var ids = _this2.renderer.selection;

        if (e.key === "m") {
          if (ids.length > 1) _this2.sendInput("randomize " + ids.toString());
        } else if (e.key === "a" && (event.ctrlKey || event.metaKey)) {
          e.preventDefault();
          var sel = [];
          var cards = game.world.queryObjects({
            instanceType: _Card.default
          });
          cards.forEach(function (c) {
            sel.push(c.id);
          });
          _this2.renderer.selection = sel;
        } else if (e.key === "g") {
          if (ids.length > 1) _this2.sendInput("gather " + ids.toString());
        }
      });
      return _get(_getPrototypeOf(CovidClientEngine.prototype), "start", this).call(this);
    }
  }, {
    key: "autoAlignCardOnInteractionEnabled",
    get: function get() {
      return true;
    }
  }]);

  return CovidClientEngine;
}(_lanceGg.ClientEngine);

exports.default = CovidClientEngine;
//# sourceMappingURL=CovidClientEngine.js.map