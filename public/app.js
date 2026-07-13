const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const guestName = document.querySelector("#guestName");
const compressImages = document.querySelector("#compressImages");
const uploadButton = document.querySelector("#uploadButton");
const progressBar = document.querySelector("#progressBar");
const statusText = document.querySelector("#status");
const fileList = document.querySelector("#fileList");
const languageOptions = document.querySelectorAll(".language-option");

let selectedFiles = [];
let currentLanguage = localStorage.getItem("weddingUploadLanguage") || "en";

const translations = {
  en: {
    title: "Welcome to Joep & Juliana's wedding album",
    lede: "We'd love to see the day through your eyes. Upload your favorite photos and videos below.",
    nameLabel: "Your name",
    namePlaceholder: "So we know who to thank",
    chooseFiles: "Tap to choose files",
    dropFiles: "or drag & drop photos and videos here",
    compress: "Compress large photos before upload",
    upload: "Upload memories",
    gallery: "View live gallery",
    statusInitial: "Choose a few files to begin.",
    statusReady: (count) => `${count} file${count === 1 ? "" : "s"} ready.`,
    statusNameRequired: "Please enter your name before uploading.",
    statusPreparing: "Preparing your uploads...",
    statusUploading: (index, total, name) => `Uploading ${index} of ${total}: ${name}`,
    statusDone: (parts) => `Done: ${parts.join(", ")}. Thank you!`,
    statusFailed: "Upload failed. Please try again.",
    uploaded: (count) => `${count} uploaded`,
    duplicates: (count) => `${count} duplicate${count === 1 ? "" : "s"} skipped`
  },
  nl: {
    title: "Welkom in het trouwalbum van Joep & Juliana",
    lede: "We zien deze dag graag door jullie ogen. Upload hieronder je favoriete foto's en video's.",
    nameLabel: "Je naam",
    namePlaceholder: "Dan weten we wie we kunnen bedanken",
    chooseFiles: "Tik om bestanden te kiezen",
    dropFiles: "of sleep foto's en video's hierheen",
    compress: "Grote foto's verkleinen voor uploaden",
    upload: "Herinneringen uploaden",
    gallery: "Bekijk live galerij",
    statusInitial: "Kies een paar bestanden om te beginnen.",
    statusReady: (count) => `${count} bestand${count === 1 ? "" : "en"} klaar.`,
    statusNameRequired: "Vul je naam in voordat je uploadt.",
    statusPreparing: "Uploads voorbereiden...",
    statusUploading: (index, total, name) => `${index} van ${total} uploaden: ${name}`,
    statusDone: (parts) => `Klaar: ${parts.join(", ")}. Dankjewel!`,
    statusFailed: "Uploaden mislukt. Probeer het opnieuw.",
    uploaded: (count) => `${count} geupload`,
    duplicates: (count) => `${count} duplicaat${count === 1 ? "" : "en"} overgeslagen`
  },
  pt: {
    title: "Bem-vindos ao álbum de casamento de Joep & Juliana",
    lede: "Adoraríamos ver o dia pelos seus olhos. Envie suas fotos e vídeos favoritos abaixo.",
    nameLabel: "Seu nome",
    namePlaceholder: "Para sabermos a quem agradecer",
    chooseFiles: "Toque para escolher arquivos",
    dropFiles: "ou arraste fotos e vídeos para cá",
    compress: "Comprimir fotos grandes antes do envio",
    upload: "Enviar memórias",
    gallery: "Ver galeria ao vivo",
    statusInitial: "Escolha alguns arquivos para começar.",
    statusReady: (count) => `${count} arquivo${count === 1 ? "" : "s"} pronto${count === 1 ? "" : "s"}.`,
    statusNameRequired: "Digite seu nome antes de enviar.",
    statusPreparing: "Preparando seus envios...",
    statusUploading: (index, total, name) => `Enviando ${index} de ${total}: ${name}`,
    statusDone: (parts) => `Pronto: ${parts.join(", ")}. Obrigado!`,
    statusFailed: "Falha no envio. Tente novamente.",
    uploaded: (count) => `${count} enviado${count === 1 ? "" : "s"}`,
    duplicates: (count) => `${count} duplicado${count === 1 ? "" : "s"} ignorado${count === 1 ? "" : "s"}`
  },
  es: {
    title: "Bienvenidos al álbum de boda de Joep & Juliana",
    lede: "Nos encantaría ver el día a través de sus ojos. Suban sus fotos y videos favoritos abajo.",
    nameLabel: "Tu nombre",
    namePlaceholder: "Para saber a quién agradecer",
    chooseFiles: "Toca para elegir archivos",
    dropFiles: "o arrastra fotos y videos aquí",
    compress: "Comprimir fotos grandes antes de subirlas",
    upload: "Subir recuerdos",
    gallery: "Ver galería en vivo",
    statusInitial: "Elige algunos archivos para empezar.",
    statusReady: (count) => `${count} archivo${count === 1 ? "" : "s"} listo${count === 1 ? "" : "s"}.`,
    statusNameRequired: "Ingresa tu nombre antes de subir archivos.",
    statusPreparing: "Preparando tus archivos...",
    statusUploading: (index, total, name) => `Subiendo ${index} de ${total}: ${name}`,
    statusDone: (parts) => `Listo: ${parts.join(", ")}. Gracias!`,
    statusFailed: "No se pudo subir. Inténtalo de nuevo.",
    uploaded: (count) => `${count} subido${count === 1 ? "" : "s"}`,
    duplicates: (count) => `${count} duplicado${count === 1 ? "" : "s"} omitido${count === 1 ? "" : "s"}`
  }
};

applyLanguage(currentLanguage);

fileInput.addEventListener("change", () => setFiles([...fileInput.files]));
guestName.addEventListener("input", updateUploadState);

languageOptions.forEach((option) => {
  option.addEventListener("click", () => applyLanguage(option.dataset.language));
});

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
  if (!guestName.value.trim()) {
    statusText.textContent = t("statusNameRequired");
    guestName.focus();
    updateUploadState();
    return;
  }

  uploadButton.disabled = true;
  progressBar.style.width = "0%";
  statusText.textContent = t("statusPreparing");

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

      statusText.textContent = t("statusUploading", index + 1, selectedFiles.length, original.name);
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
    if (uploaded.length) parts.push(t("uploaded", uploaded.length));
    if (duplicates.length) parts.push(t("duplicates", duplicates.length));
    statusText.textContent = t("statusDone", parts);
    selectedFiles = [];
    fileInput.value = "";
    renderFileList();
  } catch (error) {
    statusText.textContent = error.message || t("statusFailed");
  } finally {
    updateUploadState();
  }
});

function setFiles(files) {
  selectedFiles = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
  statusText.textContent = selectedFiles.length ? t("statusReady", selectedFiles.length) : t("statusInitial");
  updateUploadState();
  renderFileList();
}

function updateUploadState() {
  uploadButton.disabled = selectedFiles.length === 0 || !guestName.value.trim();
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

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "en";
  localStorage.setItem("weddingUploadLanguage", currentLanguage);
  document.documentElement.lang = currentLanguage;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  languageOptions.forEach((option) => {
    option.setAttribute("aria-pressed", String(option.dataset.language === currentLanguage));
  });

  if (!selectedFiles.length) statusText.textContent = t("statusInitial");
  else statusText.textContent = t("statusReady", selectedFiles.length);
}

function t(key, ...args) {
  const value = translations[currentLanguage][key] || translations.en[key] || "";
  return typeof value === "function" ? value(...args) : value;
}
