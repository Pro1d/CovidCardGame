"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lanceGg = require("lance-gg");

var _Card = _interopRequireDefault(require("./Card"));

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

// /////////////////////////////////////////////////////////
//
// GAME ENGINE
//
// /////////////////////////////////////////////////////////
var CovidGameEngine =
/*#__PURE__*/
function (_GameEngine) {
  _inherits(CovidGameEngine, _GameEngine);

  function CovidGameEngine(options) {
    var _this;

    _classCallCheck(this, CovidGameEngine);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(CovidGameEngine).call(this, options)); //this.physicsEngine = new SimplePhysicsEngine({ gameEngine: this, collisions: { autoResolve: false }});
    // common code

    _this.on('postStep', _this.gameLogic.bind(_assertThisInitialized(_this)));

    return _this;
  }

  _createClass(CovidGameEngine, [{
    key: "registerClasses",
    value: function registerClasses(serializer) {
      serializer.registerClass(_Card.default);
    }
  }, {
    key: "gameLogic",
    value: function gameLogic() {// Called every postStep
      // Nothing to do???
    }
  }, {
    key: "forEachValidCard",
    value: function forEachValidCard(ids, functor) {
      var _this2 = this;

      ids.forEach(function (id) {
        var cardObj = _this2.world.queryObject({
          id: id,
          instanceType: _Card.default
        });

        if (cardObj) functor(cardObj);
      });
    }
  }, {
    key: "getIds",
    value: function getIds(commaSeparatedId) {
      var ids = [];
      commaSeparatedId.split(",").forEach(function (idStr) {
        ids.push(parseInt(idStr));
      });
      return ids;
    }
  }, {
    key: "processInput",
    value: function processInput(inputData, playerId, isServer) {
      _get(_getPrototypeOf(CovidGameEngine.prototype), "processInput", this).call(this, inputData, playerId);

      var input = inputData.input.split(" ");
      if (isServer) console.log(input);
      var action = input.shift();

      if (action === "flip") {
        // flip the cards that have the same side visible as the first id
        var sideToFlip = null;
        this.forEachValidCard(this.getIds(input.shift()), function (cardObj) {
          if (sideToFlip === null) {
            sideToFlip = cardObj.side;
          }

          if (cardObj.side === sideToFlip) cardObj.flip();
        });
      } else if (action === "top") {
        var ids = this.getIds(input.shift());
        this.moveToTop(ids);
      } else if (action === "move") {
        var delta = input.shift().split(",");
        var dx = parseFloat(delta[0]);
        var dy = parseFloat(delta[1]);
        this.forEachValidCard(this.getIds(input.shift()), function (cardObj) {
          var px = cardObj.position.x + dx;
          var py = cardObj.position.y + dy;
          cardObj.position.x = Math.min(Math.max(px, 1), 800 - 1);
          cardObj.position.y = Math.min(Math.max(py, 1), 800 - 1);
        });
      } else if (action === "orientation") {
        var angle = parseFloat(input.shift());
        this.forEachValidCard(this.getIds(input.shift()), function (cardObj) {
          cardObj.angle = angle;
        });
      } else if (action == "rotate") {
        var deltaAngle = parseFloat(input.shift());
        this.forEachValidCard(this.getIds(input.shift()), function (cardObj) {
          if (deltaAngle < 0) cardObj.turnLeft(-deltaAngle);else cardObj.turnRight(deltaAngle);
        });
      } else if (action == "randomize") {
        var _ids = this.getIds(input.shift());

        this.emit("executeCommand", {
          cmd: "randomize",
          ids: _ids
        });
      } else if (action == "gather") {
        var xmin = 800,
            xmax = 0,
            ymin = 800,
            ymax = 0;

        var _ids2 = this.getIds(input.shift());

        this.forEachValidCard(_ids2, function (cardObj) {
          xmin = Math.min(cardObj.position.x, xmin);
          ymin = Math.min(cardObj.position.y, ymin);
          xmax = Math.max(cardObj.position.x, xmax);
          ymax = Math.max(cardObj.position.y, ymax);
        });
        var x = (xmin + xmax) / 2;
        var y = (ymin + ymax) / 2;
        this.forEachValidCard(_ids2, function (cardObj) {
          cardObj.position.x = x;
          cardObj.position.y = y;
          cardObj.angle = 0;
        });
      } //  inputData.rearrange
      //   gather(or spread)?+set orientation
      //  inputData.zoom
      //   zoom card

    }
  }, {
    key: "moveToTop",
    value: function moveToTop(ids) {
      var orderToUpdate = [];
      this.forEachValidCard(ids, function (cardObj) {
        orderToUpdate.push(cardObj.order);
      });
      var cards = this.world.queryObjects({
        instanceType: _Card.default
      });
      cards.forEach(function (cardObj) {
        var count = 0; // number of card to update that has a greater order value.

        var found = false;
        orderToUpdate.forEach(function (otu) {
          if (cardObj.order > otu) {
            ++count;
          } else if (cardObj.order === otu) {
            found = true;
          }
        });

        if (found) {
          cardObj.order = cards.length - orderToUpdate.length + count;
        } else {
          cardObj.order -= count;
        }
      });
    }
  }], [{
    key: "CardsCount",
    get: function get() {
      return SetOfCards.length;
    }
  }]);

  return CovidGameEngine;
}(_lanceGg.GameEngine);

exports.default = CovidGameEngine;
//# sourceMappingURL=CovidGameEngine.js.map