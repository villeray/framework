import { queueCreate, queueRemove, queueUpdate } from "./callbacks.js";
import { setClass } from "./class.js";
import { refresh } from "./refresh.js";
import { route, routeAttrs } from "./route.js";
import { setStyles } from "./style.js";
import { transform } from "./transform.js";

export function render(elem, children) {
  const transformed = transform(children);

  // tracking these as separate variables is much faster than
  // repeatedly querying the `length` property, not sure why
  const numVNodes = transformed.length;
  const numElems = elem.childNodes.length;
  const numOverlap = Math.min(numVNodes, numElems);

  // render to existing child elem
  // doesn't do anything fancy with keys, just replaces current children in order
  // focus gets restored later using element id
  for (let index = 0; index < numOverlap; index++) {
    renderChild(elem.childNodes[index], transformed[index]);
  }

  // make new child elem
  for (let index = numOverlap; index < numVNodes; index++) {
    elem.append(createElem(transformed[index]));
  }

  // remove unused child elems
  for (let index = numVNodes; index < numOverlap; index++) {
    // remove the next trailing element
    elem.removeChild(elem.children[numOverlap]);
    queueRemove(elem);
  }
}

// update elem to match vnode if it has a compatible type
// otherwise replace it with a new elem
// vnode is either a string of a VNode object
function renderChild(elem, vnode) {
  if (typeof vnode === "string") {
    if (elem.nodeType === Node.TEXT_NODE) {
      // update existing text elem
      if (elem.textContent !== vnode) {
        elem.textContent = vnode;
      }

      return;
    }

    // replace elem with new text elem
    elem.replaceWith(createElem(vnode));
    queueRemove(elem);
    return;
  }

  if (vnode.tag === "route") {
    renderRoute(elem, vnode);
    return;
  }

  if (vnode.tag.toUpperCase() === elem.tagName) {
    // elem.tagName is always uppercase
    // vnode.tag is case insensitive

    // update existing elem
    render(elem, vnode.children);
    setAttributes(elem, vnode.attrs);
    queueUpdate(elem);
    return;
  }

  // replace elem with new elem
  elem.replaceWith(createElem(vnode));
  queueRemove(elem);
}

function renderRoute(elem, { attrs, children }) {
  function onclick(e) {
    // don't hijack ctrl-click and such for links
    // ctrl-click for new tab will still work since href is set
    if (!(e.ctrlKey || e.shiftKey || e.metaKey)) {
      route(attrs.path ?? "", attrs.params ?? {});
      e.preventDefault();
    }
  }

  const newAttrs = {
    ...routeAttrs(attrs),
    onclick,
  };

  renderChild(elem, {
    tag: "a",
    attrs: newAttrs,
    children,
  });
}

function setAttributes(elem, attrs) {
  // elem won't have oldAttrs on first render
  const oldAttrs = elem.vnodeAttrs ?? {};

  attrs = setStyles(attrs);
  attrs = setClass(attrs);

  // store vnode attrs for future setAttributes diffs
  // some attributes like 'checked' don't appear in
  // elem.attributes, so we have to keep track separately
  elem.vnodeAttrs = attrs;

  // don't transform lifecycle handlers
  const entries = Object.entries(attrs).filter(shouldSetAttribute);

  for (const [attr, value] of entries) {
    if (attr.startsWith("on")) {
      // check if inner handler provided is the same as the one previously
      // given to avoid recreating wrapper function is possible
      if (oldAttrs[attr] !== value) {
        // wrapper which calls given event handler and refreshes
        elem[attr] = (...args) => {
          value(...args);
          refresh();
        };
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
    if (attrs[oldAttr] == undefined) {
      delete elem[oldAttr];
    }
  }
}

function shouldSetAttribute(entry) {
  const attr = entry[0];
  switch (attr) {
    case "aftercreate":
    case "afterupdate":
    case "afterremove":
      return false;
  }

  return true;
}

// tracks special case for making SVG descendant elements
let inSVG = false;

function createElem(vnode) {
  if (typeof vnode === "string") {
    return document.createTextNode(vnode);
  }

  const { tag, attrs, children } = vnode;

  const wasInSVG = inSVG;
  inSVG ||= tag.toUpperCase() === "SVG";

  const elem = inSVG
    ? document.createElementNS("http://www.w3.org/2000/svg", tag)
    : document.createElement(tag);

  render(elem, children);
  setAttributes(elem, attrs);
  queueCreate(elem);

  inSVG = wasInSVG;
  return elem;
}
