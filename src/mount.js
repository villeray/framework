import { render } from "./render.js";

const mounts = [];

export function mount(elem, app) {
  mounts.push({ elem, app });
  render(elem, app());
}

export function refresh() {
  for (const { elem, app } of mounts) {
    render(elem, app());
  }
}
