import { ServerEngine, TwoVector } from 'lance-gg';
import Card from '../common/Card';
import PrivateArea from '../common/PrivateArea';
import * as utils from '../common/utils.js'

export default class CovidServerEngine extends ServerEngine {
  constructor(io, gameEngine, inputOptions) {
    super(io, gameEngine, inputOptions);
    gameEngine.on('execute_command', this.executeCommand.bind(this));
  }

  executeCommand(cmd) {
    // cmd.cmd === ""; cmd.data as Map
  }

  start() {
    super.start();
    const setOfCards = this.gameEngine.catalog.games[this.gameEngine.game].ids;

    // add card object to world, random order, random position
    let ordering = utils.shuffle(utils.sequence(setOfCards.length));
    for (let i = 0; i < setOfCards.length; i++) {
      let card = new Card(this.gameEngine);
      card.model = setOfCards[i];
      card.side = Math.random() < 0.5 ? Card.SIDE.BACK : Card.SIDE.FRONT;
      card.order = ordering[i];
      const size = this.gameEngine.getCardRes(card.model).size;
      const margin = Math.hypot(size.x, size.y);
      card.position.x = (Math.random() - 0.5) * (this.gameEngine.tableSize.x - margin);
      card.position.y = (Math.random() - 0.5) * (this.gameEngine.tableSize.y - margin);
      card.angle = Math.random() * 360;

      this.gameEngine.addObjectToWorld(card);
    }

    // Create Player private area
    const gameEngine = this.gameEngine;
    [PrivateArea.SIDE.SOUTH, PrivateArea.SIDE.WEST, PrivateArea.SIDE.NORTH, PrivateArea.SIDE.EAST].forEach((side) => {
      let pa = new PrivateArea(gameEngine, null, {});
      let x = -Math.sin(utils.RADIANS * side);
      let y = Math.cos(utils.RADIANS * side);
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

