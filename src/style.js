const camelChar = /(?<=[a-z])[A-Z]/g;

// for css properties
function snakeCase(str) {
  return str.replaceAll(camelChar, (c) => `-${c}`.toLowerCase());
}

function showStyle([property, value]) {
  return `${snakeCase(property)}: ${value};`;
}

export function setStyles(attrs) {
  if (attrs.style instanceof Object) {
    // convert object of property -> style definitions to a style string
    const styles = Object.entries(attrs.style).map(showStyle);
    return { ...attrs, style: styles.join(" ") };
  }

  return attrs;
}
