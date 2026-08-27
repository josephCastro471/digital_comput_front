import { NAV_ITEMS } from "./components/layout/layout.js";
import { navigate } from "./router.js";
import { isAuthenticated } from "./services/auth.service.js";

const escapeHandlers = {};

/** Registra un handler para Escape, identificado por `key` (ej: nombre de la
 * pagina). Reemplaza cualquier handler previo con la misma key, para no ir
 * acumulando listeners cada vez que la pagina se vuelve a renderizar. */
export function onEscape(key, handler) {
  if (escapeHandlers[key]) {
    document.removeEventListener("keydown", escapeHandlers[key]);
  }
  const listener = (event) => {
    if (event.key === "Escape") handler();
  };
  escapeHandlers[key] = listener;
  document.addEventListener("keydown", listener);
}

export function setupGlobalShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (!event.altKey || event.ctrlKey || event.shiftKey || event.metaKey) return;
    if (!isAuthenticated()) return;

    const index = Number(event.key) - 1;
    if (Number.isInteger(index) && index >= 0 && index < NAV_ITEMS.length) {
      event.preventDefault();
      navigate(NAV_ITEMS[index].path);
    }
  });
}
