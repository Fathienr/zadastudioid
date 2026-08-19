/* ZADA STUDIO — Project Progress Widget (Client Live Tracker) */

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("project-progress-widget");
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding: 3rem 1rem;">
      <p style="color:var(--color-text-dim); font-family:var(--font-mono, monospace); font-size:0.9rem;">
        ⚡ Memuat data progres proyek real-time&hellip;
      </p>
    </div>
  `;

  try {
    let schools = [];
    if (typeof ZadaData !== "undefined" && ZadaData.getAllSchools) {
      schools = await ZadaData.getAllSchools();
    }

    // Default sample fallback projects if database is empty or loading
    if (!schools || schools.length === 0) {
      schools = [
        {
          id: "sma-labs-2026",
          school: "SMA LABSCHOOL KEBAYORAN",
          level: "SMA/MA",
          hasPassword: false,
          progress: {
            currentStage: 3,
            pic: "M. Rizky (Lead Layout)",
            statusBadge: "Revisi Klien",
            note: "Draf desain bab 1-3 telah diunggah. Panitia sekolah dimohon melakukan Final Review.",
            teamReport: "Editing foto kandid & layout kelas 12 IPA telah rampung 90%. Menunggu konfirmasi revisi panitia.",
            updatedAt: new Date().toISOString()
          }
        },
        {
          id: "sman1-tng-2026",
          school: "SMA NEGERI 1 TANGERANG",
          level: "SMA/MA",
          hasPassword: false,
          progress: {
            currentStage: 2,
            pic: "Tim Fotografi Studio",
            statusBadge: "Lancar",
            note: "Sesi Photoshoot outdoor telah selesai. Tim editing sedang memproses pewarnaan foto.",
            teamReport: "500+ foto mentah dari sesi pemotretan studio & outdoor telah disortir.",
            updatedAt: new Date().toISOString()
          }
        },
        {
          id: "smp-alazhar-2026",
          school: "SMP AL-AZHAR 1 JAKARTA",
          level: "SMP/MTs",
          hasPassword: false,
          progress: {
            currentStage: 4,
            pic: "Tim Produksi & Cetak ZADA",
            statusBadge: "Proses Cetak",
            note: "Final Review telah disetujui. Flipbook digital aktif & dummy cetak sedang diproduksi.",
            teamReport: "Buku telah dikirim ke percetakan mitra untuk sampel proofing.",
            updatedAt: new Date().toISOString()
          }
        }
      ];
    }

    renderProjectProgressWidget(container, schools);
  } catch (err) {
    console.error("Error loading project progress:", err);
    container.innerHTML = `
      <div style="text-align:center; padding: 2rem; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.2);">
        <p style="color:#f87171;">Gagal memuat data progres real-time. Silakan muat ulang halaman.</p>
      </div>
    `;
  }
});

function renderProjectProgressWidget(container, schools) {
  let activeSchool = schools[0];
  let unlockedDataMap = {}; // stores unlocked data for password-protected schools

  function getMilestones() {
    return [
      {
        order: 1,
        key: "konsep",
        icon: "📋",
        title: "Konsep & Konsultasi",
        subtitle: "Briefing & Planning",
        desc: "Diskusi konsep visual, penentuan jadwal pemotretan, dan struktur tata letak awal."
      },
      {
        order: 2,
        key: "photoshoot",
        icon: "📸",
        title: "Photoshoot",
        subtitle: "Sesi Pemotretan & Produksi",
        desc: "Pengambilan foto studio/on-location, sesi foto per kelas, individu, dan dokumentasi."
      },
      {
        order: 3,
        key: "editing",
        icon: "🎨",
        title: "Editing",
        subtitle: "Retouching & Design Layout",
        desc: "Seleksi foto terbaik, color grading, retouching wajah, dan penyusunan desain halaman."
      },
      {
        order: 4,
        key: "final_review",
        icon: "🔍",
        title: "Final Review",
        subtitle: "Pengecekan Klien & Proofing",
        desc: "Review draf cetak/digital oleh pihak sekolah/klien untuk konfirmasi revisi akhir."
      },
      {
        order: 5,
        key: "publishing",
        icon: "📖",
        title: "Flipbook & Cetak",
        subtitle: "Publikasi Digital / Cetak",
        desc: "Penerbitan e-flipbook interaktif dan proses cetak fisik hardcover/softcover."
      },
      {
        order: 6,
        key: "complete",
        icon: "🎁",
        title: "Pengarsipan",
        subtitle: "Serah Terima Final",
        desc: "Pengiriman hasil akhir album, file master digital, dan penyerahan produk ke klien."
      }
    ];
  }

  function renderWidgetContent() {
    const isProtected = Boolean(activeSchool.hasPassword);
    const unlockedPortal = unlockedDataMap[activeSchool.id];
    const isUnlocked = !isProtected || Boolean(unlockedPortal);

    const progressData = isUnlocked
      ? (unlockedPortal ? unlockedPortal.progress : activeSchool.progress) || { currentStage: 1 }
      : { currentStage: 1 };

    const milestones = getMilestones();
    const currentStageNum = progressData.currentStage || 1;
    const isFullyCompleted = Boolean(progressData.completed);

    const picName = progressData.pic || "Tim Produksi ZADA";
    const statusBadgeText = progressData.statusBadge || "Lancar";
    const statusClass = {
      Lancar: "badge-status--green",
      "Revisi Klien": "badge-status--yellow",
      "Menunggu Bahan": "badge-status--blue",
      "Proses Cetak": "badge-status--orange",
      Kendala: "badge-status--red"
    }[statusBadgeText] || "badge-status--green";

    const lastUpdatedLabel = progressData.updatedAt
      ? new Date(progressData.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
      : "Terbaru";

    // Build Milestones Steps HTML
    const stepsHTML = milestones.map((m) => {
      let state = "pending";
      if (isFullyCompleted || m.order < currentStageNum) state = "done";
      else if (m.order === currentStageNum) state = "active";

      const statusBadgeLabel = {
        done: "✓ Selesai",
        active: "⚡ Sedang Berjalan",
        pending: "⏳ Menunggu"
      }[state];

      return `
        <div class="tracker-milestone tracker-milestone--${state}">
          <div class="tracker-milestone__icon-box">
            <span class="tracker-milestone__icon">${state === "done" ? "✓" : m.icon}</span>
            <span class="tracker-milestone__num">${m.order}</span>
          </div>
          <div class="tracker-milestone__content">
            <span class="tracker-milestone__badge tracker-milestone__badge--${state}">${statusBadgeLabel}</span>
            <h4 class="tracker-milestone__title">${m.title}</h4>
            <span class="tracker-milestone__sub">${m.subtitle}</span>
            <p class="tracker-milestone__desc">${m.desc}</p>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="progress-tracker-card">
        <!-- Header Selector -->
        <div class="progress-tracker-card__top">
          <div class="progress-tracker-card__header-title">
            <span class="eyebrow-chip">📍 REAL-TIME PROJECT TRACKER</span>
            <h3>Pilih Proyek / Sekolah Mitra</h3>
          </div>
          <div class="progress-tracker-card__select-wrap">
            <select id="tracker-school-select" class="tracker-select" aria-label="Pilih Proyek Sekolah">
              ${schools.map((s) => `
                <option value="${s.id}" ${s.id === activeSchool.id ? "selected" : ""}>
                  ${s.school} (${s.level || "Project"}) ${s.hasPassword ? "🔒 Privat" : ""}
                </option>
              `).join("")}
            </select>
          </div>
        </div>

        ${isProtected && !isUnlocked ? `
          <!-- Password Protected Gate inside Tracker Widget -->
          <div class="tracker-lock-gate">
            <div class="tracker-lock-icon">🔒</div>
            <h4>Progres Proyek bersifat Privat</h4>
            <p>Masukkan kata sandi akses yang diberikan oleh tim ZADA untuk melihat perkembangan proyek <strong>${activeSchool.school}</strong>.</p>
            <form id="widget-lock-form" class="tracker-lock-form">
              <div class="tracker-input-group">
                <input type="password" id="widget-lock-pwd" placeholder="Masukkan kata sandi proyek..." required autocomplete="off" />
                <button type="submit" class="btn btn-primary btn-sm">Lihat Progres &rarr;</button>
              </div>
              <p id="widget-lock-err" class="tracker-lock-err" style="display:none;">Kata sandi tidak sesuai. Hubungi tim ZADA jika Anda lupa sandi.</p>
            </form>
          </div>
        ` : `
          <!-- Live Real-time Status Header Card -->
          <div class="tracker-live-summary">
            <div class="tracker-live-summary__info">
              <div class="tracker-live-summary__project-name">
                <span class="tracker-project-level">${activeSchool.level || "PROYEK"}</span>
                <h2>${activeSchool.school}</h2>
              </div>
              <div class="tracker-live-summary__status">
                <span class="badge-status ${statusClass}">● ${statusBadgeText}</span>
                <span class="tracker-updated-tag">🕒 ${lastUpdatedLabel}</span>
              </div>
            </div>

            <div class="tracker-live-summary__pic-box">
              <span class="zada-avatar">👤</span>
              <div>
                <span class="pic-label">Penanggung Jawab (PIC Tim ZADA)</span>
                <strong>${picName}</strong>
              </div>
            </div>
          </div>

          ${progressData.note || progressData.teamReport ? `
            <div class="tracker-notes-grid">
              ${progressData.note ? `
                <div class="tracker-note-card tracker-note-card--client">
                  <span class="tracker-note-card__label">💬 Pesan untuk Klien / Panitia</span>
                  <p>${progressData.note}</p>
                </div>
              ` : ""}
              ${progressData.teamReport ? `
                <div class="tracker-note-card tracker-note-card--team">
                  <span class="tracker-note-card__label">📊 Laporan Internal Tim ZADA</span>
                  <p>${progressData.teamReport}</p>
                </div>
              ` : ""}
            </div>
          ` : ""}

          <!-- Milestones Visual Track -->
          <div class="tracker-milestones-wrapper">
            <div class="tracker-milestones-header">
              <h4>Milestone &amp; Tahapan Progres Real-Time</h4>
              <span class="tracker-stage-indicator">Tahap Saat Ini: <strong>Tahap ${currentStageNum} dari 6</strong></span>
            </div>
            <div class="tracker-milestones-grid">
              ${stepsHTML}
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="tracker-footer-actions">
            <a href="progress.html?id=${encodeURIComponent(activeSchool.id)}" class="btn btn-primary btn-block-mobile">
              🔍 Buka Portal Progress Penuh &amp; Riwayat Log &rarr;
            </a>
            <a href="https://wa.me/6281234567890?text=Halo%20Tim%20ZADA,%20saya%20ingin%20bertanya%20mengenai%20progres%20proyek%20${encodeURIComponent(activeSchool.school)}" target="_blank" rel="noopener" class="btn btn-outline btn-block-mobile">
              💬 Hubungi PIC ZADA via WhatsApp
            </a>
          </div>
        `}
      </div>
    `;

    // Attach event listeners
    const selectEl = container.querySelector("#tracker-school-select");
    if (selectEl) {
      selectEl.addEventListener("change", (e) => {
        const found = schools.find((s) => s.id === e.target.value);
        if (found) {
          activeSchool = found;
          renderWidgetContent();
        }
      });
    }

    const lockForm = container.querySelector("#widget-lock-form");
    if (lockForm) {
      lockForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pwdInput = container.querySelector("#widget-lock-pwd");
        const errEl = container.querySelector("#widget-lock-err");
        const submitBtn = lockForm.querySelector("button[type='submit']");

        if (!pwdInput) return;
        errEl.style.display = "none";
        submitBtn.disabled = true;
        submitBtn.textContent = "Memeriksa...";

        if (typeof ZadaData !== "undefined" && ZadaData.tryUnlockPortal) {
          const unlocked = await ZadaData.tryUnlockPortal(activeSchool.id, pwdInput.value);
          if (unlocked !== null) {
            unlockedDataMap[activeSchool.id] = unlocked;
            // Also store in sessionStorage for smooth transition to progress.html
            const unlockKey = `zada_unlocked_${activeSchool.id}`;
            sessionStorage.setItem(unlockKey, "1");
            sessionStorage.setItem(`${unlockKey}_data`, JSON.stringify(unlocked));
            renderWidgetContent();
            return;
          }
        }
        errEl.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.textContent = "Lihat Progres →";
      });
    }
  }

  renderWidgetContent();
}
