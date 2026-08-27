import { listConteos, crearConteo } from "../../services/conteo-monedas.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";
import { DENOMINACIONES } from "../../utils/denominaciones.js";

export async function renderConteoMonedas(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  let conteos;
  try {
    conteos = await listConteos();
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar el historial: ${describeError(err)}</p>`;
    return;
  }

  draw(outlet, conteos, null);
}

function draw(outlet, conteos, fechaFiltro) {
  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Conteo de monedas";
  outlet.appendChild(header);

  const info = document.createElement("p");
  info.className = "card-subtitle";
  info.textContent = "Calculadora de apoyo para conteo de monedas de terceros. No afecta el saldo de ninguna cuenta.";
  outlet.appendChild(info);

  outlet.appendChild(buildFormConteo(outlet));

  const historialTitle = document.createElement("h2");
  historialTitle.textContent = "Historial";
  outlet.appendChild(historialTitle);

  outlet.appendChild(buildFiltroFecha(outlet, fechaFiltro));
  outlet.appendChild(buildHistorial(conteos));
}

function buildFiltroFecha(outlet, fechaFiltro) {
  const wrap = document.createElement("div");
  wrap.className = "filtro-fecha";

  const label = document.createElement("label");
  label.textContent = "Filtrar por fecha:";

  const fechaInput = document.createElement("input");
  fechaInput.type = "date";
  fechaInput.value = fechaFiltro || "";

  const limpiarBtn = document.createElement("button");
  limpiarBtn.type = "button";
  limpiarBtn.className = "link-btn";
  limpiarBtn.textContent = "Limpiar";
  limpiarBtn.hidden = !fechaFiltro;

  fechaInput.addEventListener("change", async () => {
    const conteos = await listConteos(fechaInput.value || undefined);
    draw(outlet, conteos, fechaInput.value || null);
  });

  limpiarBtn.addEventListener("click", async () => {
    const conteos = await listConteos();
    draw(outlet, conteos, null);
  });

  label.appendChild(fechaInput);
  wrap.appendChild(label);
  wrap.appendChild(limpiarBtn);
  return wrap;
}

function buildFormConteo(outlet) {
  const form = document.createElement("form");
  form.className = "denominaciones-form";

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
    totalEl.textContent = `Total: ${formatCurrency(total)}`;
  }
  actualizarTotal();

  const notaInput = document.createElement("input");
  notaInput.type = "text";
  notaInput.className = "nota-input";
  notaInput.placeholder = "Nota (opcional, ej. nombre del cliente)";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Guardar conteo";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(table);
  form.appendChild(totalEl);
  form.appendChild(notaInput);
  form.appendChild(submitBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;

    const denominaciones = {};
    filas.forEach(({ denominacion, input }) => {
      const cantidad = Number(input.value) || 0;
      if (cantidad > 0) denominaciones[String(denominacion)] = cantidad;
    });

    if (Object.keys(denominaciones).length === 0) {
      errorMsg.textContent = "Conta al menos una denominacion.";
      errorMsg.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    try {
      await crearConteo({ denominaciones, nota: notaInput.value || null });
      await renderConteoMonedas(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function buildHistorial(conteos) {
  const wrap = document.createElement("div");

  if (conteos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no hay conteos registrados.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>Fecha</th><th>Total</th><th>Detalle</th><th>Nota</th></tr></thead>";
  const tbody = document.createElement("tbody");

  conteos
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .forEach((conteo) => {
      const tr = document.createElement("tr");
      const fecha = new Date(conteo.fecha).toLocaleString();
      const detalle = Object.entries(conteo.denominaciones)
        .map(([denom, cantidad]) => `${cantidad}x${formatCurrency(denom)}`)
        .join(", ");
      tr.innerHTML = `<td>${fecha}</td><td>${formatCurrency(conteo.total)}</td><td>${detalle}</td><td>${conteo.nota || "-"}</td>`;
      tbody.appendChild(tr);
    });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
