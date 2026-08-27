import {
  listDirectorio,
  crearDirectorio,
  actualizarDirectorio,
  eliminarDirectorio,
} from "../../services/directorio.service.js";
import { describeError } from "../../utils/errors.js";
import { onEscape } from "../../shortcuts.js";

const TIPO_LABELS = { empresa: "Empresa", cliente: "Cliente" };

const state = {
  entradas: [],
  editando: null,
  buscar: "",
};

export async function renderDirectorio(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";
  try {
    state.entradas = await listDirectorio(state.buscar);
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar el directorio: ${describeError(err)}</p>`;
    return;
  }

  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = "Directorio";
  outlet.appendChild(header);

  const formTitle = document.createElement("h2");
  formTitle.textContent = state.editando ? `Editar: ${state.editando.nombre}` : "Nueva entrada";
  outlet.appendChild(formTitle);

  outlet.appendChild(buildForm(outlet));

  outlet.appendChild(buildBuscador(outlet));

  const tablaTitle = document.createElement("h2");
  tablaTitle.textContent = "Listado";
  outlet.appendChild(tablaTitle);

  outlet.appendChild(buildTabla(outlet));

  onEscape("directorio", async () => {
    if (!state.editando) return;
    state.editando = null;
    await renderDirectorio(outlet);
  });
}

function buildForm(outlet) {
  const editando = state.editando;
  const form = document.createElement("form");
  form.className = "servicio-form";

  const tipoSelect = document.createElement("select");
  Object.entries(TIPO_LABELS).forEach(([tipo, label]) => {
    const opt = document.createElement("option");
    opt.value = tipo;
    opt.textContent = label;
    tipoSelect.appendChild(opt);
  });
  tipoSelect.value = editando?.tipo || "empresa";

  const nombreInput = document.createElement("input");
  nombreInput.type = "text";
  nombreInput.placeholder = "Nombre";
  nombreInput.required = true;
  nombreInput.value = editando?.nombre || "";

  const codigoInput = document.createElement("input");
  codigoInput.type = "text";
  codigoInput.placeholder = "Codigo";
  codigoInput.value = editando?.codigo || "";

  const redInput = document.createElement("input");
  redInput.type = "text";
  redInput.placeholder = "Red";
  redInput.value = editando?.red || "";

  const cedulaInput = document.createElement("input");
  cedulaInput.type = "text";
  cedulaInput.placeholder = "Cedula / Cuenta";
  cedulaInput.value = editando?.cedula_cuenta || "";

  const notaInput = document.createElement("input");
  notaInput.type = "text";
  notaInput.placeholder = "Nota";
  notaInput.value = editando?.nota || "";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = editando ? "Guardar cambios" : "Crear entrada";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancelar";
  cancelBtn.hidden = !editando;
  cancelBtn.addEventListener("click", async () => {
    state.editando = null;
    await renderDirectorio(outlet);
  });

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  form.appendChild(tipoSelect);
  form.appendChild(nombreInput);
  form.appendChild(codigoInput);
  form.appendChild(redInput);
  form.appendChild(cedulaInput);
  form.appendChild(notaInput);
  form.appendChild(submitBtn);
  form.appendChild(cancelBtn);
  form.appendChild(errorMsg);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;

    const payload = {
      tipo: tipoSelect.value,
      nombre: nombreInput.value,
      codigo: codigoInput.value || null,
      red: redInput.value || null,
      cedula_cuenta: cedulaInput.value || null,
      nota: notaInput.value || null,
    };

    try {
      if (editando) {
        await actualizarDirectorio(editando.id, payload);
      } else {
        await crearDirectorio(payload);
      }
      state.editando = null;
      await renderDirectorio(outlet);
    } catch (err) {
      errorMsg.textContent = describeError(err);
      errorMsg.hidden = false;
      submitBtn.disabled = false;
    }
  });

  return form;
}

function buildBuscador(outlet) {
  const form = document.createElement("form");
  form.className = "inline-form filtro-fecha";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Buscar por nombre, codigo, red, cedula o nota";
  input.value = state.buscar;

  const buscarBtn = document.createElement("button");
  buscarBtn.type = "submit";
  buscarBtn.textContent = "Buscar";

  const limpiarBtn = document.createElement("button");
  limpiarBtn.type = "button";
  limpiarBtn.textContent = "Limpiar";
  limpiarBtn.addEventListener("click", async () => {
    state.buscar = "";
    await renderDirectorio(outlet);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.buscar = input.value;
    await renderDirectorio(outlet);
  });

  form.appendChild(input);
  form.appendChild(buscarBtn);
  form.appendChild(limpiarBtn);
  return form;
}

function buildTabla(outlet) {
  const wrap = document.createElement("div");

  if (state.entradas.length === 0) {
    const empty = document.createElement("p");
    empty.className = "card-subtitle";
    empty.textContent = "No hay entradas para mostrar.";
    wrap.appendChild(empty);
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "table";
  table.innerHTML =
    "<thead><tr><th>Tipo</th><th>Nombre</th><th>Codigo</th><th>Red</th><th>Cedula/Cuenta</th><th>Nota</th><th></th></tr></thead>";
  const tbody = document.createElement("tbody");

  state.entradas.forEach((entrada) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${TIPO_LABELS[entrada.tipo] || entrada.tipo}</td><td>${entrada.nombre}</td><td>${entrada.codigo ?? ""}</td><td>${entrada.red ?? ""}</td><td>${entrada.cedula_cuenta ?? ""}</td><td>${entrada.nota ?? ""}</td>`;

    const tdAcciones = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "link-btn";
    editBtn.textContent = "Editar";
    editBtn.addEventListener("click", async () => {
      state.editando = entrada;
      await renderDirectorio(outlet);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "link-btn link-btn--danger";
    delBtn.textContent = "Eliminar";
    delBtn.addEventListener("click", async () => {
      if (!window.confirm(`Eliminar "${entrada.nombre}"?`)) return;
      try {
        await eliminarDirectorio(entrada.id);
        if (state.editando?.id === entrada.id) state.editando = null;
        await renderDirectorio(outlet);
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
