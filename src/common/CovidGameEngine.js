import { GameEngine, BaseTypes, DynamicObject, SimplePhysicsEngine, TwoVector } from 'lance-gg';
import Card from './Card';
import PrivateArea from './PrivateArea';
import PingPosition from './PingPosition';
import ShuffleFx from './ShuffleFx';

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

  getIds(commaSeparatedIds) {
    return Array.from(commaSeparatedIds.split(","), idStr => parseInt(idStr));
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
      const ids = this.getIds(input.shift());
      const cards = this.getValidCards(ids);
      cards.forEach((cardObj) => {
        if (sideToFlip === null) {
          sideToFlip = cardObj.side;
        }
        if (cardObj.side === sideToFlip)
          cardObj.flip();
      });
    } else if (action === "top") {
      const ids = this.getIds(input.shift());
      this.moveToTop(ids);
    } else if (action === "move") {
      const delta = input.shift().split(",");
      const dx = parseFloat(delta[0]);
      const dy = parseFloat(delta[1]);
      const ids = this.getIds(input.shift());
      const cards = this.getValidCards(ids);
      cards.forEach((cardObj) => {
        cardObj.position.x += dx;
        cardObj.position.y += dy;
        this.fitPositionInTable(cardObj.position);
      });
    } else if (action == "rotate") {
      const deltaAngle = parseFloat(input.shift());
      const ids = this.getIds(input.shift());
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
        const ids = this.getIds(input.shift());
        const cards = this.getValidCards(ids);
        cards.forEach((cardObj) => { cardObj.angle = angle; });
      }
    } else if (action == "randomize") {
      if (isServer) {
        let ids = this.getIds(input.shift());
        this.emit("executeCommand", {cmd:"randomize", ids: ids});
      }
    } else if (action == "gather") {
      if (isServer) {
        const angle = parseFloat(input.shift());
        const ids = this.getIds(input.shift());
        const cards = this.getValidCards(ids);
        const center = this.computeAABBCenter(ids);
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
        const radians = (orientation + 90) * Math.PI / 180;
        const ids = this.getIds(input.shift());
        const randomConflictRemap = ids.reduce((map, id) => map.set(id, Math.random()), new Map());
        const cards = this.getValidCards(ids);
        const orderConflictRemap = cards.reduce((map, obj) => map.set(obj.id, obj.order), new Map());
        const step = new TwoVector(Math.sin(radians), -Math.cos(radians));
        function dot(a, b) { return a.x * b.x + a.y * b.y; };
        cards.sort((a, b) => {
          const diff = dot(a, step) - dot(b, step);
          return (Math.abs(diff) < Card.WIDTH * 0.05) ? orderConflictRemap.get(a.id) - orderConflictRemap.get(b.id) : diff;
        });
        const step_length = Card.WIDTH * 0.3;
        step.multiplyScalar(step_length);
        const pos = this.computeAABBCenter(ids);
        pos.subtract(step.clone().multiplyScalar((cards.length - 1) / 2));
        const order = Array.from(cards, x=>x.order).sort((a,b)=>(a-b));
        cards.forEach((cardObj) => {
          cardObj.position.copy(pos);
          this.fitPositionInTable(cardObj.position);
          pos.add(step);
          cardObj.order = order.shift();
          cardObj.angle = orientation;
        });
      }
    } else if (action === "ping_position") {
      if (isServer) {
        const position = input.shift().split(',').map(x => parseFloat(x));
        this.server_addShortLivedObject(PingPosition, position[0], position[1]);
      }
    }
  }

  fitPositionInTable(pos) {
    pos.x = Math.min(Math.max(pos.x, 1-this.tableHalf.x), this.tableHalf.x-2);
    pos.y = Math.min(Math.max(pos.y, 1-this.tableHalf.y), this.tableHalf.y-2);
  }

  computeAABBCenter(ids) {
    const aabb = this.computeAABB(ids);
    const x = (aabb.xmin + aabb.xmax) / 2;
    const y = (aabb.ymin + aabb.ymax) / 2;
    return new TwoVector(x, y);
  }
  computeAABB(ids) {
    const cards = this.getValidCards(ids);
    const c = cards.pop();
    const aabb = {
      xmin: c.position.x,
      xmax: c.position.x,
      ymin: c.position.y,
      ymax: c.position.y
    };
    cards.forEach((cardObj) => {
      aabb.xmin = Math.min(cardObj.position.x, aabb.xmin);
      aabb.ymin = Math.min(cardObj.position.y, aabb.ymin);
      aabb.xmax = Math.max(cardObj.position.x, aabb.xmax);
      aabb.ymax = Math.max(cardObj.position.y, aabb.ymax);
    });
    return aabb;
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

  // The ids to randomized must have been moveToTop before calling this method
  randomizeSubSetOrder(ids, enableFx) {
    const distance = (a, b) => Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
    const fxPositions = [];
    const cards = this.getValidCards(ids);
    const toRandomize = cards.map(c => ({ order: c.order, x: c.position.x, y: c.position.y, angle: c.angle }));
    let noneHasMoved = true;
    cards.forEach((c) => {
      let pick_index = Math.trunc(Math.random() * toRandomize.length);
      const target = toRandomize[pick_index];
      const hasMoved = distance(target, c.position) > 0.01 * this.tableSize.x;
      noneHasMoved = noneHasMoved && !hasMoved;
      c.order = target.order;
      c.position.x = target.x;
      c.position.y = target.y;
      c.angle = target.angle;
      toRandomize[pick_index] = toRandomize[0];
      toRandomize.shift();
      if (enableFx) {
        const isFarFromTarget = p => distance(p, target) > 200;
        if (fxPositions.every(isFarFromTarget)) {
          fxPositions.push({x: target.x, y: target.y});
          this.server_addShortLivedObject(ShuffleFx, target.x, target.y);
        }
      }
    });
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
