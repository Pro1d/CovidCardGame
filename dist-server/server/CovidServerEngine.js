"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lanceGg = require("lance-gg");

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

// cards set definition
var SetOfCards = [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9];

var CovidServerEngine =
/*#__PURE__*/
function (_ServerEngine) {
  _inherits(CovidServerEngine, _ServerEngine);

  function CovidServerEngine(io, gameEngine, inputOptions) {
    var _this;

    _classCallCheck(this, CovidServerEngine);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(CovidServerEngine).call(this, io, gameEngine, inputOptions));
    gameEngine.on('executeCommand', _this.executeCommand.bind(_assertThisInitialized(_this)));
    return _this;
  }

  _createClass(CovidServerEngine, [{
    key: "executeCommand",
    value: function executeCommand(cmd) {
      if (cmd.cmd === "randomize") {
        this.gameEngine.moveToTop(cmd.ids);
        this.randomizeSubSetOrder(cmd.ids);
      }
    }
  }, {
    key: "start",
    value: function start() {
      _get(_getPrototypeOf(CovidServerEngine.prototype), "start", this).call(this); // add card object to world, random order, random position


      var ordering = Array.apply(null, SetOfCards).map(Function.call, Number);

      for (var i = 0; i < SetOfCards.length; i++) {
        var pick_index = Math.trunc(Math.random() * (SetOfCards.length - i)) + i;
        var order = ordering[pick_index];
        ordering[pick_index] = ordering[i];
        var card = new _Card.default(this.gameEngine, null, {
          position: new _lanceGg.TwoVector(0, 0)
        });
        card.model = SetOfCards[i];
        card.side = _Card.default.SIDE.BACK;
        card.order = order;
        var margin = _Card.default.HEIGHT / 1.41;
        card.position.x = Math.random() * (800 - margin * 2) + margin;
        card.position.y = Math.random() * (800 - margin * 2) + margin;
        card.angle = Math.random() * 360;
        this.gameEngine.addObjectToWorld(card);
      }
    } // The ids to randomized must have been moveToTop before calling this method

  }, {
    key: "randomizeSubSetOrder",
    value: function randomizeSubSetOrder(ids) {
      var orderToRandomize = [];
      this.gameEngine.forEachValidCard(ids, function (c) {
        orderToRandomize.push(c.order);
      });
      this.gameEngine.forEachValidCard(ids, function (c) {
        var pick_index = Math.trunc(Math.random() * orderToRandomize.length);
        c.order = orderToRandomize[pick_index];
        orderToRandomize[pick_index] = orderToRandomize[0];
        orderToRandomize.shift();
      });
    }
  }, {
    key: "onPlayerConnected",
    value: function onPlayerConnected(socket) {
      _get(_getPrototypeOf(CovidServerEngine.prototype), "onPlayerConnected", this).call(this, socket);

      console.log("player joined: " + socket.playerId);
    }
  }, {
    key: "onPlayerDisconnected",
    value: function onPlayerDisconnected(socketId, playerId) {
      _get(_getPrototypeOf(CovidServerEngine.prototype), "onPlayerDisconnected", this).call(this, socketId, playerId);

      console.log("player left: " + playerId);
    }
  }]);

  return CovidServerEngine;
}(_lanceGg.ServerEngine);

exports.default = CovidServerEngine;
;
//# sourceMappingURL=CovidServerEngine.js.map