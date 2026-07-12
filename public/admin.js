const adminKey = document.querySelector("#adminKey");
const loadAdmin = document.querySelector("#loadAdmin");
const adminList = document.querySelector("#adminList");
const adminStatus = document.querySelector("#adminStatus");
const adminQuota = document.querySelector("#adminQuota");

loadQuota();

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

async function loadQuota() {
  try {
    const response = await fetch("/api/quota");
    const quota = await response.json();
    if (!response.ok) throw new Error(quota.error);
    adminQuota.textContent = `${formatBytes(quota.usedBytes)} used of ${formatBytes(quota.limitBytes)} this month (${quota.percentUsed}%).`;
  } catch {
    adminQuota.textContent = "Monthly quota is not available yet.";
  }
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
