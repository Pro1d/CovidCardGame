import { ServerEngine, TwoVector } from 'lance-gg';
import Card from '../common/Card';
import Item from '../common/Item';
import PrivateArea from '../common/PrivateArea';
import Catalog from '../data/Catalog';
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
    const gameSet = Catalog.games[this.gameEngine.game].ids;

    // add card object to world, random order, random position
    let ordering = utils.shuffle(utils.sequence(gameSet.length));
    for (let i = 0; i < gameSet.length; i++) {
      const res = Catalog.getResourceByModelId(gameSet[i]);
      let obj;
      if (res.type === "card") {
        obj = new Card(this.gameEngine);
        obj.side = Math.random() < 0.5 ? Card.SIDE.BACK : Card.SIDE.FRONT;
        obj.angle = Math.random() * 360;
      }
      else if (res.type === "item") {
        obj = new Item(this.gameEngine);
        obj.angle = 0;
      }
      else {
        console.warning(`Unknown resource type "${res.type}"`);
      }

      if (obj) {
        if (gameSet[i] - res.id_offset >= res.count) {
          console.warning(`Invalid id ${gameSet[i]}`);
          continue;
        }
        obj.model = gameSet[i];
        obj.order = ordering[i];
        const margin = this.gameEngine.tableSize.x * 0.2
        obj.position.x = (Math.random() - 0.5) * (this.gameEngine.tableSize.x - margin);
        obj.position.y = (Math.random() - 0.5) * (this.gameEngine.tableSize.y - margin);
        this.gameEngine.addObjectToWorld(obj);
      }
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

