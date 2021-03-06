import InteractiveObject from "./InteractiveObject";

import Catalog from "../data/Catalog";
import Card from "../common/Card";
import * as utils from "./../common/utils";

import * as PIXI from "pixi.js";

const Texture = { FRONT: 0, BACK: 1, UNKNOWN_FRONT: 2, UNKNOWN_BACK: 3 };
function getTextureIndex(isBack, isUnknown) {
  return isBack + 2 * isUnknown;
}

export default class RenderableCard {
  constructor(gameObject, renderer, client) {
    const res = Catalog.getResourceByModelId(gameObject.model);
    const id = gameObject.model - res.idOffset;

    // Card images
    this.textures = {};
    this.textures[Texture.FRONT] = res.textures.get(res.prefix + id + Catalog.SUFFIX);
    this.textures[Texture.BACK] = res.textures.get(res.prefix + Catalog.BACK_SUFFIX);
    this.textures[Texture.UNKNOWN_FRONT] = res.textures.get(res.prefix + Catalog.UNKNOWN_SUFFIX);
    this.textures[Texture.UNKNOWN_BACK] = res.textures.get(
      res.prefix + Catalog.UNKNOWN_BACK_SUFFIX
    );

    // Card frame
    this.container = new PIXI.Container();
    this.container.hitArea = new PIXI.Rectangle(
      -res.size.x / 2,
      -res.size.y / 2,
      res.size.x,
      res.size.y
    );

    // Card sprite
    this.sprite = new PIXI.Sprite(this.textures[Texture.FRONT]);
    this.sprite.anchor.set(0.5, 0.5);
    this.container.addChild(this.sprite);

    // Selection border
    this.selectionBorder = new PIXI.Graphics();
    this.selectionBorder.lineStyle(4, 0xff1040, 1.0);
    this.selectionBorder.beginFill(0, 0);
    this.selectionBorder.drawRoundedRect(
      -res.size.x / 2,
      -res.size.y / 2,
      res.size.x,
      res.size.y,
      8
    );
    this.selectionBorder.endFill();
    this.container.addChild(this.selectionBorder);

    // Member
    this.gameObject = gameObject;
    this.resource = res;
    this.mouseIsOver = false;
    this.interaction = new InteractiveObject(gameObject, this.container, renderer, client, {
      groupSelectionPriority: 10,
      objectGroup: 1,
      rotating: true,
      rotationMinDistance: Math.min(res.size.x / 2, res.size.y / 2),
      onMouseOver: this.onMouseOver.bind(this),
      onMouseOut: this.onMouseOut.bind(this),
      onMouseWheel: this.onMouseWheel.bind(this),
      onRightClick: this.onRightClick.bind(this),
    });
    this.cardDesc =
      this.resource.descriptions &&
      this.resource.descriptions[this.gameObject.model - this.resource.idOffset];

    this.client = client;
    this.renderer = renderer;
  }

  destroy() {
    this.container.destroy({ children: true });
  }

  onMouseOver() {
    if (this.cardDesc && this.gameObject.side === Card.SIDE.FRONT) {
      const selected = this.client.selection.has(this.gameObject.id);
      if (!selected) {
        const obsState = this.renderer.observationState(this.container.position);
        if (obsState.visibleByUser) {
          const position = this.container.getGlobalPosition();
          const radius =
            Math.max(
              this.resource.size.x * this.container.scale.x,
              this.resource.size.y * this.container.scale.y
            ) / 2;
          this.renderer.showTooltip(this.gameObject.id, this.cardDesc, position, radius);
        }
      }
    }
  }

  onMouseOut() {
    if (this.cardDesc) {
      this.renderer.hideTooltip(this.gameObject.id);
    }
  }

  onMouseWheel(delta) {
    const N = this.client.gameEngine.table.ngon;
    const angleStep = (Math.sign(-delta) * 360) / (N * [1, 4, 2, 4][N & 3]);
    const angleRef = this.client.side;
    const ids = this.client.selection.toString();

    this.client.sendInput(`rotate_step ${angleStep} ${angleRef} ${ids}`);
  }

  onRightClick() {
    const ids = this.client.selection.toString();
    this.client.sendInput(`flip ${this.gameObject.id} ${ids}`);
    this.client.sendInput(`top ${ids}`);
    this.client.autoExecutionOnInteraction(this.client.selection);
  }

  draw(t, dt, renderer, client) {
    // Transform
    this.container.zIndex = this.gameObject.order + 1;
    this.container.angle = this.gameObject.angle;
    this.container.x = this.gameObject.position.x;
    this.container.y = this.gameObject.position.y;

    const obsState = renderer.observationState(this.container.position);

    // Scale up if card is private, with transition animation
    const currentScale = this.container.scale.x;
    const targetScale = obsState.insideUserPrivateArea ? 1.0 : 0.87;
    const diffScale = targetScale - currentScale;
    let newScale = targetScale;
    if (Math.abs(diffScale) > 0.01) {
      const transitionDuration = 120;
      const scale = Math.pow(0.9, (dt / transitionDuration) * -Math.sign(diffScale));
      const scaleMin = Math.min(targetScale, currentScale);
      const scaleMax = Math.max(targetScale, currentScale);
      newScale = utils.clamp(currentScale * scale, scaleMin, scaleMax);
    }
    this.container.scale.set(newScale, newScale);

    // Selection border
    const selected = client.selection.has(this.gameObject.id);
    this.selectionBorder.renderable = selected;
    if (selected) {
      const sinT = Math.sin((t * Math.PI * 2) / 2000);
      this.selectionBorder.alpha = sinT * sinT;
    }

    // Sprite texture (side and observability)
    const isBack = this.gameObject.side === Card.SIDE.BACK;
    this.sprite.texture = this.textures[getTextureIndex(isBack, !obsState.visibleByUser)];

    // mouseover tint
    this.sprite.tint =
      this.interaction.mouseIsOver && renderer.selecting === null && !selected
        ? 0xaaaaaa
        : 0xffffff;
  }
}
