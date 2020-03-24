import { BaseTypes, DynamicObject, Renderer } from 'lance-gg';


const SIDEAREA = { SOUTH: 0, WEST: 90, NORTH: 180, EAST: 270}; // rotation to apply to render view to orientate the table so player is at bottom.
export default class PrivateArea extends DynamicObject {
  static get netScheme() {
    return Object.assign({
      text: { type: BaseTypes.TYPES.STRING },
      side: { type: BaseTypes.TYPES.INT16 } // table side, to take a seat and adapt square table orientation
    }, super.netScheme);
  }

  static get SIDE() { return SIDEAREA; }

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

  onAddToWorld(gameEngine) {
    if (Renderer)
      Renderer.getInstance().addPrivateArea(this);
  }
}
