const gallery = document.querySelector("#gallery");
const statusText = document.querySelector("#galleryStatus");
const largeView = document.querySelector("#largeView");
const compactView = document.querySelector("#compactView");

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
    statusText.textContent = result.error || "Could not load gallery yet.";
    return;
  }

  gallery.replaceChildren(...result.items.map(renderItem));
  statusText.textContent = result.items.length ? `Showing ${result.items.length} recent upload${result.items.length === 1 ? "" : "s"}.` : "No uploads yet.";
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
    media.alt = item.originalName || "Wedding upload";
  }

  const caption = document.createElement("figcaption");
  caption.className = "gallery-meta";
  caption.textContent = item.guestName ? `From ${item.guestName}` : "From a guest";

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
