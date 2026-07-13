const gallery = document.querySelector("#gallery");
const statusText = document.querySelector("#galleryStatus");
const largeView = document.querySelector("#largeView");
const compactView = document.querySelector("#compactView");

const currentLanguage = localStorage.getItem("weddingUploadLanguage") || "en";
const translations = {
  en: {
    documentTitle: "Wedding Gallery",
    kicker: "Live gallery",
    title: "Joep & Juliana's Wedding",
    viewSize: "Gallery view size",
    largeView: "Large",
    compactView: "Gallery",
    upload: "Upload",
    loading: "Loading the latest uploads...",
    loadError: "Could not load gallery yet.",
    showing: (count) => `Showing ${count} recent upload${count === 1 ? "" : "s"}.`,
    empty: "No uploads yet.",
    fromGuest: (name) => `From ${name}`,
    fromUnknown: "From a guest",
    imageAlt: "Wedding upload"
  },
  nl: {
    documentTitle: "Bruiloftsgalerij",
    kicker: "Live galerij",
    title: "De bruiloft van Joep & Juliana",
    viewSize: "Weergavegrootte galerij",
    largeView: "Groot",
    compactView: "Galerij",
    upload: "Uploaden",
    loading: "De nieuwste uploads laden...",
    loadError: "De galerij kan nog niet worden geladen.",
    showing: (count) => `${count} recente upload${count === 1 ? "" : "s"} zichtbaar.`,
    empty: "Nog geen uploads.",
    fromGuest: (name) => `Van ${name}`,
    fromUnknown: "Van een gast",
    imageAlt: "Bruiloft upload"
  },
  pt: {
    documentTitle: "Galeria do casamento",
    kicker: "Galeria ao vivo",
    title: "Casamento de Joep & Juliana",
    viewSize: "Tamanho da visualiza\u00e7\u00e3o da galeria",
    largeView: "Grande",
    compactView: "Galeria",
    upload: "Enviar",
    loading: "Carregando os envios mais recentes...",
    loadError: "Ainda n\u00e3o foi poss\u00edvel carregar a galeria.",
    showing: (count) => `Mostrando ${count} envio${count === 1 ? "" : "s"} recente${count === 1 ? "" : "s"}.`,
    empty: "Ainda n\u00e3o h\u00e1 envios.",
    fromGuest: (name) => `De ${name}`,
    fromUnknown: "De um convidado",
    imageAlt: "Envio do casamento"
  },
  es: {
    documentTitle: "Galer\u00eda de boda",
    kicker: "Galer\u00eda en vivo",
    title: "Boda de Joep & Juliana",
    viewSize: "Tama\u00f1o de vista de la galer\u00eda",
    largeView: "Grande",
    compactView: "Galer\u00eda",
    upload: "Subir",
    loading: "Cargando las subidas m\u00e1s recientes...",
    loadError: "Todav\u00eda no se pudo cargar la galer\u00eda.",
    showing: (count) => `Mostrando ${count} subida${count === 1 ? "" : "s"} reciente${count === 1 ? "" : "s"}.`,
    empty: "Todav\u00eda no hay subidas.",
    fromGuest: (name) => `De ${name}`,
    fromUnknown: "De un invitado",
    imageAlt: "Subida de boda"
  }
};

applyLanguage();

const savedView = localStorage.getItem("weddingGalleryView") || "large";
setGalleryView(savedView);

largeView.addEventListener("click", () => setGalleryView("large"));
compactView.addEventListener("click", () => setGalleryView("compact"));

loadGallery();
setInterval(loadGallery, 15000);

async function loadGallery() {
  const response = await fetch("/api/gallery");
  const result = await response.json().catch(() => ({ items: [] }));

  if (!response.ok) {
    statusText.textContent = result.error || t("loadError");
    return;
  }

  gallery.replaceChildren(...result.items.map(renderItem));
  statusText.textContent = result.items.length ? t("showing", result.items.length) : t("empty");
}

function renderItem(item) {
  const figure = document.createElement("figure");
  figure.className = "gallery-item";

  const media = item.type.startsWith("video/")
    ? document.createElement("video")
    : document.createElement("img");

  media.src = item.url;
  media.loading = "lazy";
  if (media.tagName === "VIDEO") {
    media.controls = true;
    media.muted = true;
    media.playsInline = true;
  } else {
    media.alt = item.originalName || t("imageAlt");
  }

  const caption = document.createElement("figcaption");
  caption.className = "gallery-meta";
  caption.textContent = item.guestName ? t("fromGuest", item.guestName) : t("fromUnknown");

  figure.append(media, caption);
  return figure;
}

function setGalleryView(view) {
  const isCompact = view === "compact";
  gallery.classList.toggle("gallery-compact", isCompact);
  largeView.setAttribute("aria-pressed", String(!isCompact));
  compactView.setAttribute("aria-pressed", String(isCompact));
  localStorage.setItem("weddingGalleryView", isCompact ? "compact" : "large");
}

function applyLanguage() {
  document.documentElement.lang = translations[currentLanguage] ? currentLanguage : "en";
  document.title = t("documentTitle");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
}

function t(key, ...args) {
  const language = translations[currentLanguage] ? currentLanguage : "en";
  const value = translations[language][key] || translations.en[key] || "";
  return typeof value === "function" ? value(...args) : value;
}
