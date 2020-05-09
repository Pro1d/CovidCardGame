import { DynamicObject, BaseTypes } from "lance-gg";

const SIDE = { FRONT: 0, BACK: 1 };
export default class Card extends DynamicObject {
  static get netScheme() {
    return Object.assign(
      {
        model: { type: BaseTypes.TYPES.INT32 }, // -1: unknown, 0+:card model
        side: { type: BaseTypes.TYPES.INT8 }, // SIDE.FRONT, SIDE.BACK
        order: { type: BaseTypes.TYPES.INT32 }, // display ordering
      },
      super.netScheme
    );
  }

  static get SIDE() {
    return SIDE;
  }

  flip() {
    this.side = this.side === SIDE.FRONT ? SIDE.BACK : SIDE.FRONT;
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

  // debug
  toString() {
    return `${super.toString()} model=${this.model} side=${this.side} order=${this.order}`;
  }
}
