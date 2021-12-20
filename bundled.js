var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};

// src/class.js
function setClass(attrs) {
  if (attrs.class instanceof Array) {
    attrs.class = attrs.class.join(" ");
  }
  attrs.className = attrs.class;
  delete attrs.class;
}

// src/style.js
var camelChar = /(?<=[a-z])[A-Z]/g;
function snakeCase(str) {
  return str.replaceAll(camelChar, (c) => `-${c}`.toLowerCase());
}
function showStyle([property, value]) {
  return `${snakeCase(property)}: ${value};`;
}
function setStyles(attrs) {
  if (attrs.style instanceof Object) {
    attrs.style = Object.entries(attrs.style).map(showStyle).join(" ");
  }
}

// src/vnode.js
var VNode = class {
  constructor(tag, attrs, children) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
  }
  static debug(value) {
    return new VNode("pre", {}, dump(value));
  }
};
function v(tag, attrs, ...children) {
  if (typeof tag !== "string") {
    const message = "error: 'tag' must be a string";
    console.log(new Error(message), tag);
    return `(${message})`;
  }
  if ((attrs == null ? void 0 : attrs.constructor) !== Object) {
    const message = "error: 'attrs' must be an object";
    console.log(new Error(message), tag);
    return `(${message})`;
  }
  return new VNode(tag, attrs, children);
}
function dump(value) {
  if (value instanceof Function) {
    return `[function ${value.name}]`;
  }
  if (value.toString !== Object.prototype.toString) {
    return value.toString();
  }
  return JSON.stringify(value, (key, val) => dump(val), 2);
}

// src/transform.js
function transform(app) {
  return app != null && typeof app[Symbol.iterator] === "function" ? [...app].map(transformChild) : [app];
}
function transformChild(node) {
  switch (node == null ? void 0 : node.constructor) {
    case VNode:
      return node;
    case String:
    case Number:
      return node.toString();
    case Boolean:
    case void 0:
      return "";
    default: {
      return VNode.debug(node);
    }
  }
}

// src/render.js
function render(elem, children) {
  const transformed = transform(children);
  const numVNodes = transformed.length;
  const numElems = elem.childNodes.length;
  const numOverlap = Math.min(numVNodes, numElems);
  for (let index = 0; index < numOverlap; index++) {
    renderChild(elem.childNodes[index], transformed[index]);
  }
  for (let index = numOverlap; index < numVNodes; index++) {
    elem.append(createElem(transformed[index]));
  }
  const oldNodes = [...elem.childNodes];
  for (let index = numOverlap; index < numElems; index++) {
    oldNodes[index].remove();
  }
}
function renderChild(elem, vnode) {
  if (typeof vnode === "string") {
    if (elem.nodeType === Node.TEXT_NODE) {
      if (elem.textContent !== vnode) {
        elem.textContent = vnode;
      }
      return;
    }
    elem.replaceWith(createElem(vnode));
    return;
  }
  if (vnode.tag.toUpperCase() === elem.tagName) {
    render(elem, vnode.children);
    setAttributes(elem, vnode.attrs);
    return;
  }
  elem.replaceWith(createElem(vnode));
}
function setAttributes(elem, attrs) {
  var _a;
  const oldAttrs = (_a = elem.vnodeAttrs) != null ? _a : {};
  attrs = __spreadValues({}, attrs);
  setStyles(attrs);
  setClass(attrs);
  elem.vnodeAttrs = attrs;
  for (const [attr, value] of Object.entries(attrs)) {
    if (elem[attr] !== value) {
      elem[attr] = value;
    }
  }
  for (const oldAttr of Object.keys(oldAttrs)) {
    if (attrs[oldAttr] == void 0) {
      delete elem[oldAttr];
    }
  }
}
var inSVG = false;
function createElem(vnode) {
  if (typeof vnode === "string") {
    return document.createTextNode(vnode);
  }
  const { tag, attrs, children } = vnode;
  const wasInSVG = inSVG;
  inSVG || (inSVG = tag.toUpperCase() === "SVG");
  const elem = inSVG ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  render(elem, children);
  setAttributes(elem, attrs);
  inSVG = wasInSVG;
  return elem;
}

// src/mount.js
var mounts = [];
function mount(elem, app) {
  mounts.push({ elem, app });
  render(elem, app());
}
function refresh() {
  for (const { elem, app } of mounts) {
    render(elem, app());
  }
}
export {
  mount,
  refresh,
  v
};
