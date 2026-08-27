import { isAuthenticated } from "./services/auth.service.js";
import { renderShell } from "./components/layout/layout.js";

const routes = {};

export function registerRoute(path, renderFn) {
  routes[path] = renderFn;
}

export function navigate(path) {
  window.location.hash = `#${path}`;
}

async function resolve() {
  const path = window.location.hash.slice(1) || "/dashboard";

  if (path !== "/login" && !isAuthenticated()) {
    window.location.hash = "#/login";
    return;
  }
  if (path === "/login" && isAuthenticated()) {
    window.location.hash = "#/dashboard";
    return;
  }

  renderShell();

  const render = routes[path] || routes["/dashboard"];
  const outlet = document.getElementById("outlet");
  if (outlet && render) {
    await render(outlet);
  }
}

export function startRouter() {
  window.addEventListener("hashchange", resolve);
  resolve();
}
