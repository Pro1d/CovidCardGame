import * as utils from "../common/utils";
import * as PIXI from "pixi.js";

const TEXT_ANCHOR_CENTER_Y = 0.57;
const Color = { White: 0xffffff, DarkGrey: 0x424242, LightGrey: 0xaaaaaa };

export default class RenderableArea {
  constructor(gameObject, opts, client) {
    this.gameObject = gameObject;
    this.blwidth = gameObject.baseLeftWidth;
    this.brwidth = gameObject.baseRightWidth;
    this.tlwidth = gameObject.topLeftWidth;
    this.trwidth = gameObject.topRightWidth;
    this.height = gameObject.height;

    this.client = client;

    this.area = new PIXI.Polygon();

    this.container = new PIXI.Container();
    this.container.hitArea = this.area;

    this.display = new PIXI.Graphics();
    this.container.addChild(this.display);

    this.text = new PIXI.BitmapText(gameObject.text, { font: { name: "Comfortaa", size: 42 }, tint: Color.White });
    this.text.anchor.set(0.5, TEXT_ANCHOR_CENTER_Y);
    this.text.alpha = 0.8;
    this.container.addChild(this.text);

    this.updateGeometryAndAlpha();
    this.updateState(client.privateArea);
    this.updateTextOrientation(client.tableSide);

    // Listeners to update renderable
    this.onTableSideChanged = (side) => {
      this.updateTextOrientation(side);
    };
    this.onPrivateAreaEntered = (id) => {
      this.updateState(id);
    };
    this.onPrivateAreaExited = (id) => {
      this.updateState(null);
    };
    this.client.on("table_side_changed", this.onTableSideChanged);
    this.client.on("private_area_entered", this.onPrivateAreaEntered);
    this.client.on("private_area_exited", this.onPrivateAreaExited);

    this._setupInteraction();
  }

  destroy() {
    this.client.removeListener("table_side_changed", this.onTableSideChanged);
    this.client.removeListener("private_area_entered", this.onPrivateAreaEntered);
    this.client.removeListener("private_area_exited", this.onPrivateAreaExited);
    this.container.destroy({ children: true });
  }

  _setupInteraction() {
    this.container.click = (e) => {
      if (!this.client.hasPrivateArea) {
        this.client.privateArea = this.gameObject;
      }
    };
    this.container.mouseover = (e) => {this.display.tint = 0x555555;};
    this.container.mouseout = (e) => {this.display.tint = 0xffffff;};
  }

  updateState(activeAreaId) {
    const hasPrivateArea = this.client.hasPrivateArea;
    this.container.interactive = !hasPrivateArea;
    this.container.zIndex = hasPrivateArea ? 0 : 900;
    this.updateGeometryAndAlpha();
  }

  updateGeometryAndAlpha() {
    this.area.points = [
      -this.blwidth, 0,
      +this.brwidth, 0,
      +this.trwidth, this.height,
      -this.tlwidth, this.height,
    ];

    const hasPrivateArea = this.client.hasPrivateArea;
    const areaEntered = this.client.privateArea === this.gameObject.id;
    this.display.clear();
    this.display.beginFill(areaEntered ? Color.LightGrey : Color.DarkGrey, hasPrivateArea ? 0.35 : 0.9);
    this.display.drawShape(this.area);
    this.display.endFill();
    this.display.tint = 0xffffff;

    this.text.y = this.height - this.text.font.size * 0.8;
  }

  updateTextOrientation(tableSide) {
    this.text.angle = Math.abs(utils.warp180Degrees(tableSide - this.gameObject.side)) < 89 ? 0 : 180;
  }

  draw() {
    if (this.blwidth !== this.gameObject.baseLeftWidth
        || this.brwidth !== this.gameObject.baseRightWidth
        || this.tlwidth !== this.gameObject.topLeftWidth
        || this.trwidth !== this.gameObject.topRightWidth
        || this.height !== this.gameObject.height) {
      this.blwidth = this.gameObject.baseLeftWidth;
      this.brwidth = this.gameObject.baseRightWidth;
      this.tlwidth = this.gameObject.topLeftWidth;
      this.trwidth = this.gameObject.topRightWidth;
      this.height = this.gameObject.height;
      this.updateGeometryAndAlpha();
    }
    this.container.angle = this.gameObject.angle;
    this.container.x = this.gameObject.position.x;
    this.container.y = this.gameObject.position.y;
    if (this.gameObject.text)
      this.text.text = this.gameObject.text;
  }
}
