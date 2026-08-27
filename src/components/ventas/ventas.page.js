import { listVentas, crearVenta } from "../../services/ventas.service.js";
import { listServicios } from "../../services/servicios.service.js";
import { listCuentas } from "../../services/cuentas.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";

const TIPO_LABELS = { fijo: "Fijo", escalonado: "Escalonado", variable: "Variable" };

const state = {
  servicios: [],
  cuentas: [],
  ventas: [],
  carrito: [],
};

export async function renderVentas(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  try {
    const [servicios, cuentas, ventas] = await Promise.all([listServicios(), listCuentas(), listVentas()]);
    state.servicios = servicios;
    state.cuentas = cuentas;
    state.ventas = ventas;
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar la pagina: ${describeError(err)}</p>`;
    return;
  }

  draw(outlet);
}

function draw(outlet) {
  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Ventas";
  outlet.appendChild(header);

  outlet.appendChild(buildNuevaVenta(outlet));

  const historialTitle = document.createElement("h2");
  historialTitle.textContent = "Historial";
  outlet.appendChild(historialTitle);
  outlet.appendChild(buildHistorial());
}

function precioPreview(servicio, cantidad, precioManual) {
  if (servicio.tipo_precio === "fijo") return Number(servicio.precio_base);
  if (servicio.tipo_precio === "variable") return precioManual ? Number(precioManual) : null;
  const escalon = (servicio.escalones || []).find(
    (e) => e.cantidad_desde <= cantidad && (e.cantidad_hasta == null || cantidad <= e.cantidad_hasta)
  );
  return escalon ? Number(escalon.precio_unitario) : null;
}

function buildNuevaVenta(outlet) {
  const wrap = document.createElement("div");
  wrap.className = "venta-builder";

  const cuentaRow = document.createElement("div");
  cuentaRow.className = "inline-form";
  const cuentaLabelText = document.createElement("span");
  cuentaLabelText.textContent = "Cuenta:";
  const cuentaSelect = document.createElement("select");
  const sinCuentaOpt = document.createElement("option");
  sinCuentaOpt.value = "";
  sinCuentaOpt.textContent = "Sin cuenta";
  cuentaSelect.appendChild(sinCuentaOpt);
  state.cuentas.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.nombre;
    cuentaSelect.appendChild(opt);
  });
  cuentaRow.appendChild(cuentaLabelText);
  cuentaRow.appendChild(cuentaSelect);
  wrap.appendChild(cuentaRow);

  const carritoContainer = document.createElement("div");

  function redrawCarrito() {
    carritoContainer.innerHTML = "";
    carritoContainer.appendChild(buildCarritoTabla(redrawCarrito));
  }

  wrap.appendChild(buildAgregarItemForm(redrawCarrito));
  wrap.appendChild(carritoContainer);
  redrawCarrito();

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.className = "primary-btn";
  submitBtn.textContent = "Registrar venta";
  submitBtn.addEventListener("click", async () => {
    errorMsg.hidden = true;

    if (state.carrito.length === 0) {
      errorMsg.textContent = "Agrega al menos un item antes de registrar la venta.";
      errorMsg.hidden = false;
      return;
    }

    const payload = {
      cuenta_id: cuentaSelect.value ? Number(cuentaSelect.value) : null,
      items: state.carrito.map((item) => {
        const out = { servicio_id: item.servicioId, cantidad: item.cantidad };
        if (item.tipoPrecio === "variable") out.precio_unitario = item.precioManual;
        return out;
      }),
    };

    submitBtn.disabled = true;
    try {
      await crearVenta(payload);
      state.carrito = [];
      await renderVentas(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  wrap.appendChild(errorMsg);
  wrap.appendChild(submitBtn);

  return wrap;
}

function buildAgregarItemForm(onChange) {
  const form = document.createElement("form");
  form.className = "inline-form";

  const servicioSelect = document.createElement("select");
  state.servicios
    .filter((s) => s.activo)
    .forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.nombre} (${TIPO_LABELS[s.tipo_precio] || s.tipo_precio})`;
      servicioSelect.appendChild(opt);
    });

  const cantidadInput = document.createElement("input");
  cantidadInput.type = "number";
  cantidadInput.min = "1";
  cantidadInput.value = "1";
  cantidadInput.required = true;

  const precioManualInput = document.createElement("input");
  precioManualInput.type = "number";
  precioManualInput.step = "0.01";
  precioManualInput.placeholder = "Precio unitario";
  precioManualInput.hidden = true;

  function servicioSeleccionado() {
    return state.servicios.find((s) => String(s.id) === servicioSelect.value);
  }

  function actualizarVisibilidad() {
    const servicio = servicioSeleccionado();
    const esVariable = Boolean(servicio && servicio.tipo_precio === "variable");
    precioManualInput.hidden = !esVariable;
    precioManualInput.required = esVariable;
  }
  servicioSelect.addEventListener("change", actualizarVisibilidad);
  actualizarVisibilidad();

  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.textContent = "Agregar item";

  const itemErrorMsg = document.createElement("p");
  itemErrorMsg.className = "error-msg";
  itemErrorMsg.hidden = true;

  form.appendChild(servicioSelect);
  form.appendChild(cantidadInput);
  form.appendChild(precioManualInput);
  form.appendChild(addBtn);
  form.appendChild(itemErrorMsg);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    itemErrorMsg.hidden = true;

    const servicio = servicioSeleccionado();
    if (!servicio) return;
    const cantidad = Number(cantidadInput.value);

    if (servicio.tipo_precio === "variable" && !precioManualInput.value) {
      itemErrorMsg.textContent = "Este servicio requiere precio unitario.";
      itemErrorMsg.hidden = false;
      return;
    }

    state.carrito.push({
      servicioId: servicio.id,
      nombre: servicio.nombre,
      tipoPrecio: servicio.tipo_precio,
      cantidad,
      precioManual: servicio.tipo_precio === "variable" ? precioManualInput.value : null,
      precioPreview: precioPreview(servicio, cantidad, precioManualInput.value),
    });

    cantidadInput.value = "1";
    precioManualInput.value = "";
    onChange();
  });

  return form;
}

function buildCarritoTabla(onChange) {
  const tablaWrap = document.createElement("div");

  if (state.carrito.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no agregaste ningun item.";
    tablaWrap.appendChild(empty);
    return tablaWrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>Servicio</th><th>Cantidad</th><th>Precio unit.</th><th>Subtotal</th><th></th></tr></thead>";
  const tbody = document.createElement("tbody");

  let total = 0;
  state.carrito.forEach((item, index) => {
    const precio = item.precioPreview;
    const subtotal = precio != null ? precio * item.cantidad : null;
    if (subtotal != null) total += subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.nombre}</td><td>${item.cantidad}</td><td>${precio != null ? formatCurrency(precio) : "?"}</td><td>${subtotal != null ? formatCurrency(subtotal) : "?"}</td>`;

    const tdAcciones = document.createElement("td");
    const quitarBtn = document.createElement("button");
    quitarBtn.type = "button";
    quitarBtn.className = "link-btn link-btn--danger";
    quitarBtn.textContent = "Quitar";
    quitarBtn.addEventListener("click", () => {
      state.carrito.splice(index, 1);
      onChange();
    });
    tdAcciones.appendChild(quitarBtn);
    tr.appendChild(tdAcciones);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  tablaWrap.appendChild(table);

  const totalEl = document.createElement("p");
  totalEl.className = "card-value";
  totalEl.textContent = `Total estimado: ${formatCurrency(total)}`;
  tablaWrap.appendChild(totalEl);

  return tablaWrap;
}

function buildHistorial() {
  const wrap = document.createElement("div");

  if (state.ventas.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "Todavia no hay ventas registradas.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML = "<thead><tr><th>Fecha</th><th>Cuenta</th><th>Items</th><th>Total</th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.ventas
    .slice()
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .forEach((venta) => {
      const tr = document.createElement("tr");
      const fecha = new Date(venta.fecha).toLocaleString();
      const cuenta = venta.cuenta_id
        ? state.cuentas.find((c) => c.id === venta.cuenta_id)?.nombre || `#${venta.cuenta_id}`
        : "-";
      const itemsTexto = venta.items
        .map((i) => {
          const servicio = state.servicios.find((s) => s.id === i.servicio_id);
          return `${i.cantidad}x ${servicio ? servicio.nombre : `#${i.servicio_id}`}`;
        })
        .join(", ");
      tr.innerHTML = `<td>${fecha}</td><td>${cuenta}</td><td>${itemsTexto}</td><td>${formatCurrency(venta.total)}</td>`;
      tbody.appendChild(tr);
    });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
