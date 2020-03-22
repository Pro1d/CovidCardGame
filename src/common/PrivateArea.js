import { BaseTypes } from 'lance-gg';

export default class PrivateArea extends Object {
  static get netScheme() {
    return Object.assign({
      // properties to sync
    }, super.netScheme);
  }
  constructor(gameEngine, options, props) {
    super(gameEngine, options, props);
  }

  syncTo(other) {
    super.syncTo(other);
    // this.prop = other.prop;
  }
}
