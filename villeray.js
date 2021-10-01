const mounts = [];

export async function load(selector, app) {
  const elem = document.body.querySelector(selector);

  if (elem === null) {
    console.log(new Error(`no match for '${selector}' in document body`));
  } else {
    mounts.push({ elem, app });
    await refresh();
  }
}

export async function refresh() {
  const activeID = document.activeElement?.id ?? "";

  for (const mount of mounts) {
    const vnode = await transform(mount.app());
    mount.elem = await render(mount.elem, vnode);
  }

  if (activeID !== "") {
    const active = document.getElementById(activeID);
    if (active === null) {
      return;
    }

    // avoid re-running 'onfocus' for element that was previously focused
    const onFocus = active.onfocus;
    delete active.onfocus;
    active.focus();
    active.onfocus = onFocus;
  }
}

class VNode {
  constructor(tag, attrs, children) {
    Object.assign(this, { tag, attrs, children });

    if (tag === "a") {
      const href = buildURL(attrs.href ?? "", attrs.params ?? {});
      this.attrs = { ...attrs, href };

      if (attrs.href === undefined) {
        this.attrs.onclick = (e) => {
          if (!(e.ctrlKey || e.shiftKey || e.metaKey)) {
            setParams(attrs.params ?? {});
            e.preventDefault();
          }
        };
      }
    }
  }
}

export function h(tag, attrs, ...children) {
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

async function transform(node) {
  switch (node?.constructor) {
    case VNode:
      return node;
    case String:
    case Number:
      return String(node);
    case Boolean:
      return "";
    case Promise:
      return transform(await node);
    default:
      return h("pre", {}, JSON.stringify(node, null, 2));
  }
}

async function render(elem, vnode) {
  if (typeof vnode === "string") {
    if (elem.nodeType === Node.TEXT_NODE) {
      if (elem.textContent !== vnode) {
        elem.textContent = vnode;
      }
      return elem;
    }

    return replace(elem, await createElem(vnode));
  }

  if (vnode.tag.toUpperCase() === elem.tagName) {
    await setupElem(elem, vnode);
    return elem;
  }

  return replace(elem, await createElem(vnode));
}

function replace(elem, newElem) {
  elem.replaceWith(newElem);
  return newElem;
}

async function setAttributes(elem, attrs) {
  const oldAttrs = elem.vnode?.attrs ?? {};

  for (const [attr, value] of Object.entries(attrs)) {
    if (attr.startsWith("on") && oldAttrs[attr] !== value) {
      elem[attr] = async (event) => {
        await value(event);
        await refresh();
      };
    } else if (attr === "style" && typeof value === "object") {
      const oldStyles = oldAttrs.style ?? {};

      for (const [property, styleValue] of Object.entries(value)) {
        if (oldStyles[property] !== styleValue) {
          elem.style[property] = styleValue;
        }
      }

      for (const oldStyle of Object.keys(oldStyles)) {
        if (!Object.hasOwnProperty.call(value, oldStyle)) {
          delete elem.style[oldStyle];
        }
      }
    } else {
      switch (attr) {
        case "value":
        case "selected":
        case "checked":
          if (elem[attr] !== value) {
            elem[attr] = value;
          }
          break;
        default:
          if (oldAttrs[attr] !== value) {
            elem[attr] = value;
          }
      }
    }
  }

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

  for (let index = 0; index < numVNodes; index++) {
    if (index < numElems) {
      await render(elem.childNodes[index], transformed[index]);
    } else {
      elem.append(await createElem(transformed[index]));
      numElems++;
    }
  }

  while (numElems > numVNodes) {
    const lastChild = elem.childNodes[--numElems];
    elem.removeChild(lastChild);
  }
}

async function setupElem(elem, vnode) {
  await setAttributes(elem, vnode.attrs);
  await setChildren(elem, vnode.children);
  elem.vnode = vnode;
}

let inSVG = false;

async function createElem(vnode) {
  if (typeof vnode === "string") {
    return document.createTextNode(vnode);
  }

  const wasInSVG = inSVG;
  inSVG = inSVG || vnode.tag.toUpperCase() === "SVG";

  const elem = inSVG
    ? document.createElementNS("http://www.w3.org/2000/svg", vnode.tag)
    : document.createElement(vnode.tag);

  await setupElem(elem, vnode);

  inSVG = wasInSVG;
  return elem;
}

export function getParams() {
  return Object.fromEntries(
    new URL(window.location.href).searchParams.entries()
  );
}

function buildURL(path, params) {
  const url = new URL(path, window.location.href);
  url.search = "";

  for (const key of Object.keys(params).sort()) {
    url.searchParams.set(key, params[key]);
  }

  return url;
}

export async function setParams(params, addHistory = true) {
  const url = buildURL("", params);

  if (window.location.href !== url.href) {
    addHistory
      ? window.history.pushState({}, "", url)
      : window.history.replaceState({}, "", url);
  }

  await refresh();
}

let oldURL = "";

function startWatchURL() {
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

  doWatch(); // no await needed
}

startWatchURL();
