import InteractiveObject from "./InteractiveObject";

import Catalog from "../data/Catalog";
import * as utils from "../common/utils";

import * as PIXI from "pixi.js";

export default class RenderableDice {
  constructor(gameObject, renderer, client) {
    const res = Catalog.getResourceByModelId(gameObject.model);
    const id = gameObject.model - res.idOffset;
    this.maxValue = res.values;

    // Item frame
    this.container = new PIXI.Container();
    this.container.hitArea = new PIXI.Rectangle(
      -res.size.x / 2,
      -res.size.y / 2,
      res.size.x,
      res.size.y
    );

    // Item sprite and texture
    this.textures = utils
      .sequence(this.maxValue)
      .map((i) => res.textures.get(res.prefix + (id * this.maxValue + i) + Catalog.SUFFIX));
    this.sprite = new PIXI.Sprite(this.textures[gameObject.value]);
    this.sprite.anchor.set(0.5, 0.5);
    this.container.addChild(this.sprite);

    this.gameObject = gameObject;
    this.rollId = this.gameObject.rollId;
    this.actionRollId = this.gameObject.rollId;
    this.rollAnimation = 0;
    this.rotateDirection = 1;
    this.rollingStrength = 0;

    this.interaction = new InteractiveObject(gameObject, this.container, renderer, client, {
      groupSelectionPriority: 20,
      objectGroup: 3,
      onMouseWheel: this.onMouseWheel.bind(this),
      onRightClick: this.onRightClick.bind(this),
    });

    this.client = client;
  }

  destroy() {
    this.container.destroy({ children: true });
  }

  onMouseWheel(delta) {
    // Increment / decrement the value
    const step = delta > 0 ? 1 : -1;
    const ids = this.client.selection.toString();
    this.client.sendInput(`increment ${step} ${ids}`);
  }

  onRightClick() {
    this.tryRoll(0);
  }

  tryRoll(throwDir) {
    if (this.actionRollId <= this.gameObject.rollId) {
      this.actionRollId = this.gameObject.rollId + 1;
      const ids = this.client.selection.toString();
      const direction = throwDir == 0 ? NaN : this.client.side + (throwDir > 0 ? 180 : 0);
      this.client.sendInput(`roll ${ids} ${direction}`);
    }
  }

  draw(t, dt, renderer, client) {
    const rollAnimationDuration = 800;
    if (this.rollId !== this.gameObject.rollId) {
      this.rollId = this.gameObject.rollId;
      this.rollAnimation = rollAnimationDuration * utils.randFloat(0.8, 1.0);
      this.rotateDirection = Math.random() < 0.5 ? -1 : 1;
      this.rollingStrength = utils.randFloat(0.3, 1);
    }
    if (this.rollAnimation > 0) {
      this.rollAnimation = Math.max(this.rollAnimation - dt, 0);
    }

    // Transform
    const a = this.rollAnimation / rollAnimationDuration;
    const rollingAmplitude = 15 * this.rollingStrength * (1 - Math.pow(2 * a - 1, 2)) * 2 * a * a;
    const rollingAngle = 2 * Math.PI * this.rotateDirection * this.rollingStrength * a * a;
    const rotationAnim = 2 * 360 * this.rotateDirection * a * a;
    this.container.zIndex = this.gameObject.order + 1;
    this.container.angle = this.gameObject.angle + rotationAnim;
    this.container.x = this.gameObject.position.x + Math.sin(rollingAngle) * rollingAmplitude;
    this.container.y = this.gameObject.position.y + Math.cos(rollingAngle) * rollingAmplitude;

    // Dice value
    this.sprite.texture = this.textures[
      a > 0.45 ? utils.randInt(0, this.maxValue) : this.gameObject.value
    ];

    // Selection border
    const selected = client.selection.has(this.gameObject.id);
    if (selected) {
      const sinT = Math.sin((t * Math.PI * 2) / 2000);
      this.sprite.tint = 0x010101 * Math.floor((sinT * sinT * 0.6 + 0.4) * 255);
    } else if (this.interaction.mouseIsOver && renderer.selecting === null && !selected) {
      // mouseover tint
      this.sprite.tint = 0xaaaaaa;
    } else {
      this.sprite.tint = 0xffffff;
    }
  }
}
