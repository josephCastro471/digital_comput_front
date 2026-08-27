import {
  listProveedores,
  actualizarProveedor,
  calcularComision,
  crearTransaccion,
  listTransacciones,
} from "../../services/comisiones.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";

const state = {
  proveedores: [],
  transacciones: [],
  preview: null,
};

export async function renderComisiones(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  try {
    const [proveedores, transacciones] = await Promise.all([listProveedores(), listTransacciones()]);
    state.proveedores = proveedores;
    state.transacciones = transacciones;
    state.preview = null;
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar la pagina: ${describeError(err)}</p>`;
    return;
  }

  draw(outlet);
}

function draw(outlet) {
  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Comisiones";
  outlet.appendChild(header);

  const proveedoresTitle = document.createElement("h2");
  proveedoresTitle.textContent = "Proveedores";
  outlet.appendChild(proveedoresTitle);
  outlet.appendChild(buildProveedoresTabla(outlet));

  const calculadoraTitle = document.createElement("h2");
  calculadoraTitle.textContent = "Calculadora";
  outlet.appendChild(calculadoraTitle);
  outlet.appendChild(buildCalculadora(outlet));

  const historialTitle = document.createElement("h2");
  historialTitle.textContent = "Historial";
  outlet.appendChild(historialTitle);
  outlet.appendChild(buildHistorial());
}

function buildProveedoresTabla(outlet) {
  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML =
    "<thead><tr><th>Proveedor</th><th>Comision %</th><th>Aplica IVA</th><th>IVA %</th><th></th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.proveedores.forEach((proveedor) => {
    const tr = document.createElement("tr");

    const tdNombre = document.createElement("td");
    tdNombre.textContent = proveedor.nombre;
    tr.appendChild(tdNombre);

    const tdComision = document.createElement("td");
    const comisionInput = document.createElement("input");
    comisionInput.type = "number";
    comisionInput.step = "0.0001";
    comisionInput.min = "0";
    comisionInput.max = "100";
    comisionInput.value = proveedor.comision_pct;
    comisionInput.className = "cantidad-input";
    tdComision.appendChild(comisionInput);
    tr.appendChild(tdComision);

    const tdIva = document.createElement("td");
    const ivaCheckbox = document.createElement("input");
    ivaCheckbox.type = "checkbox";
    ivaCheckbox.checked = proveedor.aplica_iva;
    tdIva.appendChild(ivaCheckbox);
    tr.appendChild(tdIva);

    const tdIvaPct = document.createElement("td");
    const ivaPctInput = document.createElement("input");
    ivaPctInput.type = "number";
    ivaPctInput.step = "0.0001";
    ivaPctInput.min = "0";
    ivaPctInput.max = "100";
    ivaPctInput.value = proveedor.iva_pct;
    ivaPctInput.className = "cantidad-input";
    ivaPctInput.disabled = !proveedor.aplica_iva;
    tdIvaPct.appendChild(ivaPctInput);
    tr.appendChild(tdIvaPct);

    ivaCheckbox.addEventListener("change", () => {
      ivaPctInput.disabled = !ivaCheckbox.checked;
    });

    const tdAcciones = document.createElement("td");
    const guardarBtn = document.createElement("button");
    guardarBtn.type = "button";
    guardarBtn.className = "link-btn";
    guardarBtn.textContent = "Guardar";
    guardarBtn.addEventListener("click", async () => {
      guardarBtn.disabled = true;
      try {
        await actualizarProveedor(proveedor.id, {
          comision_pct: comisionInput.value,
          aplica_iva: ivaCheckbox.checked,
          iva_pct: ivaPctInput.value,
        });
        await renderComisiones(outlet);
      } catch (err) {
        alert(describeError(err));
        guardarBtn.disabled = false;
      }
    });
    tdAcciones.appendChild(guardarBtn);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

function buildCalculadora(outlet) {
  const wrap = document.createElement("div");
  wrap.className = "denominaciones-form";

  const form = document.createElement("form");
  form.className = "inline-form";

  const proveedorSelect = document.createElement("select");
  state.proveedores.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nombre;
    proveedorSelect.appendChild(opt);
  });

  const valorInput = document.createElement("input");
  valorInput.type = "number";
  valorInput.step = "0.01";
  valorInput.min = "0.01";
  valorInput.placeholder = "Valor a recibir";
  valorInput.required = true;

  const calcularBtn = document.createElement("button");
  calcularBtn.type = "submit";
  calcularBtn.textContent = "Calcular";

  form.appendChild(proveedorSelect);
  form.appendChild(valorInput);
  form.appendChild(calcularBtn);

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  const resultado = document.createElement("div");

  function pintarResultado() {
    resultado.innerHTML = "";
    if (!state.preview) return;

    const p = state.preview;
    const resumen = document.createElement("p");
    resumen.className = "card-value";
    resumen.textContent = `Cobrar al cliente: ${formatCurrency(p.valor_cobrado)}`;
    resultado.appendChild(resumen);

    const detalle = document.createElement("p");
    detalle.className = "card-subtitle";
    detalle.textContent = `Comision: ${formatCurrency(p.comision)} · IVA sobre comision: ${formatCurrency(
      p.iva_sobre_comision
    )}`;
    resultado.appendChild(detalle);

    const registrarBtn = document.createElement("button");
    registrarBtn.type = "button";
    registrarBtn.className = "primary-btn";
    registrarBtn.textContent = "Registrar transaccion";
    registrarBtn.addEventListener("click", async () => {
      registrarBtn.disabled = true;
      try {
        await crearTransaccion({
          proveedor_id: p.proveedor_id,
          valor_recibir: p.valor_recibir,
        });
        state.preview = null;
        await renderComisiones(outlet);
      } catch (err) {
        errorMsg.textContent = describeError(err);
        errorMsg.hidden = false;
        registrarBtn.disabled = false;
      }
    });
    resultado.appendChild(registrarBtn);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    calcularBtn.disabled = true;
    try {
      state.preview = await calcularComision({
        proveedor_id: Number(proveedorSelect.value),
        valor_recibir: valorInput.value,
      });
      pintarResultado();
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
    } finally {
      calcularBtn.disabled = false;
    }
  });

  wrap.appendChild(form);
  wrap.appendChild(errorMsg);
  wrap.appendChild(resultado);
  pintarResultado();

  return wrap;
}

function buildHistorial() {
  const wrap = document.createElement("div");

  if (state.transacciones.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no hay transacciones registradas.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML =
    "<thead><tr><th>Fecha</th><th>Proveedor</th><th>Recibido</th><th>Comision</th><th>IVA</th><th>Cobrado</th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.transacciones
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .forEach((t) => {
      const proveedor = state.proveedores.find((p) => p.id === t.proveedor_id);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${new Date(t.fecha).toLocaleString()}</td><td>${
        proveedor ? proveedor.nombre : `#${t.proveedor_id}`
      }</td><td>${formatCurrency(t.valor_recibir)}</td><td>${formatCurrency(t.comision)}</td><td>${formatCurrency(
        t.iva_sobre_comision
      )}</td><td>${formatCurrency(t.valor_cobrado)}</td>`;
      tbody.appendChild(tr);
    });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
