import { buildURL } from "./build-url.js";
import { refresh } from "./refresh.js";

// set url and search params using window.history.pushState and refresh
// use addHistory = false for window.history.replaceState
export function route(path, params, addHistory = true) {
  if (typeof window === "undefined") {
    console.log(new Error(`invalid server-side call to 'route'`));
    return;
  }

  const url = buildURL(path, params);
  const absolute = new URL(url, window.location.href);

  // don't push history entry if new url is the same as old
  if (window.location.href !== absolute.href) {
    addHistory
      ? window.history.pushState({}, "", url)
      : window.history.replaceState({}, "", url);
  }

  refresh();
}

export function startWatchURL() {
  let oldURL = "";

  // polls for changes to window url
  // calls redraw on back navigation
  function doWatch() {
    const url = window.location.href;
    if (url !== oldURL) {
      oldURL = url;
      refresh();
    }
    requestAnimationFrame(doWatch);
  }

  // no await needed
  doWatch();
}

export function routeAttrs(attrs) {
  // combine path and params attrs to get href
  const href = buildURL(attrs.path ?? "", attrs.params ?? {});
  // make new object to avoid leaking mutations
  attrs = { ...attrs, href };
  delete attrs.path;
  delete attrs.params;
  return attrs;
}

// get current search params as an object
export function getParams(url) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

const specialChar = /\?|#/;

function splitURL(url) {
  // get url chars up to '?' or '#'
  url = url.split(specialChar)[0];
  // ignore empty value after trailing '/', if there is one
  return url.split("/").filter((s) => s !== "");
}

export function matchPath(path, route) {
  const patterns = splitURL(route);
  const chunks = splitURL(path);

  if (patterns.length > chunks.length) {
    return null;
  }

  const result = {};

  for (let index = 0; index < patterns.length; index++) {
    const pattern = patterns[index];
    const chunk = chunks[index];

    if (pattern.startsWith(":")) {
      result[pattern.slice(1)] = chunk;
    } else if (pattern === "*") {
      continue;
    } else if (pattern !== chunk) {
      return null;
    }
  }

  return result;
}
