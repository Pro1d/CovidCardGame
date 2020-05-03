import { GameEngine, BaseTypes, DynamicObject, SimplePhysicsEngine, TwoVector } from 'lance-gg';
import BoardGame from './BoardGame';
import Catalog from '../data/Catalog';
import Card from './Card';
import Item from '../common/Item';
import PrivateArea from './PrivateArea';
import PingPosition from './PingPosition';
import ShuffleFx from './ShuffleFx';
import Table from './Table';
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
    this.on('client__syncReceived', this.syncReceived.bind(this));
    this.on('server__playerJoined', this.onPlayerConnected.bind(this));
    this.on('server__playerDisconnected', this.onPlayerDisconnected.bind(this));

    const size = 900;
    Object.assign(this, {
      tableSize: new TwoVector(size, size),
      tableHalf: new TwoVector(size / 2, size / 2),
      game: "the-game"
    });

    this.gameboardUpdateId = -1;
    this.gameboardUpdating = true;
    this.gameboard = null;
    this.tableUpdateId = -1;
    this.table = null;

    this.activePlayers = new Set();
  }

  // client side only
  syncReceived() {
    if (this.boardgame) {
      if (this.gameboardUpdateId !== this.boardgame.updateId) {
        if (!this.gameboardUpdating) {
          this.emit('updating_gameboard');
          this.gameboardUpdating = true;
        }
        // update in progress
        if (this.boardgame.game) {
          this.game = this.boardgame.game;
          this.gameboardUpdateId = this.boardgame.updateId;
          this.gameboardUpdating = false;
          this.emit('gameboard_updated');
        }
      }
    }
    if (this.table) {
      if (this.tableUpdateId !== this.table.updateId) {
        this.tableUpdateId = this.table.updateId;
        this.emit('table_updated');
      }
    }
  }

  registerClasses(serializer) {
    serializer.registerClass(Card);
    serializer.registerClass(Item);
    serializer.registerClass(PrivateArea);
    serializer.registerClass(PingPosition);
    serializer.registerClass(ShuffleFx);
    serializer.registerClass(BoardGame);
    serializer.registerClass(Table);
  }

  forEachValidCard(ids, functor) {
    this.getValidCards(ids).forEach(functor);
  }

  getValidCards(ids) {
    return Array.from(ids, i => this.world.queryObject({id : i, instanceType: Card}))
                .filter(obj => obj !== null);
  }
  getMovableObjects(ids) {
    const instances = [Card, Item];
    return Array.from(ids, i => this.world.queryObject({id : i}))
                .filter(obj => instances.some(I => obj instanceof I));
  }
  getFlippableObjects(ids) {
    return this.getValidCards(ids);
  }

  processInput(inputData, playerId, isServer) {
    super.processInput(inputData, playerId);
    const ignore = isServer && !this.activePlayers.has(playerId);

    const input = inputData.input.split(" ");
    if (isServer && input[0] !== "move" && input[0] !== "rotate")
      console.log(playerId, !ignore, input);

    if (ignore) return;

    const action = input.shift();
    if (action === "flip") {
      // flip the cards that have the same side visible as the first id
      const id_ref = parseInt(input.shift());
      const object_ref = this.world.queryObject({ id: id_ref });
      const sideToFlip = object_ref && object_ref.side;
      const ids = utils.parseIntArray(input.shift());
      const objects = this.getFlippableObjects(ids);
      objects.forEach((obj) => {
        if (obj.side === sideToFlip)
          obj.flip();
      });
    } else if (action === "top") {
      const ids = utils.parseIntArray(input.shift());
      const objects = this.getMovableObjects(ids);
      if (objects.length > 0) {
        this.moveToTop(objects);
      }
    } else if (action === "move") {
      const delta = utils.parseFloatArray(input.shift());
      const ids = utils.parseIntArray(input.shift());
      const objects = this.getMovableObjects(ids);
      objects.forEach((obj) => {
        obj.position.x += delta[0];
        obj.position.y += delta[1];
        this.fitPositionInTable(obj.position);
      });
    } else if (action == "rotate") {
      const deltaAngle = parseFloat(input.shift());
      const ids = utils.parseIntArray(input.shift());
      const objects = this.getMovableObjects(ids);
      objects.forEach((obj) => {
        if (deltaAngle < 0)
          obj.turnLeft(-deltaAngle);
        else
          obj.turnRight(deltaAngle);
      });
    } else if (action === "orientation") {
      if (isServer) {
        const angle = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const objects = this.getMovableObjects(ids);
        objects.forEach((obj) => {
          const delta = utils.warp180Degrees(angle - obj.angle);
          obj.angle += delta;
        });
      }
    } else if (action == "sort") {
      if (isServer) {
        const ids = utils.parseIntArray(input.shift());
        const objects = this.getMovableObjects(ids);
        this.server_sortSubSetOfCards(objects, true);
      }
    } else if (action == "randomize") {
      if (isServer) {
        const ids = utils.parseIntArray(input.shift());
        this.server_randomizeSubSetOrder(ids, true);
      }
    } else if (action == "reverse") {
      if (isServer) {
        const ids = utils.parseIntArray(input.shift());
        this.server_reverseSubSetOrder(ids);
      }
    } else if (action == "stack") {
      if (isServer) {
        const orientation = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const objects = this.getMovableObjects(ids);
        if (objects.length > 0) {
          const center = this.computeAABBCenter(objects);
          objects.forEach((obj) => {
            obj.position.copy(center);
            obj.angle += utils.warp180Degrees(orientation - obj.angle);
          });
        }
      }
    } else if (action == "gather") {
      if (isServer) {
        const orientation = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const objects = this.getMovableObjects(ids);
        if (objects.length > 0) {
          const radians = (orientation + 90) * utils.RADIANS;
          const step_vector = new TwoVector(Math.sin(radians), -Math.cos(radians));
          const step_axis = "x";
          const pos = this.computeAABBCenter(objects);

          this.group(objects, orientation, step_vector, pos);
        }
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
        const objects = this.getMovableObjects(ids);

        if (objects.length > 0) {
          const radians = (orientation + 90) * utils.RADIANS;
          const step_vector = new TwoVector(Math.sin(radians), -Math.cos(radians));
          const step_axis = "x";
          const pos = this.computeAABBCenter(objects);

          this.align(objects, orientation, step_vector, step_axis, pos);
        }
      }
    } else if (action === "valign") {
      if (isServer) {
        const orientation = parseFloat(input.shift());
        const ids = utils.parseIntArray(input.shift());
        const objects = this.getMovableObjects(ids);

        if (objects.length > 0) {
          const radians = (orientation + 180) * utils.RADIANS;
          const step_vector = new TwoVector(Math.sin(radians), -Math.cos(radians));
          const step_axis = "y";
          const pos = this.computeAABBCenter(objects);

          this.align(objects, orientation, step_vector, step_axis, pos);
        }
      }
    } else if (action === "ping_position") {
      if (isServer) {
        const position = utils.parseFloatArray(input.shift());
        this.server_addShortLivedObject(PingPosition, position[0], position[1]);
      }
    } else if (action === "change_game") {
      if (isServer) {
        this.emit('server_execute_command', { cmd: "change_game", data: { name: input.shift() } });
      }
    } else if (action === "change_table") {
      if (isServer) {
        this.emit('server_execute_command', { cmd: "change_table", data: { seats: input.shift() }});
      }
    }
  }

  align(objects, orientation, step_vector, step_axis, center) {
    const orderConflictRemap = objects.reduce((map, obj) => map.set(obj.id, obj.order), new Map());
    const resourceMap = objects.reduce((map, obj) => map.set(obj.id, Catalog.getResourceByModelId(obj.model)), new Map());
    objects.sort((a, b) => {
      const diff = (utils.dot(a.position, step_vector) - resourceMap.get(a.id).size[step_axis] / 2)
                 - (utils.dot(b.position, step_vector) - resourceMap.get(b.id).size[step_axis] / 2);
      return (Math.abs(diff) < 2.0 /*pixels*/) ? orderConflictRemap.get(a.id) - orderConflictRemap.get(b.id) : diff;
    });
    const props = objects.map(obj => resourceMap.get(obj.id));
    // Compoute the length of trail of objects,
    // from external edge of the first card to the external edge of the last card
    const lastObjProp = utils.last(props);
    const trailLength = props.reduce((res, prop) => {
      res.length = Math.max(res.length, res.offset + prop.size[step_axis]);
      res.offset += prop.align_step[step_axis];
      return res;
    }, {offset: 0.0, length: 0.0 }).length;
    // Position of the next card to align
    const nextPos = center.clone();
    const step = step_vector.clone();
    nextPos.subtract(step.multiplyScalar(trailLength / 2));
    // Re-assign order
    const order = Array.from(objects, x=>x.order).sort((a,b)=>(a-b));
    objects.forEach((obj) => {
      const prop = props.shift();
      // Set card position
      obj.position.set(
        nextPos.x + step_vector.x * prop.size[step_axis] / 2,
        nextPos.y + step_vector.y * prop.size[step_axis] / 2);
      this.fitPositionInTable(obj.position);

      // Update position of next card
      step.set(
        step_vector.x * prop.align_step[step_axis],
        step_vector.y * prop.align_step[step_axis]);
      nextPos.add(step);

      // other card data
      obj.order = order.shift();
      obj.angle += utils.warp180Degrees(orientation - obj.angle);
    });
  }

  group(objects, orientation, horizontalVector, center) {
    const orderConflictRemap = objects.reduce((map, obj) => map.set(obj.id, obj.order), new Map());
    const resourceMap = objects.reduce((map, obj) => map.set(obj.id, Catalog.getResourceByModelId(obj.model)), new Map());
    const order = Array.from(objects, x=>x.order).sort((a,b)=>(a-b));
    const verticalVector = new TwoVector(-horizontalVector.y, horizontalVector.x);
    objects.sort((a,b) => {
      const diff = utils.dot(a.position, verticalVector) - utils.dot(b.position, verticalVector);
      return Math.abs(diff) < 2.0 /*pixels*/ ? orderConflictRemap.get(a.id) - orderConflictRemap.get(b.id) : diff;
    });
    const columnCount = Math.ceil(Math.sqrt(objects.length));
    const lineCount = Math.ceil(objects.length / columnCount);
    const lineOfObjects = [];
    const lineProp = [];
    for (let l = 0; l < lineCount; l++) {
      let L = [];
      let prop = { height: 0, align_offset: utils.INF };
      for (let c = 0; c < columnCount; c++) {
        if (c + l * columnCount >= objects.length)
          break;
        const obj = objects[c + l * columnCount];
        obj.order = order.shift();
        L.push(obj);
        prop.height = Math.max(prop.height, resourceMap.get(obj.id).size.y);
        prop.align_offset = Math.min(prop.align_offset, resourceMap.get(obj.id).size.y / 2 - resourceMap.get(obj.id).align_step.y);
      }
      prop.align_step = prop.height / 2 - prop.align_offset;
      lineProp.push(prop);
      lineOfObjects.push(L);
    }
    const totalHeight = lineProp.reduce((res, prop) => {
      res.height = Math.max(res.height, res.offset + prop.height);
      res.offset += prop.align_step;
      return res;
    }, { offset: 0.0, height: 0 }).height;
    const pos = center.clone().subtract(verticalVector.clone().multiplyScalar(totalHeight / 2));
    for (let l = 0; l < lineCount; l++) {
      const prop = lineProp[l];
      pos.set(
        pos.x + verticalVector.x * prop.height / 2,
        pos.y + verticalVector.y * prop.height / 2);
      this.align(lineOfObjects[l], orientation, horizontalVector, "x", pos);
      pos.set(
        pos.x - verticalVector.x * prop.align_offset,
        pos.y - verticalVector.y * prop.align_offset);
    }
  }

  fitPositionInTable(pos) {
    const bound = this.table.radius - 2;
    const angleStep = 2 * Math.PI / this.table.ngon;
    let r = null;
    let c = null;
    for (let i = 0; i < this.table.ngon; i++) {
      const a = { x: -Math.sin(i * angleStep), y: Math.cos(i * angleStep) };
      if (utils.dot(a, pos) > bound) {
        const cc = utils.cross(a, pos);
        if (r === null || Math.abs(cc) < Math.abs(c)) {
          r = a;
          c = cc;
        }
      }
    }
    if (r) {
      const proj = utils.dot(r, pos);
      pos.x -= r.x * (proj - bound);
      pos.y -= r.y * (proj - bound);
      const halfEdgeLength = Math.tan(angleStep / 2) * this.table.radius - 2;
      if (Math.abs(c) > halfEdgeLength) {
        pos.x -= -r.y * (c - Math.sign(c) * halfEdgeLength);
        pos.y -= r.x * (c - Math.sign(c) * halfEdgeLength);
      }
    }
  }

  computeAABBCenter(objects) {
    const aabb = this.computeAABB(objects);
    const x = (aabb.xmin + aabb.xmax) / 2;
    const y = (aabb.ymin + aabb.ymax) / 2;
    return new TwoVector(x, y);
  }

  computeAABB(objects) {
    const props = objects.map(obj => Catalog.getResourceByModelId(obj.model));
    const aabb = {
      xmin: objects[0].position.x,
      xmax: objects[0].position.x,
      ymin: objects[0].position.y,
      ymax: objects[0].position.y
    };
    for(let obj of objects) {
      let p = props.shift();
      aabb.xmin = Math.min(obj.position.x - p.size.x / 2, aabb.xmin);
      aabb.ymin = Math.min(obj.position.y - p.size.y / 2, aabb.ymin);
      aabb.xmax = Math.max(obj.position.x + p.size.x / 2, aabb.xmax);
      aabb.ymax = Math.max(obj.position.y + p.size.y / 2, aabb.ymax);
    }
    return aabb;
  }

  moveToTop(objects) {
    const sortedCards = Array.from(objects).sort((a, b) => a.order - b.order);
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
    const objects = this.getMovableObjects(ids);
    const randomized = objects.map(c => ({ order: c.order, x: c.position.x, y: c.position.y, angle: c.angle }));
    utils.shuffle(randomized);
    for (let i = 0; i < objects.length; i++) {
      const target = randomized[i];
      const c = objects[i];
      c.order = target.order;
      c.position.x = target.x;
      c.position.y = target.y;
      c.angle += utils.warp180Degrees(target.angle - c.angle);
      if (enableFx) {
        const isFarFromTarget = p => utils.distance(p, target) > 200.0 /*pixels*/;
        if (fxPositions.every(isFarFromTarget)) {
          fxPositions.push({x: target.x, y: target.y});
          this.server_addShortLivedObject(ShuffleFx, target.x, target.y);
        }
      }
    }
  }

  server_reverseSubSetOrder(ids) {
    const objects = this.getMovableObjects(ids).sort((a, b) => a.order - b.order);
    const reversed = objects.map(c => ({ order: c.order, x: c.position.x, y: c.position.y, angle: c.angle }));
    reversed.reverse();
    for (let i = 0; i < objects.length; i++) {
      const target = reversed[i];
      const c = objects[i];
      c.order = target.order;
      c.position.x = target.x;
      c.position.y = target.y;
      c.angle += utils.warp180Degrees(target.angle - c.angle);
    }
  }

  server_sortSubSetOfCards(objects, enableFx) {
    const fxPositions = [];
    // sort by ascending model
    const byModel = objects.sort((a, b) => a.model - b.model || a.order - b.order);
    // copy of objects sorted by ascending order
    const byOrder = objects.map(c => ({ order: c.order, x: c.position.x, y: c.position.y, angle: c.angle })).sort((a, b) => a.order - b.order);
    for (let i = 0; i < objects.length; i++) {
      const target = byOrder[i];
      byModel[i].order = target.order;
      byModel[i].position.x = target.x;
      byModel[i].position.y = target.y;
      byModel[i].angle += utils.warp180Degrees(target.angle - byModel[i].angle);
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
        this.removeObjectFromWorld(finalObject);
        this.shortLivedCount--;
      }, 3000);
    }
  }

  onPlayerConnected(socket) {
    this.activePlayers.add(socket.playerId);
    console.log("player joined: "+socket.playerId);
  }

  onPlayerDisconnected(socket) {
    this.activePlayers.delete(socket.playerId);
    console.log("player left: "+socket.playerId);
  }
}
