import { Renderer } from "lance-gg";

import RenderableArea from "./RenderableArea";
import RenderableCard from "./RenderableCard";
import RenderableDice from "./RenderableDice";
import RenderableItem from "./RenderableItem";
import Selection from "./Selection";

import Card from "./../common/Card";
import Dice from "./../common/Dice";
import Item from "./../common/Item";
import PingPosition from "./../common/PingPosition";
import PrivateArea from "./../common/PrivateArea";
import ShuffleFx from "./../common/ShuffleFx";

import Catalog from "../data/Catalog";
import * as utils from "./../common/utils";
import * as PIXI from "pixi.js";
import "./pixi-mousewheel";

let game = null;
let app = null;
let client = null;

const Button = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
const TEXT_ANCHOR_CENTER_Y = 0.57;
const Color = { White: 0xffffff, Background: 0x0b9847 };
const TABLE_MARGIN = 40;

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
    });
    this.app = app;
    app.stop();
    this.interactiveObjects = new Map();
    this.privateAreas = new Map();
    this.isReady = false; // Whether the Sprites are loaded and renderer is ready
    this.dragging = null;
    this.selecting = null;
    this.shortLivedObjects = [];
  }

  get ASSETPATHS() {
    const assets = [];

    // Font
    assets.push({ name: "font-comfortaa", url: "assets/comfortaa.xml" });

    // Game items
    for (let res of Catalog.resources) {
      for (let i = 0; i < res.files.length; i++) {
        assets.push({ name: res.prefix + i, url: res.files[i] });
      }
    }
    return assets;
  }

  init() {
    if (
      document.readyState === "complete" ||
      document.readyState === "loaded" ||
      document.readyState === "interactive"
    )
      this.onDOMLoaded();
    else document.addEventListener("DOMContentLoaded", this.onDOMLoaded.bind(this));

    return new Promise((resolve, reject) => {
      app.loader.add(this.ASSETPATHS).load((loader, resources) => {
        for (let catResource of Catalog.resources) {
          catResource.textures = new Map();
          for (let i = 0; i < catResource.files.length; i++) {
            const textureName = catResource.prefix + i;
            for (let k of Object.keys(app.loader.resources[textureName].textures)) {
              catResource.textures.set(k, app.loader.resources[textureName].textures[k]);
            }
          }
        }
        this.isReady = true;
        this.setupStage();
        resolve();
      });
    });
  }

  onDOMLoaded() {
    // Allow mouse event sequence like: left down -> right down -> left up -> right up
    const interactionDOMElement = app.renderer.plugins.interaction.interactionDOMElement;
    app.renderer.plugins.interaction.removeEvents();
    app.renderer.plugins.interaction.supportsPointerEvents = false;
    app.renderer.plugins.interaction.setTargetElement(interactionDOMElement);
    // Allow right click
    app.renderer.view.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
      },
      false
    );
    window.onresize = this.updateTable.bind(this);
    this.initTooltip();
  }

  setCursorShape(type) {
    app.renderer.view.style.cursor = type;
  }

  setupStage() {
    document.body.querySelector("#pixiContainer").appendChild(app.renderer.view);
    app.stage.staticContainer = new PIXI.Container();
    app.stage.staticContainer.interactive = true;
    app.stage.staticContainer.hitArea = new PIXI.Rectangle(
      0,
      0,
      app.renderer.width,
      app.renderer.height
    );
    app.stage.addChild(app.stage.staticContainer);

    // Synchronized objects must be placed in this container
    app.stage.table = new PIXI.Graphics();
    // app.stage.table = new PIXI.Container();
    app.stage.table.angle = -client.tableSide;
    client.on("table_side_changed", (tableSide) => {
      app.stage.table.angle = -tableSide;
    });
    app.stage.table.sortableChildren = true;
    app.stage.table.sortDirty = true;
    app.stage.addChild(app.stage.table);
    client.gameEngine.on("table_updated", this.updateTable.bind(this));

    let selectingCounter = new PIXI.BitmapText("1", {
      font: { name: "Comfortaa", fontSize: 100 /* pixels*/ },
      tint: Color.White,
    });
    selectingCounter.anchor.set(0.5, TEXT_ANCHOR_CENTER_Y);
    selectingCounter.zIndex = 1001;
    selectingCounter.alpha = 0.6;
    selectingCounter.angle = 0;
    selectingCounter.renderable = false;
    app.stage.selectingCounter = selectingCounter;
    app.stage.addChild(selectingCounter);

    let selectingBox = new PIXI.Graphics();
    selectingBox.zIndex = 1000;
    app.stage.selectingBox = selectingBox;
    app.stage.addChild(selectingBox);

    // Transparent graphics to disable interaction when a not privateAreaSelected
    let interactionLocker = new PIXI.Graphics();
    interactionLocker.interactive = true;
    interactionLocker.zIndex = 899;
    app.stage.table.interactionLocker = interactionLocker;
    app.stage.table.addChild(interactionLocker);
    function updateInteractionLocker() {
      interactionLocker.visible = !client.hasPrivateArea;
    }
    updateInteractionLocker();
    client.on("private_area_entered", updateInteractionLocker.bind(this));
    client.on("private_area_exited", updateInteractionLocker.bind(this));

    this.setupBackgroundInteraction();

    app.start();
  }

  computeTablePolygonPath(ngon, innerRadius) {
    const angleStep = (2 * Math.PI) / ngon;
    const outerRadius = innerRadius / Math.cos(angleStep / 2);
    const path = [];
    for (let i = 0; i < ngon; i++) {
      path.push(
        new PIXI.Point(
          -Math.sin((i + 0.5) * angleStep) * outerRadius,
          Math.cos((i + 0.5) * angleStep) * outerRadius
        )
      );
    }
    return path;
  }

  updateTable() {
    const windowHeight = window.innerHeight;
    const ngon = client.gameEngine.table.ngon;
    const innerRadius = client.gameEngine.table.radius;
    if (
      app.stage.table.ngon !== ngon ||
      app.stage.table.radius !== innerRadius ||
      windowHeight != app.renderer.height
    ) {
      app.stage.table.ngon = ngon;
      app.stage.table.radius = innerRadius;

      const path = this.computeTablePolygonPath(ngon, innerRadius);
      const bg = app.stage.table;
      bg.clear();
      bg.beginFill(Color.Background, 1.0);
      bg.drawPolygon(path);
      bg.endFill();
      bg.interactionLocker.clear();
      bg.interactionLocker.beginFill(Color.White, 0.8);
      bg.interactionLocker.drawPolygon(path);
      bg.interactionLocker.endFill();

      const aabb = path.reduce(
        (box, p) => {
          box.xmin = Math.min(box.xmin, p.x);
          box.ymin = Math.min(box.ymin, p.y);
          box.xmax = Math.max(box.xmax, p.x);
          box.ymax = Math.max(box.ymax, p.y);
          return box;
        },
        { xmin: 0, xmax: 0, ymin: 0, ymax: 0 }
      );
      const scale = windowHeight / (aabb.ymax - aabb.ymin + TABLE_MARGIN * 2);
      const windowWidth = Math.round(scale * (aabb.xmax - aabb.xmin + TABLE_MARGIN * 2));
      app.stage.table.x = windowWidth / 2;
      app.stage.table.y = windowHeight / 2 - (aabb.ymin + (aabb.ymax - aabb.ymin) / 2) * scale;
      app.stage.table.scale.set(scale, scale);
      app.renderer.resize(windowWidth, windowHeight);
      app.stage.staticContainer.hitArea.width = windowWidth;
      app.stage.staticContainer.hitArea.height = windowHeight;
    }
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
        selectingBox.lineStyle(1, Color.White, 1);
        selectingBox.beginFill(Color.White, 0.2);
        selectingBox.drawRect(
          sel.start.x + 0.5,
          sel.start.y + 0.5,
          sel.end.x - sel.start.x,
          sel.end.y - sel.start.y
        );
        selectingBox.endFill();
        if (count > 0 && client.display_selecting_count) {
          selectingCounter.renderable = true;
          selectingCounter.x = (sel.start.x + sel.end.x) / 2;
          selectingCounter.y = (sel.start.y + sel.end.y) / 2;
          selectingCounter.text = count;
        }
      }
    }
    function updateSelection(selection, append) {
      selection.resetChange();
      let highestPriority = 0;
      that.interactiveObjects.forEach((v, k) => {
        let center = ref.toLocal(v.container.getGlobalPosition());
        if (
          ((that.selecting.start.x <= center.x && center.x <= that.selecting.end.x) ||
            (that.selecting.start.x >= center.x && center.x >= that.selecting.end.x)) &&
          ((that.selecting.start.y <= center.y && center.y <= that.selecting.end.y) ||
            (that.selecting.start.y >= center.y && center.y >= that.selecting.end.y))
        ) {
          const priority = v.interaction.groupSelectionPriority;
          if (priority > highestPriority) {
            selection.resetChange().addChange(k);
            highestPriority = priority;
          } else if (priority >= highestPriority) {
            selection.addChange(k);
          }
        }
      });
    }
    app.stage.staticContainer.on("mousedown", (e) => {
      if (that.commonInteraction(e)) {
        // event consumed by commonInteraction()
      } else if (e.data.button === Button.LEFT) {
        let pos = e.data.getLocalPosition(ref);
        pos.x = Math.round(pos.x);
        pos.y = Math.round(pos.y);
        that.selecting = { start: pos, end: pos };
        client.selection.resetChange();
        if (!e.data.originalEvent.shiftKey) client.selection.mergeChange(Selection.REPLACE);
        updateSelectingBox(that.selecting, client.selection.changeSize);
      }
    });
    app.stage.staticContainer.on("mousemove", (e) => {
      if (that.selecting !== null) {
        let pos = e.data.getLocalPosition(ref);
        pos.x = Math.round(utils.clamp(pos.x, 0, app.renderer.width - 1));
        pos.y = Math.round(utils.clamp(pos.y, 0, app.renderer.height - 1));
        that.selecting.end = pos;
        updateSelection(client.selection);
        updateSelectingBox(that.selecting, client.selection.changeSize);
      }
    });
    const onMouseUp = (e) => {
      if (e.data.button === Button.LEFT) {
        if (this.selecting !== null) {
          updateSelection(client.selection);
          client.selection.mergeChange(
            e.data.originalEvent.shiftKey ? Selection.ADD : Selection.REPLACE
          );
          this.selecting = null;
          updateSelectingBox(this.selecting, 0);
        }
      }
    };
    app.stage.staticContainer.on("mouseup", onMouseUp);
    app.stage.staticContainer.on("mouseupoutside", onMouseUp);
  }

  commonInteraction(e) {
    if (e.data.button == Button.MIDDLE) {
      const pos = e.data.getLocalPosition(app.stage.table);
      // check that click is inside the table
      const distCenter = Math.hypot(pos.x, pos.y);
      const t = client.gameEngine.table;
      let isInside = true;
      if (distCenter > t.outerRadius) isInside = false;
      else if (distCenter > t.innerRadius) {
        const dmax = t.innerRadius;
        t.forEachPie((pie) => {
          if (utils.dot(pie, pos) > dmax) {
            isInside = false;
            return true;
          }
        });
      }
      if (isInside) {
        client.sendInput("ping_position " + pos.x + "," + pos.y);
        return true;
      }
    }
    return false;
  }

  addObject(obj) {
    if (obj instanceof Card) this.addInteractiveObject(obj, RenderableCard);
    else if (obj instanceof Dice) this.addInteractiveObject(obj, RenderableDice);
    else if (obj instanceof Item) this.addInteractiveObject(obj, RenderableItem);
    else if (obj instanceof PrivateArea) this.addPrivateArea(obj);
    else if (obj instanceof PingPosition) this.createPingPositionAnimation(obj);
    else if (obj instanceof ShuffleFx) this.createSmokeExplosionAnimation(obj);
  }

  removeObject(obj) {
    if (obj instanceof Card || obj instanceof Dice || obj instanceof Item)
      this.removeInteractiveObject(obj);
    else if (obj instanceof PrivateArea) this.removePrivateArea(obj);
  }

  createPingPositionAnimation(obj) {
    const container = new PIXI.Container();
    container.x = obj.position.x;
    container.y = obj.position.y;
    container.zIndex = 801;
    const circle = new PIXI.Graphics();
    container.addChild(circle);
    app.stage.table.addChild(container);
    this.shortLivedObjects.push({
      time: null,
      duration: 2000,
      classType: PingPosition,
      container: container,
    });
  }

  createSmokeExplosionAnimation(obj) {
    const container = new PIXI.Container();
    container.x = obj.position.x;
    container.y = obj.position.y;
    container.zIndex = 800;
    const circles = new PIXI.Graphics();
    container.addChild(circles);
    app.stage.table.addChild(container);
    const particlesCount = 6;
    const particles = [];
    for (let i = 0; i < particlesCount; i++) {
      const direction = ((i + Math.random() * 1.1) / particlesCount) * 2 * Math.PI;
      const dx = Math.cos(direction);
      const dy = Math.sin(direction);
      const rdm = Math.random();
      const rMin = 20;
      const rFactor = 20;
      const vMin = 100;
      const vFactor = 250; /* pixels*/
      const radius = rdm * (2 - rdm) * rFactor + rMin;
      const v = (1 - rdm) * vFactor + vMin;
      particles.push({
        x: dx * radius * 0.8,
        y: dy * radius * 0.8,
        vx: dx * v,
        vy: dy * v,
        radius: radius,
      });
    }
    this.shortLivedObjects.push({
      time: null,
      duration: 1500,
      classType: ShuffleFx,
      container: container,
      particles: particles,
    });
  }

  initTooltip() {
    this.tooltip = {
      view: document.body.querySelector("#mainContainer .tooltip"),
      objectId: null, // the object id that generates this tooltip
    };
  }

  showTooltip(objectId, htmlContent, objectPosition, objectRadius) {
    let position = "";
    let x = objectPosition.x;
    let y = objectPosition.y;
    if (objectPosition.y > app.renderer.height / 2) {
      position = "above";
      y -= objectRadius + 5; // pixels
    } else {
      position = "below";
      y += objectRadius + 5; // pixels
    }
    this.tooltip.view.setAttribute("position", position);
    this.tooltip.objectId = objectId;
    this.tooltip.view.innerHTML = htmlContent;
    this.tooltip.view.style.left = (x / app.renderer.width) * 100 + "%";
    this.tooltip.view.style.top = (y / app.renderer.height) * 100 + "%";
  }

  hideTooltip(objectId) {
    if (objectId === this.tooltip.objectId) {
      this.tooltip.objectId = null;
      this.tooltip.view.setAttribute("position", "none");
    }
  }

  addInteractiveObject(obj, RenderableClass) {
    let rObj = new RenderableClass(obj, this, client);
    app.stage.table.addChild(rObj.container);
    this.interactiveObjects.set(obj.id, rObj);
  }

  removeInteractiveObject(obj) {
    const rObj = this.interactiveObjects.get(obj.id);
    if (rObj) {
      this.interactiveObjects.delete(obj.id);
      rObj.destroy();
      this.hideTooltip(obj.id);
    }
  }

  addPrivateArea(obj) {
    const area = new RenderableArea(obj, {}, client);
    app.stage.table.addChild(area.container);
    this.privateAreas.set(obj.id, area);
  }

  removePrivateArea(obj) {
    let area = this.privateAreas.get(obj.id);
    if (area) {
      this.privateAreas.delete(obj.id);
      area.destroy();
    }
  }

  // loc: in table frame
  observationState(loc) {
    let insideUserPrivateArea = false;
    let insideOtherPrivateArea = false;
    this.privateAreas.forEach((v, k) => {
      let pt = v.container.toLocal(loc, app.stage.table);
      if (k === client.privateAreaId) insideUserPrivateArea = v.area.contains(pt.x, pt.y);
      else insideOtherPrivateArea = insideOtherPrivateArea || v.area.contains(pt.x, pt.y);
    });
    const user = (client.gameEngine.table.areaVisibility & PrivateArea.Visibility.USER) !== 0;
    const other = (client.gameEngine.table.areaVisibility & PrivateArea.Visibility.OTHER) !== 0;
    return {
      visibleByUser:
        (insideUserPrivateArea && user) ||
        (insideOtherPrivateArea && other) ||
        (!insideUserPrivateArea && !insideOtherPrivateArea),
      insideUserPrivateArea: insideUserPrivateArea,
    };
  }

  draw(t, dt) {
    super.draw(t, dt);

    if (!this.isReady) return; // lance-gg and pixi's sprites not loaded yet

    this.interactiveObjects.forEach((rObj) => rObj.draw(t, dt, this, client));
    this.privateAreas.forEach((area) => area.draw());

    for (let i = 0; i < this.shortLivedObjects.length; i++) {
      const obj = this.shortLivedObjects[i];
      obj.time = obj.time || t;
      let duration = t - obj.time;
      let dRatio = duration / obj.duration; // age of the object in the range [0, 1]
      if (duration >= obj.duration) {
        obj.container.destroy({ children: true });
        this.shortLivedObjects.splice(i, 1);
        i--;
      } else if (obj.classType === PingPosition) {
        let graphics = obj.container.children[0];
        graphics.clear();
        let r = 0.25;
        // shape: /\ centered on r
        let intensity = dRatio < r ? 1 - dRatio / r : (dRatio - r) / (1 - r);
        let sqrtAlpha = Math.min(1.0, 1.2 * (1 - intensity));
        graphics.beginFill(
          0x0000ff | (0x010100 * Math.round(Math.pow(1 - intensity, 2) * 255)),
          sqrtAlpha * sqrtAlpha
        );
        graphics.drawCircle(0, 0, 80 * ((1 - Math.pow(1 - intensity, 2.3)) * 0.95 + 0.05));
        graphics.endFill();
      } else if (obj.classType === ShuffleFx) {
        let graphics = obj.container.children[0];
        graphics.clear();
        const slowdown = 0.07;
        const logSlowdown = -2.3025850929940455;
        // integrale from 0 to dRatio of slowdown^t.dt
        const vIntegrale = (Math.pow(slowdown, dRatio) - 1) / logSlowdown;
        for (let p of obj.particles) {
          const sqrtAlpha = Math.min(1.0, (1 - dRatio) * 1.2);
          graphics.beginFill(Color.White, sqrtAlpha * sqrtAlpha);
          graphics.drawCircle(
            p.x + p.vx * vIntegrale,
            p.y + p.vy * vIntegrale,
            p.radius * (1 + dRatio)
          );
          graphics.endFill();
        }
      }
    }

    app.renderer.render(app.stage);
  }
}
