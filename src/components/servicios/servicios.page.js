import {
  listServicios,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
} from "../../services/servicios.service.js";
import { formatCurrency } from "../../utils/format.js";
import { describeError } from "../../utils/errors.js";

const TIPO_LABELS = { fijo: "Fijo", escalonado: "Escalonado", variable: "Variable" };

const state = {
  servicios: [],
  editando: null,
  escalones: [],
};

export async function renderServicios(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  try {
    state.servicios = await listServicios();
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudieron cargar los servicios: ${describeError(err)}</p>`;
    return;
  }

  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Servicios";
  outlet.appendChild(header);

  const formTitle = document.createElement("h2");
  formTitle.textContent = state.editando ? `Editar: ${state.editando.nombre}` : "Nuevo servicio";
  outlet.appendChild(formTitle);

  outlet.appendChild(buildForm(outlet));

  const tablaTitle = document.createElement("h2");
  tablaTitle.textContent = "Catalogo";
  outlet.appendChild(tablaTitle);

  outlet.appendChild(buildTabla(outlet));
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

  const categoriaInput = document.createElement("input");
  categoriaInput.type = "text";
  categoriaInput.placeholder = "Categoria";
  categoriaInput.required = true;
  categoriaInput.value = editando?.categoria || "";

  const tipoSelect = document.createElement("select");
  Object.entries(TIPO_LABELS).forEach(([tipo, label]) => {
    const opt = document.createElement("option");
    opt.value = tipo;
    opt.textContent = label;
    tipoSelect.appendChild(opt);
  });
  tipoSelect.value = editando?.tipo_precio || "fijo";
  tipoSelect.disabled = Boolean(editando);

  const camposContainer = document.createElement("div");
  camposContainer.className = "servicio-campos";

  let precioBaseInput = null;

  function redrawCampos() {
    camposContainer.innerHTML = "";
    precioBaseInput = null;
    const tipo = tipoSelect.value;
    if (tipo === "fijo") {
      precioBaseInput = document.createElement("input");
      precioBaseInput.type = "number";
      precioBaseInput.step = "0.01";
      precioBaseInput.placeholder = "Precio";
      precioBaseInput.required = true;
      precioBaseInput.value = editando?.precio_base ?? "";
      camposContainer.appendChild(precioBaseInput);
    } else if (tipo === "escalonado") {
      camposContainer.appendChild(buildEscalonesEditor());
    }
  }

  function buildEscalonesEditor() {
    const wrap = document.createElement("div");
    wrap.className = "escalones-editor";

    const list = document.createElement("div");
    list.className = "escalones-list";

    function drawRows() {
      list.innerHTML = "";
      state.escalones.forEach((row, index) => {
        const rowEl = document.createElement("div");
        rowEl.className = "escalon-row";

        const desdeInput = document.createElement("input");
        desdeInput.type = "number";
        desdeInput.placeholder = "Desde";
        desdeInput.required = true;
        desdeInput.value = row.cantidad_desde ?? "";
        desdeInput.addEventListener("input", () => {
          row.cantidad_desde = desdeInput.value;
        });

        const hastaInput = document.createElement("input");
        hastaInput.type = "number";
        hastaInput.placeholder = "Hasta (vacio = sin limite)";
        hastaInput.value = row.cantidad_hasta ?? "";
        hastaInput.addEventListener("input", () => {
          row.cantidad_hasta = hastaInput.value;
        });

        const precioInput = document.createElement("input");
        precioInput.type = "number";
        precioInput.step = "0.01";
        precioInput.placeholder = "Precio unitario";
        precioInput.required = true;
        precioInput.value = row.precio_unitario ?? "";
        precioInput.addEventListener("input", () => {
          row.precio_unitario = precioInput.value;
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "link-btn link-btn--danger";
        removeBtn.textContent = "Quitar";
        removeBtn.addEventListener("click", () => {
          state.escalones.splice(index, 1);
          drawRows();
        });

        rowEl.appendChild(desdeInput);
        rowEl.appendChild(hastaInput);
        rowEl.appendChild(precioInput);
        rowEl.appendChild(removeBtn);
        list.appendChild(rowEl);
      });
    }

    drawRows();

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Agregar tramo";
    addBtn.addEventListener("click", () => {
      state.escalones.push({ cantidad_desde: "", cantidad_hasta: "", precio_unitario: "" });
      drawRows();
    });

    wrap.appendChild(list);
    wrap.appendChild(addBtn);
    return wrap;
  }

  tipoSelect.addEventListener("change", () => {
    if (tipoSelect.value === "escalonado") {
      if (state.escalones.length === 0) {
        state.escalones.push({ cantidad_desde: 1, cantidad_hasta: "", precio_unitario: "" });
      }
    } else {
      state.escalones = [];
    }
    redrawCampos();
  });

  redrawCampos();

  const activoInput = document.createElement("input");
  activoInput.type = "checkbox";
  activoInput.checked = editando ? editando.activo : true;
  const activoLabel = document.createElement("label");
  activoLabel.className = "checkbox-label";
  activoLabel.appendChild(activoInput);
  activoLabel.appendChild(document.createTextNode(" Activo"));
  if (!editando) activoLabel.hidden = true;

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = editando ? "Guardar cambios" : "Crear servicio";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.hidden = !editando;
  cancelBtn.addEventListener("click", async () => {
    state.editando = null;
    state.escalones = [];
    await renderServicios(outlet);
  });

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(nombreInput);
  form.appendChild(categoriaInput);
  form.appendChild(tipoSelect);
  form.appendChild(camposContainer);
  form.appendChild(activoLabel);
  form.appendChild(submitBtn);
  form.appendChild(cancelBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;

    try {
      if (editando) {
        const payload = {
          nombre: nombreInput.value,
          categoria: categoriaInput.value,
          activo: activoInput.checked,
        };
        if (editando.tipo_precio === "fijo") {
          payload.precio_base = precioBaseInput.value;
        }
        if (editando.tipo_precio === "escalonado") {
          payload.escalones = state.escalones.map(normalizeEscalon);
        }
        await actualizarServicio(editando.id, payload);
      } else {
        const payload = {
          nombre: nombreInput.value,
          categoria: categoriaInput.value,
          tipo_precio: tipoSelect.value,
        };
        if (tipoSelect.value === "fijo") {
          payload.precio_base = precioBaseInput.value;
        }
        if (tipoSelect.value === "escalonado") {
          payload.escalones = state.escalones.map(normalizeEscalon);
        }
        await crearServicio(payload);
      }
      state.editando = null;
      state.escalones = [];
      await renderServicios(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function normalizeEscalon(row) {
  return {
    cantidad_desde: Number(row.cantidad_desde),
    cantidad_hasta: row.cantidad_hasta === "" || row.cantidad_hasta == null ? null : Number(row.cantidad_hasta),
    precio_unitario: row.precio_unitario,
  };
}

function buildTabla(outlet) {
  const wrap = document.createElement("div");
  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML =
    "<thead><tr><th>Nombre</th><th>Categoria</th><th>Tipo</th><th>Precio</th><th>Activo</th><th></th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.servicios.forEach((servicio) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${servicio.nombre}</td><td>${servicio.categoria}</td><td>${TIPO_LABELS[servicio.tipo_precio] || servicio.tipo_precio}</td><td>${precioTextoServicio(servicio)}</td><td>${servicio.activo ? "Si" : "No"}</td>`;

    const tdAcciones = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "link-btn";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", async () => {
      state.editando = servicio;
      state.escalones = servicio.escalones.map((e) => ({ ...e }));
      await renderServicios(outlet);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "link-btn link-btn--danger";
    delBtn.textContent = "Eliminar";
    delBtn.addEventListener("click", async () => {
      if (!window.confirm(`Eliminar "${servicio.nombre}"?`)) return;
      try {
        await eliminarServicio(servicio.id);
        if (state.editando?.id === servicio.id) state.editando = null;
        await renderServicios(outlet);
      } catch (err) {
        window.alert(describeError(err));
      }
    });

    tdAcciones.appendChild(editBtn);
    tdAcciones.appendChild(delBtn);
    tr.appendChild(tdAcciones);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function precioTextoServicio(servicio) {
  if (servicio.tipo_precio === "fijo") return formatCurrency(servicio.precio_base);
  if (servicio.tipo_precio === "variable") return "Variable";
  if (!servicio.escalones || servicio.escalones.length === 0) return "Sin tramos";
  return servicio.escalones
    .map((e) => `${e.cantidad_desde}-${e.cantidad_hasta ?? "+"}: ${formatCurrency(e.precio_unitario)}`)
    .join(", ");
}
