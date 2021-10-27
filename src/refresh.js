import { mounted } from "./mount.js";
import { render } from "./render.js";

// re-render all mounted apps
// triggered automatically by element event handlers and search param changes
// needs to call manually to render changes from 'setInterval', 'fetch', etc
export function refresh() {
  for (const mount of mounted()) {
    // maintain focus after render when the currently focused element has an id
    const activeID = mount.elem.activeElement?.id ?? "";

    render(mount.elem, mount.app());

    if (activeID !== "") {
      document.getElementById(activeID).focus();
    }
  }
}
