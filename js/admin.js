/* --- auth guard: real Firebase session check, not a fake sessionStorage flag --- */
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "admin-login.html";
  } else {
    renderSchoolTable();
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  auth.signOut().then(() => (window.location.href = "admin-login.html"));
});

const toast = document.getElementById("toast");
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}
/* Shared modal helpers: keep the page pinned to the top and lock body
   scroll while any overlay is open, so the modal is centered in view the
   moment it appears instead of requiring a scroll to find it. */
let openOverlayCount = 0;
function openOverlay(overlay) {
  window.scrollTo(0, 0);
  overlay.classList.add("open");
  openOverlayCount++;
  document.body.classList.add("modal-open");
}
function closeOverlay(overlay) {
  overlay.classList.remove("open");
  openOverlayCount = Math.max(0, openOverlayCount - 1);
  if (openOverlayCount === 0) document.body.classList.remove("modal-open");
}
/* ============ SCHOOL TABLE ============ */

const tableBody = document.getElementById("table-body");

async function refreshStats(schools) {
  const allEditions = schools.flatMap((s) => s.editions || []);
  document.getElementById("stat-schools").textContent = schools.length;
  document.getElementById("stat-editions").textContent = allEditions.length;
  document.getElementById("stat-premium").textContent = allEditions.filter(
    (e) => e.category === "Premium"
  ).length;
  document.getElementById("stat-year").textContent = allEditions.length
    ? Math.max(...allEditions.map((e) => e.year))
    : "—";
}

async function renderSchoolTable() {
  tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Memuat data...</td></tr>`;

  const withTimeout = (promise, ms = 8000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Waktu tunggu habis (server tidak merespons)")), ms)),
    ]);

  let schools;
  try {
    schools = (await withTimeout(ZadaData.getAllSchools())).sort((a, b) => a.school.localeCompare(b.school));

    // Fetch protected schools' real editions in PARALLEL instead of one
    // at a time — this was the main source of slow loading.
    await Promise.all(
      schools
        .filter((s) => s.hasPassword)
        .map(async (s) => {
          const { editions } = await ZadaData._loadPortalForAdmin(s.id);
          s.editions = editions;
        })
    );
  } catch (err) {
    console.error("Gagal memuat data dari Firestore:", err);
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f2a6a6;padding:2rem;">
      Gagal memuat data: ${err.code || err.message}.<br/>
      Cek apakah Firestore Rules sudah di-Publish, dan koneksi internet aktif.
    </td></tr>`;
    return;
  }

  await refreshStats(schools);

  if (!schools.length) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Belum ada sekolah. Klik "Tambah Sekolah" untuk memulai.</td></tr>`;
    return;
  }

  tableBody.innerHTML = schools
    .map((s) => {
      const pal = ZadaData.palette(s.palette);
      const initial = s.school.trim().charAt(0).toUpperCase();
      const years = ZadaData.editionYears(s);
      const yearRange = years.length
        ? years.length > 1
          ? `${years[years.length - 1]}–${years[0]}`
          : `${years[0]}`
        : "—";

      let coverUrl = s.cover || null;
      if (!coverUrl && s.editions && s.editions.length) {
        const edWithCover = s.editions.find((e) => e.coverImage || e.pdfCover || e.previewImage);
        if (edWithCover) coverUrl = edWithCover.coverImage || edWithCover.pdfCover || edWithCover.previewImage;
      }

      const coverHtml = coverUrl
        ? `<div class="school-cover-thumb" title="Cover ${s.school}"><img src="${coverUrl}" alt="Cover ${s.school}" loading="lazy"/></div>`
        : `<div class="school-cover-thumb school-cover-thumb--gradient" style="background:${pal.base}" title="Initial Cover ${s.school}"><span>${initial}</span></div>`;

      return `
      <tr data-id="${s.id}">
        <td>${coverHtml}</td>
        <td><strong class="school-name-cell">${s.school}</strong></td>
        <td>
          <span class="pill">${s.level}</span>
          ${s.hasPassword ? '<span class="pill pill-lock">&#128274; Privat</span>' : ""}
        </td>
        <td><span class="badge-count">${(s.editions || []).length}</span></td>
        <td><span class="year-range-text">${yearRange}</span></td>
        <td>
          <div class="row-actions">
            <button class="btn-action btn-action--editions" data-action="editions" title="Kelola Edisi Buku Tahunan">
              <span class="btn-action__icon">📚</span>
              <span>Edisi</span>
            </button>
            <button class="btn-action btn-action--progress" data-action="progress" title="Kelola Progres Pengerjaan">
              <span class="btn-action__icon">📊</span>
              <span>Progres</span>
            </button>
            <button class="btn-action btn-action--edit" data-action="edit-school" title="Edit Data Sekolah">
              <span class="btn-action__icon">✏️</span>
              <span>Edit</span>
            </button>
            <button class="btn-action btn-action--delete" data-action="delete-school" title="Hapus Sekolah">
              <span class="btn-action__icon">🗑️</span>
              <span>Hapus</span>
            </button>
          </div>
        </td>
      </tr>`;
    })
    .join("");
}

tableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  const school = await ZadaData.getSchoolById(id);

  if (btn.dataset.action === "edit-school") {
    openSchoolModal(school);
  } else if (btn.dataset.action === "delete-school") {
    if (
      confirm(
        `Hapus "${school.school}" beserta seluruh buku tahunannya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      await ZadaData.removeSchool(id);
      showToast("Sekolah berhasil dihapus.");
      renderSchoolTable();
    }
  } else if (btn.dataset.action === "editions") {
    openEditionsModal(id);
  } else if (btn.dataset.action === "progress") {
    openProgressModal(id, school);
  }
});

/* ============ SCHOOL MODAL (add/edit) ============ */

const schoolOverlay = document.getElementById("school-overlay");
const schoolForm = document.getElementById("school-form");
const schoolModalTitle = document.getElementById("school-modal-title");
const coverInput = document.getElementById("s-cover-input");
const coverHidden = document.getElementById("s-cover");
const coverPreview = document.getElementById("s-cover-preview");
const schoolSubmitBtn = document.getElementById("btn-school-submit");

function setCoverPreview(dataUrl, initial) {
  coverHidden.value = dataUrl || "";
  coverPreview.innerHTML = dataUrl
    ? `<img src="${dataUrl}" alt="Pratinjau sampul" />`
    : (initial || "?");
}

// Resize + compress an image file to a JPEG data URL so it stays well under
// Firestore's ~1MB per-document limit (raw phone photos are often 3-8MB).
function compressImageToDataURL(file, { maxWidth = 1280, maxHeight = 1280, quality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

coverInput.addEventListener("change", async () => {
  const file = coverInput.files && coverInput.files[0];
  if (!file) return;
  if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
    showToast("File harus berformat JPG, JPEG, atau PNG.");
    coverInput.value = "";
    return;
  }
  try {
    const compressed = await compressImageToDataURL(file);
    setCoverPreview(compressed);
    // Safety net: if a very busy photo still comes out large, compress harder.
    if (compressed.length > 700 * 1024) {
      const smaller = await compressImageToDataURL(file, { maxWidth: 900, maxHeight: 900, quality: 0.6 });
      setCoverPreview(smaller);
    }
  } catch (err) {
    console.error("Gagal memproses gambar:", err);
    showToast("Gagal memproses gambar sampul. Coba foto lain.");
    coverInput.value = "";
  }
});
coverInput.addEventListener("change", () => {
  const file = coverInput.files && coverInput.files[0];
  if (!file) return;
  if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
    showToast("File harus berformat JPG, JPEG, atau PNG.");
    coverInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => setCoverPreview(reader.result);
  reader.readAsDataURL(file);
});

function openSchoolModal(school) {
  schoolForm.reset();
  coverInput.value = "";
  schoolSubmitBtn.disabled = false;
  schoolSubmitBtn.textContent = "Simpan Sekolah";
  if (school) {
    schoolModalTitle.textContent = "Edit Sekolah";
    document.getElementById("s-id").value = school.id;
    document.getElementById("s-name").value = school.school;
    document.getElementById("s-level").value = school.level;
    document.getElementById("s-password").value = "";
    document.getElementById("s-password").placeholder = school.hasPassword
      ? "Kosongkan untuk tetap pakai password lama"
      : "";
    setCoverPreview(school.cover, school.school.trim().charAt(0).toUpperCase());
  } else {
    schoolModalTitle.textContent = "Tambah Sekolah";
    document.getElementById("s-id").value = "";
    document.getElementById("s-password").placeholder = "";
    setCoverPreview("", "?");
  }
  schoolOverlay.classList.add("open");
}

function closeSchoolModal() {
  schoolOverlay.classList.remove("open");
}

document.getElementById("btn-add-school").addEventListener("click", () => openSchoolModal(null));
document.getElementById("btn-school-cancel").addEventListener("click", closeSchoolModal);
schoolOverlay.addEventListener("click", (e) => {
  if (e.target === schoolOverlay) closeSchoolModal();
});

schoolForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("s-id").value;
  const name = document.getElementById("s-name").value.trim();
  const password = document.getElementById("s-password").value.trim();

  if (!id && !password) {
    showToast("Kata sandi wajib diisi untuk menjaga privasi sekolah.");
    document.getElementById("s-password").focus();
    return;
  }

  const patch = {
    school: name,
    level: document.getElementById("s-level").value,
    cover: coverHidden.value,
  };
  if (password) patch.password = password; // only sent if admin actually typed one
if (patch.cover && patch.cover.length > 900 * 1024) {
  showToast("Foto sampul masih terlalu besar. Coba unggah ulang foto lain.");
  return;
}
  schoolSubmitBtn.disabled = true;
  schoolSubmitBtn.textContent = "Menyimpan...";

  try {
    if (id) {
      await ZadaData.updateSchool(id, patch);
      showToast("Data sekolah berhasil diperbarui.");
    } else {
      const newId = `${ZadaData.slugFromSchool(name)}-${Date.now().toString().slice(-4)}`;
      await ZadaData.addSchool({ id: newId, ...patch, palette: Math.floor(Math.random() * 10), editions: [] });
      showToast("Sekolah baru berhasil ditambahkan. Sekarang tambahkan edisi buku tahunannya.");
    }

    closeSchoolModal();
    renderSchoolTable();
  } catch (err) {
    console.error("Gagal menyimpan sekolah:", err);
    showToast(`Gagal menyimpan: ${err.code || err.message}`);
  } finally {
    schoolSubmitBtn.disabled = false;
    schoolSubmitBtn.textContent = "Simpan Sekolah";
  }
});

/* ============ EDITIONS MODAL (list per school) ============ */

const editionsOverlay = document.getElementById("editions-overlay");
const editionsTableBody = document.getElementById("editions-table-body");
const editionsModalTitle = document.getElementById("editions-modal-title");
let activeSchoolId = null;

async function openEditionsModal(schoolId) {
  activeSchoolId = schoolId;
  const school = await ZadaData.getSchoolById(schoolId);
  editionsModalTitle.textContent = `Edisi Buku Tahunan — ${school.school}`;
  await renderEditionsTable();
  editionsOverlay.classList.add("open");
}

function closeEditionsModal() {
  editionsOverlay.classList.remove("open");
  activeSchoolId = null;
  renderSchoolTable();
}

async function renderEditionsTable() {
  const { editions: rawEditions } = await ZadaData._loadPortalForAdmin(activeSchoolId);
  const editions = rawEditions.slice().sort((a, b) => b.year - a.year);

  if (!editions.length) {
    editionsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.6rem;">Belum ada edisi. Klik "+ Tambah Edisi" untuk menambahkan buku tahunan pertama.</td></tr>`;
    return;
  }

  editionsTableBody.innerHTML = editions
    .map(
      (e) => `
    <tr data-edition-id="${e.id}">
      <td><strong style="font-size: 0.95rem;">${e.year}</strong></td>
      <td><span class="pill">${e.category}</span></td>
      <td><span class="badge-count">${e.students}</span></td>
      <td><a href="${e.flipbookUrl}" target="_blank" rel="noopener" class="flipbook-link">📖 Flipbook &rarr;</a></td>
      <td>
        <div class="row-actions">
          <button class="btn-action btn-action--edit" data-action="edit-edition" title="Edit Edisi">
            <span class="btn-action__icon">✏️</span>
            <span>Edit</span>
          </button>
          <button class="btn-action btn-action--delete" data-action="delete-edition" title="Hapus Edisi">
            <span class="btn-action__icon">🗑️</span>
            <span>Hapus</span>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

document.getElementById("btn-editions-close").addEventListener("click", closeEditionsModal);
editionsOverlay.addEventListener("click", (e) => {
  if (e.target === editionsOverlay) closeEditionsModal();
});

editionsTableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const editionId = btn.closest("tr").dataset.editionId;
  const { editions } = await ZadaData._loadPortalForAdmin(activeSchoolId);
  const edition = editions.find((ed) => ed.id === editionId);

  if (btn.dataset.action === "edit-edition") {
    openEditionForm(edition);
  } else if (btn.dataset.action === "delete-edition") {
    showCustomConfirmDialog({
      title: "Hapus Edisi Buku Tahunan?",
      message: `Hapus edisi tahun ${edition ? edition.year : ''}? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: "Ya, Hapus Edisi",
      onConfirm: async () => {
        await ZadaData.removeEdition(activeSchoolId, editionId);
        showToast("Edisi berhasil dihapus.");
        renderEditionsTable();
      }
    });
  }
});

/* ============ EDITION FORM MODAL (add/edit one book) ============ */

const editionFormOverlay = document.getElementById("edition-form-overlay");
const editionForm = document.getElementById("edition-form");
const editionFormTitle = document.getElementById("edition-form-title");

function openEditionForm(edition) {
  editionForm.reset();
  if (edition) {
    editionFormTitle.textContent = `Edit Edisi ${edition.year}`;
    document.getElementById("e-id").value = edition.id;
    document.getElementById("e-year").value = edition.year;
    document.getElementById("e-category").value = edition.category;
    document.getElementById("e-students").value = edition.students;
    document.getElementById("e-flipbook").value = edition.flipbookUrl;
    document.getElementById("e-summary").value = edition.summary;
  } else {
    editionFormTitle.textContent = "Tambah Edisi";
    document.getElementById("e-id").value = "";
  }
  editionFormOverlay.classList.add("open");
}

function closeEditionForm() {
  editionFormOverlay.classList.remove("open");
}

document.getElementById("btn-add-edition").addEventListener("click", () => openEditionForm(null));
document.getElementById("btn-edition-cancel").addEventListener("click", closeEditionForm);
editionFormOverlay.addEventListener("click", (e) => {
  if (e.target === editionFormOverlay) closeEditionForm();
});

editionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const editionId = document.getElementById("e-id").value;
  const year = Number(document.getElementById("e-year").value);
  const patch = {
    year,
    category: document.getElementById("e-category").value,
    students: Number(document.getElementById("e-students").value),
    flipbookUrl: document.getElementById("e-flipbook").value.trim(),
    summary: document.getElementById("e-summary").value.trim(),
  };

  if (editionId) {
    await ZadaData.updateEdition(activeSchoolId, editionId, patch);
    showToast("Edisi berhasil diperbarui.");
  } else {
    const newId = `${activeSchoolId}-${year}-${Date.now().toString().slice(-4)}`;
    await ZadaData.addEdition(activeSchoolId, { id: newId, ...patch });
    showToast("Edisi baru berhasil ditambahkan.");
  }

  closeEditionForm();
  renderEditionsTable();
});

/* ============ PROGRESS MODAL (6-tahap alur kerja per sekolah) ============ */

const progressOverlay = document.getElementById("progress-overlay");
const progressForm = document.getElementById("progress-form");
const progressStagesEl = document.getElementById("progress-stages");
const progressSchoolName = document.getElementById("progress-school-name");
let activeProgressSchoolId = null;

function stageOptionHTML(stage, currentStage) {
  const checked = stage.order === currentStage ? "checked" : "";
  return `
    <label class="stage-option ${checked ? "is-selected" : ""}" data-order="${stage.order}">
      <input type="radio" name="p-stage" value="${stage.order}" ${checked} />
      <span class="stage-option-num">${stage.order}</span>
      <span class="stage-option-copy">
        <strong>${stage.title}${stage.optional ? ' <em>(opsional)</em>' : ""}</strong>
        <small>${stage.desc}</small>
      </span>
    </label>`;
}

let currentProgressData = null;

function renderReportHistory(reports = []) {
  const container = document.getElementById("p-report-history");
  const countEl = document.getElementById("p-log-count");
  if (!container) return;

  if (countEl) countEl.textContent = `${reports.length} Laporan Recorded`;

  if (!reports || reports.length === 0) {
    container.innerHTML = `<p style="font-size: 0.82rem; color: var(--color-text-dim); font-style: italic;">Belum ada riwayat laporan tersimpan.</p>`;
    return;
  }

  container.innerHTML = reports
    .map((r) => {
      const dateStr = r.timestamp
        ? new Date(r.timestamp).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
        : "Baru saja";
      const statusClass = {
        Lancar: "badge-status--green",
        "Revisi Klien": "badge-status--yellow",
        "Menunggu Bahan": "badge-status--blue",
        "Proses Cetak": "badge-status--orange",
        Kendala: "badge-status--red"
      }[r.statusBadge] || "badge-status--green";

      return `
        <div class="team-log-card">
          <div class="team-log-card__head">
            <span class="team-log-card__stage">${r.stageTitle || "Tahap " + (r.stage || 1)}</span>
            <span class="badge-status ${statusClass}">${r.statusBadge || "Lancar"}</span>
            <span class="team-log-card__time">${dateStr}</span>
          </div>
          <div class="team-log-card__meta">
            <span>👤 <strong>PIC:</strong> ${r.pic || "Tim ZADA"}</span>
          </div>
          ${r.note ? `<div class="team-log-card__note"><strong>Pesan Klien:</strong> ${r.note}</div>` : ""}
          ${r.teamReport ? `<div class="team-log-card__report"><strong>Laporan Tim ZADA:</strong> ${r.teamReport}</div>` : ""}
        </div>
      `;
    })
    .join("");
}

async function openProgressModal(schoolId, school) {
  activeProgressSchoolId = schoolId;
  const { progress } = await ZadaData._loadPortalForAdmin(schoolId);
  currentProgressData = progress || ZadaData.defaultProgress();

  progressSchoolName.textContent = school.school;
  progressStagesEl.innerHTML = ZadaData.stages().map((s) => stageOptionHTML(s, currentProgressData.currentStage)).join("");
  document.getElementById("p-print").checked = Boolean(currentProgressData.printOrdered);
  document.getElementById("p-completed").checked = Boolean(currentProgressData.completed);
  document.getElementById("p-pic").value = currentProgressData.pic || "Tim Produksi ZADA";
  document.getElementById("p-status-badge").value = currentProgressData.statusBadge || "Lancar";
  document.getElementById("p-note").value = currentProgressData.note || "";
  document.getElementById("p-team-report").value = currentProgressData.teamReport || "";

  renderReportHistory(currentProgressData.teamReports || []);

  document.getElementById("p-updated").textContent = currentProgressData.updatedAt
    ? `Terakhir diperbarui: ${new Date(currentProgressData.updatedAt).toLocaleString("id-ID")}`
    : "Belum pernah diperbarui.";
  progressOverlay.classList.add("open");
}

function closeProgressModal() {
  progressOverlay.classList.remove("open");
  activeProgressSchoolId = null;
  currentProgressData = null;
}

progressStagesEl.addEventListener("click", (e) => {
  const label = e.target.closest(".stage-option");
  if (!label) return;
  progressStagesEl.querySelectorAll(".stage-option").forEach((el) => el.classList.remove("is-selected"));
  label.classList.add("is-selected");
  label.querySelector("input").checked = true;
});

document.getElementById("btn-progress-cancel").addEventListener("click", closeProgressModal);
progressOverlay.addEventListener("click", (e) => {
  if (e.target === progressOverlay) closeProgressModal();
});

progressForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const selected = progressForm.querySelector('input[name="p-stage"]:checked');
  const stageNum = selected ? Number(selected.value) : 1;
  const stageObj = ZadaData.stages().find((s) => s.order === stageNum);
  const picVal = document.getElementById("p-pic").value.trim() || "Tim Produksi ZADA";
  const statusBadgeVal = document.getElementById("p-status-badge").value;
  const noteVal = document.getElementById("p-note").value.trim();
  const teamReportVal = document.getElementById("p-team-report").value.trim();

  const existingReports = Array.isArray(currentProgressData?.teamReports) ? [...currentProgressData.teamReports] : [];

  // Create new report entry to connect client and team zada
  const newReportEntry = {
    id: "rep_" + Date.now(),
    timestamp: new Date().toISOString(),
    stage: stageNum,
    stageTitle: stageObj ? stageObj.title : `Tahap ${stageNum}`,
    pic: picVal,
    statusBadge: statusBadgeVal,
    note: noteVal,
    teamReport: teamReportVal
  };

  // Add report entry at top of log history
  existingReports.unshift(newReportEntry);

  const patch = {
    currentStage: stageNum,
    printOrdered: document.getElementById("p-print").checked,
    completed: document.getElementById("p-completed").checked,
    pic: picVal,
    statusBadge: statusBadgeVal,
    note: noteVal,
    teamReport: teamReportVal,
    teamReports: existingReports,
  };

  await ZadaData.saveProgress(activeProgressSchoolId, patch);
  showToast("Perkembangan & Laporan Tim ZADA berhasil dikirim.");
  closeProgressModal();
});

/* ============ ADMIN TAB NAVIGATION ============ */
const tabBtnSchools = document.getElementById("tab-btn-schools");
const tabBtnGallery = document.getElementById("tab-btn-gallery");
const sectionSchools = document.getElementById("section-schools");
const sectionGallery = document.getElementById("section-gallery");

if (tabBtnSchools && tabBtnGallery) {
  tabBtnSchools.addEventListener("click", () => {
    tabBtnSchools.classList.add("btn-primary");
    tabBtnSchools.classList.remove("btn-outline");
    tabBtnGallery.classList.remove("btn-primary");
    tabBtnGallery.classList.add("btn-outline");
    sectionSchools.style.display = "block";
    sectionGallery.style.display = "none";
  });

  tabBtnGallery.addEventListener("click", () => {
    tabBtnGallery.classList.add("btn-primary");
    tabBtnGallery.classList.remove("btn-outline");
    tabBtnSchools.classList.remove("btn-primary");
    tabBtnSchools.classList.add("btn-outline");
    sectionSchools.style.display = "none";
    sectionGallery.style.display = "block";
    renderAdminGallery();
  });
}

/* ============ GALLERY MANAGEMENT ============ */
let activeGalleryCategory = "all";
const galleryTableBody = document.getElementById("gallery-table-body");
const galleryOverlay = document.getElementById("gallery-overlay");
const galleryForm = document.getElementById("gallery-form");
const btnAddGalleryPhoto = document.getElementById("btn-add-gallery-photo");
const btnGalleryCancel = document.getElementById("btn-gallery-cancel");
const gFileInput = document.getElementById("g-file-input");
const gFileStatus = document.getElementById("g-file-status");
const gPreviewWrap = document.getElementById("g-preview-wrap");
const gPreviewImg = document.getElementById("g-preview-img");
const btnGallerySubmit = document.getElementById("btn-gallery-submit");

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB strictly

async function renderAdminGallery(catFilter = activeGalleryCategory) {
  activeGalleryCategory = catFilter;
  if (!galleryTableBody) return;

  galleryTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-dim);">Memuat foto galeri...</td></tr>`;

  const photos = await ZadaData.getAllGalleryPhotos();

  // Update gallery stats
  document.getElementById("stat-gal-total").textContent = photos.length;
  document.getElementById("stat-gal-wisuda").textContent = photos.filter((p) => p.category === "wisuda").length;
  document.getElementById("stat-gal-keluarga").textContent = photos.filter((p) => p.category === "keluarga").length;
  document.getElementById("stat-gal-prewedding").textContent = photos.filter((p) => p.category === "prewedding").length;

  const filtered = catFilter === "all" ? photos : photos.filter((p) => p.category === catFilter);

  if (!filtered.length) {
    galleryTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--color-text-dim);">Belum ada foto dalam kategori ini. Klik "Unggah Foto Baru" untuk menambahkan.</td></tr>`;
    return;
  }

  const categoryLabels = {
    wisuda: "🎓 Wisuda",
    keluarga: "👨‍👩‍👧‍👦 Keluarga",
    prewedding: "💍 Prewedding",
    portrait: "👤 Portrait",
    pasfoto: "💼 Pas Foto",
    produk: "📦 Produk",
  };

  galleryTableBody.innerHTML = filtered
    .map((p) => {
      const isPortrait = p.orientation === "portrait";
      const sizeKB = p.fileSizeKB || 500;
      const sizeMB = (sizeKB / 1024).toFixed(2);
      const isOverLimit = sizeKB > 1024;

      return `
      <tr>
        <td style="width:70px;">
          <img src="${p.imageUrl}" alt="${p.title}" style="width:54px; height:54px; border-radius:8px; object-fit:cover; border:1px solid var(--glass-border);" />
        </td>
        <td>
          <strong style="color: var(--color-text); font-size: 0.95rem;">${p.title}</strong>
          <br/>
          <small style="color: var(--color-text-dim);">${p.tags || "Tanpa tags"}</small>
        </td>
        <td>
          <span class="pill" style="font-size:0.75rem;">${categoryLabels[p.category] || p.category}</span>
        </td>
        <td>
          <span style="display:inline-block; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.78rem; font-weight:600; background:${isPortrait ? "rgba(37,99,235,0.15)" : "rgba(16,185,129,0.15)"}; color:${isPortrait ? "var(--accent-400)" : "#10b981"};">
            ${isPortrait ? "📐 Portrait (2:3)" : "🖼️ Landscape (16:9)"}
          </span>
        </td>
        <td><small style="color:var(--color-text-dim);">${p.dimensions || "Auto"}</small></td>
        <td>
          <span style="font-size:0.82rem; font-weight:600; color:${isOverLimit ? "#f87171" : "var(--accent-300)"};">
            ${sizeKB < 1024 ? sizeKB + " KB" : sizeMB + " MB"}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-sm btn-outline btn-edit-gal" data-id="${p.id}">Edit</button>
            <button class="btn btn-sm btn-outline btn-del-gal" data-id="${p.id}" style="color:#f87171; border-color:rgba(248,113,113,0.3);">Hapus</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

// Global delegated listener for gallery actions
if (galleryTableBody && !galleryTableBody.dataset.boundListener) {
  galleryTableBody.dataset.boundListener = "true";
  galleryTableBody.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".btn-edit-gal");
    if (editBtn && editBtn.dataset.id) {
      editGalleryPhoto(editBtn.dataset.id);
      return;
    }
    const delBtn = e.target.closest(".btn-del-gal");
    if (delBtn && delBtn.dataset.id) {
      deleteGalleryPhoto(delBtn.dataset.id);
      return;
    }
  });
}

// Category filter button listeners in admin
document.querySelectorAll("#adminGalleryFilters .gal-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#adminGalleryFilters .gal-filter-btn").forEach((b) => {
      b.classList.remove("btn-primary");
      b.classList.add("btn-outline");
    });
    btn.classList.add("btn-primary");
    btn.classList.remove("btn-outline");
    renderAdminGallery(btn.dataset.cat);
  });
});

/* Automatic Image Compression Helper using HTML5 Canvas */
function compressAndResizeImage(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const originalSizeKB = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("File foto tidak valid"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Auto scale to maxDimension while maintaining aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

        // Approximate size of base64 JPEG in KB
        const head = "data:image/jpeg;base64,";
        const base64Len = compressedDataUrl.length - head.length;
        const compressedSizeBytes = Math.round((base64Len * 3) / 4);
        const compressedSizeKB = Math.round(compressedSizeBytes / 1024);

        const orientation = height > width ? "portrait" : "landscape";
        const dimStr = `${width} x ${height} px`;

        resolve({
          dataUrl: compressedDataUrl,
          fileSizeKB: compressedSizeKB,
          dimensions: dimStr,
          orientation,
          originalSizeKB
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* File Upload Listener with Auto Compression & Batch Multi-Upload */
let pendingBatchFiles = [];

if (gFileInput) {
  gFileInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    const batchPreviewWrap = document.getElementById("g-batch-preview-wrap");
    const batchGrid = document.getElementById("g-batch-grid");
    const batchTitle = document.getElementById("g-batch-title");

    pendingBatchFiles = [];

    if (!files.length) {
      gFileStatus.style.display = "none";
      gPreviewWrap.style.display = "none";
      if (batchPreviewWrap) batchPreviewWrap.style.display = "none";
      return;
    }

    // Show processing indicator
    gFileStatus.style.display = "block";
    gFileStatus.style.background = "rgba(37, 99, 235, 0.15)";
    gFileStatus.style.color = "var(--accent-300)";
    gFileStatus.style.border = "1px solid rgba(37, 99, 235, 0.3)";
    gFileStatus.innerHTML = `⚡ <strong>Mengompres &amp; mengoptimalkan ${files.length} foto otomatis...</strong>`;
    btnGallerySubmit.disabled = true;

    if (files.length === 1) {
      // Single file mode with automatic compression
      if (batchPreviewWrap) batchPreviewWrap.style.display = "none";
      const file = files[0];

      try {
        const compressed = await compressAndResizeImage(file);
        
        document.getElementById("g-image-url").value = compressed.dataUrl;
        document.getElementById("g-file-size-kb").value = compressed.fileSizeKB;
        document.getElementById("g-dimensions").value = compressed.dimensions;

        const orientationSelect = document.getElementById("g-orientation");
        if (orientationSelect) orientationSelect.value = compressed.orientation;

        btnGallerySubmit.disabled = false;
        gFileStatus.style.background = "rgba(34, 197, 94, 0.15)";
        gFileStatus.style.color = "#4ade80";
        gFileStatus.style.border = "1px solid rgba(34, 197, 94, 0.3)";
        gFileStatus.innerHTML = `✨ <strong>Otomatis Dikompres!</strong> Asli: ${compressed.originalSizeKB} KB &rarr; <strong>Terkompresi: ${compressed.fileSizeKB} KB</strong> (${compressed.dimensions}). Siap diunggah!`;

        gPreviewImg.src = compressed.dataUrl;
        gPreviewWrap.style.display = "block";
      } catch (err) {
        console.error("Gagal kompres foto:", err);
        gFileStatus.style.background = "rgba(239, 68, 68, 0.15)";
        gFileStatus.style.color = "#f87171";
        gFileStatus.innerHTML = "⚠️ Gagal memproses file foto. Pastikan format image valid (JPG/PNG/WebP).";
      }
    } else {
      // Multiple / Batch files mode with automatic compression
      gPreviewWrap.style.display = "none";
      batchGrid.innerHTML = "";

      try {
        const compressedResults = await Promise.all(
          files.map((f) => compressAndResizeImage(f))
        );

        compressedResults.forEach((res, i) => {
          const originalName = files[i].name;
          pendingBatchFiles.push({
            filename: originalName,
            imageUrl: res.dataUrl,
            fileSizeKB: res.fileSizeKB,
            dimensions: res.dimensions,
            orientation: res.orientation
          });

          batchGrid.innerHTML += `
            <div style="border: 1px solid rgba(34,197,94,0.4); background: rgba(34,197,94,0.05); border-radius: 6px; padding: 0.38rem; text-align: center; font-size: 0.72rem;">
              <img src="${res.dataUrl}" style="width:100%; height:60px; object-fit:cover; border-radius:4px; margin-bottom:2px;" />
              <span style="color:#4ade80; font-weight:700; display:block;">⚡ ${res.fileSizeKB} KB</span>
              <span style="color:var(--color-text-dim); font-size:0.65rem;">(Asli ${res.originalSizeKB} KB)</span>
            </div>
          `;
        });

        if (batchPreviewWrap) batchPreviewWrap.style.display = "block";
        if (batchTitle) batchTitle.textContent = `Pratinjau Batch ${files.length} Foto (Telah Dioptimalkan Otomatis):`;

        btnGallerySubmit.disabled = false;
        gFileStatus.style.background = "rgba(34, 197, 94, 0.15)";
        gFileStatus.style.color = "#4ade80";
        gFileStatus.style.border = "1px solid rgba(34, 197, 94, 0.3)";
        gFileStatus.innerHTML = `✨ <strong>${files.length} foto berhasil dikompresi &amp; dioptimalkan!</strong> Siap diunggah sekaligus ke kategori terpilih.`;
      } catch (err) {
        console.error("Gagal kompres batch foto:", err);
        gFileStatus.style.background = "rgba(239, 68, 68, 0.15)";
        gFileStatus.style.color = "#f87171";
        gFileStatus.innerHTML = "⚠️ Terjadi kesalahan saat memproses sebagian foto batch.";
      }
    }
  });
}

// Open modal for new photo
if (btnAddGalleryPhoto) {
  btnAddGalleryPhoto.addEventListener("click", () => {
    document.getElementById("gallery-modal-title").textContent = "Unggah Foto Galeri";
    document.getElementById("g-id").value = "";
    galleryForm.reset();
    document.getElementById("g-image-url").value = "";
    document.getElementById("g-file-size-kb").value = "";
    document.getElementById("g-dimensions").value = "";
    pendingBatchFiles = [];
    gFileStatus.style.display = "none";
    gPreviewWrap.style.display = "none";
    const batchPreviewWrap = document.getElementById("g-batch-preview-wrap");
    if (batchPreviewWrap) batchPreviewWrap.style.display = "none";
    btnGallerySubmit.disabled = false;
    openOverlay(galleryOverlay);
  });
}

// Cancel modal
if (btnGalleryCancel) {
  btnGalleryCancel.addEventListener("click", () => {
    closeOverlay(galleryOverlay);
  });
}

// Edit existing photo
async function editGalleryPhoto(id) {
  const photos = await ZadaData.getAllGalleryPhotos();
  const photo = photos.find((p) => p.id === id);
  if (!photo) return;

  document.getElementById("gallery-modal-title").textContent = "Edit Detail Foto Galeri";
  document.getElementById("g-id").value = photo.id;
  document.getElementById("g-title").value = photo.title || "";
  document.getElementById("g-category").value = photo.category || "wisuda";
  document.getElementById("g-orientation").value = photo.orientation || "portrait";
  document.getElementById("g-tags").value = photo.tags || "";
  document.getElementById("g-image-url").value = photo.imageUrl || "";
  document.getElementById("g-file-size-kb").value = photo.fileSizeKB || 500;
  document.getElementById("g-dimensions").value = photo.dimensions || "1200 x 1800 px";
  pendingBatchFiles = [];

  const batchPreviewWrap = document.getElementById("g-batch-preview-wrap");
  if (batchPreviewWrap) batchPreviewWrap.style.display = "none";

  if (photo.imageUrl) {
    gPreviewImg.src = photo.imageUrl;
    gPreviewWrap.style.display = "block";
    gFileStatus.style.display = "block";
    gFileStatus.style.background = "rgba(37, 99, 235, 0.15)";
    gFileStatus.style.color = "var(--accent-300)";
    gFileStatus.style.border = "1px solid rgba(37, 99, 235, 0.3)";
    gFileStatus.innerHTML = `ℹ️ Mengedit foto terdaftar (${photo.fileSizeKB || 500} KB, ${photo.dimensions || "1200x1800 px"}).`;
  } else {
    gPreviewWrap.style.display = "none";
    gFileStatus.style.display = "none";
  }

  btnGallerySubmit.disabled = false;
  openOverlay(galleryOverlay);
}

// Custom Confirm Modal (avoiding blocked native confirm() in iframe/previews)
function showCustomConfirmDialog({ title, message, confirmText = "Ya, Hapus", onConfirm }) {
  let modal = document.getElementById("zadaConfirmModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "zadaConfirmModal";
    modal.className = "modal-overlay";
    modal.style.cssText = "z-index: 10001; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; position: fixed; inset: 0;";
    modal.innerHTML = `
      <div style="background: var(--color-surface, #1e293b); border: 1px solid var(--glass-border, rgba(255,255,255,0.15)); padding: 2rem; border-radius: 18px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 400px; width: 90%;">
        <div style="font-size: 2.5rem; margin-bottom: 0.6rem;">🗑️</div>
        <h3 id="zadaConfirmTitle" style="font-size: 1.25rem; color: #fff; margin-bottom: 0.5rem; font-weight: 700;">Hapus Foto?</h3>
        <p id="zadaConfirmMessage" style="font-size: 0.88rem; color: var(--color-text-dim, #94a3b8); margin-bottom: 1.5rem; line-height: 1.5;">Apakah Anda yakin ingin menghapus foto ini dari galeri studio ZADA?</p>
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button id="zadaConfirmCancelBtn" class="btn btn-outline" style="flex: 1; padding: 0.65rem 1rem;">Batal</button>
          <button id="zadaConfirmOkBtn" class="btn" style="flex: 1; padding: 0.65rem 1rem; background: #ef4444; color: #fff; border: none; font-weight: 600;">Ya, Hapus</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById("zadaConfirmTitle").textContent = title || "Konfirmasi Hapus";
  document.getElementById("zadaConfirmMessage").textContent = message || "Apakah Anda yakin ingin menghapus data ini?";
  const okBtn = document.getElementById("zadaConfirmOkBtn");
  const cancelBtn = document.getElementById("zadaConfirmCancelBtn");
  okBtn.textContent = confirmText;

  modal.style.display = "flex";
  modal.classList.add("open");

  const cleanup = () => {
    modal.style.display = "none";
    modal.classList.remove("open");
    okBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  cancelBtn.onclick = cleanup;
  okBtn.onclick = async () => {
    cleanup();
    if (typeof onConfirm === "function") {
      await onConfirm();
    }
  };
}

// Delete photo
async function deleteGalleryPhoto(id) {
  if (!id) return;
  
  showCustomConfirmDialog({
    title: "Hapus Foto Galeri?",
    message: "Apakah Anda yakin ingin menghapus foto ini dari katalog studio ZADA?",
    confirmText: "Ya, Hapus",
    onConfirm: async () => {
      try {
        showSavingLoadingPopup("⏳ Menghapus Foto...", "Sedang menghapus foto dari katalog studio ZADA...");
        await ZadaData.deleteGalleryPhoto(id);
        await new Promise((r) => setTimeout(r, 200));
        showToast("✅ Foto berhasil dihapus dari galeri.");
        await renderAdminGallery();
      } catch (err) {
        console.error("Gagal menghapus foto:", err);
        showToast("⚠️ Gagal menghapus foto. Silakan coba lagi.");
      } finally {
        hideSavingLoadingPopup();
      }
    }
  });
}

function showSavingLoadingPopup(title = "⏳ Mohon Tunggu...", message = "Sedang mengompres & menyimpan foto ke galeri studio ZADA...") {
  let overlay = document.getElementById("zadaLoadingOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "zadaLoadingOverlay";
    overlay.className = "modal-overlay";
    overlay.style.cssText = "z-index: 10000; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; position: fixed; inset: 0;";
    overlay.innerHTML = `
      <div style="background: var(--color-surface, #1e293b); border: 1px solid var(--glass-border, rgba(255,255,255,0.15)); padding: 2.2rem 2.5rem; border-radius: 18px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 420px; width: 90%;">
        <div class="spinner" style="margin: 0 auto 1.2rem auto; width: 44px; height: 44px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--accent-400, #3b82f6); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
        <h3 id="zadaLoadingTitle" style="font-size: 1.2rem; color: var(--color-text, #ffffff); margin-bottom: 0.5rem; font-weight: 700;">⏳ Mohon Tunggu...</h3>
        <p id="zadaLoadingText" style="font-size: 0.88rem; color: var(--color-text-dim, #94a3b8); margin: 0; line-height: 1.5;">Sedang memproses &amp; menyimpan foto ke galeri...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  document.getElementById("zadaLoadingTitle").textContent = title;
  document.getElementById("zadaLoadingText").textContent = message;
  overlay.style.display = "flex";
  overlay.classList.add("open");
}

function hideSavingLoadingPopup() {
  const overlay = document.getElementById("zadaLoadingOverlay");
  if (overlay) {
    overlay.style.display = "none";
    overlay.classList.remove("open");
  }
}

// Submit gallery form
if (galleryForm) {
  galleryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("g-id").value;
    const baseTitle = document.getElementById("g-title").value.trim();
    const category = document.getElementById("g-category").value;
    const defaultOrientation = document.getElementById("g-orientation").value;
    const tags = document.getElementById("g-tags").value.trim();

    const isBatch = !id && pendingBatchFiles.length > 1;
    const totalFiles = isBatch ? pendingBatchFiles.length : 1;

    showSavingLoadingPopup(
      "⏳ Mohon Tunggu...",
      `Sedang menyimpan ${totalFiles} foto ke galeri studio ZADA...`
    );

    // Brief delay to render popup
    await new Promise((r) => setTimeout(r, 300));

    try {
      // Batch upload mode if multiple valid files were selected
      if (isBatch) {
        const batchPayloads = pendingBatchFiles.map((bf, idx) => ({
          title: `${baseTitle} #${idx + 1}`,
          category,
          orientation: bf.orientation || defaultOrientation,
          tags,
          imageUrl: bf.imageUrl,
          fileSizeKB: bf.fileSizeKB,
          dimensions: bf.dimensions,
        }));

        await ZadaData.addGalleryPhotosBatch(batchPayloads);
        
        await new Promise((r) => setTimeout(r, 400));
        hideSavingLoadingPopup();

        showToast(`🎉 Berhasil mengunggah ${batchPayloads.length} foto ke album ${category.toUpperCase()}!`);
        pendingBatchFiles = [];
        closeOverlay(galleryOverlay);
        renderAdminGallery();
        return;
      }

      // Single upload or edit mode
      let imageUrl = document.getElementById("g-image-url").value;
      let fileSizeKB = parseInt(document.getElementById("g-file-size-kb").value) || 450;
      let dimensions = document.getElementById("g-dimensions").value || (defaultOrientation === "portrait" ? "1200 x 1800 px" : "1920 x 1280 px");
      let orientation = defaultOrientation;

      if (!id && pendingBatchFiles.length === 1) {
        imageUrl = pendingBatchFiles[0].imageUrl;
        fileSizeKB = pendingBatchFiles[0].fileSizeKB;
        dimensions = pendingBatchFiles[0].dimensions;
        orientation = pendingBatchFiles[0].orientation || defaultOrientation;
      }

      if (!imageUrl) {
        const fallbackUrls = {
          wisuda: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
          keluarga: "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1920&auto=format&fit=crop",
          prewedding: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1200&auto=format&fit=crop",
          portrait: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
          pasfoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
          produk: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1920&auto=format&fit=crop",
        };
        imageUrl = fallbackUrls[category] || fallbackUrls.wisuda;
      }

      const payload = {
        title: baseTitle,
        category,
        orientation,
        tags,
        imageUrl,
        fileSizeKB,
        dimensions,
      };

      if (id) {
        await ZadaData.updateGalleryPhoto(id, payload);
        showToast("Foto galeri berhasil diperbarui.");
      } else {
        await ZadaData.addGalleryPhoto(payload);
        showToast("Foto baru berhasil ditambahkan ke galeri!");
      }

      await new Promise((r) => setTimeout(r, 300));
      hideSavingLoadingPopup();

      pendingBatchFiles = [];
      closeOverlay(galleryOverlay);
      renderAdminGallery();
    } catch (err) {
      console.error("Gagal menyimpan foto galeri:", err);
      hideSavingLoadingPopup();
      showToast("⚠️ Gagal menyimpan foto. Silakan coba lagi.");
    }
  });
}

