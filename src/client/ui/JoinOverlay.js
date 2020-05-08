class _JoinOverlay {
  init(client) {
    this.client = client;
    this.inputName = document.querySelector("#nameInput");
    this.overlay = this.inputName.parentElement;
  }

  getInputName() {
    const value = this.inputName.value.replace(/\s+/g, " ").replace(/^ | $/g, "");
    this.inputName.value = value;
    return value;
  }

  show() {
    this.overlay.style.visibility = "visible";
    this.inputName.select();
    this.client.unbindKeys();
  }

  hide() {
    this.overlay.style.visibility = "hidden";
    this.client.bindKeys();
  }
}

export const JoinOverlay = new _JoinOverlay();
