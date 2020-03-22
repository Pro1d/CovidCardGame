import { DynamicObject, BaseTypes, Renderer } from 'lance-gg';

const SIDE = { FRONT: 0, BACK: 1 }
const WIDTH = 120;
const HEIGHT = 180;
export default class Card extends DynamicObject {

  static get netScheme() {
    return Object.assign({
      model: { type: BaseTypes.TYPES.INT32 }, // -1: unknown, 0+:card model
      side: { type: BaseTypes.TYPES.INT8 }, // SIDE.FRONT, SIDE.BACK
      order: { type: BaseTypes.TYPES.INT32 } // display ordering
    }, super.netScheme);
  }

  static get WIDTH() { return WIDTH; }
  static get HEIGHT() { return HEIGHT; }
  static get SIDE() { return SIDE; }

  flip() {
    this.side = (this.side === SIDE.FRONT ? SIDE.BACK : SIDE.FRONT);
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.side = SIDE.FRONT;
  }

  syncTo(other) {
    super.syncTo(other);
    this.model = other.model;
    this.side = other.side;
    this.order = other.order;
  }

  // avoid gradual synchronization of velocity
  //get bending() {
  //  return {
  //    velocity: { percent: 0.0 },
  //    position: { percent: 1.0, min : 5}
  //  };
  //}

  // debug
  toString() {
    return `${super.toString()} model=${this.model} side=${this.side} order=${this.order}`;
  }

  onAddToWorld(gameEngine) {
    if (Renderer)
      Renderer.getInstance().addCard(this);
  }

  onRemoveFromWorld(gameEngine) {
    if (Renderer)
      Renderer.getInstance().removeCard(this);
  }
}

