import { login } from "../services/auth.service.js";
import { navigate } from "../router.js";

export function renderLogin(outlet) {
  outlet.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "login-card";

  const title = document.createElement("h1");
  title.textContent = "Comput Digital";
  wrapper.appendChild(title);

  const form = document.createElement("form");

  const userInput = document.createElement("input");
  userInput.type = "text";
  userInput.placeholder = "Usuario";
  userInput.required = true;
  userInput.autocomplete = "username";

  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.placeholder = "Contrasena";
  passInput.required = true;
  passInput.autocomplete = "current-password";

  const errorMsg = document.createElement("p");
  errorMsg.className = "error-msg";
  errorMsg.hidden = true;

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.textContent = "Ingresar";

  form.appendChild(userInput);
  form.appendChild(passInput);
  form.appendChild(errorMsg);
  form.appendChild(submitBtn);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMsg.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Ingresando...";
    try {
      await login(userInput.value, passInput.value);
      navigate("/dashboard");
    } catch (err) {
      errorMsg.textContent = "Usuario o contrasena incorrectos";
      errorMsg.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Ingresar";
    }
  });

  wrapper.appendChild(form);
  outlet.appendChild(wrapper);
}
