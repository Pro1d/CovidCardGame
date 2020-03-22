"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lanceGg = require("lance-gg");

var _Card = _interopRequireDefault(require("./../common/Card"));

var filters = _interopRequireWildcard(require("pixi-filters"));

var PIXI = _interopRequireWildcard(require("pixi.js"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
var app = null;
var client = null;
var BUTTON = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2
};

var GameRenderer =
/*#__PURE__*/
function (_Renderer) {
  _inherits(GameRenderer, _Renderer);

  function GameRenderer(gameEngine, clientEngine) {
    var _this;

    _classCallCheck(this, GameRenderer);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(GameRenderer).call(this, gameEngine, clientEngine));
    game = gameEngine;
    client = clientEngine;
    app = new PIXI.Application({
      width: 800,
      height: 800,
      antialias: true
    });
    app.stop();
    _this.cardSprites = new Map();
    _this.isReady = false; // Whether the Sprites are loaded and renderer is ready

    _this.dragging = null;
    _this.selecting = null;
    _this.selection = [];
    return _this;
  }

  _createClass(GameRenderer, [{
    key: "setupStage",
    value: function setupStage() {
      document.body.querySelector('.pixiContainer').appendChild(app.renderer.view);
      app.stage.backgroundSprite = new PIXI.Sprite(app.loader.resources.background.texture);
      app.stage.backgroundSprite.width = app.renderer.width;
      app.stage.backgroundSprite.height = app.renderer.height;
      app.stage.backgroundSprite.zIndex = 0;
      app.stage.addChild(app.stage.backgroundSprite);
      app.stage.sortableChildren = true;
      app.stage.sortDirty = true;
      app.start();
      var selectingCounter = new PIXI.BitmapText("1", {
        font: {
          name: "Comfortaa",
          size: 100
        },
        tint: 0xFFFFFF
      });
      selectingCounter.anchor.set(0.5, 0.5);
      selectingCounter.zIndex = 1001;
      selectingCounter.alpha = 0.6;
      selectingCounter.angle = 180;
      selectingCounter.renderable = false;
      app.stage.selectingCounter = selectingCounter;
      app.stage.addChild(selectingCounter);
      var selectingBox = new PIXI.Graphics();
      selectingBox.zIndex = 1000;
      app.stage.selectingBox = selectingBox;
      app.stage.addChild(selectingBox);

      function updateSelectingBox(sel, count) {
        selectingBox.clear();
        selectingCounter.renderable = false;

        if (sel !== null) {
          selectingBox.lineStyle(1, 0xffffff, 1);
          selectingBox.beginFill(0xffffff, 0.2);
          selectingBox.drawRect(sel.start.x + .5, sel.start.y + .5, sel.end.x - sel.start.x, sel.end.y - sel.start.y);
          selectingBox.endFill();

          if (count > 0) {
            selectingCounter.renderable = true;
            selectingCounter.x = (sel.start.x + sel.end.x) / 2;
            selectingCounter.y = (sel.start.y + sel.end.y) / 2;
            selectingCounter.text = count;
          }
        }
      }

      var table = app.stage.backgroundSprite;
      table.interactive = true;
      var that = this; // Reactangular selection

      function applySelection() {
        var ids = [];
        that.cardSprites.forEach(function (v, k) {
          var center = app.stage.toLocal(v.getGlobalPosition());

          if ((that.selecting.start.x < center.x && center.x < that.selecting.end.x || that.selecting.start.x > center.x && center.x > that.selecting.end.x) && (that.selecting.start.y < center.y && center.y < that.selecting.end.y || that.selecting.start.y > center.y && center.y > that.selecting.end.y)) {
            ids.push(k);
          }
        });
        return ids;
      }

      table.on("mousedown", function (e) {
        if (e.data.button === BUTTON.LEFT) {
          var pos = e.data.getLocalPosition(app.stage);
          pos.x = Math.round(pos.x);
          pos.y = Math.round(pos.y);
          that.selecting = {
            start: pos,
            end: pos
          };
          that.selection = [];
          updateSelectingBox(that.selecting, that.selection.length);
        }
      });
      table.on("mousemove", function (e) {
        if (that.selecting !== null) {
          var pos = e.data.getLocalPosition(app.stage);
          pos.x = Math.round(Math.min(Math.max(pos.x, 0), app.renderer.width));
          pos.y = Math.round(Math.min(Math.max(pos.y, 0), app.renderer.height));
          that.selecting.end = pos;
          updateSelectingBox(that.selecting, that.selection.length);
          that.selection = applySelection();
        }
      });

      function onMouseUp(e) {
        if (e.data.button === BUTTON.LEFT) {
          if (that.selecting !== null) {
            that.selection = applySelection();
            that.selecting = null;
            updateSelectingBox(that.selecting, 0);
          }
        }
      }

      table.on("mouseup", onMouseUp);
      table.on("mouseupoutside", onMouseUp); //this.dropShadowFilter = new filters.DropShadowFilter({
      //  color: 0x000000,
      //  alpha: 0.5,
      //  blur: 2,
      //  quality: 2,
      //  distance: 0
      //});
    }
  }, {
    key: "init",
    value: function init() {
      var _this2 = this;

      if (document.readyState === 'complete' || document.readyState === 'loaded' || document.readyState === 'interactive') this.onDOMLoaded();else document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this));
      return new Promise(function (resolve, reject) {
        app.loader.add(Object.keys(_this2.ASSETPATHS).map(function (x) {
          return {
            name: x,
            url: _this2.ASSETPATHS[x]
          };
        })).load(function () {
          _this2.isReady = true;

          _this2.setupStage();

          if (isTouchDevice()) document.body.classList.add('touch');else if (isMacintosh()) document.body.classList.add('mac');else if (isWindows()) document.body.classList.add('pc');
          resolve();

          _this2.gameEngine.emit('renderer.ready');
        });
      });
    }
  }, {
    key: "onDOMLoaded",
    value: function onDOMLoaded() {
      app.renderer.view.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      }, false);
    } // Add a single Card game object

  }, {
    key: "addCard",
    value: function addCard(obj) {
      var card_container = new PIXI.Container();
      var frontSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures[obj.model + ".png"]);
      var backSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures["back.png"]);
      card_container.addChild(frontSprite);
      card_container.addChild(backSprite);
      card_container.frontSprite = frontSprite;
      card_container.backSprite = backSprite;
      frontSprite.anchor.set(0.5, 0.5);
      backSprite.anchor.set(0.5, 0.5); //frontSprite.filters = [this.dropShadowFilter];
      //backSprite.filters = [this.dropShadowFilter];
      //frontSprite.visible = obj.side === Card.SIDE.FRONT;
      //backSprite.visible = obj.side === Card.SIDE.BACK;

      this.setupCardInteraction(obj, card_container);
      app.stage.addChild(card_container);
      this.cardSprites.set(obj.id, card_container);
    }
  }, {
    key: "setupCardInteraction",
    value: function setupCardInteraction(obj, container) {
      var that = this;
      container.interactive = true; // Over

      container.on("mouseover", function (e) {
        container.mouseIsOver = true;
      });
      container.on("mouseout", function (e) {
        container.mouseIsOver = false;
      }); // Flip

      container.on("rightclick", function (e) {
        // Update selection
        var sel_index = that.selection.indexOf(obj.id);

        if (sel_index !== -1) {
          var tmp = that.selection[0];
          that.selection[0] = that.selection[sel_index];
          that.selection[sel_index] = tmp;
        } else {
          that.selection = [obj.id];
        }

        var ids = that.selection;
        client.sendInput("flip " + ids.toString());
        client.sendInput("top " + ids.toString());
        if (client.autoAlignCardOnInteractionEnabled && ids.length === 1) client.sendInput("orientation " + 0 + " " + ids.toString()); // restore selection

        if (sel_index === -1) {
          that.selection = [];
        }
      }); // Drag Start

      container.on("mousedown", function (e) {
        if (e.data.button == BUTTON.LEFT) {
          var sel_index = that.selection.indexOf(obj.id);

          if (sel_index === -1) {
            // clear selection, create one card selection
            that.selection = [obj.id];
          }

          var ids = that.selection;
          var rel = e.data.getLocalPosition(container);
          var pos = e.data.getLocalPosition(app.stage);
          var dist = Math.hypot(rel.x, rel.y);
          that.dragging = {
            objId: obj.id,
            rotate: dist > _Card.default.WIDTH / 2,
            prevPos: pos,
            initialLocalDist: dist,
            pivotGlobal: app.stage.toLocal(container.getGlobalPosition())
          };
          if (client.autoAlignCardOnInteractionEnabled && ids.length === 1 && !that.dragging.rotate) client.sendInput("orientation " + 0 + " " + ids.toString());
          client.sendInput("top " + ids.toString());
        }
      }); // Drag Move

      container.on("mousemove", function (e) {
        if (that.dragging && that.dragging.objId === obj.id) {
          var ids = that.selection;
          var prevMousePos = that.dragging.prevPos.clone();
          var currMousePos = e.data.getLocalPosition(app.stage);
          currMousePos.copyTo(that.dragging.prevPos);

          if (!that.dragging.rotate || ids.length > 1) {
            var dx = currMousePos.x - prevMousePos.x;
            var dy = currMousePos.y - prevMousePos.y;
            client.sendInput("move " + [dx, dy].toString() + " " + ids.toString());
          } else {
            var xRelFrom = prevMousePos.x - that.dragging.pivotGlobal.x;
            var yRelFrom = prevMousePos.y - that.dragging.pivotGlobal.y;
            var xRelTo = currMousePos.x - that.dragging.pivotGlobal.x;
            var yRelTo = currMousePos.y - that.dragging.pivotGlobal.y;
            var distFrom = Math.hypot(xRelFrom, yRelFrom);
            var distTo = Math.hypot(xRelTo, yRelTo); // Do not push the card, only pull is allowed (and if the move has been
            // interrupted, resume it if only when we reached the initial anchor point)

            if (distTo > distFrom && distTo > that.dragging.initialLocalDist) {
              var dm = distTo - that.dragging.initialLocalDist;

              var _dx = xRelTo * dm / distTo;

              var _dy = yRelTo * dm / distTo;

              that.dragging.pivotGlobal.x += _dx;
              that.dragging.pivotGlobal.y += _dy;
              client.sendInput("move " + [_dx, _dy].toString() + " " + [obj.id].toString());
            }

            var angleFrom = Math.atan2(yRelFrom, xRelFrom);
            var angleTo = Math.atan2(yRelTo, xRelTo);
            var deltaAngle = (angleTo - angleFrom) * 180 / Math.PI;
            client.sendInput("rotate " + deltaAngle + " " + [obj.id].toString());
          }
        }
      }); // Drag End

      function dragEnd(e) {
        if (e.data.button == BUTTON.LEFT) {
          that.dragging = null; // clear selection

          if (that.selection.length === 1) {
            that.selection = [];
          }
        }
      }

      container.on("mouseupoutside", dragEnd);
      container.on("mouseup", dragEnd);
    }
  }, {
    key: "removeCard",
    value: function removeCard(obj) {
      var card_container = this.cardSprites.get(obj.id);

      if (card_container) {
        this.cardSprites.delete(obj.id);
        if (card_container.frontSprite) card_container.frontSprite.destroy();
        frontSprite.destroy();
        if (card_container.backSprite) card_container.backSprite.destroy();
        backSprite.destroy();
      }
    }
  }, {
    key: "draw",
    value: function draw(t, dt) {
      var _this3 = this;

      _get(_getPrototypeOf(GameRenderer.prototype), "draw", this).call(this, t, dt);

      if (!this.isReady) return; // lance-gg and pixi's sprites not loaded yet

      game.world.forEachObject(function (id, obj) {
        if (obj instanceof _Card.default) {
          var card_container = _this3.cardSprites.get(obj.id);

          card_container.zIndex = obj.order;
          card_container.rotation = obj.angle * Math.PI / 180;
          card_container.x = obj.position.x;
          card_container.y = obj.position.y;
          card_container.frontSprite.renderable = obj.side === _Card.default.SIDE.FRONT;
          card_container.backSprite.renderable = obj.side === _Card.default.SIDE.BACK;

          if (_this3.selection.indexOf(obj.id) !== -1 && _this3.dragging === null || card_container.mouseIsOver && _this3.dragging === null && _this3.selecting === null) {
            card_container.frontSprite.tint = 0xAAAAAA;
            card_container.backSprite.tint = 0xAAAAAA;
          } else {
            card_container.frontSprite.tint = 0xFFFFFF;
            card_container.backSprite.tint = 0xFFFFFF;
          }
        }
      });
      app.renderer.render(app.stage);
    }
  }, {
    key: "ASSETPATHS",
    get: function get() {
      return {
        background: 'assets/wood.png',
        cardSheet: 'assets/cards.json',
        comfortaaFont: 'assets/comfortaa.xml'
      };
    }
  }]);

  return GameRenderer;
}(_lanceGg.Renderer);

exports.default = GameRenderer;

function isMacintosh() {
  return navigator.platform.indexOf('Mac') > -1;
}

function isWindows() {
  return navigator.platform.indexOf('Win') > -1;
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints;
}
//# sourceMappingURL=CovidRenderer.js.map