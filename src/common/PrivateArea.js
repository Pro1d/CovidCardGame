import { BaseTypes, DynamicObject } from "lance-gg";

const VISIBILITY = { USER: 0x1, OTHER: 0x2, ALL: 0x3, NOBODY: 0x0 };
const HEIGHT = 180;
// rotation to apply to render view to orientate the table so player is at bottom.
const SIDEAREA = { SOUTH: 0, WEST: 90, NORTH: 180, EAST: 270 };
export default class PrivateArea extends DynamicObject {
  static get netScheme() {
    return Object.assign(
      {
        text: { type: BaseTypes.TYPES.STRING },
        side: { type: BaseTypes.TYPES.FLOAT32 },
        // shape
        baseLeftWidth: { type: BaseTypes.TYPES.FLOAT32 },
        baseRightWidth: { type: BaseTypes.TYPES.FLOAT32 },
        topLeftWidth: { type: BaseTypes.TYPES.FLOAT32 },
        topRightWidth: { type: BaseTypes.TYPES.FLOAT32 },
      },
      super.netScheme
    );
  }

  static get SIDE() {
    return SIDEAREA;
  }

  static get DefaultHeight() {
    return HEIGHT;
  }

  static get Visibility() {
    return VISIBILITY;
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.side = SIDEAREA.SOUTH;
    this.text = "???";
  }

  syncTo(other) {
    super.syncTo(other);
    this.text = other.text ? other.text : "";
    this.side = other.side;
    this.baseLeftWidth = other.baseLeftWidth;
    this.baseRightWidth = other.baseRightWidth;
    this.topLeftWidth = other.topLeftWidth;
    this.topRightWidth = other.topRightWidth;
  }
}
