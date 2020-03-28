import { Renderer } from 'lance-gg';
import Card from './../common/Card';
import PrivateArea from './../common/PrivateArea';
import * as filters from 'pixi-filters';
import * as PIXI from 'pixi.js';

let game = null;
let app = null;
let client = null;
const BUTTON = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
const TEXT_ANCHOR_CENTER_Y = 0.57;
const CursorShape = { GRAB: "move", GRABBING: "grabbing", ROTATE: "pointer", DEFAULT: "default" };
export default class GameRenderer extends Renderer {

  constructor(gameEngine, clientEngine) {
    super(gameEngine, clientEngine);
    game = gameEngine;
    client = clientEngine;
    app = new PIXI.Application({
      width: game.tableSize.x,
      height: game.tableSize.y,
      antialias: true,
      transparent: true,
      view: document.querySelector(".pixiContainer"),
    });
    app.stop()
    this.cardSprites = new Map();
    this.privateAreas = new Map();
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
        //this.gameEngine.emit('renderer.ready');
      });
    });
  }

  onDOMLoaded() {
    app.renderer.view.addEventListener("contextmenu", function(e){
      e.preventDefault();
    }, false);
  }

  setCursorShape(type) {
    app.renderer.view.style.cursor = type;
  }

  setupStage() {
    document.body.querySelector('#pixiContainer').appendChild(app.renderer.view);
    app.stage.staticContainer = new PIXI.Container();
    app.stage.staticContainer.interactive = true;
    app.stage.staticContainer.hitArea = new PIXI.Rectangle(0, 0, app.renderer.width, app.renderer.height);
    app.stage.backgroundSprite = new PIXI.Graphics(); //new PIXI.Sprite(app.loader.resources.background.texture);
    app.stage.backgroundSprite.beginFill(0x09803C);
    app.stage.backgroundSprite.drawRoundedRect(0, 0, app.renderer.width, app.renderer.height, 20);
    app.stage.backgroundSprite.endFill();
    app.stage.staticContainer.addChild(app.stage.backgroundSprite);
    app.stage.addChild(app.stage.staticContainer);

    // Synchronized objects must be placed in this container
    app.stage.table = new PIXI.Container();
    app.stage.table.angle = client.tableSide;
    client.on('table_side_changed', (tableSide) => { app.stage.table.angle = -tableSide; });
    app.stage.table.x = game.tableHalf.x;
    app.stage.table.y = game.tableHalf.y;
    //app.stage.table.anchor(0.5, 0.5); // if table is a Sprite
    app.stage.table.sortableChildren = true;
    app.stage.table.sortDirty = true;
    app.stage.addChild(app.stage.table);

    let selectingCounter = new PIXI.BitmapText("1", {font: { name: "Comfortaa", size: 100 }, tint: 0xFFFFFF});
    selectingCounter.anchor.set(0.5, TEXT_ANCHOR_CENTER_Y);
    selectingCounter.zIndex = 1001;
    selectingCounter.alpha = 0.6;
    selectingCounter.angle = 180;
    selectingCounter.renderable = false;
    app.stage.selectingCounter = selectingCounter;
    app.stage.addChild(selectingCounter);

    let selectingBox = new PIXI.Graphics();
    selectingBox.zIndex = 1000;
    app.stage.selectingBox = selectingBox;
    app.stage.addChild(selectingBox);

    // Transparent graphics to disable interaction when a not privateAreaSelected
    let interactionLocker = new PIXI.Graphics();
    interactionLocker.beginFill(0xffffff, 0.8);
    interactionLocker.drawRect(-app.renderer.width / 2, -app.renderer.height / 2, app.renderer.width, app.renderer.height);
    interactionLocker.endFill();
    interactionLocker.interactive = true;
    interactionLocker.zIndex = 899;
    app.stage.table.addChild(interactionLocker);
    function updateInteractionLocker() {
      interactionLocker.visible = !client.hasPrivateArea;
    }
    updateInteractionLocker();
    client.on("private_area_entered", updateInteractionLocker.bind(this));
    client.on("private_area_exited", updateInteractionLocker.bind(this));

    this.setupBackgroundInteraction();

    //this.dropShadowFilter = new filters.DropShadowFilter({
    //  color: 0x000000,
    //  alpha: 0.5,
    //  blur: 2,
    //  quality: 2,
    //  distance: 0
    //});
    app.start();
  }

  setupBackgroundInteraction() {
    const ref = app.stage.staticContainer;
    const that = this;
    const selectingBox = app.stage.selectingBox;
    const selectingCounter = app.stage.selectingCounter;

    app.stage.staticContainer.interactive = true;

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

    app.stage.staticContainer.on("mousedown", function(e) {
      if (e.data.button === BUTTON.LEFT) {
        let pos = e.data.getLocalPosition(ref)
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        that.selecting = { start: pos, end: pos };
        that.selection = [];
        updateSelectingBox(that.selecting, that.selection.length);
      }
    });
    app.stage.staticContainer.on("mousemove", function(e) {
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
        if (this.selecting !== null) {
          this.selection = applySelection();
          this.selecting = null;
          updateSelectingBox(this.selecting, 0);
        }
      }
    }
    app.stage.staticContainer.on("mouseup", onMouseUp.bind(this));
    app.stage.staticContainer.on("mouseupoutside", onMouseUp.bind(this));
  }

  // Add a single Card game object
  addCard(obj) {
    let card_container = new PIXI.Container();
    let frontSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures[obj.model+".png"]);
    let backSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures["back.png"]);
    let unknownFrontSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures["unknown.png"]);
    let unknownBackSprite = new PIXI.Sprite(app.loader.resources.cardSheet.textures["unknown_back.png"]);
    card_container.addChild(frontSprite);
    card_container.addChild(backSprite);
    card_container.addChild(unknownFrontSprite);
    card_container.addChild(unknownBackSprite);
    card_container.frontSprite = frontSprite;
    card_container.backSprite = backSprite;
    card_container.unknownFrontSprite = unknownFrontSprite;
    card_container.unknownBackSprite = unknownBackSprite;

    frontSprite.anchor.set(0.5, 0.5);
    backSprite.anchor.set(0.5, 0.5);
    unknownFrontSprite.anchor.set(0.5, 0.5);
    unknownBackSprite.anchor.set(0.5, 0.5);

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
      if (that.selecting === null && that.dragging === null)
        that.setCursorShape(CursorShape.GRAB)
    });
    container.on("mouseout", function(e) {
      container.mouseIsOver = false;
      if (that.selecting === null && that.dragging === null)
        that.setCursorShape(CursorShape.DEFAULT);
    });
    // Flip
    container.on("rightclick", function(e) {
    console.log(app.stage);
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
      client.autoExecutionOnInteraction(ids);
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
          rotate: dist > Card.WIDTH / 2 && ids.length === 1,
          prevPos: pos,
          initialLocalDist: dist,
          pivotGlobal: table.toLocal(container.getGlobalPosition())
        };
        if (!that.dragging.rotate)
            client.autoExecutionOnInteraction(ids);
        client.sendInput("top " + ids.toString());
        that.setCursorShape(CursorShape.GRABBING);
      }
    });
    // Drag Move
    container.on("mousemove", function(e) {
      if (that.dragging && that.dragging.objId === obj.id) {
        let ids = that.selection;
        let prevMousePos = that.dragging.prevPos.clone();
        let currMousePos = e.data.getLocalPosition(table);
        currMousePos.copyTo(that.dragging.prevPos);

        if (!that.dragging.rotate) {
          let dx = currMousePos.x - prevMousePos.x;
          let dy = currMousePos.y - prevMousePos.y;
          client.sendInput("move "+[dx,dy].toString()+" "+ids.toString());
        } else {
          let xRelFrom = prevMousePos.x - that.dragging.pivotGlobal.x;
          let yRelFrom = prevMousePos.y - that.dragging.pivotGlobal.y;
          let xRelTo = currMousePos.x - that.dragging.pivotGlobal.x;
          let yRelTo = currMousePos.y - that.dragging.pivotGlobal.y;
          let distFrom = Math.hypot(xRelFrom, yRelFrom);
          let distTo = Math.hypot(xRelTo, yRelTo) / container.scale.x;
          // Do not push the card, only pull is allowed (and if the move has been
          // interrupted, resume it if only when we reached the initial anchor point)
          if (distTo > distFrom && distTo > that.dragging.initialLocalDist) {
            let dm = distTo - that.dragging.initialLocalDist;
            let dx = xRelTo * dm / distTo;
            let dy = yRelTo * dm / distTo;
            that.dragging.pivotGlobal.x += dx;
            that.dragging.pivotGlobal.y += dy;
            client.sendInput("move "+[dx,dy].toString()+" "+ids.toString());
          }
          let angleFrom = Math.atan2(yRelFrom, xRelFrom);
          let angleTo = Math.atan2(yRelTo, xRelTo);
          let deltaAngle = (angleTo - angleFrom) * 180 / Math.PI;
          client.sendInput("rotate "+deltaAngle+" "+ids.toString());
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
      that.setCursorShape(CursorShape.DEFAULT);
    }
    container.on("mouseupoutside", dragEnd);
    container.on("mouseup", dragEnd);
  }

  removeCard(obj) {
    let card_container = this.cardSprites.get(obj.id);
    if (card_container) {
      this.cardSprites.delete(obj.id);
      card_container.destroy({ children: true });
    }
  }

  addPrivateArea(obj) {
    let area = new PIXI.Container();
    area.angle = obj.angle;
    area.zIndex = client.hasPrivateArea ? 0 : 900;
    area.position.x = obj.position.x;
    area.position.y = obj.position.y;
    area.interactive = true;
    let r = 10;
    area.hitArea = new PIXI.RoundedRectangle(-obj.width / 2, -r, obj.width, obj.height + r, r);

    let rect = new PIXI.Graphics();
    //area.lineStyle(1, 0xffffff, 1);
    let updateRect = (hasPrivateArea) => {
      rect.clear();
      rect.beginFill(0x424242, hasPrivateArea ? 0.35 : 0.9);
      rect.drawShape(area.hitArea);
      rect.endFill();
      rect.tint = 0xffffff;
    };
    updateRect(client.hasPrivateArea);
    area.addChild(rect);

    let text = new PIXI.BitmapText(obj.text, {font: { name: "Comfortaa", size: 50 }, tint: 0xFFFFFF});
    let updateText = (tableSide) => {
      text.angle = tableSide === obj.side ? 0 : 180;
    };
    updateText(client.tableSide);
    text.anchor.set(0.5, TEXT_ANCHOR_CENTER_Y);
    text.y = obj.height - text.font.size * 0.8;
    text.alpha = 0.8;
    area.addChild(text);
    area.text = text;

    client.on('table_side_changed', (side) => {
      updateText(side);
    });
    client.on('private_area_entered', (id) => {
      area.zIndex = 0;
      area.interactive = !client.hasPrivateArea;
      updateRect(client.hasPrivateArea);
    });
    client.on('private_area_exited', (id) => {
      area.zIndex = 900;
      area.interactive = !client.hasPrivateArea;
      updateRect(client.hasPrivateArea);
    });
    area.click = (e) => {
      if (!client.hasPrivateArea) {
        client.privateArea = obj;
      }
    };
    area.mouseover = (e) => { rect.tint = 0x555555; };
    area.mouseout = (e) => { rect.tint = 0xffffff; };

    app.stage.table.addChild(area);
    this.privateAreas.set(obj.id, area);
  }

  // Also need to remove callback event attached in addPrivateArea()
  //removePrivateArea(obj) {
  //  let container = this.privateAreas.get(obj.id);
  //  if (container) {
  //    this.privateAreas.delete(obj.id);
  //    container.destroy({ children: true });
  //  }
  //}

  observationState(loc) {
    let insideClientPrivateArea = false;
    let insideOtherPrivateArea = false;
    this.privateAreas.forEach((v, k) => {
      let pt = v.toLocal(loc, app.stage.table);
      if (k === client.privateAreaId)
        insideClientPrivateArea = v.hitArea.contains(pt.x, pt.y);
      else
        insideOtherPrivateArea = insideOtherPrivateArea || v.hitArea.contains(pt.x, pt.y);
    });
    return {insideOtherPrivateArea: insideOtherPrivateArea, insideClientPrivateArea: insideClientPrivateArea};
  }

  draw(t, dt) {
    super.draw(t, dt);
    if (!this.isReady) return; // lance-gg and pixi's sprites not loaded yet
    if (!this.privateFilter) {
      // OutlineFilter
      this.privateFilter = new filters.GlowFilter({quality: 0.8, outerStrength: 4, innerStrength: 1.5, color:0x424242});
      //this.privateFilter = new PIXI.filters.ColorMatrixFilter();
      //this.privateFilter.brightness(1.2);
    }
    game.world.forEachObject((id, obj) => {
      if (obj instanceof Card) {
        let card_container = this.cardSprites.get(obj.id);
        card_container.zIndex = obj.order + 1;
        card_container.angle = obj.angle;
        card_container.x = obj.position.x;
        card_container.y = obj.position.y;
        let obsState = this.observationState(card_container.position);
        if (!obsState.insideClientPrivateArea) card_container.scale.set(0.8, 0.8);
        else card_container.scale.set(1.0, 1.0);
        //card_container.filters = obsState.insideClientPrivateArea ? [this.privateFilter]:[];
        let unknown = obsState.insideOtherPrivateArea && ! obsState.insideClientPrivateArea;
        card_container.frontSprite.renderable = !unknown && obj.side === Card.SIDE.FRONT;
        card_container.backSprite.renderable = !unknown && obj.side === Card.SIDE.BACK;
        card_container.unknownFrontSprite.renderable = unknown && obj.side === Card.SIDE.FRONT;
        card_container.unknownBackSprite.renderable = unknown && obj.side === Card.SIDE.BACK;
        if ((this.selection.indexOf(obj.id) !== -1 && this.dragging ===  null)
            || (card_container.mouseIsOver && this.dragging === null && this.selecting === null)) {
          card_container.frontSprite.tint = 0xAAAAAA;
          card_container.backSprite.tint = 0xAAAAAA;
          card_container.unknownFrontSprite.tint = 0xAAAAAA;
          card_container.unknownBackSprite.tint = 0xAAAAAA;
        } else {
          card_container.frontSprite.tint = 0xFFFFFF;
          card_container.backSprite.tint = 0xFFFFFF;
          card_container.unknownFrontSprite.tint = 0xFFFFFF;
          card_container.unknownBackSprite.tint = 0xFFFFFF;
        }
        // scale : with position, in inside PrivateArea: zoom=1:1, if table then zoom=1:2, linear grandient at PrivateArea border:
      }
      else if (obj instanceof PrivateArea) {
        let area = this.privateAreas.get(obj.id);
        if (obj.text)
          area.text.text = obj.text;
      }
    });
    app.renderer.render(app.stage);
  }
}

function isMacintosh() { return navigator.platform.indexOf('Mac') > -1; }
function isWindows() { return navigator.platform.indexOf('Win') > -1; }
function isTouchDevice() { return 'ontouchstart' in window || navigator.maxTouchPoints; }
