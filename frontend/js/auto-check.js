async function postAutoCheck(payload) {
  const response = await fetch("/api/auto/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API error ${response.status}`);
  }

  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const button = document.getElementById("autoCheckBtn");
  const userId = document.getElementById("autoUserId");
  const resourceType = document.getElementById("autoResourceType");
  const resourceId = document.getElementById("autoResourceId");
  const action = document.getElementById("autoAction");
  const result = document.getElementById("autoResult");

  if (!button || !userId || !resourceType || !resourceId || !action || !result) {
    return;
  }

  button.addEventListener("click", async () => {
    result.value = "prüft...";

    try {
      const decision = await postAutoCheck({
        userId: userId.value,
        resourceType: resourceType.value,
        resourceId: resourceId.value,
        action: action.value
      });

      result.value = `${decision.allowed ? "erlaubt" : "abgelehnt"} (${decision.reason})`;
    } catch (error) {
      result.value = error.message;
    }
  });
});
