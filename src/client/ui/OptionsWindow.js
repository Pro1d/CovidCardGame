import Catalog from '../../data/Catalog.js';

class _OptionsWindow {
  constructor() {
  }

  init(client) {
    this.client = client;
    this.gameOptionsForm = document.getElementById("gameOptions");

    this._setupGameList();

    // Close button
    const closeBtn = this.gameOptionsForm.querySelector("#close");
    closeBtn.onclick = this.hide.bind(this);

    // Apply button
    this.applyBtn = this.gameOptionsForm.querySelector("#apply");
    this.applyBtn.onclick = () => {
      if (this.gameOptionsForm.style.visibility === "visible") {
        const game = this.gameOptionsForm["game"].value;
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
      const description = game['description'] ? " - " + game['description'] : "";
      gameItemsHTML += itemFormat
        .replace(new RegExp("\\{id\\}", 'g'), gameKey)
        .replace(new RegExp("\\{name\\}", 'g'), game['name'])
        .replace(new RegExp("\\{description\\}", 'g'), description);
    }
    gameListElt.innerHTML = gameItemsHTML;
  }

  show() {
    this.gameOptionsForm["game"].value = this.client.gameEngine.game;
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
