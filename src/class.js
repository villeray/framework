export function setClass(attrs) {
  // convert array of class names to class string
  if (attrs.class instanceof Array) {
    attrs.class = attrs.class.join(" ");
  }

  // class actually gets set through attribute 'className'
  attrs.className = attrs.class;

  // remove 'class' attr
  delete attrs.class;
}
