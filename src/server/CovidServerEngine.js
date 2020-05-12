import { ServerEngine } from "lance-gg";
import BoardGame from "../common/BoardGame";
import Card from "../common/Card";
import Dice from "../common/Dice";
import Item from "../common/Item";
import PrivateArea from "../common/PrivateArea";
import Table from "../common/Table";
import Catalog from "../data/Catalog";
import * as utils from "../common/utils.js";

export default class CovidServerEngine extends ServerEngine {
  constructor(io, gameEngine, inputOptions) {
    super(io, gameEngine, inputOptions);
    gameEngine.on("server_execute_command", this.executeCommand.bind(this));
    this.currentGameSetObjects = [];
    this.currentSeatObjects = [];
  }

  executeCommand(cmd) {
    console.info(cmd);
    // cmd.cmd === ""; cmd.data as Map
    switch (cmd.cmd) {
      case "change_game":
        if (this.gameEngine.game !== cmd.data.name) {
          this.removeCurrentGameSet();
          this.gameEngine.game = cmd.data.name;
          this.loadNewGameSet();
        }
        break;
      case "change_table":
        this.gameEngine.table.areaVisibility = cmd.data.areaVisibility;
        if (
          this.gameEngine.table.seats !== Table.seatsToFlag(cmd.data.seats) ||
          this.gameEngine.table.radius !== cmd.data.radius ||
          this.gameEngine.table.expandArea !== cmd.data.expandArea
        ) {
          this.updateTableSeats(cmd.data.seats, cmd.data.radius, cmd.data.expandArea);
        }
        break;
    }
  }

  start() {
    super.start();

    const gameEngine = this.gameEngine;
    this.table = new Table(gameEngine, null, {});
    this.table.areaVisibility = PrivateArea.Visibility.USER;
    this.table = gameEngine.addObjectToWorld(this.table);
    this.updateTableSeats("oooo", 500.0, false);

    this.gameboard = new BoardGame(gameEngine, null, {});
    this.gameboard = gameEngine.addObjectToWorld(this.gameboard);
    this.loadNewGameSet();
  }

  removeCurrentGameSet() {
    for (let id of this.currentGameSetObjects) {
      this.gameEngine.removeObjectFromWorld(id);
    }
    this.currentGameSetObjects.splice(0, this.currentGameSetObjects.length);
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
      } else if (res.type === "item") {
        obj = new Item(this.gameEngine);
        obj.angle = 0;
      } else if (res.type === "dice") {
        obj = new Dice(this.gameEngine);
        obj.angle = Math.random() * 360;
        obj.value = utils.randInt(0, res.values);
      } else {
        console.warn(`Unknown resource type "${res.type}"`);
      }

      if (obj) {
        if (gameSet[i] - res.idOffset >= res.count) {
          console.warn(`Invalid id ${gameSet[i]}`);
          continue;
        }
        obj.model = gameSet[i];
        obj.order = ordering[i];
        const rdmDist = Math.random() * (this.gameEngine.table.radius - 180);
        const rdmAngle = Math.random() * 2 * Math.PI;
        obj.position.x = Math.cos(rdmAngle) * rdmDist;
        obj.position.y = Math.sin(rdmAngle) * rdmDist;
        const finaleObj = this.gameEngine.addObjectToWorld(obj);
        this.currentGameSetObjects.push(finaleObj);
      }
    }
  }

  updateTableSeats(seats, radius, expandArea) {
    this.gameEngine.table.seats = Table.seatsToFlag(seats);
    this.gameEngine.table.ngon = seats.length;
    this.gameEngine.table.radius = radius;
    this.gameEngine.table.expandArea = expandArea;
    this.gameEngine.table.updateId++;
    this.currentGameSetObjects.forEach((obj) => this.gameEngine.fitPositionInTable(obj.position));

    const N = seats.length;
    const angleStep = this.gameEngine.table.angleStepRad;
    const innerRadius = this.gameEngine.table.innerRadius;
    const sideLength = this.gameEngine.table.sideLength;
    const margin = 6;
    let seatId = 0;
    this.gameEngine.table.forEachPie((pie, rad, i) => {
      if (seats[i] === "o") {
        let obj;
        if (seatId < this.currentSeatObjects.length) {
          obj = this.currentSeatObjects[seatId];
        } else {
          obj = this.gameEngine.addObjectToWorld(new PrivateArea(this.gameEngine));
          obj.text = "Place libre";
          obj.height = 180;
          this.currentSeatObjects.push(obj);
        }
        const deg = rad * utils.DEGREES;
        obj.side = deg;
        obj.angle = (deg + 180) % 360;
        obj.position.x = pie.x * innerRadius;
        obj.position.y = pie.y * innerRadius;
        obj.width = (Math.tan(angleStep / 2) * (innerRadius - obj.height) - margin) * 2;
        const expandLeft = seats[(i + N - 1) % N] !== "o";
        const expandRight = seats[(i + 1) % N] !== "o";
        const overExpand = obj.height / Math.tan(angleStep);
        obj.baseLeftWidth = expandArea ? sideLength / 2 - margin * (1 + expandLeft) : obj.width / 2;
        obj.baseRightWidth = expandArea
          ? sideLength / 2 - margin * (1 + expandRight)
          : obj.width / 2;
        obj.topLeftWidth =
          expandArea && expandLeft ? sideLength / 2 - margin * 2 + overExpand : obj.width / 2;
        obj.topRightWidth =
          expandArea && expandRight ? sideLength / 2 - margin * 2 + overExpand : obj.width / 2;
        seatId++;
      }
    });
    while (this.currentSeatObjects.length > seatId) {
      this.gameEngine.removeObjectFromWorld(this.currentSeatObjects.pop());
    }
  }
}
