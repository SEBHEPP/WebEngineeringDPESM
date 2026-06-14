async function apiGet(path) {
  const response = await fetch(`/api${path}`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("healthCheckBtn");
  const output = document.getElementById("output");

  if (!button || !output) return;

  button.addEventListener("click", async () => {
    try {
      const data = await apiGet("/health");
      output.textContent = JSON.stringify(data, null, 2);
    } catch (error) {
      output.textContent = error.message;
    }
  });
});
