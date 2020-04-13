import * as PIXI from 'pixi.js';
import * as utils from './../common/utils';
import Catalog from '../data/Catalog';
import Card from '../common/Card';

const Button = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
const Texture = {FRONT: 0, BACK: 1, UNKNOWN_FRONT: 2, UNKNOWN_BACK: 3 };
function getTextureIndex(isBack, isUnknown) { return isBack + 2 * isUnknown; }

export default class RenderableCard {
  constructor(gameObject, renderer, client) {
    const res = Catalog.getResourceByModelId(gameObject.model);
    const id = gameObject.model - res.id_offset;

    // Card images
    this.textures = {};
    this.textures[Texture.FRONT] = res.textures.get(res.prefix + id + Catalog.SUFFIX),
    this.textures[Texture.BACK] = res.textures.get(res.prefix + Catalog.BACK_SUFFIX),
    this.textures[Texture.UNKNOWN_FRONT] = res.textures.get(res.prefix + Catalog.UNKNOWN_SUFFIX),
    this.textures[Texture.UNKNOWN_BACK] = res.textures.get(res.prefix + Catalog.UNKNOWN_BACK_SUFFIX)

    // Card frame
    this.container = new PIXI.Container();
    this.container.hitArea = new PIXI.Rectangle(-res.size.x/2, -res.size.y/2, res.size.x, res.size.y);

    // Card sprite
    this.sprite = new PIXI.Sprite(this.textures[Texture.FRONT]);
    this.sprite.anchor.set(0.5, 0.5);
    this.container.addChild(this.sprite);

    // Selection border
    this.selectionBorder = new PIXI.Graphics();
    this.selectionBorder.lineStyle(4, 0xFF1040, 1.0);
    this.selectionBorder.beginFill(0, 0);
    this.selectionBorder.drawRoundedRect(-res.size.x/2, -res.size.y/2, res.size.x, res.size.y, 8);
    this.selectionBorder.endFill();
    this.container.addChild(this.selectionBorder);

    // Member
    this.gameObject = gameObject;
    this.resource = res;
    this.mouseIsOver = false;

    this._setupInteraction(renderer, client);
  }

  destroy() {
    this.container.destroy({ children: true });
  }

  _setupInteraction(renderer, client) {
    const table = renderer.app.stage.table;
    const cardDesc = this.resource.descriptions && this.resource.descriptions[this.gameObject.model - this.resource.id_offset];

    this.container.interactive = true;

    // Over
    this.container.on("mouseover", e => {
      this.mouseIsOver = true;
      if (renderer.selecting === null && renderer.dragging === null) {
        renderer.setCursorShape("pointer");
        if (cardDesc) {
          if (this.gameObject.side === Card.SIDE.FRONT) {
            const selected = (client.selection.indexOf(this.gameObject.id) !== -1);
            if (!selected) {
              const obsState = renderer.observationState(this.container.position);
              const unknown = obsState.insideOtherPrivateArea && !obsState.insideClientPrivateArea;
              if (!unknown) {
                const position = this.container.getGlobalPosition();
                const radius = Math.max(this.resource.size.x * this.container.scale.x, this.resource.size.y * this.container.scale.y) / 2;
                renderer.showTooltip(this.gameObject.id, cardDesc, position, radius);
              }
            }
          }
        }
      }
    });
    this.container.on("mouseout", e => {
      this.mouseIsOver = false;
      if (renderer.selecting === null && renderer.dragging === null) {
        renderer.setCursorShape("default");
        if (cardDesc) {
          renderer.hideTooltip(this.gameObject.id);
        }
      }
    });
    // Flip
    this.container.on("rightclick", e => {
      // Update selection
      const sel_index = client.selection.indexOf(this.gameObject.id);
      if (sel_index !== -1) {
        let tmp = client.selection[0];
        client.selection[0] = client.selection[sel_index];
        client.selection[sel_index] = tmp;
      } else {
        // Equivalent to client.selection = [this.gameObject.id]
        client.selection.splice(0, client.selection.length, this.gameObject.id);
      }
      const ids = client.selection.toString();
      client.sendInput(`flip ${ids}`);
      client.sendInput(`top ${ids}`);
      client.autoExecutionOnInteraction(client.selection);

      // restore selection
      if (sel_index === -1) {
        client.selection.splice(0, client.selection.length);
      }
    });
    // Drag Start
    this.container.on("mousedown", e => {
      renderer.hideTooltip(this.gameObject.id);
      if (renderer.commonInteraction(e)) {
        // event consumed by commonInteraction()
      }
      else if (e.data.button == Button.LEFT) {
        const sel_index = client.selection.indexOf(this.gameObject.id);
        if (sel_index === -1) {
          // clear selection, create one card selection
          client.selection.splice(0, client.selection.length, this.gameObject.id);
        }

        const size = this.resource.size;
        const rel = e.data.getLocalPosition(this.container);
        const pos = e.data.getLocalPosition(table);
        const dist = Math.hypot(rel.x, rel.y);

        renderer.dragging = {
          objId: this.gameObject.id,
          rotate: dist > Math.min(size.x, size.y) / 2 && client.selection.length === 1,
          prevPos: pos,
          initialLocalDist: dist,
          pivotGlobal: table.toLocal(this.container.getGlobalPosition())
        };
        
        if (!renderer.dragging.rotate)
            client.autoExecutionOnInteraction(client.selection);

        const ids = client.selection.toString();
        client.sendInput(`top ${ids}`);
        renderer.setCursorShape("grabbing");
      }
    });
    // Drag Move
    this.container.on("mousemove", e => {
      if (renderer.dragging && renderer.dragging.objId === this.gameObject.id) {
        const ids = client.selection.toString();
        const prevMousePos = renderer.dragging.prevPos.clone();
        const currMousePos = e.data.getLocalPosition(table);
        currMousePos.copyTo(renderer.dragging.prevPos);

        if (!renderer.dragging.rotate) {
          const dx = currMousePos.x - prevMousePos.x;
          const dy = currMousePos.y - prevMousePos.y;
          client.sendInput(`move ${dx},${dy} ${ids}`);
        } else {
          const xRelFrom = prevMousePos.x - renderer.dragging.pivotGlobal.x;
          const yRelFrom = prevMousePos.y - renderer.dragging.pivotGlobal.y;
          const xRelTo = currMousePos.x - renderer.dragging.pivotGlobal.x;
          const yRelTo = currMousePos.y - renderer.dragging.pivotGlobal.y;
          const distFrom = Math.hypot(xRelFrom, yRelFrom);
          const distTo = Math.hypot(xRelTo, yRelTo) / this.container.scale.x;
          // Do not push the card, only pull is allowed (and if the move has been
          // interrupted, resume it if only when we reached the initial anchor point)
          if (distTo > distFrom && distTo > renderer.dragging.initialLocalDist) {
            const dm = distTo - renderer.dragging.initialLocalDist;
            const dx = xRelTo * dm / distTo;
            const dy = yRelTo * dm / distTo;
            renderer.dragging.pivotGlobal.x += dx;
            renderer.dragging.pivotGlobal.y += dy;
            client.sendInput(`move ${dx},${dy} ${ids}`);
          }
          const angleFrom = Math.atan2(yRelFrom, xRelFrom);
          const angleTo = Math.atan2(yRelTo, xRelTo);
          const deltaAngle = (angleTo - angleFrom) * utils.DEGREES;
          client.sendInput(`rotate ${deltaAngle} ${ids}`);
        }
      }
    });
    // Drag End
    function dragEnd(e) {
      if (e.data.button == Button.LEFT) {
        renderer.dragging = null;
        // clear selection
        if (client.selection.length === 1) {
          client.selection.splice(0, client.selection.length);
        }
      }
      renderer.setCursorShape("default");
    }
    this.container.on("mouseupoutside", dragEnd.bind(this));
    this.container.on("mouseup", dragEnd.bind(this));
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
    const targetScale = obsState.insideClientPrivateArea ? 1.0 : 0.8;
    const diffScale = targetScale - currentScale;
    let newScale = targetScale;
    if (Math.abs(diffScale) > 0.01) {
      const transitionDuration = 120 /* milliseconds */;
      const scale = Math.pow(0.8, dt / transitionDuration * -Math.sign(diffScale));
      const scaleMin = Math.min(targetScale, currentScale);
      const scaleMax = Math.max(targetScale, currentScale);
      newScale = utils.clamp(currentScale * scale, scaleMin, scaleMax);
    }
    this.container.scale.set(newScale, newScale);

    // Selection border
    const selected = (client.selection.indexOf(this.gameObject.id) !== -1);
    this.selectionBorder.renderable = selected;
    if (selected) {
      const sinT = Math.sin(t * Math.PI * 2 / 2000);
      this.selectionBorder.alpha = (sinT * sinT);
    }

    // Sprite texture (side and observability)
    const unknown = obsState.insideOtherPrivateArea && ! obsState.insideClientPrivateArea;
    const isBack = (this.gameObject.side === Card.SIDE.BACK);
    this.sprite.texture = this.textures[getTextureIndex(isBack, unknown)];

    // mouseover tint
    this.sprite.tint = (this.mouseIsOver && renderer.selecting === null && !selected) ? 0xAAAAAA : 0xFFFFFF;
  }
}
