import { listArqueos, abrirArqueo, cerrarArqueo } from "../../services/arqueo.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";

const DENOMINACIONES = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 5, 10, 20, 50, 100];
const ESTADO_LABELS = { abierto: "Abierto", cerrado: "Cerrado" };

export async function renderArqueo(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  let arqueos;
  try {
    arqueos = await listArqueos();
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar el arqueo: ${describeError(err)}</p>`;
    return;
  }

  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Arqueo de caja";
  outlet.appendChild(header);

  const abierto = arqueos.find((a) => a.estado === "abierto");
  if (abierto) {
    outlet.appendChild(buildTurnoAbierto(abierto, outlet));
  } else {
    outlet.appendChild(buildFormAbrir(outlet));
  }

  const historialTitle = document.createElement("h2");
  historialTitle.textContent = "Historial";
  outlet.appendChild(historialTitle);
  outlet.appendChild(buildHistorial(arqueos));
}

function buildFormAbrir(outlet) {
  const wrap = document.createElement("div");

  const info = document.createElement("p");
  info.className = "card-subtitle";
  info.textContent = "No hay ningun turno abierto.";
  wrap.appendChild(info);

  const form = document.createElement("form");
  form.className = "inline-form";

  const saldoInput = document.createElement("input");
  saldoInput.type = "number";
  saldoInput.step = "0.01";
  saldoInput.value = "40.00";
  saldoInput.required = true;

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Abrir turno";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(saldoInput);
  form.appendChild(submitBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;
    try {
      await abrirArqueo({ saldo_apertura: saldoInput.value });
      await renderArqueo(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  wrap.appendChild(form);
  return wrap;
}

function buildTurnoAbierto(arqueo, outlet) {
  const wrap = document.createElement("div");

  const cards = document.createElement("div");
  cards.className = "cards";
  cards.appendChild(buildInfoCard("Turno abierto desde", new Date(arqueo.fecha_apertura).toLocaleString()));
  cards.appendChild(buildInfoCard("Saldo de apertura", formatCurrency(arqueo.saldo_apertura)));
  wrap.appendChild(cards);

  const cerrarTitle = document.createElement("h2");
  cerrarTitle.textContent = "Cerrar turno";
  wrap.appendChild(cerrarTitle);

  wrap.appendChild(buildFormCerrar(arqueo, outlet));

  return wrap;
}

function buildInfoCard(title, value) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<p class="card-title">${title}</p><p class="card-value">${value}</p>`;
  return card;
}

function buildFormCerrar(arqueo, outlet) {
  const form = document.createElement("form");
  form.className = "arqueo-cierre-form";

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>Denominacion</th><th>Cantidad</th><th>Subtotal</th></tr></thead>";
  const tbody = document.createElement("tbody");

  const filas = [];

  DENOMINACIONES.forEach((denominacion) => {
    const tr = document.createElement("tr");

    const tdDenom = document.createElement("td");
    tdDenom.textContent = formatCurrency(denominacion);

    const tdCantidad = document.createElement("td");
    const cantidadInput = document.createElement("input");
    cantidadInput.type = "number";
    cantidadInput.min = "0";
    cantidadInput.value = "0";
    cantidadInput.className = "cantidad-input";
    tdCantidad.appendChild(cantidadInput);

    const tdSubtotal = document.createElement("td");
    tdSubtotal.textContent = formatCurrency(0);

    cantidadInput.addEventListener("input", () => {
      const cantidad = Number(cantidadInput.value) || 0;
      tdSubtotal.textContent = formatCurrency(denominacion * cantidad);
      actualizarTotal();
    });

    filas.push({ denominacion, input: cantidadInput });

    tr.appendChild(tdDenom);
    tr.appendChild(tdCantidad);
    tr.appendChild(tdSubtotal);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  const totalEl = document.createElement("p");
  totalEl.className = "card-value";

  function actualizarTotal() {
    const total = filas.reduce((acc, { denominacion, input }) => acc + denominacion * (Number(input.value) || 0), 0);
    totalEl.textContent = `Total contado: ${formatCurrency(total)}`;
  }
  actualizarTotal();

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Cerrar turno";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(table);
  form.appendChild(totalEl);
  form.appendChild(submitBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;

    const detalles = filas
      .filter(({ input }) => Number(input.value) > 0)
      .map(({ denominacion, input }) => ({ denominacion, cantidad: Number(input.value) }));

    if (detalles.length === 0) {
      errorMsg.textContent = "Conta al menos una denominacion antes de cerrar.";
      errorMsg.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    try {
      await cerrarArqueo(arqueo.id, { detalles });
      await renderArqueo(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function buildHistorial(arqueos) {
  const wrap = document.createElement("div");

  if (arqueos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no hay arqueos registrados.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML =
    "<thead><tr><th>Apertura</th><th>Cierre</th><th>Saldo apertura</th><th>Saldo cierre</th><th>Ganancia neta</th><th>Estado</th></tr></thead>";
  const tbody = document.createElement("tbody");

  arqueos
    .slice()
    .sort((a, b) => new Date(b.fecha_apertura) - new Date(a.fecha_apertura))
    .forEach((arqueo) => {
      const tr = document.createElement("tr");
      const apertura = new Date(arqueo.fecha_apertura).toLocaleString();
      const cierre = arqueo.fecha_cierre ? new Date(arqueo.fecha_cierre).toLocaleString() : "-";
      const saldoCierre = arqueo.saldo_cierre != null ? formatCurrency(arqueo.saldo_cierre) : "-";
      const gananciaNeta = arqueo.ganancia_neta != null ? formatCurrency(arqueo.ganancia_neta) : "-";
      tr.innerHTML = `<td>${apertura}</td><td>${cierre}</td><td>${formatCurrency(arqueo.saldo_apertura)}</td><td>${saldoCierre}</td><td>${gananciaNeta}</td><td>${ESTADO_LABELS[arqueo.estado] || arqueo.estado}</td>`;
      tbody.appendChild(tr);
    });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
