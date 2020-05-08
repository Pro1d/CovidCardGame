import * as utils from "./../common/utils";

import Selection from "./Selection";

const Button = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };

export default class InteractiveObject {
  constructor(gameObject, displayable, renderer, client, opts) {
    /*
    opts.onMouseOver // callback
    opts.onMouseOut // callback
    opts.onMouseWheel // callback
    opts.onRightClick // callback
    opts.rotationMinDistance (float) min distance from center to rotate instaed of dragging
    opts.rotating (bool) whether the user can rotate the object
    opts.groupSelectionPriority (int)
      -1 -> not selectable with group,
      0+ in a selecting group, only the objects with the highest value will be selected.
    */

    this.groupSelectionPriority = opts.groupSelectionPriority || 0;
    this.onMouseOver = opts.onMouseOver;
    this.onMouseOut = opts.onMouseOut;
    this.onRightClick = opts.onRightClick;
    this.rotating = opts.rotating || false;
    this.rotationMinDistance =
      opts.rotationMinDistance ||
      Math.min(displayable.hitArea.width / 2, displayable.hitArea.height / 2);
    this.gameObject = gameObject;
    this.displayable = displayable;
    this.displayable.interactive = true;
    this.mouseIsOver = false;
    this.objectGroup = opts.objectGroup;

    if (opts.onMouseWheel) {
      this.onMouseWheel = opts.onMouseWheel;
      this.displayable.interactiveMousewheel = true;
    }

    this._setupInteraction(renderer, client);
  }

  _setupInteraction(renderer, client) {
    this.displayable.interactive = true;
    const table = renderer.app.stage.table;

    // Mouse over
    this.displayable.on("mouseover", (e) => {
      this.mouseIsOver = true;
      if (renderer.selecting === null && renderer.dragging === null) {
        renderer.setCursorShape("pointer");
        if (this.onMouseOver) this.onMouseOver();
      }
    });

    // Mouse out
    this.displayable.on("mouseout", (e) => {
      this.mouseIsOver = false;
      if (renderer.selecting === null && renderer.dragging === null) {
        renderer.setCursorShape("default");
        if (this.onMouseOut) this.onMouseOut();
      }
    });

    this.displayable.on("mousewheel", (delta, e) => {
      // Update selection
      const singleCard = !client.selection.has(this.gameObject.id);
      if (singleCard)
        client.selection.resetChange().mergeChange(Selection.REPLACE).addChange(this.gameObject.id);

      this.onMouseWheel(delta);

      if (singleCard) client.selection.resetChange();
    });

    // Right click
    this.displayable.on("rightclick", (e) => {
      // Update selection
      const singleCard = !client.selection.has(this.gameObject.id);
      if (singleCard)
        client.selection.resetChange().mergeChange(Selection.REPLACE).addChange(this.gameObject.id);

      if (this.onRightClick) this.onRightClick();

      if (singleCard) client.selection.resetChange();
    });

    // Drag start
    this.displayable.on("mousedown", (e) => {
      if (renderer.commonInteraction(e)) {
        // event consumed by commonInteraction()
      } else if (e.data.button === Button.LEFT && e.data.originalEvent.ctrlKey) {
        if (client.selection.has(this.gameObject.id)) {
          // If Ctrl+Click on a selected object: keep only similar object in selection
          client.selection.resetChange();
          for (let keyValue of renderer.interactiveObjects) {
            const obj = keyValue[1];
            if (
              client.selection.has(obj.gameObject.id) &&
              obj.interaction.objectGroup === this.objectGroup
            )
              client.selection.addChange(obj.gameObject.id);
          }
          client.selection.mergeChange(Selection.REPLACE);
        } else {
          // If Ctrl+Click: select all similar object
          client.selection.resetChange();
          for (let keyValue of renderer.interactiveObjects) {
            const obj = keyValue[1];
            if (obj.interaction.objectGroup === this.objectGroup)
              client.selection.addChange(obj.gameObject.id);
          }
          // If shift is pressed, add selected objects to current selection
          client.selection.mergeChange(
            e.data.originalEvent.shiftKey ? Selection.ADD : Selection.REPLACE
          );
        }
      } else if (e.data.button === Button.LEFT && e.data.originalEvent.shiftKey) {
        client.selection.resetChange().addChange(this.gameObject.id).mergeChange(Selection.TOGGLE);
        client.selection.resetChange();
      } else if (e.data.button === Button.LEFT) {
        renderer.setCursorShape("grabbing");
        if (this.onMouseOut) this.onMouseOut(this.gameObject);

        // Update selection
        const singleCard = !client.selection.has(this.gameObject.id);
        if (singleCard)
          client.selection
            .resetChange()
            .mergeChange(Selection.REPLACE)
            .addChange(this.gameObject.id);

        const rel = e.data.getLocalPosition(this.displayable);
        const pos = e.data.getLocalPosition(table);
        const dist = Math.hypot(rel.x, rel.y);
        const rotate =
          this.rotating && dist > this.rotationMinDistance && client.selection.size === 1;

        renderer.dragging = {
          objId: this.gameObject.id,
          rotate: rotate,
          prevPos: pos,
          initialLocalDist: dist,
          pivotGlobal: table.toLocal(this.displayable.getGlobalPosition()),
        };

        if (!rotate) client.autoExecutionOnInteraction(client.selection);

        const ids = client.selection.toString();
        client.sendInput(`top ${ids}`);
      }
    });
    // Drag Move
    this.displayable.on("mousemove", (e) => {
      if (renderer.dragging && renderer.dragging.objId === this.gameObject.id) {
        const ids = client.selection.toString();
        const prevMousePos = renderer.dragging.prevPos.clone();
        const currMousePos = e.data.getLocalPosition(table);
        currMousePos.copyTo(renderer.dragging.prevPos);

        if (!renderer.dragging.rotate) {
          const dx = currMousePos.x - prevMousePos.x;
          const dy = currMousePos.y - prevMousePos.y;
          client.sendInput(`move ${dx},${dy} ${ids}`);
        } else {
          const xRelFrom = prevMousePos.x - renderer.dragging.pivotGlobal.x;
          const yRelFrom = prevMousePos.y - renderer.dragging.pivotGlobal.y;
          const xRelTo = currMousePos.x - renderer.dragging.pivotGlobal.x;
          const yRelTo = currMousePos.y - renderer.dragging.pivotGlobal.y;
          const distFrom = Math.hypot(xRelFrom, yRelFrom);
          const distTo = Math.hypot(xRelTo, yRelTo) / this.displayable.scale.x;
          // Do not push the card, only pull is allowed (and if the move has been
          // interrupted, resume it if only when we reached the initial anchor point)
          if (distTo > distFrom && distTo > renderer.dragging.initialLocalDist) {
            const dm = distTo - renderer.dragging.initialLocalDist;
            const dx = (xRelTo * dm) / distTo;
            const dy = (yRelTo * dm) / distTo;
            renderer.dragging.pivotGlobal.x += dx;
            renderer.dragging.pivotGlobal.y += dy;
            client.sendInput(`move ${dx},${dy} ${ids}`);
          }
          const angleFrom = Math.atan2(yRelFrom, xRelFrom);
          const angleTo = Math.atan2(yRelTo, xRelTo);
          const deltaAngle = (angleTo - angleFrom) * utils.DEGREES;
          client.sendInput(`rotate ${deltaAngle} ${ids}`);
        }
      }
    });
    // Drag End
    function dragEnd(e) {
      if (e.data.button == Button.LEFT) {
        if (renderer.dragging) {
          renderer.dragging = null;
          // clear selection
          client.selection.resetChange();
          renderer.setCursorShape("default");
        }
      }
    }
    this.displayable.on("mouseupoutside", dragEnd.bind(this));
    this.displayable.on("mouseup", dragEnd.bind(this));
  }
}
