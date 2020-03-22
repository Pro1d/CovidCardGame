import { ClientEngine, KeyboardControls } from 'lance-gg';
import CovidRenderer from '../client/CovidRenderer';
import Card from '../common/Card';
let game = null;
export default class CovidClientEngine extends ClientEngine {

  constructor(gameEngine, options) {
    super(gameEngine, options, CovidRenderer);
    game = gameEngine;
  }

  start() {
    document.addEventListener("keydown", (e) => {
      let ids = this.renderer.selection;
      if (e.key === "m") {
        if (ids.length > 1)
          this.sendInput("randomize " + ids.toString());
      } else if (e.key === "a" && (event.ctrlKey || event.metaKey)) {
        e.preventDefault();
        let sel = [];
        let cards = game.world.queryObjects({ instanceType: Card });
        cards.forEach((c) => { sel.push(c.id); });
        this.renderer.selection = sel;
      } else if (e.key === "g") {
        if (ids.length > 1)
          this.sendInput("gather " + ids.toString());
      }
    });
    return super.start();
  }

  get autoAlignCardOnInteractionEnabled() {
    return true;
  }
  
}
