const adminKey = document.querySelector("#adminKey");
const loadAdmin = document.querySelector("#loadAdmin");
const adminList = document.querySelector("#adminList");
const adminStatus = document.querySelector("#adminStatus");

loadAdmin.addEventListener("click", async () => {
  adminStatus.textContent = "Loading uploads...";
  const response = await fetch("/api/admin/uploads", {
    headers: { "x-admin-key": adminKey.value }
  });
  const result = await response.json().catch(() => ({ items: [] }));

  if (!response.ok) {
    adminStatus.textContent = result.error || "Admin request failed.";
    return;
  }

  adminList.replaceChildren(...result.items.map((item) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <span>${escapeHtml(item.originalName || item.key)}</span>
      <span>${escapeHtml(item.guestName || "Guest")} · ${new Date(item.uploadedAt).toLocaleString()}</span>
      <a class="ghost-link" href="${item.url}" target="_blank" rel="noreferrer">Open original</a>
    `;
    return row;
  }));

  adminStatus.textContent = `${result.items.length} upload${result.items.length === 1 ? "" : "s"} found.`;
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
