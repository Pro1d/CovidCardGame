import { GameEngine, BaseTypes, DynamicObject, SimplePhysicsEngine, TwoVector } from 'lance-gg';
import Card from './Card';
import PrivateArea from './PrivateArea';
import PingPosition from './PingPosition';
import ShuffleFx from './ShuffleFx';
import * as utils from './utils.js'

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
    serializer.registerClass(PingPosition);
    serializer.registerClass(ShuffleFx);
  }

  gameLogic() {
    // Called every postStep
    // Nothing to do???
  }

  forEachValidCard(ids, functor) {
    this.getValidCards(ids).forEach(functor);
  }

  getValidCards(ids) {
    return Array.from(ids, i => this.world.queryObject({id : i, instanceType: Card})).filter(x=>x);
  }

  processInput(inputData, playerId, isServer) {
    super.processInput(inputData, playerId);

    const input = inputData.input.split(" ");
    if (isServer) console.log(input);

    const action = input.shift();
    if (action === "flip") {
      // flip the cards that have the same side visible as the first id
      let sideToFlip = null;
      const ids = utils.parseIntArray(input.shift());
      const cards = this.getValidCards(ids);
      cards.forEach((cardObj) => {
        if (sideToFlip === null) {
          sideToFlip = cardObj.side;
        }
        if (cardObj.side === sideToFlip)
          cardObj.flip();
      });
    } else if (action === "top") {
      const ids = utils.parseIntArray(input.shift());
      const cards = this.getValidCards(ids);
      this.moveToTop(cards);
    } else if (action === "move") {
      const delta = utils.parseFloatArray(input.shift());
      const ids = utils.parseIntArray(input.shift());
      const cards = this.getValidCards(ids);
      cards.forEach((cardObj) => {
        cardObj.position.x += delta[0];
        cardObj.position.y += delta[1];
        this.fitPositionInTable(cardObj.position);
      });
    } else if (action == "rotate") {
      const deltaAngle = parseFloat(input.shift());
      const ids = utils.parseIntArray(input.shift());
      const cards = this.getValidCards(ids);
      cards.forEach((cardObj) => {
        if (deltaAngle < 0)
          cardObj.turnLeft(-deltaAngle);
        else
          cardObj.turnRight(deltaAngle);
      });
    } else if (action === "orientation") {
      if (isServer) {
        const angle = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const cards = this.getValidCards(ids);
        cards.forEach((cardObj) => { cardObj.angle = angle; });
      }
    } else if (action == "sort") {
      if (isServer) {
        const ids = utils.parseIntArray(input.shift());
        const cards = this.getValidCards(ids);
        this.sortSubSet(cards, true);
      }
    } else if (action == "randomize") {
      if (isServer) {
        const ids = utils.parseIntArray(input.shift());
        this.randomizeSubSetOrder(ids, true);
      }
    } else if (action == "gather") {
      if (isServer) {
        const angle = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const cards = this.getValidCards(ids);
        const center = this.computeAABBCenter(cards);
        cards.forEach((cardObj) => {
          cardObj.position.copy(center);
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
    } else if (action === "align") {
      if (isServer) {
        const orientation = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const cards = this.getValidCards(ids);

        const radians = (orientation + 90) * utils.RADIANS;
        const step = new TwoVector(Math.sin(radians), -Math.cos(radians));
        const step_length = Card.WIDTH * 0.3;
        const pos = this.computeAABBCenter(cards);

        this.align(cards, orientation, step, step_length, pos);
      }
    } else if (action === "valign") {
      if (isServer) {
        const orientation = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const cards = this.getValidCards(ids);

        const radians = (orientation + 180) * utils.RADIANS;
        const step = new TwoVector(Math.sin(radians), -Math.cos(radians));
        const step_length = Card.WIDTH * 0.3;
        const pos = this.computeAABBCenter(cards);

        this.align(cards, orientation, step, step_length, pos);
      }
    } else if (action === "ping_position") {
      if (isServer) {
        const position = utils.parseFloatArray(input.shift());
        this.server_addShortLivedObject(PingPosition, position[0], position[1]);
      }
    }
  }

  align(cards, orientation, align_direction, step_length, center) {
    const orderConflictRemap = cards.reduce((map, obj) => map.set(obj.id, obj.order), new Map());
    const step = align_direction.clone();
    cards.sort((a, b) => {
      const diff = utils.dot(a.position, step) - utils.dot(b.position, step);
      return (Math.abs(diff) < Card.WIDTH * 0.05) ? orderConflictRemap.get(a.id) - orderConflictRemap.get(b.id) : diff;
    });
    step.multiplyScalar(step_length);
    // Position of the next card to align
    const pos = center || this.computeAABBCenter(cards);
    pos.subtract(step.clone().multiplyScalar((cards.length - 1) / 2));
    // Re-assign order
    const order = Array.from(cards, x=>x.order).sort((a,b)=>(a-b));
    cards.forEach((cardObj) => {
      cardObj.position.copy(pos);
      this.fitPositionInTable(cardObj.position);
      pos.add(step);
      cardObj.order = order.shift();
      cardObj.angle = orientation;
    });
  }

  fitPositionInTable(pos) {
    pos.x = utils.clamp(pos.x, 1-this.tableHalf.x, this.tableHalf.x-2);
    pos.y = utils.clamp(pos.y, 1-this.tableHalf.y, this.tableHalf.y-2);
  }

  computeAABBCenter(cards) {
    const aabb = this.computeAABB(cards);
    const x = (aabb.xmin + aabb.xmax) / 2;
    const y = (aabb.ymin + aabb.ymax) / 2;
    return new TwoVector(x, y);
  }
  computeAABB(cards) {
    const c = cards[0];
    const aabb = {
      xmin: c.position.x,
      xmax: c.position.x,
      ymin: c.position.y,
      ymax: c.position.y
    };
    for(let cardObj of cards) {
      aabb.xmin = Math.min(cardObj.position.x, aabb.xmin);
      aabb.ymin = Math.min(cardObj.position.y, aabb.ymin);
      aabb.xmax = Math.max(cardObj.position.x, aabb.xmax);
      aabb.ymax = Math.max(cardObj.position.y, aabb.ymax);
    }
    return aabb;
  }

  moveToTop(cards) {
    const orderToUpdate = cards.map(c => c.order);
    let allCards = this.world.queryObjects({ instanceType: Card });
    allCards.forEach((cardObj) => {
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
        cardObj.order = (allCards.length - orderToUpdate.length) + count;
      } else {
        cardObj.order -= count;
      }
    });
  }

  randomizeSubSetOrder(ids, enableFx) {
    const fxPositions = [];
    const cards = this.getValidCards(ids);
    const randomized = cards.map(c => ({ order: c.order, x: c.position.x, y: c.position.y, angle: c.angle }));
    utils.shuffle(randomized);
    for (let i = 0; i < cards.length; i++) {
      const target = randomized[i];
      const c = cards[i];
      c.order = target.order;
      c.position.x = target.x;
      c.position.y = target.y;
      c.angle = target.angle;
      if (enableFx) {
        const isFarFromTarget = p => utils.distance(p, target) > 200;
        if (fxPositions.every(isFarFromTarget)) {
          fxPositions.push({x: target.x, y: target.y});
          this.server_addShortLivedObject(ShuffleFx, target.x, target.y);
        }
      }
    }
  }

  sortSubSet(cards, enableFx) {
    const fxPositions = [];
    // sort by ascending model
    const byModel = cards.sort((a, b) => a.model - b.model);
    // copy of cards sorted by ascending order
    const byOrder = cards.map(c => ({ order: c.order, x: c.position.x, y: c.position.y, angle: c.angle })).sort((a, b) => a.order - b.order);
    for (let i = 0; i < cards.length; i++) {
      const target = byOrder[i];
      byModel[i].order = target.order;
      byModel[i].position.x = target.x;
      byModel[i].position.y = target.y;
      byModel[i].angle = target.angle;
      if (enableFx) {
        const isFarFromTarget = p => utils.distance(p, target) > 200;
        if (fxPositions.every(isFarFromTarget)) {
          fxPositions.push({x: target.x, y: target.y});
          this.server_addShortLivedObject(ShuffleFx, target.x, target.y);
        }
      }
    }
  }

  server_addShortLivedObject(Type, px, py) {
    this.shortLivedCount = this.shortLivedCount || 0;
    if (this.shortLivedCount < 20) {
      this.shortLivedCount++;
      let obj = new Type(this);
      obj.position.set(px, py);
      const finalObject = this.addObjectToWorld(obj);
      setTimeout(() => {
        this.removeObjectFromWorld(finalObject)
        this.shortLivedCount--;
      }, 3000);
    }
  }
}
