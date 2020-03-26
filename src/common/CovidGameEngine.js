import { GameEngine, BaseTypes, DynamicObject, SimplePhysicsEngine, TwoVector } from 'lance-gg';
import Card from './Card';
import PrivateArea from './PrivateArea';

// /////////////////////////////////////////////////////////
//
// GAME ENGINE
//
// /////////////////////////////////////////////////////////
export default class CovidGameEngine extends GameEngine {

  constructor(options) {
    super(options);
    //this.physicsEngine = new SimplePhysicsEngine({ gameEngine: this, collisions: { autoResolve: false }});

    // common code
    this.on('postStep', this.gameLogic.bind(this));

    const size = 900;
    Object.assign(this, {
      tableSize: new TwoVector(size, size),
      tableHalf: new TwoVector(size / 2, size / 2),
      setOfCards: [0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9]
    });
  }

  registerClasses(serializer) {
    serializer.registerClass(Card);
    serializer.registerClass(PrivateArea);
  }

  gameLogic() {
    // Called every postStep
    // Nothing to do???
  }

  forEachValidCard(ids, functor) {
    ids.forEach((id) => {
      const cardObj = this.world.queryObject({id : id, instanceType: Card});
      if (cardObj)
        functor(cardObj);
    });
  }

  getIds(commaSeparatedId) {
    let ids = [];
    commaSeparatedId.split(",").forEach((idStr) => { ids.push(parseInt(idStr)); });
    return ids;
  }

  processInput(inputData, playerId, isServer) {
    super.processInput(inputData, playerId);

    let input = inputData.input.split(" ");
    if (isServer) console.log(input);

    const action = input.shift();
    if (action === "flip") {
      // flip the cards that have the same side visible as the first id
      let sideToFlip = null;
      this.forEachValidCard(this.getIds(input.shift()), (cardObj) => {
        if (sideToFlip === null) {
          sideToFlip = cardObj.side;
        }
        if (cardObj.side === sideToFlip)
          cardObj.flip();
      });
    } else if (action === "top") {
      let ids = this.getIds(input.shift());
      this.moveToTop(ids);
    } else if (action === "move") {
      const delta = input.shift().split(",");
      const dx = parseFloat(delta[0]);
      const dy = parseFloat(delta[1]);
      this.forEachValidCard(this.getIds(input.shift()), (cardObj) => {
        const px = cardObj.position.x + dx;
        const py = cardObj.position.y + dy;
        cardObj.position.x = Math.min(Math.max(px, 1-this.tableHalf.x), this.tableHalf.x-2);
        cardObj.position.y = Math.min(Math.max(py, 1-this.tableHalf.y), this.tableHalf.y-2);
      });
    } else if (action === "orientation") {
      if (isServer) {
        const angle = parseFloat(input.shift());
        this.forEachValidCard(this.getIds(input.shift()), (cardObj) => {
          cardObj.angle = angle;
        });
      }
    } else if (action == "rotate") {
      const deltaAngle = parseFloat(input.shift());
      this.forEachValidCard(this.getIds(input.shift()), (cardObj) => {
        if (deltaAngle < 0)
          cardObj.turnLeft(-deltaAngle);
        else
          cardObj.turnRight(deltaAngle);
      });
    } else if (action == "randomize") {
      let ids = this.getIds(input.shift());
      this.emit("executeCommand", {cmd:"randomize", ids: ids});
    } else if (action == "gather") {
      if (isServer) {
        let xmin = this.tableHalf.x, xmax = -this.tableHalf.x;
        let ymin = this.tableHalf.y, ymax = -this.tableHalf.y;
        let angle = parseFloat(input.shift());
        let ids = this.getIds(input.shift());
        this.forEachValidCard(ids, (cardObj) => {
          xmin = Math.min(cardObj.position.x, xmin);
          ymin = Math.min(cardObj.position.y, ymin);
          xmax = Math.max(cardObj.position.x, xmax);
          ymax = Math.max(cardObj.position.y, ymax);
        });
        let x = (xmin + xmax) / 2;
        let y = (ymin + ymax) / 2;
        this.forEachValidCard(ids, (cardObj) => {
          cardObj.position.x = x;
          cardObj.position.y = y;
          cardObj.angle = angle;
        });
      }
    } else if (action === "change_name") {
      if (isServer) {
        const id = parseInt(input.shift());
        const area = this.world.queryObject({ instanceType: PrivateArea, id: id});
        if (area) {
          area.text = input.join(' ');
        }
      }
    }
    //  inputData.rearrange
    //   gather(or spread)?+set orientation
    //  inputData.zoom
    //   zoom card

  }

  moveToTop(ids) {
    const orderToUpdate = [];
    this.forEachValidCard(ids, (cardObj) => {
      orderToUpdate.push(cardObj.order);
    });
    let cards = this.world.queryObjects({ instanceType: Card });
    cards.forEach((cardObj) => {
      let count = 0; // number of card to update that has a greater order value.
      let found = false;
      orderToUpdate.forEach((otu) => {
        if (cardObj.order > otu) {
          ++count;
        } else if (cardObj.order === otu) {
          found = true;
        }
      });
      if (found) {
        cardObj.order = (cards.length - orderToUpdate.length) + count;
      } else {
        cardObj.order -= count;
      }
    });
  }
}
