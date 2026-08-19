/* ZADA Studio Gallery Component & Category Album Landing Page Architecture */

let allGalleryPhotos = [];
let currentGalleryFilter = "all";
let activeCategoryAlbum = null; // null = viewing all category albums, string = specific album

// Active Lightbox State
let activeAlbumPhotos = [];
let activePhotoIndex = 0;

const CATEGORY_MAP = {
  wisuda: {
    name: "Wisuda Studio",
    title: "Album Foto Wisuda",
    desc: "Sesi foto selebrasi kelulusan & wisuda dengan lighting studio presisi, toga & kebaya look elegan, diabadikan sempurna untuk momen bersejarah Anda.",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
  },
  keluarga: {
    name: "Foto Keluarga",
    title: "Album Foto Keluarga",
    desc: "Potret kehangatan keluarga besar dalam konsep studio yang hangat dan intim, dirancang untuk mengabadikan kebersamaan indah antar generasi.",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  },
  prewedding: {
    name: "Prewedding & Couple",
    title: "Album Prewedding & Couple",
    desc: "Foto prewedding & couple bergaya sinematik modern dengan pencahayaan lembut, penataan pose alami, dan nuansa romantis yang abadi.",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
  },
  portrait: {
    name: "Personal Portrait",
    title: "Album Personal Portrait",
    desc: "Foto personal branding & profil profesional dengan estetika visual berkelas, memberikan kesan impresif dan percaya diri.",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
  },
  pasfoto: {
    name: "Pas Foto & Profile",
    title: "Album Pas Foto & Profile",
    desc: "Pas foto resmi & kebutuhan dokumen berstandar tinggi dengan latar bersih, kontras tajam, dan ketepatan warna yang presisi.",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>`
  },
  produk: {
    name: "Foto Produk",
    title: "Album Foto Produk Commercial",
    desc: "Foto komersial & katalog produk berstandar profesional untuk menonjolkan keunggulan detail dan daya tarik visual brand Anda.",
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`
  }
};

async function initStudioGallery() {
  const gridContainer = document.getElementById("galleryGrid");
  const pillsContainer = document.getElementById("galleryCategoryPills");

  if (!gridContainer) return;

  gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--color-text-dim);">
    <div class="spinner" style="margin: 0 auto 1rem auto;"></div>
    Memuat katalog album galeri studio ZADA...
  </div>`;

  try {
    allGalleryPhotos = await ZadaData.getAllGalleryPhotos();
  } catch (err) {
    console.error("Gagal memuat galeri:", err);
    allGalleryPhotos = [];
  }

  renderGalleryView();
  setupGalleryPills(pillsContainer);
  setupGalleryLightbox();
}

function renderGalleryView() {
  const gridContainer = document.getElementById("galleryGrid");
  const emptyState = document.getElementById("galleryEmptyState");

  if (!gridContainer) return;

  if (currentGalleryFilter === "all" && !activeCategoryAlbum) {
    // LEVEL 1: Render All Album Cards (Album Landing Page Catalog)
    renderAlbumCategoryCatalog(gridContainer, emptyState);
  } else {
    // LEVEL 2: Render Photos inside a Specific Category Album Landing
    const targetCategory = activeCategoryAlbum || currentGalleryFilter;
    renderSpecificCategoryAlbum(gridContainer, emptyState, targetCategory);
  }
}

/* LEVEL 1: Render Album Catalog Landing View */
function renderAlbumCategoryCatalog(gridContainer, emptyState) {
  const categoryOrder = ["wisuda", "keluarga", "prewedding", "portrait", "pasfoto", "produk"];

  const albums = [];
  categoryOrder.forEach((catKey) => {
    const catPhotos = allGalleryPhotos.filter((p) => p.category === catKey);
    if (catPhotos.length > 0) {
      albums.push({
        categoryKey: catKey,
        meta: CATEGORY_MAP[catKey] || { name: catKey, title: "Album " + catKey, desc: "", icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>` },
        coverPhoto: catPhotos[0],
        photos: catPhotos,
        totalCount: catPhotos.length
      });
    }
  });

  if (!albums.length) {
    gridContainer.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  gridContainer.style.display = "grid";

  gridContainer.innerHTML = albums.map((album) => {
    const cover = album.coverPhoto;
    const meta = album.meta;

    return `
      <div class="gallery-card album-catalog-card" data-category="${album.categoryKey}" style="cursor: pointer;">
        <div class="gallery-card__img-wrap" style="padding-top: 75%;">
          <img src="${cover.imageUrl}" alt="${album.meta.title}" loading="lazy" class="gallery-card__img" />
          <div class="gallery-card__overlay">
            <span class="gallery-card__zoom-icon">Buka Galeri Album (${album.totalCount} Foto)</span>
          </div>
          <span class="gallery-badge gallery-badge--orient" style="top: 12px; left: 12px; background: rgba(15, 23, 42, 0.85); font-size: 0.78rem; letter-spacing: 0.02em;">
            ${album.totalCount} Sesi Foto Klien
          </span>
          <span class="gallery-badge gallery-badge--dim" style="bottom: 12px; right: 12px;">
            Katalog Album Studio
          </span>
        </div>
        <div class="gallery-card__content" style="padding: 1.35rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.3rem;">
            <span class="gallery-card__category" style="font-size: 0.78rem;">${meta.name}</span>
            <span style="font-size:0.75rem; color:var(--accent-400); font-weight:700; background:rgba(37,99,235,0.12); padding:0.25rem 0.6rem; border-radius:6px;">
              ${album.totalCount} Foto
            </span>
          </div>
          <h3 class="gallery-card__title" style="font-size: 1.15rem; margin-bottom: 0.4rem;">${meta.title}</h3>
          <p style="font-size:0.83rem; color:var(--color-text-dim); line-height: 1.45; margin-bottom: 0.8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${meta.desc}
          </p>
          <div style="margin-top: auto; pt: 0.5rem; display:flex; align-items:center; justify-content:space-between; border-top: 1px dashed var(--glass-border); padding-top: 0.75rem;">
            <span style="font-size: 0.8rem; color: var(--color-text-dim);">Sampul: <strong>${cover.title}</strong></span>
            <span style="font-size:0.82rem; color:var(--accent-400); font-weight:700; display:flex; align-items:center; gap:0.2rem;">
              Lihat Album &rarr;
            </span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // Attach click events to album cards
  gridContainer.querySelectorAll(".album-catalog-card").forEach((card) => {
    card.addEventListener("click", () => {
      const catKey = card.dataset.category;
      activeCategoryAlbum = catKey;
      currentGalleryFilter = catKey;

      // Update pills active state
      updateActivePill(catKey);

      // Render inner album photos
      renderGalleryView();

      // Scroll smoothly to gallery section
      const gallerySec = document.getElementById("galeri-foto");
      if (gallerySec) gallerySec.scrollIntoView({ behavior: "smooth" });
    });
  });
}

/* LEVEL 2: Render Inner Album Page Grid */
function renderSpecificCategoryAlbum(gridContainer, emptyState, catKey) {
  const catPhotos = allGalleryPhotos.filter((p) => p.category === catKey);
  const meta = CATEGORY_MAP[catKey] || { name: catKey, title: "Album " + catKey, desc: "Koleksi foto studio ZADA.", icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>` };

  if (!catPhotos.length) {
    gridContainer.style.display = "none";
    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(37,99,235,0.1); color: var(--accent-400); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
          <h3 style="font-size: 1.2rem; color: var(--color-text); margin-bottom: 0.5rem;">Belum ada foto di ${meta.title}</h3>
          <p style="font-size: 0.9rem; color: var(--color-text-dim); margin-bottom: 1.25rem;">Foto untuk album ini belum diunggah oleh admin.</p>
          <button class="btn btn-outline btn-sm" id="btnBackToAlbumsEmpty">&larr; Kembali ke Semua Album</button>
        </div>
      `;
      document.getElementById("btnBackToAlbumsEmpty")?.addEventListener("click", () => {
        activeCategoryAlbum = null;
        currentGalleryFilter = "all";
        updateActivePill("all");
        renderGalleryView();
      });
    }
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  gridContainer.style.display = "grid";

  // Build Album Header Banner
  const headerHtml = `
    <div class="album-header-banner" style="grid-column: 1 / -1; background: var(--color-surface); border: 1px solid var(--glass-border); border-radius: var(--radius-lg); padding: 1.5rem 1.8rem; margin-bottom: 1rem; box-shadow: 0 10px 30px rgba(0,0,0,0.04);">
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0.8rem;">
        <button class="btn btn-outline btn-sm" id="btnBackToAlbums" style="border-radius: var(--radius-pill); font-weight: 600;">
          &larr; Kembali ke Semua Album
        </button>
        <span class="pill" style="margin: 0; font-size: 0.82rem; background: rgba(37,99,235,0.12); color: var(--accent-400); border-color: rgba(37,99,235,0.25);">
          Album Klien (${catPhotos.length} Foto Tersedia)
        </span>
      </div>

      <div style="display: flex; align-items: flex-start; gap: 1rem; margin-top: 0.5rem;">
        <div style="color: var(--accent-400); background: rgba(37,99,235,0.1); width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${meta.icon}
        </div>
        <div>
          <h2 style="font-size: 1.45rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.3rem; line-height: 1.3;">
            ${meta.title}
          </h2>
          <p style="font-size: 0.9rem; color: var(--color-text-dim); margin: 0; max-width: 780px; line-height: 1.5;">
            ${meta.desc}
          </p>
        </div>
      </div>
    </div>
  `;

  // Render photo cards
  const photoCardsHtml = catPhotos.map((photo, index) => {
    const isPortrait = photo.orientation === "portrait";

    return `
      <div class="gallery-card inner-photo-card ${photo.orientation || 'portrait'}" data-index="${index}" style="cursor: pointer;">
        <div class="gallery-card__img-wrap">
          <img src="${photo.imageUrl}" alt="${photo.title}" loading="lazy" class="gallery-card__img" />
          <div class="gallery-card__overlay">
            <span class="gallery-card__zoom-icon">Perbesar &amp; Detail Foto</span>
          </div>
          <span class="gallery-badge gallery-badge--orient ${isPortrait ? 'portrait' : 'landscape'}">
            ${isPortrait ? 'Portrait' : 'Landscape'}
          </span>
          <span class="gallery-badge gallery-badge--dim">
            ZADA Studio
          </span>
        </div>
        <div class="gallery-card__content">
          <span class="gallery-card__category">${meta.name}</span>
          <h3 class="gallery-card__title">${photo.title}</h3>
          <p class="gallery-card__tags" style="font-size:0.8rem; color:var(--color-text-dim); margin-top:0.2rem;">
            ${photo.tags || 'Studio Shoot'} &bull; Klik untuk perbesar
          </p>
        </div>
      </div>
    `;
  }).join("");

  gridContainer.innerHTML = headerHtml + photoCardsHtml;

  // Back to albums listener
  document.getElementById("btnBackToAlbums")?.addEventListener("click", () => {
    activeCategoryAlbum = null;
    currentGalleryFilter = "all";
    updateActivePill("all");
    renderGalleryView();
  });

  // Photo click event -> Opens Lightbox Slider Modal for this album
  gridContainer.querySelectorAll(".inner-photo-card").forEach((card) => {
    card.addEventListener("click", () => {
      const idx = parseInt(card.dataset.index, 10);
      openCategoryAlbumLightbox(catPhotos, isNaN(idx) ? 0 : idx);
    });
  });
}

function updateActivePill(catKey) {
  const container = document.getElementById("galleryCategoryPills");
  if (!container) return;

  container.querySelectorAll(".pill-btn").forEach((b) => {
    if (b.dataset.cat === catKey) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });
}

function setupGalleryPills(container) {
  if (!container) return;

  const buttons = container.querySelectorAll(".pill-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentGalleryFilter = btn.dataset.cat;
      if (currentGalleryFilter === "all") {
        activeCategoryAlbum = null;
      } else {
        activeCategoryAlbum = currentGalleryFilter;
      }

      renderGalleryView();
    });
  });
}

/* Multi-Photo Category Lightbox Modal Setup */
function setupGalleryLightbox() {
  let lightbox = document.getElementById("galleryLightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "galleryLightbox";
    lightbox.className = "modal-overlay gallery-lightbox";
    lightbox.innerHTML = `
      <div class="modal gallery-lightbox__modal" style="max-width: 980px; padding: 0; overflow: hidden; border-radius: 16px;">
        <!-- Lightbox Header Bar -->
        <div class="gallery-lightbox__header">
          <div style="display:flex; align-items:center; gap:0.8rem;">
            <span class="pill" id="lightboxCategoryHeader" style="margin: 0; font-size: 0.82rem;">Album Wisuda</span>
            <span id="lightboxCounterHeader" style="font-size:0.88rem; color:var(--color-text-dim); font-weight:600;">(Foto 1 dari 4)</span>
          </div>
          <button class="gallery-lightbox__close" id="closeLightbox" aria-label="Tutup Pratinjau">&times;</button>
        </div>

        <div class="gallery-lightbox__grid">
          <!-- Left: Main Photo Viewport with Nav Arrows -->
          <div class="gallery-lightbox__image-box">
            <button class="lightbox-nav-btn prev" id="lightboxPrevBtn" aria-label="Foto Sebelumnya">&#10094;</button>
            
            <div class="lightbox-img-container">
              <img id="lightboxImg" src="" alt="Pratinjau Foto Galeri Studio ZADA" />
              <span class="lightbox-photo-index" id="lightboxImageIndex">1 / 4</span>
            </div>

            <button class="lightbox-nav-btn next" id="lightboxNextBtn" aria-label="Foto Selanjutnya">&#10095;</button>
          </div>

          <!-- Right: Details Side Panel -->
          <div class="gallery-lightbox__info-box" style="padding: 1.8rem; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <span class="pill" id="lightboxCategoryTag" style="margin-bottom: 0.8rem; font-size: 0.78rem;">Wisuda Studio</span>
              <h2 id="lightboxTitle" style="font-size: 1.35rem; margin-bottom: 1rem; color: var(--color-text); line-height: 1.3;">Detail Foto Studio</h2>
              
              <div style="background: var(--color-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 1rem 1.15rem; margin-bottom: 1.25rem; font-size: 0.88rem; color: var(--color-text); line-height: 1.5;">
                <p id="lightboxDescriptionText" style="margin: 0; color: var(--color-text-dim);">
                  Setiap momen diabadikan dengan tata cahaya studio profesional, komposisi artistik presisi, dan hasil visual berkualitas tinggi khas ZADA Studio.
                </p>
              </div>

              <p id="lightboxTags" style="font-size: 0.85rem; color: var(--color-text-dim); margin-bottom: 1.25rem;">Tags: Wisuda, Studio A</p>
            </div>

            <div>
              <a id="lightboxWaBtn" href="#" target="_blank" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center; gap: 0.5rem; box-shadow: var(--shadow-glow);">
                Booking Konsep Ini via WhatsApp &rarr;
              </a>
            </div>
          </div>
        </div>

        <!-- Bottom: Album Thumbnail Strip -->
        <div class="gallery-lightbox__thumb-strip" id="lightboxThumbStrip"></div>
      </div>
    `;
    document.body.appendChild(lightbox);

    document.getElementById("closeLightbox").addEventListener("click", closeGalleryLightbox);
    
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeGalleryLightbox();
    });

    // Navigation buttons
    document.getElementById("lightboxPrevBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      navigateAlbum(-1);
    });

    document.getElementById("lightboxNextBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      navigateAlbum(1);
    });

    // Global keyboard listener for modal
    document.addEventListener("keydown", (e) => {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "ArrowLeft") navigateAlbum(-1);
      if (e.key === "ArrowRight") navigateAlbum(1);
      if (e.key === "Escape") closeGalleryLightbox();
    });
  }
}

function openCategoryAlbumLightbox(albumPhotos, startIndex = 0) {
  if (!albumPhotos || !albumPhotos.length) return;

  activeAlbumPhotos = albumPhotos;
  activePhotoIndex = startIndex >= 0 && startIndex < albumPhotos.length ? startIndex : 0;

  const lightbox = document.getElementById("galleryLightbox");
  if (!lightbox) return;

  renderLightboxActivePhoto();

  lightbox.classList.add("open");
  document.body.classList.add("modal-open");
}

function navigateAlbum(direction) {
  if (!activeAlbumPhotos.length) return;
  
  activePhotoIndex += direction;
  if (activePhotoIndex < 0) {
    activePhotoIndex = activeAlbumPhotos.length - 1; // loop to last
  } else if (activePhotoIndex >= activeAlbumPhotos.length) {
    activePhotoIndex = 0; // loop to first
  }

  renderLightboxActivePhoto();
}

function renderLightboxActivePhoto() {
  const photo = activeAlbumPhotos[activePhotoIndex];
  if (!photo) return;

  const meta = CATEGORY_MAP[photo.category] || { name: photo.category, title: "Album " + photo.category, desc: "" };

  const total = activeAlbumPhotos.length;
  const currentNum = activePhotoIndex + 1;

  // Update Header & Counter
  document.getElementById("lightboxCategoryHeader").textContent = meta.title;
  document.getElementById("lightboxCounterHeader").textContent = `(Foto ${currentNum} dari ${total})`;
  document.getElementById("lightboxImageIndex").textContent = `${currentNum} / ${total}`;

  // Update Main Image & Info
  const imgEl = document.getElementById("lightboxImg");
  imgEl.style.opacity = "0.3";
  imgEl.src = photo.imageUrl;
  imgEl.onload = () => { imgEl.style.opacity = "1"; };

  document.getElementById("lightboxTitle").textContent = photo.title;
  document.getElementById("lightboxCategoryTag").textContent = meta.name;

  const descEl = document.getElementById("lightboxDescriptionText");
  if (descEl) {
    descEl.textContent = meta.desc || "Setiap momen diabadikan dengan tata cahaya studio profesional, pencahayaan presisi, dan estetika visual berkualitas tinggi khas ZADA Studio.";
  }

  document.getElementById("lightboxTags").textContent = photo.tags ? `Label Konsep: ${photo.tags}` : "Kategori: " + meta.name;

  // Update WhatsApp Booking Link for currently active photo
  const waMessage = encodeURIComponent(`Halo ZADA Studio, saya tertarik dengan foto '${photo.title}' (${meta.name}) di galeri web dan ingin konsultasi / booking.`);
  document.getElementById("lightboxWaBtn").href = `https://wa.me/6282217771191?text=${waMessage}`;

  // Render Thumbnails Strip
  renderLightboxThumbnails();
}

function renderLightboxThumbnails() {
  const thumbStrip = document.getElementById("lightboxThumbStrip");
  if (!thumbStrip) return;

  thumbStrip.innerHTML = activeAlbumPhotos.map((p, idx) => {
    const isActive = idx === activePhotoIndex;
    return `
      <div class="lightbox-thumb ${isActive ? 'active' : ''}" data-idx="${idx}">
        <img src="${p.imageUrl}" alt="${p.title}" />
      </div>
    `;
  }).join("");

  thumbStrip.querySelectorAll(".lightbox-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const idx = parseInt(thumb.dataset.idx, 10);
      if (!isNaN(idx)) {
        activePhotoIndex = idx;
        renderLightboxActivePhoto();
      }
    });
  });

  // Scroll active thumbnail into view smoothly
  const activeThumb = thumbStrip.querySelector(".lightbox-thumb.active");
  if (activeThumb) {
    activeThumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function closeGalleryLightbox() {
  const lightbox = document.getElementById("galleryLightbox");
  if (lightbox) {
    lightbox.classList.remove("open");
    document.body.classList.remove("modal-open");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initStudioGallery();
});
