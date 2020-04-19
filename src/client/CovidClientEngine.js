import { ClientEngine, KeyboardControls } from 'lance-gg';
import Selection from './Selection';
import Catalog from '../data/Catalog';
import CovidRenderer from '../client/CovidRenderer';
import Card from '../common/Card';
import PrivateArea from '../common/PrivateArea';


export default class CovidClientEngine extends ClientEngine {

  constructor(gameEngine, options) {
    super(gameEngine, options, CovidRenderer);
    this.selection = new Selection();
    this.privateAreaId = null;
    this.side = PrivateArea.SIDE.SOUTH;
    this.callbacks = new Map();
    this.callbacks.set("table_side_changed", [])
    this.callbacks.set("private_area_entered", [])
    this.callbacks.set("private_area_exited", [])
    this.shortcuts = new Map();
    // Manual bindings
    // this.addKeyboardShortcut("p", ()=>{}, false, false);
  }

  start() {
    this.bindKeys();
    this.updateInputName();
    this.connectToolboxOptionCheckboxes();
    this.connectToolboxActionButtons();
    this.updateHtmlDisplay();
    return super.start();
  }

  updateHtmlDisplay() {
    const game = Catalog.games[this.gameEngine.game];
    const html = game.html || ("<h1>" + game.name + "</h1>" + game.description);
    document.body.querySelector("#mainContainer .secondary").innerHTML = html;
    document.head.getElementsByTagName("title")[0].innerText = "Covid Card Table - " + game.name;
  }

  bindKeys() {
    this.keyDownListener = this.keyDownListener || this.onKeyDown.bind(this);
    document.body.addEventListener("keydown", this.keyDownListener);
  }

  unbindKeys() {
    document.body.removeEventListener("keydown", this.keyDownListener);
  }

  connectToolboxOptionCheckboxes() {
    const checkboxes = document.querySelectorAll("#toolbox ul input[type=checkbox]");
    checkboxes.forEach(c => {
      const cmd = c.getAttribute('command');
      if (!["auto_orient", "auto_align", "display_selecting_count"].includes(cmd)) {
        console.error("Value of attribute 'command' missing or unkown");
      } else {
        c.onclick = () => { this[cmd] = c.checked; };
        c.onclick(); // get default value
      }
    });
  }

  autoExecutionOnInteraction(ids) {
    if (!this.tryAutoAlign(ids)) {
      this.tryAutoOrient(ids);
    }
  }

  tryAutoOrient(ids) {
    if (this.auto_orient) {
      this.sendInput("orientation " + this.side + " " + ids.toString());
      return true;
    }
    return false;
  }

  tryAutoAlign(ids) {
    if (this.auto_align) {
      this.sendInput("align " + this.side + " " + ids.toString());
      return true;
    }
    return false;
  }

  addKeyboardShortcut(key, func, ctrl, alt) {
    if (!this.shortcuts.has(key))
      this.shortcuts.set(key, []);
    this.shortcuts.get(key).push({func: func, ctrl: ctrl === true, alt: alt === true});
  }

  onKeyDown(e) {
    const actions = this.shortcuts.get(e.key);
    if (actions) {
      for (let a of actions) {
        if (a.ctrl === event.ctrlKey && a.alt === event.altKey) {
          a.func();
          e.preventDefault();
        }
      }
    }
  }

  connectToolboxActionButtons() {
    const buttons = document.querySelectorAll("#toolbox button");
    buttons.forEach(b => {
      switch (b.getAttribute("command")) {
        case "select_all": b.onclick = this.action_selectAll.bind(this); break;
        case "sort": b.onclick = this.action_sendSort.bind(this); break;
        case "randomize": b.onclick = this.action_sendRandomize.bind(this); break;
        case "gather": b.onclick = this.action_sendGather.bind(this); break;
        case "align": b.onclick = this.action_sendAlign.bind(this); break;
        case "valign": b.onclick = this.action_sendVAlign.bind(this); break;
        case "leave": b.onclick = this.action_leavePrivateArea.bind(this); break;
        default:
          console.error("Value of attribute 'command' missing or unkown");
          break;
      }
      // Auto binding from html content
      const k = b.querySelector(".keyCode").innerText.toLowerCase().split('-');
      let key = k.pop();
      if (key === "échap") key = "Escape"; // translate
      if (k.includes("shift")) key = key.toUpperCase();
      this.addKeyboardShortcut(key, b.onclick, k.includes("ctrl"), k.includes("alt"));
    });
  }

  action_selectAll() {
    let cards = this.gameEngine.world.queryObjects({ instanceType: Card });
    this.selection.resetChange();
    cards.forEach(c => { this.selection.add(c.id); });
    this.selection.mergeChange(Selection.REPLACE);
  }
  action_sendSort() {
    if (!this.hasPrivateArea) return;
    if (this.selection.size > 1)
      this.sendInput("sort " + this.selection.toString());
  }
  action_sendRandomize() {
    if (!this.hasPrivateArea) return;
    if (this.selection.size > 1)
      this.sendInput("randomize " + this.selection.toString());
  }
  action_sendGather() {
    if (!this.hasPrivateArea) return;
    if (this.selection.size > 1)
      this.sendInput("gather " + this.side + " " + this.selection.toString());
  }
  action_sendAlign() {
    if (!this.hasPrivateArea) return;
    if (this.selection.size > 1)
      this.sendInput("align " + this.side + " " + this.selection.toString());
  }
  action_sendVAlign() {
    if (!this.hasPrivateArea) return;
    if (this.selection.size > 1)
      this.sendInput("valign " + this.side + " " + this.selection.toString());
  }
  action_leavePrivateArea() {
    this.privateArea = null;
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

  // Register a `func` to call when the `eventName` is trigger by `this`.
  on(eventName, func) {
    const fs = this.callbacks.get(eventName);
    if (fs === undefined)
      console.error("Unkown event: \""+eventName+"\"");
    else
      fs.push(func);
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
