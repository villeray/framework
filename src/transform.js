import { VNode } from "./vnode.js";

export function transform(app) {
  return app != null && typeof app[Symbol.iterator] === "function"
    ? [...app].map(transformChild)
    : [app];
}

function transformChild(node) {
  // return value is either a string or a VNode object
  switch (node?.constructor) {
    case VNode:
      return node;
    case String:
    case Number:
      return node.toString();
    case Boolean:
    case undefined:
      // booleans, undefined, and null are ignored (rendered as empty text nodes)
      // to facilitate conditional rendering
      return "";
    default: {
      return VNode.debug(node);
    }
  }
}
