export function setClass(attrs) {
  // convert array of class names to class string
  if (attrs.class instanceof Array) {
    return { ...attrs, class: attrs.class.join(" ") };
  }

  if (attrs.class) {
    // class actually gets set through attribute 'className'
    attrs = { ...attrs, className: attrs.class };
    // remove 'class' attr
    delete attrs.class;
    return attrs;
  }

  return attrs;
}
