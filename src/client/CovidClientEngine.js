import { ClientEngine, KeyboardControls } from 'lance-gg';
import CovidRenderer from '../client/CovidRenderer';
import Card from '../common/Card';
import PrivateArea from '../common/PrivateArea';


export default class CovidClientEngine extends ClientEngine {

  constructor(gameEngine, options) {
    super(gameEngine, options, CovidRenderer);
    this.privateAreaId = null;
    this.side = PrivateArea.SIDE.SOUTH;
    this.callbacks = new Map();
    this.callbacks.set("table_side_changed", [])
    this.callbacks.set("private_area_entered", [])
    this.callbacks.set("private_area_exited", [])
    gameEngine.on('renderer.ready', this.bindKeys.bind(this));
  }

  start() {
    this.bindKeys();
    this.updateInputName();
    this.connectToolboxActionButtons();
    return super.start();
  }

  bindKeys() {
    this.keyDownListener = this.keyDownListener || this.onKeyDown.bind(this);
    document.body.addEventListener("keydown", this.keyDownListener);
  }

  connectToolboxActionButtons() {
    const buttons = document.querySelectorAll("#toolbox button");
    buttons.forEach(b => {
      switch (b.getAttribute("command")) {
        case "select_all": b.onclick = this.action_selectAll.bind(this); break;
        case "randomize": b.onclick = this.action_sendRandomize.bind(this); break;
        case "gather": b.onclick = this.action_sendGather.bind(this); break;
        case "align": b.onclick = this.action_sendAlign.bind(this); break;
        case "leave": b.onclick = this.action_leavePrivateArea.bind(this); break;
        default:
          console.error("Value of attribute 'command' missing or unkown");
          break;
      }
    });
  }

  unbindKeys() {
    document.body.removeEventListener("keydown", this.keyDownListener);
  }

  action_selectAll() {
    let cards = this.gameEngine.world.queryObjects({ instanceType: Card });
    this.renderer.selection = cards.map(c => c.id);
  }
  action_sendRandomize() {
    let ids = this.renderer.selection;
    if (ids.length > 1)
      this.sendInput("randomize " + ids.toString());
  }
  action_sendGather() {
    let ids = this.renderer.selection;
    if (ids.length > 1)
      this.sendInput("gather " + this.side + " " + ids.toString());
  }
  action_sendAlign() {
    let ids = this.renderer.selection;
    if (ids.length > 1)
      this.sendInput("align " + this.side + " " + ids.toString());
  }
  action_leavePrivateArea() {
    this.privateArea = null;
  }

  onKeyDown(e) {
    if (e.key === "r") {
      this.action_sendRandomize();
    } else if (e.key === "a" && (event.ctrlKey || event.metaKey)) {
      e.preventDefault();
      this.action_selectAll();
    } else if (e.key === "g") {
      this.action_sendGather();
    } else if (e.key === "Escape") {
      this.action_leavePrivateArea();
    } else if (e.key == "a") {
      this.action_sendAlign();
    }
  }

  // return the content in the text box
  updateInputName() {
    let playerName;
    const input = document.querySelector('#nameInput');
    if (this.hasPrivateArea) {
      input.parentElement.style.visibility = "hidden";
      this.bindKeys();
      playerName = input.value;
    } else {
      input.parentElement.style.visibility = "visible";
      input.select();
      this.unbindKeys();
    }
    return playerName;
  }

  on(eventName, func) {
    const fs = this.callbacks.get(eventName);
    if (fs === undefined)
      console.error("Unkown event: \""+eventName+"\"");
    else
      fs.push(func);
  }

  get autoAlignCardOnInteractionEnabled() {
    return true;
  }

  get tableSide() {
    return this.side;
  }

  set tableSide(s) {
    if (s != this.side) {
      this.side = s;
      this.triggerCallbacks("table_side_changed", s);
    }
  }

  get hasPrivateArea() {
    return this.privateAreaId !== null;
  }

  get privateArea() {
    return this.privateAreaId;
  }

  set privateArea(obj) {
    const newId = obj === null ? null : obj.id;
    const prevId = this.privateAreaId;
    if (prevId !== newId) {
      this.privateAreaId = newId;
      this.triggerCallbacks('private_area_exited', prevId);
      if (newId !== null) {
        this.tableSide = obj.side;
        this.triggerCallbacks('private_area_entered', newId);
        obj.text = this.updateInputName();
        this.sendInput('change_name '+obj.id+' '+obj.text);
      } else {
        this.updateInputName();
      }
    }
  }

  triggerCallbacks(eventName, param) {
    for (let f of this.callbacks.get(eventName)) {
      f(param);
    }
  }
}
