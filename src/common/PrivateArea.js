import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';

const VISIBILITY = { USER: 0x1, OTHER: 0x2, ALL: 0x3, NOBODY: 0x0 };
const HEIGHT = 180;
const SIDEAREA = { SOUTH: 0, WEST: 90, NORTH: 180, EAST: 270}; // rotation to apply to render view to orientate the table so player is at bottom.
export default class PrivateArea extends DynamicObject {
  static get netScheme() {
    return Object.assign({
      text: { type: BaseTypes.TYPES.STRING },
      side: { type: BaseTypes.TYPES.INT16 } // table side, to take a seat and adapt square table orientation
    }, super.netScheme);
  }

  static get SIDE() { return SIDEAREA; }
  static get DefaultHeight() { return HEIGHT; }
  static get Visibility() { return VISIBILITY; }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.side = SIDEAREA.SOUTH;
    this.text = "???";
  }

  syncTo(other) {
    super.syncTo(other);
    this.text = other.text ? other.text : "";
    this.side = other.side;
  }
}
