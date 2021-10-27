import { setClass } from "./class.js";
import { routeAttrs } from "./route.js";
import { setStyles } from "./style.js";
import { VNode } from "./vnode.js";

// convert vnode to html for server-side render
export function serialize(vnode) {
  return [vnode].flat(Infinity).map(serializeChild).join("");
}

function serializeVNode({ tag, attrs, children }) {
  if (tag === "route") {
    return serializeRoute(attrs, children);
  }

  attrs = setStyles(attrs);
  attrs = setClass(attrs);

  // valid tag shouldn't need escaping, but do it anyway to be safe
  const tagStr = escapeHTML(tag).toLowerCase();
  const attrStr = Object.entries(attrs)
    .filter(shouldSerialize)
    .map(showAttr)
    .join("");

  // flatten to full depth
  const childrenStr = serialize(children);

  if (isEmptyTag(tagStr)) {
    return `<${tagStr}${attrStr} />`;
  }

  return `<${tagStr}${attrStr}>${childrenStr}</${tagStr}>`;
}

// don't serialize event handlers
function shouldSerialize(entry) {
  const attr = entry[0];
  return !attr.startsWith("on");
}

function serializeRoute(attrs, children) {
  return serializeVNode({ tag: "a", attrs: routeAttrs(attrs), children });
}

function serializeChild(value) {
  switch (value?.constructor) {
    case VNode:
      return serializeVNode(value);
    case Number:
      return value.toString();
    case String:
      return escapeHTML(value);
    case Boolean:
    case undefined:
      // booleans, undefined, and null are ignored (rendered as empty text nodes)
      // to facilitate conditional rendering
      return "";
    default: {
      return serialize(VNode.debug(value));
    }
  }
}

// escape html chars
function escapeHTML(str) {
  return String(str)
    .replaceAll(`&`, "&amp;")
    .replaceAll(`<`, "&lt;")
    .replaceAll(`>`, "&gt;")
    .replaceAll(`"`, "&quot;")
    .replaceAll(`'`, "&apos;");
}

function isEmptyTag(tagStr) {
  switch (tagStr) {
    case "area":
    case "base":
    case "br":
    case "col":
    case "embed":
    case "hr":
    case "img":
    case "input":
    case "link":
    case "meta":
    case "param":
    case "source":
    case "track":
    case "wbr":
      return true;
    default:
      return false;
  }
}

function showAttr([attr, val]) {
  // render boolean attrs as flags
  switch (val) {
    case true:
      return ` ${escapeHTML(attr)}`;
    case false:
      return "";
  }

  // valid attr name shouldn't need escaping, but do it anyway to be safe
  return ` ${escapeHTML(attr)}="${escapeHTML(String(val))}"`;
}
