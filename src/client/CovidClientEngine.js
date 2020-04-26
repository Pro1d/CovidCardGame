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
    // Map Enter key to nothing to prevent default behaviour (click on focused button)
    this.addKeyboardShortcut("Enter", ()=>{}, false, false);

    gameEngine.on('gameboard_updated', this.updateHtmlDisplay.bind(this));
    gameEngine.on('updating_gameboard', this.loadingHtmlDisplay.bind(this));
  }

  start() {
    this.bindKeys();
    this.ui_updateInputName();
    this.connectToolboxOptionCheckboxes();
    this.connectToolboxActionButtons();
    this.updateHtmlDisplay();
    this.initGameOptionsUI();
    return super.start();
  }

  initGameOptionsUI() {
    this.gameOptionsForm = document.getElementById("gameOptions");

    // Setup game list
    const gameListElt = this.gameOptionsForm.querySelector("#gameList");
    const gameListItemFormat = gameListElt.innerHTML;
    let gameItemsHTML = "";
    for (let gameKey of Object.keys(Catalog.games).sort()) {
      const game = Catalog.games[gameKey];
      gameItemsHTML += gameListItemFormat
        .replace(new RegExp("\\{id\\}", 'g'), gameKey)
        .replace(new RegExp("\\{name\\}", 'g'), game['name'])
        .replace(new RegExp("\\{description\\}", 'g'), game['description'] ? " - " + game['description'] : "");
    }
    gameListElt.innerHTML = gameItemsHTML;
    this.gameOptionsForm["game"].value = this.gameEngine.game;

    // Close button
    const closeBtn = this.gameOptionsForm.querySelector("#close");
    closeBtn.onclick = this.ui_hideGameOptions.bind(this);

    // Apply button
    const applyBtn = this.gameOptionsForm.querySelector("#apply");
    applyBtn.onclick = () => {
      if (this.gameOptionsForm.style.visibility === "visible") {
        const game = this.gameOptionsForm["game"].value;
        console.log(`select ${game}`);
        this.sendInput(`change_game ${game}`);
        this.ui_hideGameOptions();
        // Make the button lose focus
        applyBtn.blur();
      }
    };
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
          callback = this.ui_showGameOptions.bind(this);
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

  ui_showGameOptions() {
    this.gameOptionsForm.style.visibility = "visible";
    this.gameOptionsForm.style.opacity = 1.0;
  }

  ui_hideGameOptions() {
    this.gameOptionsForm.style.visibility = "hidden";
    this.gameOptionsForm.style.opacity = 0.0;
  }

  // return the content in the text box
  ui_updateInputName() {
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
        obj.text = this.ui_updateInputName();
        this.sendInput('change_name '+obj.id+' '+obj.text);
      } else {
        this.ui_updateInputName();
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

  triggerCallbacks(eventName, param) {
    for (let f of this.callbacks.get(eventName)) {
      f(param);
    }
  }
}
