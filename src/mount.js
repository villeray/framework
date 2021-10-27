import { refresh } from "./refresh.js";
import { startWatchURL } from "./route.js";

// [{ elem, app }, ...]
const mounts = [];

export function mounted() {
  return mounts;
}

// mount an app inside the element matching selector
export function mount(selector, app) {
  if (typeof document === "undefined") {
    console.log(new Error(`invalid server-side call to 'mount'`));
    return;
  }

  if (mounts.length === 0) {
    // only start once, at first mount
    startWatchURL();
  }

  // mount element must be in documeny.body
  const elem = document.body.querySelector(selector);

  if (elem === null) {
    console.log(new Error(`no match for '${selector}' in document body`));
  } else {
    mounts.push({ elem, app });
    refresh();
  }
}
