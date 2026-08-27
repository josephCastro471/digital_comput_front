import {
  listInventario,
  crearAccesorio,
  actualizarAccesorio,
  registrarMovimiento,
} from "../../services/inventario.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";
import { onEscape } from "../../shortcuts.js";

const state = {
  accesorios: [],
  editando: null,
  movimientoAbiertoId: null,
};

export async function renderInventario(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  try {
    state.accesorios = await listInventario();
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar el inventario: ${describeError(err)}</p>`;
    return;
  }

  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Inventario";
  outlet.appendChild(header);

  const formTitle = document.createElement("h2");
  formTitle.textContent = state.editando ? `Editar: ${state.editando.nombre}` : "Nuevo accesorio";
  outlet.appendChild(formTitle);

  outlet.appendChild(buildForm(outlet));

  const tablaTitle = document.createElement("h2");
  tablaTitle.textContent = "Catalogo";
  outlet.appendChild(tablaTitle);

  outlet.appendChild(buildTabla(outlet));

  onEscape("inventario", async () => {
    if (!state.editando && state.movimientoAbiertoId === null) return;
    state.editando = null;
    state.movimientoAbiertoId = null;
    await renderInventario(outlet);
  });
}

function buildForm(outlet) {
  const editando = state.editando;
  const form = document.createElement("form");
  form.className = "servicio-form";

  const nombreInput = document.createElement("input");
  nombreInput.type = "text";
  nombreInput.placeholder = "Nombre";
  nombreInput.required = true;
  nombreInput.value = editando?.nombre || "";

  const costoInput = document.createElement("input");
  costoInput.type = "number";
  costoInput.step = "0.01";
  costoInput.min = "0";
  costoInput.placeholder = "Costo";
  costoInput.required = true;
  costoInput.value = editando?.costo ?? "";

  const precioInput = document.createElement("input");
  precioInput.type = "number";
  precioInput.step = "0.01";
  precioInput.min = "0";
  precioInput.placeholder = "Precio de venta";
  precioInput.required = true;
  precioInput.value = editando?.precio_venta ?? "";

  const stockInput = document.createElement("input");
  stockInput.type = "number";
  stockInput.min = "0";
  stockInput.placeholder = "Stock inicial";
  stockInput.value = editando ? editando.stock_actual : "0";
  stockInput.disabled = Boolean(editando);
  if (editando) stockInput.title = "El stock se ajusta con movimientos de entrada/salida";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = editando ? "Guardar cambios" : "Crear accesorio";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.hidden = !editando;
  cancelBtn.addEventListener("click", async () => {
    state.editando = null;
    await renderInventario(outlet);
  });

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(nombreInput);
  form.appendChild(costoInput);
  form.appendChild(precioInput);
  form.appendChild(stockInput);
  form.appendChild(submitBtn);
  form.appendChild(cancelBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;

    try {
      if (editando) {
        await actualizarAccesorio(editando.id, {
          nombre: nombreInput.value,
          costo: costoInput.value,
          precio_venta: precioInput.value,
        });
      } else {
        await crearAccesorio({
          nombre: nombreInput.value,
          costo: costoInput.value,
          precio_venta: precioInput.value,
          stock_actual: Number(stockInput.value || 0),
        });
      }
      state.editando = null;
      await renderInventario(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function buildTabla(outlet) {
  const wrap = document.createElement("div");

  if (state.accesorios.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no hay accesorios registrados.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML =
    "<thead><tr><th>Nombre</th><th>Costo</th><th>Precio venta</th><th>Stock</th><th></th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.accesorios.forEach((accesorio) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${accesorio.nombre}</td><td>${formatCurrency(accesorio.costo)}</td><td>${formatCurrency(accesorio.precio_venta)}</td><td>${accesorio.stock_actual}</td>`;

    const tdAcciones = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "link-btn";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", async () => {
      state.editando = accesorio;
      await renderInventario(outlet);
    });

    const movBtn = document.createElement("button");
    movBtn.type = "button";
    movBtn.className = "link-btn";
    movBtn.textContent = "Movimiento";
    movBtn.addEventListener("click", async () => {
      state.movimientoAbiertoId = state.movimientoAbiertoId === accesorio.id ? null : accesorio.id;
      await renderInventario(outlet);
    });

    tdAcciones.appendChild(editBtn);
    tdAcciones.appendChild(movBtn);
    tr.appendChild(tdAcciones);
    tbody.appendChild(tr);

    if (state.movimientoAbiertoId === accesorio.id) {
      const trMov = document.createElement("tr");
      const tdMov = document.createElement("td");
      tdMov.colSpan = 5;
      tdMov.appendChild(buildMovimientoForm(outlet, accesorio));
      trMov.appendChild(tdMov);
      tbody.appendChild(trMov);
    }
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function buildMovimientoForm(outlet, accesorio) {
  const form = document.createElement("form");
  form.className = "inline-form";

  const tipoSelect = document.createElement("select");
  const entradaOpt = document.createElement("option");
  entradaOpt.value = "entrada";
  entradaOpt.textContent = "Entrada";
  const salidaOpt = document.createElement("option");
  salidaOpt.value = "salida";
  salidaOpt.textContent = "Salida";
  tipoSelect.appendChild(entradaOpt);
  tipoSelect.appendChild(salidaOpt);

  const cantidadInput = document.createElement("input");
  cantidadInput.type = "number";
  cantidadInput.min = "1";
  cantidadInput.placeholder = "Cantidad";
  cantidadInput.required = true;

  const motivoInput = document.createElement("input");
  motivoInput.type = "text";
  motivoInput.placeholder = "Motivo (opcional)";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Registrar";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(tipoSelect);
  form.appendChild(cantidadInput);
  form.appendChild(motivoInput);
  form.appendChild(submitBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;

    try {
      await registrarMovimiento(accesorio.id, {
        tipo: tipoSelect.value,
        cantidad: Number(cantidadInput.value),
        motivo: motivoInput.value || null,
      });
      state.movimientoAbiertoId = null;
      await renderInventario(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}
