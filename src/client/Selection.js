import * as utils from "../common/utils";
export default class Selection {
  // active selection: private, mutable through temporary selection
  // temporary selection: to add/remove id to selection, for rectangle selection
  constructor() {
    this.activeSelection = new Set();
    this.temporarySelection = new Set();
  }

  // active + temporary
  toString() {
    let str = "";
    this.activeSelection.forEach((x) => {
      str += x + ",";
    });
    this.temporarySelection.forEach((x) => {
      if (!this.activeSelection.has(x)) str += x + ",";
    });
    return str.substr(0, str.length - 1);
  }

  static parse(str) {
    return utils.parseIntArray(str);
  }

  // active + temporary (const)
  get empty() {
    return this.activeSelection.size + this.temporarySelection.size > 0;
  }

  // active + temporary (const)
  get size() {
    return this.activeSelection.size + this.temporarySelection.size;
  }

  // active + temporary (const)
  has(id) {
    return this.activeSelection.has(id) || this.temporarySelection.has(id);
  }

  // write temporary
  resetChange() {
    this.temporarySelection.clear();
    return this;
  }

  // write temporary
  addChange(id) {
    this.temporarySelection.add(id);
    return this;
  }

  get changeSize() {
    return this.temporarySelection.size;
  }

  // temporary -> active
  mergeChange(mergeStrategy) {
    if (mergeStrategy === Selection.REPLACE) this.activeSelection.clear();

    if (mergeStrategy === Selection.TOGGLE)
      this.temporarySelection.forEach(this._toggleActive.bind(this));
    else
      this.temporarySelection.forEach((id) => {
        this.activeSelection.add(id);
      });

    this.temporarySelection.clear();
    return this;
  }

  // active (private)
  _toggleActive(id) {
    if (!this.activeSelection.delete(id)) this.activeSelection.add(id);
  }
}

Selection.ADD = 0;
Selection.REPLACE = 1;
Selection.TOGGLE = 2;
