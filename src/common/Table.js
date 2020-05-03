import { BaseTypes, DynamicObject } from 'lance-gg';

export default class Table extends DynamicObject {
  static get netScheme() {
    return Object.assign({
      ngon: { type: BaseTypes.TYPES.UINT8 }, // number of sides of the N-gon
      radius: { type: BaseTypes.TYPES.FLOAT32 },
      seats: { type: BaseTypes.TYPES.INT32 },
      updateId: { type: BaseTypes.TYPES.INT32 }
    }, super.netScheme);
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.updateId = 0;
  }

  syncTo(other) {
    super.syncTo(other);
    this.ngon = other.ngon;
    this.radius = other.radius;
    this.seats = other.seats;
    this.updateId = other.updateId;
  }

  static seatsToFlag(seats) {
    return Array.from(seats).reduce((i, c) => (i<<1)|(c==='o'), 0);
  }

  onAddToWorld(gameEngine) {
    gameEngine.table = this;
  }
}
