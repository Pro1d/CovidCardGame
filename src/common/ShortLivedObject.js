import { DynamicObject } from "lance-gg";

export default class ShortLivedObject extends DynamicObject {
  static get netScheme() {
    return Object.assign({}, super.netScheme);
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
  }
}
