const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const guestName = document.querySelector("#guestName");
const compressImages = document.querySelector("#compressImages");
const uploadButton = document.querySelector("#uploadButton");
const progressBar = document.querySelector("#progressBar");
const statusText = document.querySelector("#status");
const quotaStatus = document.querySelector("#quotaStatus");
const fileList = document.querySelector("#fileList");

let selectedFiles = [];

loadQuota();

fileInput.addEventListener("change", () => setFiles([...fileInput.files]));

for (const eventName of ["dragenter", "dragover"]) {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("is-over");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  dropZone.addEventListener(eventName, () => dropZone.classList.remove("is-over"));
}

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  setFiles([...event.dataTransfer.files]);
});

uploadButton.addEventListener("click", async () => {
  uploadButton.disabled = true;
  progressBar.style.width = "0%";
  statusText.textContent = "Preparing your uploads...";

  try {
    const uploaded = [];
    const duplicates = [];

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const original = selectedFiles[index];
      const preview = compressImages.checked ? await maybeCompressImage(original) : null;
      const hash = await sha256(original);
      const form = new FormData();
      form.append("file", original, original.name);
      if (preview && preview !== original) form.append("preview", preview, preview.name);
      form.append("guestName", guestName.value.trim());
      form.append("hash", hash);
      form.append("originalName", original.name);

      statusText.textContent = `Uploading ${index + 1} of ${selectedFiles.length}: ${original.name}`;
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || `Upload failed for ${original.name}`);
      }

      if (result.duplicate) duplicates.push(original.name);
      else uploaded.push(original.name);

      progressBar.style.width = `${Math.round(((index + 1) / selectedFiles.length) * 100)}%`;
    }

    const parts = [];
    if (uploaded.length) parts.push(`${uploaded.length} uploaded`);
    if (duplicates.length) parts.push(`${duplicates.length} duplicate${duplicates.length === 1 ? "" : "s"} skipped`);
    statusText.textContent = `Done: ${parts.join(", ")}. Thank you!`;
    selectedFiles = [];
    fileInput.value = "";
    renderFileList();
    loadQuota();
  } catch (error) {
    statusText.textContent = error.message || "Upload failed. Please try again.";
  } finally {
    uploadButton.disabled = selectedFiles.length === 0;
  }
});

function setFiles(files) {
  selectedFiles = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
  uploadButton.disabled = selectedFiles.length === 0;
  statusText.textContent = selectedFiles.length ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} ready.` : "Choose a few files to begin.";
  renderFileList();
}

function renderFileList() {
  fileList.replaceChildren(...selectedFiles.map((file) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${escapeHtml(file.name)}</span><strong>${formatBytes(file.size)}</strong>`;
    return item;
  }));
}

async function maybeCompressImage(file) {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;

  const bitmap = await createImageBitmap(file);
  const maxEdge = 2200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
}

async function sha256(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

async function loadQuota() {
  try {
    const response = await fetch("/api/quota");
    const quota = await response.json();
    if (!response.ok) throw new Error(quota.error);
    quotaStatus.textContent = `${formatBytes(quota.remainingBytes)} upload space left this month.`;
  } catch {
    quotaStatus.textContent = "";
  }
}
