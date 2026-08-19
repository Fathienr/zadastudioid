document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const root = document.getElementById("page-content");
  root.innerHTML = `<section style="padding:6rem 0;text-align:center;"><p style="color:var(--text-faint);font-family:var(--mono);font-size:0.85rem;">Memuat data sekolah&hellip;</p></section>`;
  const school = id ? await ZadaData.getSchoolById(id) : null;

  if (!school) {
    document.title = "Sekolah Tidak Ditemukan — ZADA Yearbook";
    root.innerHTML = `
      <section style="padding:6rem 0;text-align:center;">
        <div class="container">
          <span class="eyebrow">404</span>
          <h1 style="font-family:var(--display);font-size:2rem;margin:0.6rem 0 1rem;">Sekolah tidak ditemukan</h1>
          <p style="color:var(--text-muted);margin-bottom:1.6rem;">Tautan ini mungkin sudah tidak berlaku, atau data sekolah telah dihapus dari arsip.</p>
          <a href="yearbook.html#katalog" class="btn btn-primary">Kembali ke Katalog</a>
        </div>
      </section>
    `;
    return;
  }

  const unlockKey = `zada_unlocked_${school.id}`;
  document.title = `${school.school} — ZADA Yearbook`;
  const isProtected = Boolean(school.hasPassword);
  // Session-only convenience so the visitor isn't asked again on this
  // device during this browser tab session. It does NOT grant access on
  // its own — it's just a flag we check before re-fetching from Firestore.
  const alreadyUnlockedThisSession = sessionStorage.getItem(unlockKey) === "1";

  if (!isProtected) {
    renderFullDetail(school.editions || []);
  } else if (alreadyUnlockedThisSession) {
    const cached = JSON.parse(sessionStorage.getItem(`${unlockKey}_data`) || "{}");
    renderFullDetail(cached.editions || []);
  } else {
    renderLockGate();
  }

  function renderLockGate() {
    root.innerHTML = `
      <section style="padding:4rem 0 6rem;">
        <div class="container">
          <a href="yearbook.html#katalog" class="back-link">&larr; Kembali ke Portofolio Yearbook</a>
          <div class="lock-gate">
            <div class="lock-icon-wrap">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <span class="eyebrow">Akses Privat Terproteksi</span>
            <h1>${school.school}</h1>
            <p>Katalog buku tahunan sekolah ini bersifat privat untuk menjaga privasi dokumentasi siswa. Masukkan kata sandi akses yang diberikan oleh pihak sekolah atau panitia.</p>
            
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
              <button type="submit" class="btn btn-primary" id="lock-submit" style="width:100%; justify-content:center;">Buka Akses Portofolio &rarr;</button>
            </form>

            <a href="progress.html?id=${encodeURIComponent(school.id)}" class="lock-gate-alt-link">Cek status perkembangan buku tahunan &rarr;</a>
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
        renderFullDetail(portal.editions);
      } else {
        errorEl.style.display = "block";
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Buka Akses Portofolio &rarr;";
      }
    });
  }

  function renderFullDetail(editionsRaw) {
    const pal = ZadaData.palette(school.palette);
    const initial = school.school.trim().charAt(0).toUpperCase();
    const editions = (editionsRaw || []).slice().sort((a, b) => b.year - a.year);
    const totalStudents = editions.reduce((sum, e) => sum + (Number(e.students) || 0), 0);
    const years = editions.map((e) => e.year).sort((a, b) => b - a);
    const yearLabel = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : `${years[0] || "-"}`;

    const editionsHTML = editions.length
      ? editions
          .map((e) => {
            const isLiveLink = e.flipbookUrl && !e.flipbookUrl.includes("/example/");
            const flipEmbed = isLiveLink
              ? `<iframe src="${e.flipbookUrl}" loading="lazy" allowfullscreen title="Flipbook ${school.school} ${e.year}"></iframe>`
              : `<div class="flip-fallback">
                  Pratinjau flipbook AnyFlip edisi ${e.year} akan tampil di sini setelah tautan proyek terhubung ke akun AnyFlip ZADA.<br />
                  <a href="${e.flipbookUrl}" target="_blank" rel="noopener" style="color:var(--maroon);font-family:var(--mono);">${e.flipbookUrl}</a>
                </div>`;
            return `
      <div class="edition-block">
        <div class="edition-head">
          <div>
            <span class="eyebrow">Edisi ${e.year}</span>
            <h3>Buku Tahunan ${e.year}</h3>
          </div>
          <div class="edition-badges">
            <span class="pill">${e.category}</span>
            <span class="pill">${e.students} Siswa</span>
          </div>
        </div>
        <p class="edition-summary">${e.summary}</p>
        <div class="flip-frame">
          <div class="frame-bar">
            <span>anyflip.com</span>
            <a href="${e.flipbookUrl}" target="_blank" rel="noopener">Buka di tab baru &rarr;</a>
          </div>
          ${flipEmbed}
        </div>
      </div>
    `;
          })
          .join("")
      : `<div class="empty-state">Belum ada edisi buku tahunan tercatat untuk sekolah ini.</div>`;

    root.innerHTML = `
    <header class="detail-hero">
      <div class="container">
        <a href="yearbook.html#katalog" class="back-link">&larr; Kembali ke Portofolio Yearbook</a>
        <div class="detail-grid">
          <div class="detail-cover" style="background:${pal.base}">
            ${school.cover ? `<img class="detail-cover-img" src="${school.cover}" alt="Sampul ${school.school}" />` : `<span class="card-initial">${initial}</span>`}
          </div>
          <div class="detail-title">
            <span class="eyebrow">${school.level} &middot; ${editions.length} Edisi Tersedia${school.hasPassword ? " &middot; &#128274; Privat" : ""}</span>
            <h1>${school.school}</h1>
            <div class="detail-meta">
              <div><span>Jenjang</span><strong>${school.level}</strong></div>
              <div><span>Rentang Edisi</span><strong>${yearLabel}</strong></div>
              <div><span>Total Edisi</span><strong>${editions.length}</strong></div>
              <div><span>Total Siswa Terdokumentasi</span><strong>${totalStudents}</strong></div>
            </div>
            <p class="detail-summary">Semua buku tahunan yang telah diproduksi ZADA untuk ${school.school} terkumpul di satu halaman ini — pilih edisi tahun mana pun untuk membaca flipbook-nya secara interaktif.</p>
            <div class="detail-actions">
              <a href="progress.html?id=${encodeURIComponent(school.id)}" class="btn btn-ghost">Cek Perkembangan Buku &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section class="detail-body">
      <div class="container">
        <div class="section-head text-center">
          <div>
            <span class="eyebrow">Semua Portofolio</span>
            <h2>Edisi buku tahunan ${school.school}</h2>
            <p>Diurutkan dari edisi terbaru. Setiap edisi dipublikasikan melalui AnyFlip sehingga dapat dibaca langsung tanpa perlu mengunduh file.</p>
          </div>
        </div>
        <div class="editions-list">
          ${editionsHTML}
        </div>
      </div>
    </section>
  `;
  }
});
