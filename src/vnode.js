export class VNode {
  constructor(tag, attrs, children) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
  }

  static debug(value) {
    return new VNode("pre", {}, dump(value));
  }
}

// represents an element with the given tag, attributes, and children
export function v(tag, attrs, ...children) {
  // errors are logged to the console and rendered on the page
  if (typeof tag !== "string") {
    const message = "error: 'tag' must be a string";
    console.log(new Error(message), tag);
    return `(${message})`;
  }

  if (attrs?.constructor !== Object) {
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
