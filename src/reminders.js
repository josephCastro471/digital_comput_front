import { listArqueos } from "./services/arqueo.service.js";
import { isAuthenticated } from "./services/auth.service.js";
import { navigate } from "./router.js";

const CHECK_INTERVAL_MS = 60 * 1000;
const HORA_LIMITE = 19;

let bannerEl = null;

function ensureBanner() {
  if (bannerEl) return bannerEl;
  bannerEl = document.createElement("div");
  bannerEl.className = "turno-reminder";
  bannerEl.hidden = true;
  document.body.insertBefore(bannerEl, document.body.firstChild);
  return bannerEl;
}

async function checkTurnoAbierto() {
  const banner = ensureBanner();

  if (!isAuthenticated() || new Date().getHours() < HORA_LIMITE) {
    banner.hidden = true;
    return;
  }

  let abiertos;
  try {
    abiertos = await listArqueos({ estado: "abierto" });
  } catch {
    return;
  }

  if (!abiertos || abiertos.length === 0) {
    banner.hidden = true;
    return;
  }

  banner.hidden = false;
  banner.innerHTML = "";

  const texto = document.createElement("span");
  texto.textContent = "Son las 19:00 o mas y el turno de caja sigue abierto — no te olvides de cerrarlo.";
  banner.appendChild(texto);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Ir a Arqueo";
  btn.addEventListener("click", () => navigate("/arqueo"));
  banner.appendChild(btn);
}

export function setupTurnoReminder() {
  checkTurnoAbierto();
  setInterval(checkTurnoAbierto, CHECK_INTERVAL_MS);
}
