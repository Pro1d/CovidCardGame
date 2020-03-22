import { ServerEngine, TwoVector } from 'lance-gg';
import Card from '../common/Card';

// cards set definition
let SetOfCards = [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9];

export default class CovidServerEngine extends ServerEngine {
  constructor(io, gameEngine, inputOptions) {
    super(io, gameEngine, inputOptions);
    gameEngine.on('executeCommand', this.executeCommand.bind(this));
  }

  executeCommand(cmd) {
    if (cmd.cmd === "randomize") {
      this.gameEngine.moveToTop(cmd.ids);
      this.randomizeSubSetOrder(cmd.ids);
    }
  }

  start() {
    super.start();

    // add card object to world, random order, random position
    let ordering = Array.apply(null, SetOfCards).map(Function.call, Number);
    for (let i = 0; i < SetOfCards.length; i++) {
      let pick_index = Math.trunc(Math.random() * (SetOfCards.length - i)) + i;
      let order = ordering[pick_index];
      ordering[pick_index] = ordering[i];
      let card = new Card(this.gameEngine, null, { position: new TwoVector(0, 0) });
      card.model = SetOfCards[i];
      card.side = Card.SIDE.BACK;
      card.order = order;
      const margin = Card.HEIGHT / 1.41;
      card.position.x = Math.random() * (800 - margin * 2) + margin;
      card.position.y = Math.random() * (800 - margin * 2) + margin;
      card.angle = Math.random() * 360;

      this.gameEngine.addObjectToWorld(card);
    }
  }

  // The ids to randomized must have been moveToTop before calling this method
  randomizeSubSetOrder(ids) {
    let orderToRandomize = [];
    this.gameEngine.forEachValidCard(ids, (c) => { orderToRandomize.push(c.order); });
    this.gameEngine.forEachValidCard(ids, (c) => {
      let pick_index = Math.trunc(Math.random() * orderToRandomize.length);
      c.order = orderToRandomize[pick_index];
      orderToRandomize[pick_index] = orderToRandomize[0];
      orderToRandomize.shift();
    });
  }

  onPlayerConnected(socket) {
    super.onPlayerConnected(socket);
    console.log("player joined: "+socket.playerId);
  }

  onPlayerDisconnected(socketId, playerId) {
    super.onPlayerDisconnected(socketId, playerId);
    console.log("player left: "+playerId);
  }
};

