// [{ elem, app }, ...]
const mounts = [];

// mount an app that replaces the element matching selector
export async function mount(selector, app) {
  const elem = document.body.querySelector(selector);

  if (elem === null) {
    console.log(new Error(`no match for '${selector}' in document body`));
  } else {
    mounts.push({ elem, app });
    await refresh();
  }
}

// re-render all mounted apps
// triggered automatically by element event handlers and search param changes
// need to call manually to render changes from 'setInterval', 'fetch', etc
export async function refresh() {
  for (const mount of mounts) {
    // used maintain focus after render when the currently focused element has an id
    const activeId = mount.elem.activeElement?.id ?? "";

    const vnode = await transform(mount.app());
    // could return the same element, or a new one
    mount.elem = await render(mount.elem, vnode);

    restoreActive(mount.elem, activeId);
  }
}

function restoreActive(elem, id) {
  if (id !== "") {
    const newActive = elem.getElementById(id);
    const oldActive = elem.activeElement ?? document.body;

    if (newActive === null) {
      // there was no previously focused element
      // or there was but it didn't have an id
      // or it was removed from the page / lost its id
      return;
    }

    // avoid re-running 'onfocus' for element that was previously focused
    // or 'onblur' for element that was temporarily focused
    const onFocus = newActive.onfocus;
    const onBlur = oldActive.onblur;

    delete newActive.onfocus;
    delete oldActive.onfocus;

    newActive.focus();
    newActive.onfocus = onFocus;
    oldActive.onblur = onBlur;
  }
}

class VNode {
  constructor(tag, attrs, children) {
    Object.assign(this, { tag, attrs, children });

    if (tag === "a") {
      // combine give href and params attrs to get full url
      const href = buildURL(attrs.href ?? "", attrs.params ?? {});
      this.attrs = { ...attrs, href };

      // links that change search params only use window.history.pushState
      // to avoid a full page re-render
      if (attrs.href === undefined) {
        // don't overwrite existing click handler if there is one
        this.attrs.onclick ??= (e) => {
          // don't hijack ctrl-click and such for links
          // ctrl-click etc will still work since href is set
          if (!(e.ctrlKey || e.shiftKey || e.metaKey)) {
            setParams(attrs.params ?? {});
            e.preventDefault();
          }
        };
      }
    }
  }
}

// represents an element with the given tag, attributes, and children
export function h(tag, attrs, ...children) {
  // errors are logged to the console and rendered on the page
  if (typeof tag !== "string") {
    const message = "error: 'tag' must be a string";
    console.log(new Error(message), tag);
    return `(${message})`;
  }
  if (typeof attrs !== "object") {
    const message = "error: 'attrs' must be an object";
    console.log(new Error(message), tag);
    return `(${message})`;
  }
  return new VNode(tag, attrs, children);
}

function replacer(key, val) {
  if (val instanceof Function) {
    return `[function ${val.name}]`;
  }

  return val
}

async function transform(node) {
  // returns value is either a string or a VNode object
  switch (node?.constructor) {
    case VNode:
      return node;
    case String:
    case Number:
      return String(node);
    case Boolean:
    case undefined:
      // booleans, undefined, and null are ignored (rendered as empty text nodes)
      // to facilitate conditional rendering
      // https://reactjs.org/docs/jsx-in-depth.html#booleans-null-and-undefined-are-ignored
      return "";
    case Promise:
      // resolve promises
      return transform(await node);
    default:
      // dump objects in text form, for debugging
      return h("pre", {}, JSON.stringify(node, replacer, 2));
  }
}

// update elem to match vnode if it has a compatible type
// otherwise replace it with a new elem
// vnode is either a string of a VNode object
async function render(elem, vnode) {
  if (typeof vnode === "string") {
    if (elem.nodeType === Node.TEXT_NODE) {
      // update existing text elem
      if (elem.textContent !== vnode) {
        elem.textContent = vnode;
      }
      return elem;
    }

    // replace elem with new text elem
    return replace(elem, await createElem(vnode));
  }

  // elem.tagName is always uppercase
  // vnode.tag is case insensitive
  if (vnode.tag.toUpperCase() === elem.tagName) {
    // update existing elem
    await setupElem(elem, vnode);
    return elem;
  }

  // replace elem with new elem
  return replace(elem, await createElem(vnode));
}

function replace(elem, newElem) {
  elem.replaceWith(newElem);
  return newElem;
}

async function setAttributes(elem, attrs) {
  // elem won't have oldAttrs on first render
  const oldAttrs = elem.vnodeAttrs ?? {};

  // store vnode attrs for future setAttributes diffs
  elem.vnodeAttrs = attrs;

  for (const [attr, value] of Object.entries(attrs)) {
    if (attr.startsWith("on") && oldAttrs[attr] !== value) {
      // wrapper which calls given event handler and refreshes
      elem[attr] = async (...args) => {
        await value(...args);
        await refresh();
      };
    } else if (attr === "style" && typeof value === "object") {
      // makes it possible to specify element styles as an object
      // instead of a string

      // styles may not have been set previously
      const oldStyles = oldAttrs.style ?? {};

      for (const [property, styleValue] of Object.entries(value)) {
        if (oldStyles[property] !== styleValue) {
          elem.style[property] = styleValue;
        }
      }

      // remove old styles
      for (const property of Object.values(oldStyles)) {
        if (!Object.hasOwnProperty.call(value, property)) {
          elem.style.removeProperty(property);
        }
      }
    } else if (elem[attr] !== value) {
      // check against elem property directly, not oldAttrs, in case
      // the property value got converted to some other type
      // (for example, a number converted to a string 'value' property)
      elem[attr] = value;
    }
  }

  // remove attrs set by old vnode that are no longer used
  // Object.keys(elem) should only return attrs that were previously set
  for (const oldAttr of Object.keys(oldAttrs)) {
    if (!Object.hasOwnProperty.call(attrs, oldAttr)) {
      delete elem[oldAttr];
    }
  }
}

async function setChildren(elem, children) {
  const transformed = await Promise.all(children.map(transform));

  // tracking these as separate variables is much faster than
  // repeatedly querying the `length` property, not sure why
  let numVNodes = transformed.length;
  let numElems = elem.childNodes.length;

  // doesn't do anything fancy with keys, just replaces current children in-order
  // focus gets restored later using element id
  for (let index = 0; index < numVNodes; index++) {
    if (index < numElems) {
      // render to existing child elem
      await render(elem.childNodes[index], transformed[index]);
    } else {
      // make new child elem
      elem.append(await createElem(transformed[index]));
      numElems++;
    }
  }

  // make unused child elems
  while (numElems > numVNodes) {
    const lastChild = elem.childNodes[--numElems];
    elem.removeChild(lastChild);
  }
}

// vnode is a VNode object, setupElem is not called for string elements
// since they have no attrs or children
async function setupElem(elem, vnode) {
  await setAttributes(elem, vnode.attrs);
  await setChildren(elem, vnode.children);
}

// tracks special case for making SVG descendant elements
let inSVG = false;

async function createElem(vnode) {
  if (typeof vnode === "string") {
    return document.createTextNode(vnode);
  }

  const wasInSVG = inSVG;
  inSVG ||= vnode.tag.toUpperCase() === "SVG";

  const elem = inSVG
    ? document.createElementNS("http://www.w3.org/2000/svg", vnode.tag)
    : document.createElement(vnode.tag);

  await setupElem(elem, vnode);

  inSVG = wasInSVG;
  return elem;
}

// get current search params as an object
export function getParams() {
  return Object.fromEntries(
    new URL(window.location.href).searchParams.entries()
  );
}

// combine path (relative to current location or absolute)
// with new search params to get new url
function buildURL(path, params) {
  const url = new URL(path, window.location.href);
  url.search = "";

  for (const key of Object.keys(params).sort()) {
    url.searchParams.set(key, params[key]);
  }

  return url;
}

// set new search params using window.history.pushState and refresh
// use addHistory = false for window.history.replaceState
export async function setParams(params, addHistory = true) {
  const url = buildURL("", params);

  if (window.location.href !== url.href) {
    addHistory
      ? window.history.pushState({}, "", url)
      : window.history.replaceState({}, "", url);
  }

  await refresh();
}

function startWatchURL() {
  let oldURL = "";

  // polls for changes to window url
  // calls redraw on back navigation
  async function doWatch() {
    const url = window.location.href;
    if (url !== oldURL) {
      oldURL = url;
      await refresh();
    }
    requestAnimationFrame(doWatch);
  }

  // no await needed
  doWatch();
}

startWatchURL();
