import { Renderer } from 'lance-gg';
import Card from './../common/Card';
import * as filters from 'pixi-filters';
import * as PIXI from 'pixi.js';

let game = null;
let app = null;
let client = null;
const BUTTON = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
export default class GameRenderer extends Renderer {

  constructor(gameEngine, clientEngine) {
    super(gameEngine, clientEngine);
    game = gameEngine;
    client = clientEngine;
    app = new PIXI.Application({
      width: game.tableSize.x,
      height: game.tableSize.y,
      antialias: true,
    });
    app.stop()
    this.cardSprites = new Map();
    this.isReady = false; // Whether the Sprites are loaded and renderer is ready
    this.dragging = null;
    this.selecting = null;
    this.selection = []
  }

  get ASSETPATHS() {
    return {
      background: 'assets/wood.png',
      cardSheet: 'assets/cards.json',
      comfortaaFont: 'assets/comfortaa.xml'
    };
  }

  setupStage() {
    document.body.querySelector('.pixiContainer').appendChild(app.renderer.view);
    app.stage.backgroundSprite = new PIXI.Sprite(app.loader.resources.background.texture);
    app.stage.backgroundSprite.width = app.renderer.width;
    app.stage.backgroundSprite.height = app.renderer.height;
    app.stage.addChild(app.stage.backgroundSprite);
    app.start();

    // Synchronized objects must be placed in this container
    app.stage.table = new PIXI.Container();
    app.stage.table.x = game.tableHalf.x;
    app.stage.table.y = game.tableHalf.y;
    //app.stage.table.anchor(0.5, 0.5); // if table is a Sprite
    app.stage.table.sortableChildren = true;
    app.stage.table.sortDirty = true;
    app.stage.addChild(app.stage.table);

    let selectingCounter = new PIXI.BitmapText("1", {font: { name: "Comfortaa", size: 100 }, tint: 0xFFFFFF});
    selectingCounter.anchor.set(0.5, 0.5);
    selectingCounter.zIndex = 1001;
    selectingCounter.alpha = 0.6;
    selectingCounter.angle = 180;
    selectingCounter.renderable = false;
    app.stage.addChild(selectingCounter);

    let selectingBox = new PIXI.Graphics();
    selectingBox.zIndex = 1000;
    app.stage.addChild(selectingBox);

    function updateSelectingBox(sel, count) {
      selectingBox.clear();
      selectingCounter.renderable = false;
      if (sel !== null) {
        selectingBox.lineStyle(1, 0xffffff, 1);
        selectingBox.beginFill(0xffffff, 0.2);
        selectingBox.drawRect(
          sel.start.x+.5, sel.start.y+.5, sel.end.x - sel.start.x, sel.end.y - sel.start.y);
        selectingBox.endFill();
        if (count > 0) {
          selectingCounter.renderable = true;
          selectingCounter.x = (sel.start.x + sel.end.x) / 2;
          selectingCounter.y = (sel.start.y + sel.end.y) / 2;
          selectingCounter.text = count;
        }
      }
    }

    const ref = app.stage;
    app.stage.backgroundSprite.interactive = true;
    const that = this;
    // Reactangular selection
    function applySelection() {
      let ids = [];
      that.cardSprites.forEach((v, k) => {
        let center = ref.toLocal(v.getGlobalPosition());
        if (((that.selecting.start.x <= center.x && center.x <= that.selecting.end.x)
          || (that.selecting.start.x >= center.x && center.x >= that.selecting.end.x))
          && ((that.selecting.start.y <= center.y && center.y <= that.selecting.end.y)
            || (that.selecting.start.y >= center.y && center.y >= that.selecting.end.y))) {
          ids.push(k);
        }
      });
      return ids;
    }
    app.stage.backgroundSprite.on("mousedown", function(e) {
      if (e.data.button === BUTTON.LEFT) {
        let pos = e.data.getLocalPosition(ref)
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        that.selecting = { start: pos, end: pos };
        that.selection = [];
        updateSelectingBox(that.selecting, that.selection.length);
      }
    });
    app.stage.backgroundSprite.on("mousemove", function(e) {
      if (that.selecting !== null) {
        let pos = e.data.getLocalPosition(ref)
        pos.x = Math.round(Math.min(Math.max(pos.x, 0), app.renderer.width-1));
        pos.y = Math.round(Math.min(Math.max(pos.y, 0), app.renderer.height-1));
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
    app.stage.backgroundSprite.on("mouseup", onMouseUp);
    app.stage.backgroundSprite.on("mouseupoutside", onMouseUp);

    //this.dropShadowFilter = new filters.DropShadowFilter({
    //  color: 0x000000,
    //  alpha: 0.5,
    //  blur: 2,
    //  quality: 2,
    //  distance: 0
    //});
  }

  init() {
    if (document.readyState === 'complete' ||
        document.readyState === 'loaded' ||
        document.readyState === 'interactive')
      this.onDOMLoaded();
    else
      document.addEventListener('DOMContentLoaded', this.onDOMLoaded.bind(this));

    return new Promise((resolve, reject) => {
      app.loader.add(Object.keys(this.ASSETPATHS).map((x) => {
          return { name: x, url: this.ASSETPATHS[x] };
      }))
      .load(() => {
        this.isReady = true;
        this.setupStage();

        if (isTouchDevice()) document.body.classList.add('touch');
        else if (isMacintosh()) document.body.classList.add('mac');
        else if (isWindows()) document.body.classList.add('pc');
        resolve();
        this.gameEngine.emit('renderer.ready');
        });
      });
  }

  onDOMLoaded() {
    app.renderer.view.addEventListener("contextmenu", function(e){
      e.preventDefault();
    }, false);
  }

  // Add a single Card game object
  addCard(obj) {
    let card_container = new PIXI.Container();
    let frontSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures[obj.model+".png"]);
    let backSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures["back.png"]);
    card_container.addChild(frontSprite);
    card_container.addChild(backSprite);
    card_container.frontSprite = frontSprite;
    card_container.backSprite = backSprite;

    frontSprite.anchor.set(0.5, 0.5);
    backSprite.anchor.set(0.5, 0.5);
    frontSprite.renderable = obj.side === Card.SIDE.FRONT;
    backSprite.renderable = obj.side === Card.SIDE.BACK;
    //frontSprite.filters = [this.dropShadowFilter];
    //backSprite.filters = [this.dropShadowFilter];

    this.setupCardInteraction(obj, card_container);

    app.stage.table.addChild(card_container);
    this.cardSprites.set(obj.id, card_container);
  }

  setupCardInteraction(obj, container) {
    const that = this;
    const table = app.stage.table;
    container.interactive = true;
    // Over
    container.on("mouseover", function(e) {
      container.mouseIsOver = true;
    });
    container.on("mouseout", function(e) {
      container.mouseIsOver = false;
    });
    // Flip
    container.on("rightclick", function(e) {
      // Update selection
      let sel_index = that.selection.indexOf(obj.id);
      if (sel_index !== -1) {
        let tmp = that.selection[0];
        that.selection[0] = that.selection[sel_index];
        that.selection[sel_index] = tmp;
      } else {
        that.selection = [obj.id];
      }
      let ids = that.selection;
      client.sendInput("flip " + ids.toString());
      client.sendInput("top " + ids.toString());
      if (client.autoAlignCardOnInteractionEnabled && ids.length === 1)
        client.sendInput("orientation " + 0 + " " + ids.toString());
      // restore selection
      if (sel_index === -1) {
        that.selection = [];
      }
    });
    // Drag Start
    container.on("mousedown", function(e) {
      if (e.data.button == BUTTON.LEFT) {
        let sel_index = that.selection.indexOf(obj.id);
        if (sel_index === -1) {
          // clear selection, create one card selection
          that.selection = [obj.id];
        }
        let ids = that.selection;

        let rel = e.data.getLocalPosition(container);
        let pos = e.data.getLocalPosition(table);
        let dist = Math.hypot(rel.x, rel.y);
        that.dragging = {
          objId: obj.id,
          rotate: dist > Card.WIDTH / 2,
          prevPos: pos,
          initialLocalDist: dist,
          pivotGlobal: table.toLocal(container.getGlobalPosition())
        };
        if (client.autoAlignCardOnInteractionEnabled && ids.length === 1 && !that.dragging.rotate)
          client.sendInput("orientation " + 0 + " " + ids.toString());
        client.sendInput("top " + ids.toString());
      }
    });
    // Drag Move
    container.on("mousemove", function(e) {
      if (that.dragging && that.dragging.objId === obj.id) {
        let ids = that.selection;
        let prevMousePos = that.dragging.prevPos.clone();
        let currMousePos = e.data.getLocalPosition(table);
        currMousePos.copyTo(that.dragging.prevPos);

        if (!that.dragging.rotate || ids.length > 1) {
          let dx = currMousePos.x - prevMousePos.x;
          let dy = currMousePos.y - prevMousePos.y;
          client.sendInput("move "+[dx,dy].toString()+" "+ids.toString());
        } else {
          let xRelFrom = prevMousePos.x - that.dragging.pivotGlobal.x;
          let yRelFrom = prevMousePos.y - that.dragging.pivotGlobal.y;
          let xRelTo = currMousePos.x - that.dragging.pivotGlobal.x;
          let yRelTo = currMousePos.y - that.dragging.pivotGlobal.y;
          let distFrom = Math.hypot(xRelFrom, yRelFrom);
          let distTo = Math.hypot(xRelTo, yRelTo);
          // Do not push the card, only pull is allowed (and if the move has been
          // interrupted, resume it if only when we reached the initial anchor point)
          if (distTo > distFrom && distTo > that.dragging.initialLocalDist) {
            let dm = distTo - that.dragging.initialLocalDist;
            let dx = xRelTo * dm / distTo;
            let dy = yRelTo * dm / distTo;
            that.dragging.pivotGlobal.x += dx;
            that.dragging.pivotGlobal.y += dy;
            client.sendInput("move "+[dx,dy].toString()+" "+[obj.id].toString());
          }
          let angleFrom = Math.atan2(yRelFrom, xRelFrom);
          let angleTo = Math.atan2(yRelTo, xRelTo);
          let deltaAngle = (angleTo - angleFrom) * 180 / Math.PI;
          client.sendInput("rotate "+deltaAngle+" "+[obj.id].toString());
        }
      }
    });
    // Drag End
    function dragEnd(e) {
      if (e.data.button == BUTTON.LEFT) {
        that.dragging = null;
        // clear selection
        if (that.selection.length === 1) {
          that.selection = [];
        }
      }
    }
    container.on("mouseupoutside", dragEnd);
    container.on("mouseup", dragEnd);
  }

  removeCard(obj) {
    let card_container = this.cardSprites.get(obj.id);
    if (card_container) {
      this.cardSprites.delete(obj.id);
      if (card_container.frontSprite) card_container.frontSprite.destroy();
      frontSprite.destroy();
      if (card_container.backSprite) card_container.backSprite.destroy();
      backSprite.destroy();
    }
  }

  addPrivateArea(obj) {
    let area = new PIXI.Graphics();
    let r = 10;
    //area.lineStyle(1, 0xffffff, 1);
    area.beginFill(0x424242, 0.4);
    area.angle = obj.angle;
    area.zIndex = 0;
    area.position.x = obj.position.x;
    area.position.y = obj.position.y;
    area.drawRoundedRect(- obj.width / 2, -r, obj.width, obj.height + r, r);
    area.endFill();
    app.stage.table.addChild(area);
  }

  draw(t, dt) {
    super.draw(t, dt);
    if (!this.isReady) return; // lance-gg and pixi's sprites not loaded yet

    game.world.forEachObject((id, obj) => {
      if (obj instanceof Card) {
        let card_container = this.cardSprites.get(obj.id);
        card_container.zIndex = obj.order + 1;
        card_container.rotation = obj.angle * Math.PI / 180;
        card_container.x = obj.position.x;
        card_container.y = obj.position.y;
        card_container.frontSprite.renderable = obj.side === Card.SIDE.FRONT;
        card_container.backSprite.renderable = obj.side === Card.SIDE.BACK;
        if ((this.selection.indexOf(obj.id) !== -1 && this.dragging ===  null)
            || (card_container.mouseIsOver && this.dragging === null && this.selecting === null)) {
          card_container.frontSprite.tint = 0xAAAAAA;
          card_container.backSprite.tint = 0xAAAAAA;
        } else {
          card_container.frontSprite.tint = 0xFFFFFF;
          card_container.backSprite.tint = 0xFFFFFF;
        }
        // scale : with position, in inside PrivateArea: zoom=1:1, if table then zoom=1:2, linear grandient at PrivateArea border:
      }
    });
    app.renderer.render(app.stage);
  }
}

function isMacintosh() { return navigator.platform.indexOf('Mac') > -1; }
function isWindows() { return navigator.platform.indexOf('Win') > -1; }
function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints; }
