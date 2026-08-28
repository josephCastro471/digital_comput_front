import {
  listCuentas,
  listMovimientos,
  crearMovimiento,
  actualizarCupo,
  iniciarDia,
  cerrarDia,
} from "../../services/cuentas.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";

const TIPO_LABELS = {
  efectivo: "Efectivo",
  cupo_revolvente: "Cupo revolvente",
  fondo_fijo: "Fondo fijo",
  red_recaudacion: "Red de recaudacion",
};

const MOVIMIENTO_LABELS = {
  deposito: "Deposito",
  retiro: "Retiro",
  uso: "Uso de cupo",
  ajuste: "Ajuste",
};

const state = {
  cuentas: [],
  seleccionadaId: null,
  ultimoRecaudado: null,
};

export async function renderCuentas(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  try {
    state.cuentas = await listCuentas();
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudieron cargar las cuentas: ${describeError(err)}</p>`;
    return;
  }

  if (state.seleccionadaId == null && state.cuentas.length > 0) {
    state.seleccionadaId = state.cuentas[0].id;
  }

  await draw(outlet);
}

async function draw(outlet) {
  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Cuentas";
  outlet.appendChild(header);

  const layout = document.createElement("div");
  layout.className = "cuentas-layout";

  layout.appendChild(buildListaCuentas(outlet));

  const detalle = document.createElement("div");
  detalle.className = "cuentas-detalle";
  layout.appendChild(detalle);

  outlet.appendChild(layout);

  if (state.seleccionadaId != null) {
    await drawDetalle(detalle, outlet);
  }
}

function buildListaCuentas(outlet) {
  const wrap = document.createElement("div");
  wrap.className = "cuentas-lista";

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>Cuenta</th><th>Tipo</th><th>Saldo</th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.cuentas.forEach((cuenta) => {
    const tr = document.createElement("tr");
    tr.className = "clickable-row";
    if (cuenta.id === state.seleccionadaId) tr.classList.add("selected-row");
    tr.innerHTML = `<td>${cuenta.nombre}</td><td>${TIPO_LABELS[cuenta.tipo] || cuenta.tipo}</td><td>${formatCurrency(cuenta.saldo_actual)}</td>`;
    tr.addEventListener("click", async () => {
      if (state.seleccionadaId !== cuenta.id) state.ultimoRecaudado = null;
      state.seleccionadaId = cuenta.id;
      await draw(outlet);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

async function drawDetalle(container, outlet) {
  container.innerHTML = "<p>Cargando detalle...</p>";

  const cuenta = state.cuentas.find((c) => c.id === state.seleccionadaId);
  if (!cuenta) {
    container.innerHTML = "";
    return;
  }

  let movimientos;
  try {
    movimientos = await listMovimientos(cuenta.id);
  } catch (err) {
    container.innerHTML = `<p class="error-msg">No se pudieron cargar los movimientos: ${describeError(err)}</p>`;
    return;
  }

  container.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = cuenta.nombre;
  container.appendChild(title);

  const info = document.createElement("div");
  info.className = "cards";
  info.appendChild(buildInfoCard("Saldo actual", formatCurrency(cuenta.saldo_actual)));
  if (cuenta.tipo === "cupo_revolvente") {
    info.appendChild(
      buildInfoCard(
        "Cupo transaccional",
        cuenta.cupo_transaccional != null ? formatCurrency(cuenta.cupo_transaccional) : "Sin definir"
      )
    );
    info.appendChild(
      buildInfoCard("Cupo disponible", cuenta.cupo_disponible != null ? formatCurrency(cuenta.cupo_disponible) : "-")
    );
  }
  if (cuenta.tipo === "fondo_fijo") {
    info.appendChild(buildInfoCard("Base actual", formatCurrency(cuenta.saldo_inicial_dia)));
    if (state.ultimoRecaudado != null) {
      info.appendChild(buildInfoCard("Recaudado (ultimo cuadre)", formatCurrency(state.ultimoRecaudado.recaudado)));
      info.appendChild(buildInfoCard("Retirado", formatCurrency(state.ultimoRecaudado.retirado)));
      info.appendChild(buildInfoCard("Nueva base", formatCurrency(state.ultimoRecaudado.nuevaBase)));
    }
  }
  container.appendChild(info);

  if (cuenta.tipo === "fondo_fijo") {
    container.appendChild(buildFormCuadreFondo(cuenta, outlet));
  }

  container.appendChild(buildFormMovimiento(cuenta, outlet));

  if (cuenta.tipo === "cupo_revolvente") {
    container.appendChild(buildFormCupo(cuenta, outlet));
  }

  container.appendChild(buildTablaMovimientos(movimientos));
}

function buildInfoCard(title, value) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<p class="card-title">${title}</p><p class="card-value">${value}</p>`;
  return card;
}

function buildFormMovimiento(cuenta, outlet) {
  const form = document.createElement("form");
  form.className = "inline-form";

  const tipoSelect = document.createElement("select");
  const tipos = cuenta.tipo === "cupo_revolvente" ? ["deposito", "retiro", "uso", "ajuste"] : ["deposito", "retiro", "ajuste"];
  tipos.forEach((tipo) => {
    const opt = document.createElement("option");
    opt.value = tipo;
    opt.textContent = MOVIMIENTO_LABELS[tipo];
    tipoSelect.appendChild(opt);
  });

  const montoInput = document.createElement("input");
  montoInput.type = "number";
  montoInput.step = "0.01";
  montoInput.placeholder = "Monto";
  montoInput.required = true;

  const notaInput = document.createElement("input");
  notaInput.type = "text";
  notaInput.placeholder = "Nota (opcional)";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Registrar movimiento";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(tipoSelect);
  form.appendChild(montoInput);
  form.appendChild(notaInput);
  form.appendChild(submitBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;
    try {
      await crearMovimiento(cuenta.id, {
        tipo: tipoSelect.value,
        monto: montoInput.value,
        nota: notaInput.value || null,
      });
      await renderCuentas(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function buildFormCuadreFondo(cuenta, outlet) {
  const wrap = document.createElement("div");
  wrap.className = "denominaciones-form";

  const title = document.createElement("h3");
  title.textContent = "Cuadre del fondo";
  wrap.appendChild(title);

  const ayuda = document.createElement("p");
  ayuda.className = "card-subtitle";
  ayuda.textContent =
    "Al iniciar el dia, ingresa el saldo que ves en la cuenta bancaria. Al cerrar/cuadrar, ingresa el saldo bancario actual y cuanto vas a retirar fisicamente de lo recaudado (puede ser menos que el total, o 0) — la nueva base para manana queda en base_actual menos lo retirado.";
  wrap.appendChild(ayuda);

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  const formInicio = document.createElement("form");
  formInicio.className = "inline-form";
  const inicioInput = document.createElement("input");
  inicioInput.type = "number";
  inicioInput.step = "0.01";
  inicioInput.min = "0";
  inicioInput.placeholder = "Saldo al iniciar el dia";
  inicioInput.required = true;
  const inicioBtn = document.createElement("button");
  inicioBtn.type = "submit";
  inicioBtn.textContent = "Iniciar dia";
  formInicio.appendChild(inicioInput);
  formInicio.appendChild(inicioBtn);

  formInicio.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    inicioBtn.disabled = true;
    try {
      await iniciarDia(cuenta.id, inicioInput.value);
      state.ultimoRecaudado = null;
      await renderCuentas(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      inicioBtn.disabled = false;
    }
  });

  const formCierre = document.createElement("form");
  formCierre.className = "inline-form";
  const cierreInput = document.createElement("input");
  cierreInput.type = "number";
  cierreInput.step = "0.01";
  cierreInput.min = "0";
  cierreInput.placeholder = "Saldo bancario actual";
  cierreInput.required = true;
  const retiroInput = document.createElement("input");
  retiroInput.type = "number";
  retiroInput.step = "0.01";
  retiroInput.min = "0";
  retiroInput.placeholder = "Monto a retirar (0 si no retiras)";
  retiroInput.value = "0";
  const cierreBtn = document.createElement("button");
  cierreBtn.type = "submit";
  cierreBtn.textContent = "Cerrar dia / Cuadre";
  formCierre.appendChild(cierreInput);
  formCierre.appendChild(retiroInput);
  formCierre.appendChild(cierreBtn);

  formCierre.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    cierreBtn.disabled = true;
    try {
      const resultado = await cerrarDia(cuenta.id, cierreInput.value, retiroInput.value);
      state.ultimoRecaudado = {
        recaudado: resultado.recaudado,
        retirado: resultado.monto_retirado,
        nuevaBase: resultado.nueva_base,
      };
      await renderCuentas(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      cierreBtn.disabled = false;
    }
  });

  wrap.appendChild(formInicio);
  wrap.appendChild(formCierre);
  wrap.appendChild(errorMsg);
  return wrap;
}

function buildFormCupo(cuenta, outlet) {
  const form = document.createElement("form");
  form.className = "inline-form";

  const cupoInput = document.createElement("input");
  cupoInput.type = "number";
  cupoInput.step = "0.01";
  cupoInput.placeholder = "Nuevo cupo transaccional";
  cupoInput.required = true;
  if (cuenta.cupo_transaccional != null) cupoInput.value = cuenta.cupo_transaccional;

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Actualizar cupo";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(cupoInput);
  form.appendChild(submitBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;
    try {
      await actualizarCupo(cuenta.id, { cupo_transaccional: cupoInput.value });
      await renderCuentas(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function buildTablaMovimientos(movimientos) {
  const wrap = document.createElement("div");

  const title = document.createElement("h3");
  title.textContent = "Movimientos";
  wrap.appendChild(title);

  if (movimientos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no hay movimientos.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Nota</th></tr></thead>";
  const tbody = document.createElement("tbody");
  movimientos.forEach((m) => {
    const tr = document.createElement("tr");
    const fecha = new Date(m.fecha).toLocaleString();
    tr.innerHTML = `<td>${fecha}</td><td>${MOVIMIENTO_LABELS[m.tipo] || m.tipo}</td><td>${formatCurrency(m.monto)}</td><td>${m.nota || "-"}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
