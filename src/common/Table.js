import { BaseTypes, DynamicObject } from "lance-gg";
import * as _ from "lodash";

export default class Table extends DynamicObject {
  static get netScheme() {
    return Object.assign(
      {
        // number of sides of the N-gon
        ngon: { type: BaseTypes.TYPES.UINT8 },
        // inner radius
        radius: { type: BaseTypes.TYPES.FLOAT32 },
        // seats as a bit mask
        seats: { type: BaseTypes.TYPES.INT32 },
        // boolean
        expandArea: { type: BaseTypes.TYPES.UINT8 },
        // PrivateArea.Visibility
        areaVisibility: { type: BaseTypes.TYPES.UINT8 },
        // to be incremented on update to notify the clients
        updateId: { type: BaseTypes.TYPES.INT32 },
      },
      super.netScheme
    );
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
    this.expandArea = other.expandArea;
    this.areaVisibility = other.areaVisibility;
    this.updateId = other.updateId;
  }

  static seatsToFlag(seats) {
    return Array.from(seats).reduce((i, c) => (i << 1) | (c === "o"), 0);
  }

  static seatsToString(seats) {
    let str = "";
    while (seats > 0) {
      str = ".o"[seats & 1] + str;
      seats >>= 1;
    }
    return str;
  }

  static getSeatsCount(seats) {
    if (typeof seats !== "string") seats = Table.seatsToString(seats);
    return _.countBy(seats)["o"];
  }

  get angleStepRad() {
    return (2 * Math.PI) / this.ngon;
  }

  get angleStepDeg() {
    return 360 / this.ngon;
  }

  get outerRadius() {
    return this.radius / Math.cos(this.angleStepRad / 2);
  }

  get innerRadius() {
    return this.radius;
  }

  get sideLength() {
    return Math.tan(this.angleStepRad / 2) * this.innerRadius * 2;
  }

  forEachPie(f) {
    const angleStep = this.angleStepRad;
    for (let i = 0; i < this.ngon; i++) {
      const a = angleStep * i;
      const vec = { x: -Math.sin(a), y: Math.cos(a) };
      if (f(vec, a, i)) break;
    }
  }

  onAddToWorld(gameEngine) {
    gameEngine.table = this;
  }
}
