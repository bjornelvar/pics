// script.js
// Fetch, sort by height, and fade-in images as they load (no waiting for all)
// + loading indicator (Loaded X / Total)

document.addEventListener("DOMContentLoaded", () => {
  const owner = "bjornelvar";
  const repo = "pics";
  const folder = "images";
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/2025/${folder}`;

  const gallery = document.getElementById("gallery");
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  let currentFilter = "all";

  // --- Loading indicator state ---
  let totalImages = 0;
  let finishedImages = 0; // counts load + error

  // Inject fade-in + loading indicator styles
  const loadingOverlay = document.getElementById("loading-overlay");

  function hideLoader() {
    loadingOverlay.classList.add("hidden");
  }
  const style = document.createElement("style");
  style.innerHTML = `
    .gallery img {
      opacity: 0;
      transition: opacity 0.5s ease;
    }
    .gallery img.loaded {
      opacity: 1;
    }

    /* Loading badge */
    #loading-indicator {
      position: fixed;
      top: 14px;
      right: 14px;
      z-index: 9999;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 999px;
      padding: 8px 12px;
      font: 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: #111;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
      display: none;
      user-select: none;
    }
    #loading-indicator .muted {
      color: #666;
      margin-left: 8px;
      font-size: 12px;
    }
    #loading-indicator .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #111;
      margin-right: 8px;
      animation: pulse 1s infinite ease-in-out;
      vertical-align: middle;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(0.8); opacity: 0.4; }
      50% { transform: scale(1.0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Create loading indicator element
  const loadingEl = document.createElement("div");
  loadingEl.id = "loading-indicator";
  loadingEl.innerHTML = `<span class="dot"></span><span id="loading-text">Loading…</span><span class="muted" id="loading-sub"></span>`;
  document.body.appendChild(loadingEl);

  function showLoading(total) {
    totalImages = total;
    finishedImages = 0;
    loadingEl.style.display = "inline-flex";
    updateLoading();
  }

  function updateLoading() {
    const text = document.getElementById("loading-text");
    const sub = document.getElementById("loading-sub");

    if (totalImages <= 0) {
      text.textContent = "Loading…";
      sub.textContent = "";
      return;
    }

    text.textContent = `Loading photos`;
    sub.textContent = `(${Math.min(
      finishedImages,
      totalImages
    )} / ${totalImages})`;

    if (finishedImages >= totalImages) {
      // small grace period so it doesn't flicker
      setTimeout(() => {
        loadingEl.style.display = "none";
      }, 300);
    }
  }

  function markFinishedOne() {
    finishedImages += 1;
    updateLoading();
  }

  async function fetchImageUrls() {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("API failed");
      const files = await res.json();
      return files
        .filter((f) => f.type === "file" && /\.(jpe?g|png|gif)$/i.test(f.name))
        .map((f) => f.download_url);
    } catch {
      // fallback to local directory listing (works only if server lists directories)
      const res = await fetch(`./${folder}/`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      return Array.from(doc.querySelectorAll("a"))
        .map((a) => a.getAttribute("href"))
        .filter((n) => /\.(jpe?g|png|gif)$/i.test(n))
        .map((n) => `./${folder}/${n}`);
    }
  }

  function sortGallery() {
    const imgs = Array.from(gallery.children);
    imgs.sort((a, b) => (b.naturalHeight || 0) - (a.naturalHeight || 0));
    imgs.forEach((img) => gallery.appendChild(img));
  }

  function applyFilter() {
    const imgs = Array.from(gallery.children);
    imgs.forEach((img) => {
      const orientation = img.dataset.orientation;
      if (
        currentFilter === "all" ||
        !orientation ||
        orientation === currentFilter
      ) {
        img.style.display = "";
      } else {
        img.style.display = "none";
      }
    });
  }

  let loaderHidden = false;
  function createAndInsertImage(src) {
    const imgEl = document.createElement("img");
    imgEl.src = src;
    imgEl.loading = "lazy";

    // Ensure we only count it once (either load or error)
    let counted = false;
    const countOnce = () => {
      if (counted) return;
      counted = true;
      markFinishedOne();
    };

    imgEl.addEventListener("load", () => {
      if (!loaderHidden) {
        hideLoader(); // 👈 hides as soon as first image loads
        loaderHidden = true;
      }

      const orientation =
        imgEl.naturalHeight > imgEl.naturalWidth ? "portrait" : "landscape";

      imgEl.dataset.orientation = orientation;
      imgEl.classList.add("loaded");
      sortGallery();
      applyFilter();
    });

    imgEl.addEventListener("error", () => {
      // still count it so the loader can finish
      countOnce();
    });

    imgEl.addEventListener("click", () => {
      lightboxImg.src = src;
      lightbox.style.display = "flex";
    });

    gallery.appendChild(imgEl);
  }

  async function loadImages() {
    const urls = await fetchImageUrls();

    showLoading(urls.length);

    urls.forEach((src) => createAndInsertImage(src));

    // If there are zero images, hide loader quickly
    if (urls.length === 0) {
      finishedImages = 0;
      updateLoading();
      loadingEl.style.display = "none";
    }
  }

  // Filter click handlers
  document.querySelectorAll(".filters a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const active = document.querySelector(".filters a.active");
      if (active) active.classList.remove("active");
      link.classList.add("active");

      currentFilter = link.dataset.filter;
      applyFilter();
    });
  });

  // Close lightbox on click
  lightbox.addEventListener("click", () => (lightbox.style.display = "none"));

  // Initial load
  loadImages();
});
