import { BaseTypes, DynamicObject } from "lance-gg";

export default class Dice extends DynamicObject {
  static get netScheme() {
    return Object.assign(
      {
        order: { type: BaseTypes.TYPES.INT32 },
        model: { type: BaseTypes.TYPES.INT32 },
        value: { type: BaseTypes.TYPES.INT32 },
        rollId: { type: BaseTypes.TYPES.INT32 },
      },
      super.netScheme
    );
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.value = 0;
    this.rollId = 0;
  }

  syncTo(other) {
    super.syncTo(other);
    this.order = other.order;
    this.model = other.model;
    this.value = other.value;
    this.rollId = other.rollId;
  }
}
