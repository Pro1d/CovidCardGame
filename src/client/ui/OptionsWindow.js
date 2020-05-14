import Catalog from "../../data/Catalog";
import Table from "../../common/Table";

import * as utils from "../../common/utils";

class _OptionsWindow {
  constructor() {}

  init(client) {
    this.client = client;
    this.gameOptionsForm = document.getElementById("gameOptions");

    this._setupGameList();
    this._setupTableList();

    // Close button
    const closeBtn = this.gameOptionsForm.querySelector("#close");
    closeBtn.onclick = this.hide.bind(this);

    // Apply button
    this.applyBtn = this.gameOptionsForm.querySelector("#apply");
    this.applyBtn.onclick = () => {
      if (this.gameOptionsForm.style.visibility === "visible") {
        const game = this.gameOptionsForm["game"].value;
        const table = this.gameOptionsForm["table"].value;
        const radius = this.gameOptionsForm["radius"].value;
        const expandArea = this.gameOptionsForm["expandArea"].checked;
        const areaVisibility = this.gameOptionsForm["areaVisibility"].value;
        this.client.sendInput(`change_table ${table} ${radius} ${expandArea} ${areaVisibility}`);
        this.client.sendInput(`change_game ${game}`);
        this.hide();
      }
    };
  }

  _setupGameList() {
    const gameListElt = this.gameOptionsForm.querySelector("#gameList");
    const itemFormat = gameListElt.innerHTML;

    let gameItemsHTML = "";
    for (let gameKey of Object.keys(Catalog.games).sort()) {
      const game = Catalog.games[gameKey];
      const description = game["description"] ? " - " + game["description"] : "";
      gameItemsHTML += itemFormat
        .replace(new RegExp("\\{id\\}", "g"), gameKey)
        .replace(new RegExp("\\{name\\}", "g"), game["name"])
        .replace(new RegExp("\\{description\\}", "g"), description);
    }
    gameListElt.innerHTML = gameItemsHTML;
  }

  _setupTableList() {
    const tableListElt = this.gameOptionsForm.querySelector("#tableList");
    const itemFormat = tableListElt.firstElementChild;
    itemFormat.remove();
    const tables = [
      "o...",
      "o.o.",
      "oo..",
      "oo.o",
      "oo.o.",
      "o.o.o.",
      "oooo",
      "oooo.",
      "oo.oo.",
      "ooooo",
      "ooooo.",
      "oooooo",
      "ooo.ooo.",
      "ooooooo.",
      "oooooooo",
    ];
    const cvsSize = 70;
    for (let t = 0; t < tables.length; t++) {
      const table = tables[t];
      const elt = itemFormat.cloneNode(true);
      const cvs = elt.querySelector("canvas");
      cvs.height = cvsSize;
      cvs.width = cvsSize;
      const ctx = cvs.getContext("2d");
      ctx.fillStyle = "#0b984700";
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = "#0b9847";
      this._drawTable(cvs, table, 450, 180, "#0b9847", "#4242425A");

      elt.querySelector("input").value = table;
      tableListElt.appendChild(elt);
    }

    this.gameOptionsForm["table"].value = "oooo";
  }

  _drawTable(cvs, table, innerRadius, seatHeight, tableColor, seatColor) {
    const size = cvs.width; // cvs is a square
    const N = table.length;
    const angleStep = (2 * Math.PI) / N;
    const radius = innerRadius / Math.cos(angleStep / 2);
    const ngon = [];
    for (let i = 0; i < N; i++) {
      ngon.push({
        x: -Math.sin((i + 0.5) * angleStep) * radius,
        y: Math.cos((i + 0.5) * angleStep) * radius,
      });
    }
    const aabb = ngon.reduce(
      (box, p) => {
        box.xmin = Math.min(box.xmin, p.x);
        box.ymin = Math.min(box.ymin, p.y);
        box.xmax = Math.max(box.xmax, p.x);
        box.ymax = Math.max(box.ymax, p.y);
        return box;
      },
      { xmin: 0, xmax: 0, ymin: 0, ymax: 0 }
    );
    const scale = size / Math.max(aabb.xmax - aabb.xmin, aabb.ymax - aabb.ymin);

    const ctx = cvs.getContext("2d");
    ctx.translate(size * 0.5, -aabb.ymin * scale);
    ctx.scale(scale, scale);
    ctx.fillStyle = tableColor;
    ctx.beginPath();
    ctx.moveTo(utils.last(ngon).x, utils.last(ngon).y);
    for (let p of ngon) ctx.lineTo(p.x, p.y);
    ctx.fill();

    ctx.fillStyle = seatColor;
    for (let i = 0; i < N; i++) {
      if (table[i] === "o") {
        const x1 = (-Math.sin(0.5 * angleStep) * radius * (innerRadius - seatHeight)) / innerRadius;
        const y1 = (Math.cos(0.5 * angleStep) * radius * (innerRadius - seatHeight)) / innerRadius;
        ctx.fillRect(x1 + 10, y1, -x1 * 2 - 10 * 2, seatHeight);
      }
      ctx.rotate(angleStep);
    }
  }

  show() {
    this.gameOptionsForm["game"].value = this.client.gameEngine.game;
    this.gameOptionsForm["table"].value = Table.seatsToString(this.client.gameEngine.table.seats);
    this.gameOptionsForm["radius"].value = `${this.client.gameEngine.table.radius}`;
    this.gameOptionsForm["expandArea"].checked = !!this.client.gameEngine.table.expandArea;
    this.gameOptionsForm["areaVisibility"].value = `${this.client.gameEngine.table.areaVisibility}`;
    this.gameOptionsForm.style.visibility = "visible";
    this.gameOptionsForm.style.opacity = 1.0;
  }

  hide() {
    // Make the apply button lose focus
    this.applyBtn.blur();
    this.gameOptionsForm.style.visibility = "hidden";
    this.gameOptionsForm.style.opacity = 0.0;
  }
}

export const OptionsWindow = new _OptionsWindow();
