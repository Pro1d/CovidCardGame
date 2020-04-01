import { ServerEngine, TwoVector } from 'lance-gg';
import Card from '../common/Card';
import PrivateArea from '../common/PrivateArea';

export default class CovidServerEngine extends ServerEngine {
  constructor(io, gameEngine, inputOptions) {
    super(io, gameEngine, inputOptions);
    gameEngine.on('executeCommand', this.executeCommand.bind(this));
  }

  executeCommand(cmd) {
    if (cmd.cmd === "randomize") {
      this.gameEngine.randomizeSubSetOrder(cmd.ids, true);
    }
  }

  start() {
    super.start();
    const setOfCards = this.gameEngine.setOfCards;

    // add card object to world, random order, random position
    let ordering = Array.apply(null, setOfCards).map(Function.call, Number);
    for (let i = 0; i < setOfCards.length; i++) {
      let pick_index = Math.trunc(Math.random() * (setOfCards.length - i)) + i;
      let order = ordering[pick_index];
      ordering[pick_index] = ordering[i];
      let card = new Card(this.gameEngine);
      card.model = setOfCards[i];
      card.side = Math.random() < 0.5 ? Card.SIDE.BACK : Card.SIDE.FRONT;
      card.order = order;
      const margin = Card.HEIGHT / 1.41;
      card.position.x = (Math.random() - 0.5) * (this.gameEngine.tableSize.x - margin * 2);
      card.position.y = (Math.random() - 0.5) * (this.gameEngine.tableSize.y - margin * 2);
      card.angle = Math.random() * 360;

      this.gameEngine.addObjectToWorld(card);
    }

    // Create Player private area
    const gameEngine = this.gameEngine;
    [PrivateArea.SIDE.SOUTH, PrivateArea.SIDE.WEST, PrivateArea.SIDE.NORTH, PrivateArea.SIDE.EAST].forEach((side) => {
      let pa = new PrivateArea(gameEngine, null, {});
      let x = -Math.sin(Math.PI/180 * side);
      let y = Math.cos(Math.PI/180 * side);
      pa.text = "Place libre";
      pa.side = side;
      pa.position.set(x * gameEngine.tableHalf.x, y * gameEngine.tableHalf.y);
      pa.width = 500;
      pa.height = 180;
      pa.angle = (side + 180) % 360;
      gameEngine.addObjectToWorld(pa);
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

