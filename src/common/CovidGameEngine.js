import { GameEngine, BaseTypes, DynamicObject, SimplePhysicsEngine, TwoVector } from 'lance-gg';
import Catalog from '../data/Catalog';
import Card from './Card';
import Item from '../common/Item';
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
      game: "covid-letter"
    });
  }

  registerClasses(serializer) {
    serializer.registerClass(Card);
    serializer.registerClass(Item);
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
    return Array.from(ids, i => this.world.queryObject({id : i, instanceType: Card}));
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
        this.server_sortSubSetOfCards(cards, true);
      }
    } else if (action == "randomize") {
      if (isServer) {
        const ids = utils.parseIntArray(input.shift());
        this.server_randomizeSubSetOrder(ids, true);
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
        const step_vector = new TwoVector(Math.sin(radians), -Math.cos(radians));
        const step_axis = "x";
        const pos = this.computeAABBCenter(cards);

        this.align(cards, orientation, step_vector, step_axis, pos);
      }
    } else if (action === "valign") {
      if (isServer) {
        const orientation = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const cards = this.getValidCards(ids);

        const radians = (orientation + 180) * utils.RADIANS;
        const step_vector = new TwoVector(Math.sin(radians), -Math.cos(radians));
        const step_axis = "y";
        const pos = this.computeAABBCenter(cards);

        this.align(cards, orientation, step_vector, step_axis, pos);
      }
    } else if (action === "ping_position") {
      if (isServer) {
        const position = utils.parseFloatArray(input.shift());
        this.server_addShortLivedObject(PingPosition, position[0], position[1]);
      }
    }
  }

  align(cards, orientation, step_vector, step_axis, center) {
    const orderConflictRemap = cards.reduce((map, obj) => map.set(obj.id, obj.order), new Map());
    const props = cards.map(cardObj => Catalog.getResourceByModelId(cardObj.model));
    cards.sort((a, b) => {
      const diff = utils.dot(a.position, step_vector) - utils.dot(b.position, step_vector);
      return (Math.abs(diff) < 2.0 /*pixels*/) ? orderConflictRemap.get(a.id) - orderConflictRemap.get(b.id) : diff;
    });
    // Compoute the length of trail of cards,
    // from external edge of the first card to the external edge of the last card
    const lastCardProp = utils.last(props);
    const trailLength = lastCardProp.size[step_axis] - lastCardProp.align_step[step_axis] + props.reduce(
      (sum, prop) => sum + prop.align_step[step_axis], 0.0);
    // Position of the next card to align
    const nextPos = center.clone();
    const step = step_vector.clone();
    nextPos.subtract(step.multiplyScalar(trailLength / 2));
    // Re-assign order
    const order = Array.from(cards, x=>x.order).sort((a,b)=>(a-b));
    cards.forEach((cardObj) => {
      const prop = props.shift();
      // Set card position
      cardObj.position.set(
        nextPos.x + step_vector.x * prop.size[step_axis] / 2,
        nextPos.y + step_vector.y * prop.size[step_axis] / 2);
      this.fitPositionInTable(cardObj.position);

      // Update position of next card
      step.set(
        step_vector.x * prop.align_step[step_axis],
        step_vector.y * prop.align_step[step_axis]);
      nextPos.add(step);

      // other card data
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
    const sortedCards = Array.from(cards).sort((a, b) => a.order - b.order);
    const allZSortableObjects = [];
    this.world.forEachObject((id, obj) => {
      if (obj.order !== undefined)
        allZSortableObjects.push(obj);
    });
    allZSortableObjects.sort((a, b) => a.order - b.order);
    const sortedOrderToReassign = allZSortableObjects.map(o => o.order);
    let card_index = 0;
    for (let obj of allZSortableObjects) {
      if (card_index < sortedCards.length && obj.order === sortedCards[card_index].order)
        card_index++;
      else
        obj.order = sortedOrderToReassign.shift();
    }
    for (let c of sortedCards)
      c.order = sortedOrderToReassign.shift();
  }

  server_randomizeSubSetOrder(ids, enableFx) {
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
        const isFarFromTarget = p => utils.distance(p, target) > 200.0 /*pixels*/;
        if (fxPositions.every(isFarFromTarget)) {
          fxPositions.push({x: target.x, y: target.y});
          this.server_addShortLivedObject(ShuffleFx, target.x, target.y);
        }
      }
    }
  }

  server_sortSubSetOfCards(cards, enableFx) {
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
