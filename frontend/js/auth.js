// Elias
document.addEventListener("DOMContentLoaded", () => {
  setupLogin();
  setupRegister();
  setupMagicLogin();
  setupVerifyPage();
});

function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const message = document.getElementById("authMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(message, "Login läuft...");

    try {
      await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value
        })
      });

      setMessage(message, "Login erfolgreich. Du wirst weitergeleitet.", "success");
      window.location.href = "../../index.html";
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });
}

function setupRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const message = document.getElementById("authMessage");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (form.password.value !== form.passwordRepeat.value) {
      setMessage(message, "Die Passwörter stimmen nicht überein.", "error");
      return;
    }

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.value,
          password: form.password.value
        })
      });

      setMessage(message, "Registrierung erfolgreich. Prüfe Maildev für den Bestätigungslink.", "success");
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });
}

function setupMagicLogin() {
  const requestForm = document.getElementById("magicRequestForm");
  const verifyForm = document.getElementById("magicVerifyForm");
  const message = document.getElementById("authMessage");

  if (requestForm && getParam("error") === "link") {
    setMessage(message, "Der Login-Link ist ungültig, abgelaufen oder wurde bereits verwendet. Fordere einen neuen an.", "error");
  }

  requestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiRequest("/auth/magic/request", {
        method: "POST",
        body: JSON.stringify({ email: requestForm.email.value })
      });

      setMessage(message, "Code wurde gesendet. Prüfe Maildev.", "success");
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  verifyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiRequest("/auth/magic/verify", {
        method: "POST",
        body: JSON.stringify({
          email: verifyForm.email.value,
          code: verifyForm.code.value
        })
      });

      setMessage(message, "Magic Login erfolgreich.", "success");
      window.location.href = "../../index.html";
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });
}

async function setupVerifyPage() {
  const box = document.getElementById("verifyStatus");
  if (!box) return;

  const token = getParam("token");

  if (!token) {
    box.innerHTML = "<p class=\"session-hint\">Öffne den Bestätigungslink aus Maildev.</p>";
    return;
  }

  try {
    const data = await apiRequest(`/auth/verify?token=${encodeURIComponent(token)}`);
    box.innerHTML = `
      <div class="info-list">
        <div><span>User-ID</span><strong>${data.user.id}</strong></div>
        <div><span>Konto-Status</span><strong>Bestätigt</strong></div>
        <div><span>E-Mail</span><strong>${data.user.email}</strong></div>
      </div>
      <a class="btn" href="login.html">Zum Login</a>
    `;
  } catch (error) {
    box.innerHTML = `<p class="session-hint error">${error.message}</p>`;
  }
}
