import { ServerEngine, TwoVector } from 'lance-gg';
import BoardGame from '../common/BoardGame';
import Card from '../common/Card';
import Item from '../common/Item';
import PrivateArea from '../common/PrivateArea';
import Catalog from '../data/Catalog';
import * as utils from '../common/utils.js'

export default class CovidServerEngine extends ServerEngine {
  constructor(io, gameEngine, inputOptions) {
    super(io, gameEngine, inputOptions);
    gameEngine.on('server_execute_command', this.executeCommand.bind(this));
    this.currentGameSetObjId = [];
  }

  executeCommand(cmd) {
    console.log(cmd);
    // cmd.cmd === ""; cmd.data as Map
    switch (cmd.cmd) {
      case "change_game":
        this.removeCurrentGameSet();
        this.gameEngine.game = cmd.data.name;
        this.loadNewGameSet();
        break;
    }
  }

  start() {
    super.start();

    const gameEngine = this.gameEngine;

    this.gameboard = new BoardGame(gameEngine, null, {});
    this.gameboard = gameEngine.addObjectToWorld(this.gameboard);
    this.loadNewGameSet();

    // Create Player private area
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

  removeCurrentGameSet() {
    for (let id of this.currentGameSetObjId) {
      this.gameEngine.removeObjectFromWorld(id);
    }
    this.currentGameSetObjId.splice(0, this.currentGameSetObjId.length);
  }

  loadNewGameSet() {
    this.gameboard.game = this.gameEngine.game;
    this.gameboard.updateId++;
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
        console.warn(`Unknown resource type "${res.type}"`);
      }

      if (obj) {
        if (gameSet[i] - res.id_offset >= res.count) {
          console.warn(`Invalid id ${gameSet[i]}`);
          continue;
        }
        obj.model = gameSet[i];
        obj.order = ordering[i];
        const margin = this.gameEngine.tableSize.x * 0.2
        obj.position.x = (Math.random() - 0.5) * (this.gameEngine.tableSize.x - margin);
        obj.position.y = (Math.random() - 0.5) * (this.gameEngine.tableSize.y - margin);
        const finaleObj = this.gameEngine.addObjectToWorld(obj);
        this.currentGameSetObjId.push(finaleObj.id);
      }
    }
  }
};

