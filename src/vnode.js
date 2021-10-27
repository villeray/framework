export class VNode {
  constructor(tag, attrs, children) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
  }

  static debug(value) {
    let valueStr;
    if (value instanceof Function) {
      valueStr = showFunction(value);
    } else if (value.toString !== Object.prototype.toString) {
      valueStr = value.toString();
    } else {
      valueStr = JSON.stringify(value, replacer, 2);
    }
    return new VNode("pre", {}, valueStr);
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

function replacer(key, val) {
  if (val instanceof Function) {
    return showFunction(val);
  }

  return val;
}

function showFunction(func) {
  return `[function ${func.name}]`;
}
