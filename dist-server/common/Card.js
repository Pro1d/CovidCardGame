"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lanceGg = require("lance-gg");

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var SIDE = {
  FRONT: 0,
  BACK: 1
};
var WIDTH = 120;
var HEIGHT = 180;

var Card =
/*#__PURE__*/
function (_DynamicObject) {
  _inherits(Card, _DynamicObject);

  _createClass(Card, [{
    key: "flip",
    value: function flip() {
      this.side = this.side === SIDE.FRONT ? SIDE.BACK : SIDE.FRONT;
    }
  }], [{
    key: "netScheme",
    get: function get() {
      return Object.assign({
        model: {
          type: _lanceGg.BaseTypes.TYPES.INT32
        },
        // -1: unknown, 0+:card model
        side: {
          type: _lanceGg.BaseTypes.TYPES.INT8
        },
        // SIDE.FRONT, SIDE.BACK
        order: {
          type: _lanceGg.BaseTypes.TYPES.INT32 // display ordering

        }
      }, _get(_getPrototypeOf(Card), "netScheme", this));
    }
  }, {
    key: "WIDTH",
    get: function get() {
      return WIDTH;
    }
  }, {
    key: "HEIGHT",
    get: function get() {
      return HEIGHT;
    }
  }, {
    key: "SIDE",
    get: function get() {
      return SIDE;
    }
  }]);

  function Card(gameEngine, options, props) {
    var _this;

    _classCallCheck(this, Card);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Card).call(this, gameEngine, options, props));
    _this.side = SIDE.FRONT;
    return _this;
  }

  _createClass(Card, [{
    key: "syncTo",
    value: function syncTo(other) {
      _get(_getPrototypeOf(Card.prototype), "syncTo", this).call(this, other);

      this.model = other.model;
      this.side = other.side;
      this.order = other.order;
    } // avoid gradual synchronization of velocity
    //get bending() {
    //  return {
    //    velocity: { percent: 0.0 },
    //    position: { percent: 1.0, min : 5}
    //  };
    //}
    // debug

  }, {
    key: "toString",
    value: function toString() {
      return "".concat(_get(_getPrototypeOf(Card.prototype), "toString", this).call(this), " model=").concat(this.model, " side=").concat(this.side, " order=").concat(this.order);
    }
  }, {
    key: "onAddToWorld",
    value: function onAddToWorld(gameEngine) {
      if (_lanceGg.Renderer) _lanceGg.Renderer.getInstance().addCard(this);
    }
  }, {
    key: "onRemoveFromWorld",
    value: function onRemoveFromWorld(gameEngine) {
      if (_lanceGg.Renderer) _lanceGg.Renderer.getInstance().removeCard(this);
    }
  }]);

  return Card;
}(_lanceGg.DynamicObject);

exports.default = Card;
//# sourceMappingURL=Card.js.map