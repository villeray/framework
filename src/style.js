const camelChar = /(?<=[a-z])[A-Z]/g;

// for css properties
function snakeCase(str) {
  return str.replaceAll(camelChar, (c) => `-${c}`.toLowerCase());
}

function showStyle([property, value]) {
  return `${snakeCase(property)}: ${value};`;
}

export function setStyles(attrs) {
  // convert object of property / style definitions to a style string
  if (attrs.style instanceof Object) {
    attrs.style = Object.entries(attrs.style).map(showStyle).join(" ");
  }
}
