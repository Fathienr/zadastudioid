document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const root = document.getElementById("page-content");
  root.innerHTML = `<section style="padding:6rem 0;text-align:center;"><p style="color:var(--text-faint);font-family:var(--mono);font-size:0.85rem;">Memuat perkembangan&hellip;</p></section>`;
  const school = id ? await ZadaData.getSchoolById(id) : null;

  if (!school) {
    root.innerHTML = `
      <section style="padding:6rem 0;text-align:center;">
        <div class="container">
          <span class="eyebrow">404</span>
          <h1 style="font-family:var(--display);font-size:2rem;margin:0.6rem 0 1rem;">Sekolah tidak ditemukan</h1>
          <p style="color:var(--text-muted);margin-bottom:1.6rem;">Tautan ini mungkin sudah tidak berlaku, atau data sekolah telah dihapus dari arsip.</p>
          <a href="yearbook.html#katalog" class="btn btn-primary">Kembali ke Portofolio Yearbook</a>
        </div>
      </section>
    `;
    return;
  }

  // Shares the same unlock key/session cache as school.html — a visitor
  // who already unlocked the portfolio (or unlocks it here first) does not
  // need to type the password twice in the same browser tab.
  const unlockKey = `zada_unlocked_${school.id}`;
  const isProtected = Boolean(school.hasPassword);
  const alreadyUnlockedThisSession = sessionStorage.getItem(unlockKey) === "1";

  if (!isProtected) {
    renderProgress(school.progress || ZadaData.defaultProgress());
  } else if (alreadyUnlockedThisSession) {
    const cached = JSON.parse(sessionStorage.getItem(`${unlockKey}_data`) || "{}");
    renderProgress(cached.progress || ZadaData.defaultProgress());
  } else {
    renderLockGate();
  }

  function renderLockGate() {
    root.innerHTML = `
      <section style="padding:4rem 0 6rem;">
        <div class="container">
          <a href="school.html?id=${encodeURIComponent(school.id)}" class="back-link">&larr; Kembali ke Halaman Sekolah</a>
          <div class="lock-gate">
            <div class="lock-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <span class="eyebrow">Status Perkembangan Privat</span>
            <h1>${school.school}</h1>
            <p>Progres pengerjaan buku tahunan sekolah ini bersifat privat. Masukkan kata sandi akses yang diberikan oleh tim ZADA untuk memantau alur pengerjaan.</p>
            
            <form id="lock-form" class="lock-form">
              <div class="field">
                <label for="lock-password">Kata Sandi Akses</label>
                <div class="input-password-wrap">
                  <input type="password" id="lock-password" placeholder="Masukkan kata sandi..." autocomplete="off" required />
                  <button type="button" id="togglePwd" class="toggle-pwd-btn" aria-label="Tampilkan kata sandi">
                    &#128065;
                  </button>
                </div>
              </div>
              <p class="lock-error" id="lock-error">Kata sandi kurang tepat. Silakan periksa kembali atau hubungi tim ZADA.</p>
              <button type="submit" class="btn btn-primary" id="lock-submit" style="width:100%; justify-content:center;">Lihat Perkembangan Proyek &rarr;</button>
            </form>
          </div>
        </div>
      </section>
    `;

    const form = document.getElementById("lock-form");
    const errorEl = document.getElementById("lock-error");
    const submitBtn = document.getElementById("lock-submit");
    const pwdInput = document.getElementById("lock-password");
    const toggleBtn = document.getElementById("togglePwd");

    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const isPwd = pwdInput.type === "password";
        pwdInput.type = isPwd ? "text" : "password";
        toggleBtn.textContent = isPwd ? "🙈" : "👁️";
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorEl.style.display = "none";
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Memeriksa...";

      const value = pwdInput.value;
      const portal = await ZadaData.tryUnlockPortal(school.id, value);

      if (portal !== null) {
        sessionStorage.setItem(unlockKey, "1");
        sessionStorage.setItem(`${unlockKey}_data`, JSON.stringify(portal));
        renderProgress(portal.progress);
      } else {
        errorEl.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Lihat Perkembangan Proyek &rarr;";
      }
    });
  }

  function renderProgress(progress) {
    const stages = ZadaData.stages();
    const current = progress.currentStage || 1;
    const isFullyCompleted = Boolean(progress.completed);

    const stepsHTML = stages
      .map((stage) => {
        const isSkipped = stage.optional && !progress.printOrdered;
        let state = "pending";
        if (isSkipped) state = "skipped";
        else if (isFullyCompleted) state = "done";
        else if (stage.order < current) state = "done";
        else if (stage.order === current) state = "active";

        const statusLabel = {
          done: "Selesai",
          active: "Sedang Berjalan",
          pending: "Menunggu",
          skipped: "Tidak Dipesan",
        }[state];

        return `
      <li class="stage-step stage-step--${state}">
        <div class="stage-step-marker">
          <span class="stage-step-num">${state === "done" ? "&#10003;" : stage.order}</span>
        </div>
        <div class="stage-step-body">
          <span class="stage-step-status">${statusLabel}</span>
          <h3>${stage.title}${stage.optional ? ' <em>(opsional)</em>' : ""}</h3>
          <p>${stage.desc}</p>
        </div>
      </li>`;
      })
      .join("");

    const updatedLabel = progress.updatedAt
      ? new Date(progress.updatedAt).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
      : "belum ada pembaruan tercatat";

    const picName = progress.pic || "Tim Produksi ZADA";
    const statusBadgeText = progress.statusBadge || "Lancar";
    const statusClass = {
      Lancar: "badge-status--green",
      "Revisi Klien": "badge-status--yellow",
      "Menunggu Bahan": "badge-status--blue",
      "Proses Cetak": "badge-status--orange",
      Kendala: "badge-status--red"
    }[statusBadgeText] || "badge-status--green";

    const teamReports = Array.isArray(progress.teamReports) ? progress.teamReports : [];

    const historyLogsHTML = teamReports.length > 0
      ? teamReports.map((r) => {
          const dateStr = r.timestamp
            ? new Date(r.timestamp).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
            : "Terbaru";
          const rStatusClass = {
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
                <span class="badge-status ${rStatusClass}">${r.statusBadge || "Lancar"}</span>
                <span class="team-log-card__time">${dateStr}</span>
              </div>
              <div class="team-log-card__meta">
                <span>👤 <strong>PIC ZADA:</strong> ${r.pic || "Tim ZADA"}</span>
              </div>
              ${r.note ? `<div class="team-log-card__note"><strong>Pesan ke Klien:</strong> ${r.note}</div>` : ""}
              ${r.teamReport ? `<div class="team-log-card__report"><strong>Laporan Tim ZADA:</strong> ${r.teamReport}</div>` : ""}
            </div>
          `;
        }).join("")
      : `<p style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Belum ada riwayat laporan khusus yang tercatat.</p>`;

    root.innerHTML = `
    <header class="detail-hero">
      <div class="container">
        <a href="school.html?id=${encodeURIComponent(school.id)}" class="back-link">&larr; Kembali ke halaman sekolah</a>
        <div class="progress-head">
          <span class="eyebrow">Status Perkembangan &middot; ${school.hasPassword ? "&#128274; Privat" : "Publik"}</span>
          <h1>${school.school}</h1>
          <p class="detail-summary">${
            isFullyCompleted
              ? `Buku tahunan ${school.school} telah rampung diproses oleh tim ZADA, dari konsep hingga pengarsipan resmi.`
              : `Halaman ini menunjukkan sejauh mana buku tahunan ${school.school} telah diproses oleh tim ZADA, mengikuti alur kerja resmi dari konsep hingga pengarsipan.`
          }</p>
        </div>
      </div>
    </header>

    <section class="detail-body">
      <div class="container">
        <div class="progress-panel">
          ${
            isFullyCompleted
              ? `<div class="progress-complete-banner">
                  <span class="progress-complete-icon">&#10003;</span>
                  <div>
                    <strong>Seluruh Proses Selesai</strong>
                    <p>Buku tahunan ini telah tuntas dikerjakan dan diarsipkan secara resmi oleh tim ZADA.</p>
                  </div>
                </div>`
              : ""
          }

          <!-- Tim ZADA Status & Client Report Box -->
          <div class="zada-team-card">
            <div class="zada-team-card__header">
              <div class="zada-team-card__pic">
                <span class="zada-avatar">🏢</span>
                <div>
                  <strong>Penanggung Jawab Tim ZADA</strong>
                  <p>${picName}</p>
                </div>
              </div>
              <div class="zada-team-card__status">
                <span class="badge-status ${statusClass}">${statusBadgeText}</span>
              </div>
            </div>

            ${
              progress.note
                ? `<div class="zada-team-card__body">
                    <span class="eyebrow">Pesan Utama untuk Panitia / Klien</span>
                    <p>${progress.note}</p>
                  </div>`
                : ""
            }

            ${
              progress.teamReport
                ? `<div class="zada-team-card__report">
                    <span class="eyebrow">Laporan Terbaru Tim ZADA</span>
                    <p>${progress.teamReport}</p>
                  </div>`
                : ""
            }
          </div>

          <h2 style="font-family: var(--display); font-size: 1.25rem; margin: 2rem 0 1rem; color: var(--text-main);">Alur Tahapan Pengerjaan</h2>
          <ol class="stage-track">
            ${stepsHTML}
          </ol>

          <!-- History Logs section connecting Client & Tim Zada -->
          <div class="progress-history-section" style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--glass-border);">
            <h2 style="font-family: var(--display); font-size: 1.15rem; margin-bottom: 0.8rem; color: var(--text-main); display: flex; align-items: center; justify-content: space-between;">
              <span>💬 Riwayat Laporan &amp; Log Tim ZADA</span>
              <span style="font-size: 0.8rem; font-family: var(--mono); color: var(--text-faint); font-weight: normal;">Hubungan Klien &amp; Tim</span>
            </h2>
            <div class="team-report-history-container">
              ${historyLogsHTML}
            </div>
          </div>

          <p class="progress-updated" style="margin-top: 1.5rem;">Terakhir diperbarui: ${updatedLabel}</p>

          <div class="detail-actions">
            <a href="school.html?id=${encodeURIComponent(school.id)}" class="btn btn-ghost">Lihat Portofolio &amp; Flipbook &rarr;</a>
          </div>
        </div>
      </div>
    </section>
  `;
  }
});
