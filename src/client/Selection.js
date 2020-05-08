
export default class Selection {
  // active selection: private, mutable through temporary selection
  // temporary selection: to add/remove id to selection, for rectangle selection
  constructor() {
    this.active_selection = new Set();
    this.temporary_selection = new Set();
  }

  // active + temporary
  toString() {
    let str = "";
    this.active_selection.forEach((x) => {
 str += x + ",";
});
    this.temporary_selection.forEach((x) => {
      if (!this.active_selection.has(x))
        str += x + ",";
    });
    return str.substr(0, str.length - 1);
  }

  // active + temporary (const)
  get empty() {
    return (this.active_selection.size + this.temporary_selection.size) > 0;
  }

  // active + temporary (const)
  get size() {
    return this.active_selection.size + this.temporary_selection.size;
  }

  // active + temporary (const)
  has(id) {
    return this.active_selection.has(id) || this.temporary_selection.has(id);
  }

  // write temporary
  resetChange() {
    this.temporary_selection.clear();
    return this;
  }

  // write temporary
  addChange(id) {
    this.temporary_selection.add(id);
    return this;
  }

  get changeSize() {
    return this.temporary_selection.size;
  }

  // temporary -> active
  mergeChange(mergeStrategy) {
    if (mergeStrategy === Selection.REPLACE)
      this.active_selection.clear();

    if (mergeStrategy === Selection.TOGGLE)
      this.temporary_selection.forEach(this._toggleActive.bind(this));
    else
      this.temporary_selection.forEach((id) => {
        this.active_selection.add(id);
      });

    this.temporary_selection.clear();
    return this;
  }

  // active (private)
  _toggleActive(id) {
    if (!this.active_selection.delete(id))
      this.active_selection.add(id);
  }

  // clearTemporary() { this.temporary_selection.clear(); }
  // clearActive() { this.active_selection.clear(); }
  // addTemporary(id) { this.temporary_selection.add(id); }
  // addActive(id) { this.active_selection.add(id); }
  // toggleTemporary(id) {
  //  if (!this.temporary_selection.delete(id))
  //    this.temporary_selection.add(id);
  // }
}

Selection.ADD = 0;
Selection.REPLACE = 1;
Selection.TOGGLE = 2;
