import { DynamicObject, BaseTypes } from "lance-gg";

export default class Item extends DynamicObject {
  static get netScheme() {
    return Object.assign({
      model: { type: BaseTypes.TYPES.INT32 },
      order: { type: BaseTypes.TYPES.INT32 },
    }, super.netScheme);
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
  }

  syncTo(other) {
    super.syncTo(other);
    this.model = other.model;
    this.order = other.order;
  }
}
