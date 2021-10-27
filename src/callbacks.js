// functions to be run after refresh
let callbacks = [];

export function queueCreate(elem) {
  // text elements don't have vnodeAttrs
  if (elem.vnodeAttrs?.aftercreate) {
    callbacks.push(() => elem.vnodeAttrs.aftercreate(elem));
  }
}

export function queueRemove(elem) {
  // text elements don't have vnodeAttrs
  if (elem.vnodeAttrs?.afterremove) {
    callbacks.push(() => elem.vnodeAttrs.afterremove(elem));
  }
}

export function queueUpdate(elem) {
  // text elements don't have vnodeAttrs
  if (elem.vnodeAttrs?.afterupdate) {
    callbacks.push(() => elem.vnodeAttrs.afterupdate(elem));
  }
}

export function runCallbacks() {
  callbacks.forEach((cb) => cb());
  // clear callbacks after running
  callbacks = [];
}
