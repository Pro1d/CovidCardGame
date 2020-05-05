import { BaseTypes, DynamicObject } from 'lance-gg';


export default class Table extends DynamicObject {
  static get netScheme() {
    return Object.assign({
      ngon: { type: BaseTypes.TYPES.UINT8 }, // number of sides of the N-gon
      radius: { type: BaseTypes.TYPES.FLOAT32 }, // inner radius
      seats: { type: BaseTypes.TYPES.INT32 }, // seats as a bit mask
      expand_area: { type: BaseTypes.TYPES.UINT8 }, // boolean
      area_visibility: { type: BaseTypes.TYPES.UINT8 }, // PrivateArea.Visibility
      updateId: { type: BaseTypes.TYPES.INT32 } // to be incremented on update to notify the clients
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
    this.expand_area = other.expand_area;
    this.area_visibility = other.area_visibility;
    this.updateId = other.updateId;
  }

  static seatsToFlag(seats) {
    return Array.from(seats).reduce((i, c) => (i<<1)|(c==='o'), 0);
  }

  static seatsToString(seats) {
    let str = "";
    while(seats > 0) {
      str = ".o"[seats&1] + str;
      seats >>= 1;
    }
    return str;
  }

  onAddToWorld(gameEngine) {
    gameEngine.table = this;
  }
}
