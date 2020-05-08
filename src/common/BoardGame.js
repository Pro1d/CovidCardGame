import { BaseTypes, DynamicObject } from "lance-gg";

export default class BoardGame extends DynamicObject {
  static get netScheme() {
    return Object.assign({
      game: { type: BaseTypes.TYPES.STRING },
      updateId: { type: BaseTypes.TYPES.INT32 },
    }, super.netScheme);
  }

  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
    this.updateId = 0;
  }

  syncTo(other) {
    super.syncTo(other);
    this.game = other.game;
    this.updateId = other.updateId;
  }

  onAddToWorld(gameEngine) {
    gameEngine.boardgame = this;
  }
}
