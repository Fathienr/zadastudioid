/* Shared UI helpers used across pages */

function initNavToggle() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;
  toggle.addEventListener("click", () => links.classList.toggle("open"));
}

function schoolCardHTML(school) {
  const pal = ZadaData.palette(school.palette);
  const initial = school.school.trim().charAt(0).toUpperCase();
  const years = ZadaData.editionYears(school);
  const yearLabel = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : `${years[0] || "-"}`;
  const editionWord = school.editions.length > 1 ? "Edisi" : "Edisi";
  const latest = school.editions.slice().sort((a, b) => b.year - a.year)[0];

  const coverImg = school.cover
    ? `<img class="card-cover-img" src="${school.cover}" alt="Sampul ${school.school}" loading="lazy" />`
    : "";

  return `
    <a class="card" href="school.html?id=${encodeURIComponent(school.id)}">
      <div class="card-hover-progress"></div>
      <div class="card-cover" style="background:${pal.base}">
        <span class="card-pop-badge">🔍 Sampul Utuh</span>
        ${coverImg}
        <span class="card-tag">${school.level}${school.hasPassword ? " &middot; &#128274; Privat" : ` &middot; ${school.editions.length} ${editionWord}`}</span>
        ${school.cover ? "" : `<span class="card-initial">${initial}</span>`}
        <div class="card-cover-foot">
          <div class="school">${school.school}</div>
          <div class="meta">${school.hasPassword ? "PRIVAT" : `EDISI ${yearLabel}`}</div>
        </div>
      </div>
      <div class="card-body">
        <p>${school.hasPassword ? "Portofolio ini bersifat privat. Masukkan kata sandi di halaman sekolah untuk melihat isinya." : (latest ? latest.summary : "Belum ada edisi tercatat.")}</p>
        <span class="card-link">${school.hasPassword ? "Buka dengan kata sandi" : `Lihat ${school.editions.length > 1 ? "semua portofolio" : "flipbook"}`} &rarr;</span>
      </div>
    </a>
  `;
}

function initCardHoverPopups(gridEl) {
  if (!gridEl) return;

  // Create full page blur backdrop if not present
  let backdrop = document.querySelector(".portfolio-hover-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "portfolio-hover-backdrop";
    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", () => {
      clearAllPopups();
    });
  }

  let hoverTimer = null;
  let activeCard = null;

  function clearAllPopups() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    const cards = gridEl.querySelectorAll(".card");
    cards.forEach((c) => {
      c.classList.remove("is-popped-up", "is-hover-loading");
    });
    gridEl.classList.remove("has-focus-active");
    if (backdrop) backdrop.classList.remove("is-active");
    activeCard = null;
  }

  gridEl.addEventListener("mouseover", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;

    if (activeCard && activeCard === card) return;

    if (!activeCard) {
      // Clear any pending timer on previous card
      gridEl.querySelectorAll(".card").forEach((c) => {
        if (c !== card) c.classList.remove("is-hover-loading");
      });

      if (hoverTimer) clearTimeout(hoverTimer);

      card.classList.add("is-hover-loading");

      // Set 1-second (1000ms) hover delay threshold
      hoverTimer = setTimeout(() => {
        activeCard = card;
        card.classList.remove("is-hover-loading");
        card.classList.add("is-popped-up");
        gridEl.classList.add("has-focus-active");
        if (backdrop) backdrop.classList.add("is-active");
      }, 1000);
    }
  });

  gridEl.addEventListener("mouseout", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;

    const related = e.relatedTarget;
    if (related && card.contains(related)) return; // Still inside card

    if (card === activeCard) {
      clearAllPopups();
    } else {
      card.classList.remove("is-hover-loading");
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
      }
    }
  });

  window.addEventListener("scroll", () => {
    if (activeCard) clearAllPopups();
  }, { passive: true });
}

function populateYearFilter(selectEl, schools) {
  const years = new Set();
  schools.forEach((s) => s.editions.forEach((e) => years.add(e.year)));
  [...years]
    .sort((a, b) => b - a)
    .forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      selectEl.appendChild(opt);
    });
}

document.addEventListener("DOMContentLoaded", initNavToggle);
