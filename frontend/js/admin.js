// Elias
document.addEventListener("DOMContentLoaded", () => {
  setupAdminUsersPage();
});

function setupAdminUsersPage() {
  const tableBody = document.getElementById("adminUsersBody");
  const searchForm = document.getElementById("adminUserSearchForm");
  const adminForm = document.getElementById("adminCreateForm");
  const message = document.getElementById("adminUserMessage");
  if (!tableBody) return;

  async function render(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      if (params.userId) searchParams.set("userId", params.userId);
      if (params.email) searchParams.set("email", params.email);
      const query = searchParams.toString();
      const data = await apiRequest(`/users${query ? `/search?${query}` : ""}`);
      const users = data.users || [];

      tableBody.innerHTML = users.length
        ? users.map((user) => `
          <tr>
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${user.isAdmin ? "ADMIN" : "USER"}</td>
            <td><span class="status ${user.isVerified ? "green" : ""}">${user.isVerified ? "Verifiziert" : "Offen"}</span></td>
            <td><span class="status ${user.isBlocked ? "red" : "green"}">${user.isBlocked ? "Gesperrt" : "Aktiv"}</span></td>
            <td><div class="button-row"><button class="btn small secondary" data-toggle-user="${user.id}" data-blocked="${user.isBlocked}" type="button">${user.isBlocked ? "Entsperren" : "Sperren"}</button><button class="btn small danger" data-delete-user="${user.id}" type="button">Löschen</button></div></td>
          </tr>
        `).join("")
        : "<tr><td colspan=\"6\">Keine User gefunden.</td></tr>";

      tableBody.querySelectorAll("[data-toggle-user]").forEach((button) => {
        button.addEventListener("click", async () => {
          const path = button.dataset.blocked === "true" ? "unblock" : "block";
          await apiRequest(`/users/${button.dataset.toggleUser}/${path}`, { method: "PATCH" });
          render();
        });
      });

      tableBody.querySelectorAll("[data-delete-user]").forEach((button) => {
        button.addEventListener("click", async () => {
          await apiRequest(`/users/${button.dataset.deleteUser}`, { method: "DELETE" });
          render();
        });
      });
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  }

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    render({
      userId: searchForm.userId.value,
      email: searchForm.email.value
    });
  });

  adminForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      await apiRequest("/users/admins", {
        method: "POST",
        body: JSON.stringify({
          email: adminForm.email.value,
          password: adminForm.password.value
        })
      });

      adminForm.reset();
      setMessage(message, "Admin wurde erstellt.", "success");
      render();
    } catch (error) {
      setMessage(message, error.message, "error");
    }
  });

  render();
}
