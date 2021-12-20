import { setClass } from "./class.js";
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

  const oldNodes = [...elem.childNodes];

  // remove unused child elems
  for (let index = numOverlap; index < numElems; index++) {
    // remove the next trailing element
    oldNodes[index].remove();
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
    return;
  }

  if (vnode.tag.toUpperCase() === elem.tagName) {
    // elem.tagName is always uppercase
    // vnode.tag is case insensitive

    // update existing elem
    render(elem, vnode.children);
    setAttributes(elem, vnode.attrs);
    return;
  }

  // replace elem with new elem
  elem.replaceWith(createElem(vnode));
}

function setAttributes(elem, attrs) {
  // elem won't have oldAttrs on first render
  const oldAttrs = elem.vnodeAttrs ?? {};

  // don't mutate original 'attrs' object
  attrs = { ...attrs };
  setStyles(attrs);
  setClass(attrs);

  // store vnode attrs for future setAttributes diffs
  // some attributes like 'checked' don't appear in
  // elem.attributes, so we have to keep track separately
  elem.vnodeAttrs = attrs;

  for (const [attr, value] of Object.entries(attrs)) {
    if (elem[attr] !== value) {
      // check against elem property directly, not oldAttrs, in case
      // the property value got converted to some other type
      // (for example, a number converted to a string 'value' property)
      elem[attr] = value;
    }
  }

  // remove attrs set by old vnode that are no longer used
  for (const oldAttr of Object.keys(oldAttrs)) {
    if (attrs[oldAttr] == undefined) {
      delete elem[oldAttr];
    }
  }
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

  inSVG = wasInSVG;
  return elem;
}
