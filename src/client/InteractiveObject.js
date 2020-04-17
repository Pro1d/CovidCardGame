import * as utils from './../common/utils';


const Button = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
const ButtonFlag = { LEFT: 0x1, MIDDLE: 0x4, RIGHT: 0x2 };
export default class InteractiveObject {
  constructor(gameObject, displayable, renderer, client, opts) {
    /*
    opts.onMouseOver // callback
    opts.onMouseOut // callback
    opts.onRightClick // callback
    opts.rotationMinDistance (float) min distance from center to rotate instaed of dragging
    opts.rotating (bool) whether the user can rotate the object

    opts.onscrollup // rotate card+, roll dice
    opts.onscrolldown // rotate card-
    opts.ondragstart // auto align
    opts.ondragmove // nothing
    opts.ondragend // trigger auto align in hand ?
    opts.ondoubleclick // not yet available
    opts.selectioncategory // Category.{Type, priority}

    */

    this.onMouseOver = opts.onMouseOver;
    this.onMouseOut = opts.onMouseOut;
    this.onRightClick = opts.onRightClick;
    this.rotating = opts.rotating || false;
    this.rotationMinDistance = opts.rotationMinDistance ||
      Math.min(displayable.hitArea.width / 2, displayable.hitArea.height / 2);
    this.gameObject = gameObject;
    this.displayable = displayable;
    this.displayable.interactive = true;
    this.mouseIsOver = false;

    this._setupInteraction(renderer, client);
  }

  _setupInteraction(renderer, client) {
    this.displayable.interactive = true;
    const table = renderer.app.stage.table;

    // Mouse over
    this.displayable.on("mouseover", e => {
      this.mouseIsOver = true;
      if (renderer.selecting === null && renderer.dragging === null) {
        renderer.setCursorShape("pointer");
        if (this.onMouseOver)
          this.onMouseOver();
      }
    });

    // Mouse out
    this.displayable.on("mouseout", e => {
      this.mouseIsOver = false;
      if (renderer.selecting === null && renderer.dragging === null) {
        renderer.setCursorShape("default");
        if (this.onMouseOut)
          this.onMouseOut();
      }
    });

    // Right click
    this.displayable.on("rightclick", e => {
      // Update selection
      const sel_index = client.selection.indexOf(this.gameObject.id);
      if (sel_index !== -1) {
        let tmp = client.selection[0];
        client.selection[0] = client.selection[sel_index];
        client.selection[sel_index] = tmp;
      } else {
        // Equivalent to client.selection = [this.gameObject.id]
        client.selection.splice(0, client.selection.length, this.gameObject.id);
      }

      if (this.onRightClick)
        this.onRightClick();

      // restore selection
      if (sel_index === -1) {
        client.selection.splice(0, client.selection.length);
      }
    });

    // Drag start
    this.displayable.on("mousedown", e => {
      if (renderer.commonInteraction(e)) {
        // event consumed by commonInteraction()
      }
      else if (e.data.button == Button.LEFT) {
        renderer.setCursorShape("grabbing");
        if (this.onMouseOut)
          this.onMouseOut(this.gameObject);

        const sel_index = client.selection.indexOf(this.gameObject.id);
        if (sel_index === -1) {
          // clear selection, create a single-card selection
          client.selection.splice(0, client.selection.length, this.gameObject.id);
        }

        const rel = e.data.getLocalPosition(this.displayable);
        const pos = e.data.getLocalPosition(table);
        const dist = Math.hypot(rel.x, rel.y);
        const rotate = this.rotating && (dist > this.rotationMinDistance && client.selection.length === 1);

        renderer.dragging = {
          objId: this.gameObject.id,
          rotate: rotate,
          prevPos: pos,
          initialLocalDist: dist,
          pivotGlobal: table.toLocal(this.displayable.getGlobalPosition())
        };

        if (!rotate)
            client.autoExecutionOnInteraction(client.selection);

        const ids = client.selection.toString();
        client.sendInput(`top ${ids}`);
      }
    });
    // Drag Move
    this.displayable.on("mousemove", e => {
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
            const dx = xRelTo * dm / distTo;
            const dy = yRelTo * dm / distTo;
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
      console.log(e.data.button, e.data.buttons, "dragEnd? try with left/right simultaneously");
      if (e.data.button == Button.LEFT) {
        renderer.dragging = null;
        // clear selection
        if (client.selection.length === 1) {
          client.selection.splice(0, client.selection.length);
        }
      }
      renderer.setCursorShape("default");
    }
    this.displayable.on("mouseupoutside", dragEnd.bind(this));
    this.displayable.on("mouseup", dragEnd.bind(this));
  }
}
