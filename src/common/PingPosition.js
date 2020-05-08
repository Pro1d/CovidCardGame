import ShortLivedObject from "./ShortLivedObject.js";

export default class PingPosition extends ShortLivedObject {
  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
  }

  syncTo(other) {
    super.syncTo(other);
  }
}
