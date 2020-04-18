import InteractiveObject from './InteractiveObject';

import Catalog from '../data/Catalog';
import Item from '../common/Card';
import * as utils from './../common/utils';

import * as PIXI from 'pixi.js';


export default class RenderableItem {
  constructor(gameObject, renderer, client) {
    const res = Catalog.getResourceByModelId(gameObject.model);
    const id = gameObject.model - res.id_offset;

    // Item fram
    this.container = new PIXI.Container();
    this.container.hitArea = new PIXI.Rectangle(-res.size.x/2, -res.size.y/2, res.size.x, res.size.y);

    // Item sprite and texture
    this.sprite = new PIXI.Sprite(res.textures.get(res.prefix + id + Catalog.SUFFIX));
    this.sprite.anchor.set(0.5, 0.5);
    this.sprite.angle = 30; // to break aliasing
    this.container.addChild(this.sprite);

    this.gameObject = gameObject;

    this.interaction = new InteractiveObject(gameObject, this.container, renderer, client, {
      groupSelectionPriority: 1
    });
  }

  destroy() {
    this.container.destroy({ children: true });
  }

  draw(t, dt, renderer, client) {
    // Transform
    this.container.zIndex = this.gameObject.order + 1;
    this.container.x = this.gameObject.position.x;
    this.container.y = this.gameObject.position.y;

    // Selection border
    const selected = (client.selection.indexOf(this.gameObject.id) !== -1);
    if (selected) {
      const sinT = Math.sin(t * Math.PI * 2 / 2000);
      this.sprite.tint = 0x010101 * Math.floor((sinT * sinT * 0.6 + 0.4) * 255);
    }
    else {
      // mouseover tint
      this.sprite.tint = (this.interaction.mouseIsOver && renderer.selecting === null && !selected) ? 0xAAAAAA : 0xFFFFFF;
    }
  }
}
