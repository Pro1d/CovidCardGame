import CovidRenderer from './CovidRenderer';
import {OptionsWindow} from './ui/OptionsWindow';
import {JoinOverlay} from './ui/JoinOverlay';
import Selection from './Selection';

import Card from '../common/Card';
import PrivateArea from '../common/PrivateArea';
import Catalog from '../data/Catalog';

import { ClientEngine, KeyboardControls } from 'lance-gg';


export default class CovidClientEngine extends ClientEngine {

  constructor(gameEngine, options) {
    super(gameEngine, {...options, serverURL: window.location.origin}, CovidRenderer);
    this.selection = new Selection();
    this.privateAreaId = null;
    this.side = PrivateArea.SIDE.SOUTH;
    this.callbacks = new Map();
    this.callbacks.set("table_side_changed", [])
    this.callbacks.set("private_area_entered", [])
    this.callbacks.set("private_area_exited", [])
    this.shortcuts = new Map();
    // Manual bindings
    // Map Enter key to nothing to prevent default behaviour (click on focused button)
    this.addKeyboardShortcut("Enter", ()=>{}, false, false);

    gameEngine.on('gameboard_updated', this.updateHtmlDisplay.bind(this));
    gameEngine.on('updating_gameboard', this.loadingHtmlDisplay.bind(this));
    gameEngine.on('table_updated', this.onTableUpdated.bind(this));
  }

  connect(options = {}) {
    return super.connect({...options, path: window.location.pathname + "socket.io"})
  }

  start() {
    this.bindKeys();
    this.connectToolboxOptionCheckboxes();
    this.connectToolboxActionButtons();
    this.updateHtmlDisplay();
    OptionsWindow.init(this);
    JoinOverlay.init(this);
    JoinOverlay.show();
    return super.start();
  }

  updateHtmlDisplay() {
    const game = Catalog.games[this.gameEngine.game];
    const html = game.html || ("<h1>" + game.name + "</h1>" + game.description);
    document.body.querySelector("#mainContainer .secondary").innerHTML = html;
    document.head.getElementsByTagName("title")[0].innerText = `${game.name} - Covid Card Table`;
  }
  loadingHtmlDisplay() {
    const html = "Chargement...";
    document.body.querySelector("#mainContainer .secondary").innerHTML = html;
    document.head.getElementsByTagName("title")[0].innerText = `Covid Card Table`;
  }

  onTableUpdated() {
    let hasPA = false;
    if (this.hasPrivateArea) {
      const obj = this.gameEngine.world.queryObject({ id: this.privateArea });
      if (obj) {
        this.tableSide = obj.side;
        hasPA = true;
      } else {
        this.privateArea = null;
      }
    }
    if (!hasPA) {
      const angleStep = 360 / this.gameEngine.table.ngon;
      this.tableSide = Math.round(this.tableSide / angleStep) * angleStep;
    }
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

  addKeyboardShortcut(key, func, ctrl, alt) {
    if (!this.shortcuts.has(key))
      this.shortcuts.set(key, []);
    this.shortcuts.get(key).push({func: func, ctrl: ctrl === true, alt: alt === true});
  }

  onKeyDown(e) {
    if (!e.repeat) { // disable key repeat
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
  }

  connectToolboxActionButtons() {
    const buttons = document.querySelectorAll("#toolbox button");
    buttons.forEach(b => {
      const command = b.getAttribute("command");
      let callback = null;
      switch (command) {
        case "stack": case "align": case "valign": case "gather":
          callback = () => this.action_sendCommand(command, true);
          break;
        case "sort": case "randomize": case "reverse":
          callback = () => this.action_sendCommand(command, false);
          break;
        case "leave":
          callback = this.action_leavePrivateArea.bind(this);
          break;
        case "select_all":
          callback = this.action_selectAll.bind(this);
          break;
        case "show_game_options":
          callback = OptionsWindow.show.bind(OptionsWindow);
          break;
        default:
          console.error("Value of attribute 'command' missing or unknown");
          break;
      }
      if (callback) {
        b.onclick = () => {
          b.blur();
          callback();
        };
        // Auto binding from html content
        const shortcut = b.querySelector(".keyCode");
        if (shortcut) {
          const k = shortcut.innerText.toLowerCase().split('-');
          let key = k.pop();
          if (key === "échap") key = "Escape"; // translate
          if (k.includes("maj")) key = key.toUpperCase();
          this.addKeyboardShortcut(key, callback, k.includes("ctrl"), k.includes("alt"));
        }
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

  action_selectAll() {
    let cards = this.gameEngine.world.queryObjects({ instanceType: Card });
    this.selection.resetChange();
    cards.forEach(c => { this.selection.addChange(c.id); });
    this.selection.mergeChange(Selection.REPLACE);
  }
  // param changeOrientation: whether the command intends to change the orientation of the objects
  action_sendCommand(command, changeOrientation) {
    if (!this.hasPrivateArea) return;
    if (this.selection.size >= (changeOrientation ? 1 : 2))
      this.sendInput(command + " " + (changeOrientation ? this.side + " " : "") + this.selection.toString());
  }
  action_leavePrivateArea() {
    this.privateArea = null;
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
      if (prevId !== null)
        this.triggerCallbacks('private_area_exited', prevId);
      if (newId !== null) {
        JoinOverlay.hide();
        obj.text = JoinOverlay.getInputName();
        this.tableSide = obj.side;
        this.triggerCallbacks('private_area_entered', newId);
        this.sendInput(`change_name ${obj.id} ${obj.text}`);
      } else {
        JoinOverlay.show();
      }
    }
  }

  // Register a `func` to call when the `eventName` is trigger by `this`.
  on(eventName, func) {
    const fs = this.callbacks.get(eventName);
    if (fs === undefined)
      console.error("Unkown event: \""+eventName+"\"");
    else
      fs.push(func);
  }

  removeListener(eventName, func) {
    const fs = this.callbacks.get(eventName);
    if (fs === undefined)
      console.error("Unkown event: \""+eventName+"\"");
    else {
      const i = fs.indexOf(func);
      if (i !== -1)
        fs.splice(i, 1);
    }
  }

  triggerCallbacks(eventName, param) {
    for (let f of this.callbacks.get(eventName)) {
      f(param);
    }
  }
}
