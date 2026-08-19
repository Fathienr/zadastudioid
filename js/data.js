/* ZADA Yearbook — data layer (Firestore backend)

   SCHEMA:
   - schools/{schoolId}          -> public metadata only: school, level,
                                     palette, cover, hasPassword (bool),
                                     editions (array) IF NOT protected,
                                     progress (object) IF NOT protected.
                                     If protected, `editions` here is [] and
                                     `progress` here is null.
   - protected/{schoolId}__{hash} -> only exists for protected schools.
                                     doc id embeds SHA-256(password), so a
                                     visitor can only fetch this document if
                                     they already know the correct password
                                     (which produces the same hash). Content:
                                     { editions: [...], progress: {...} }.
                                     `progress` is the 6-tahap workflow status
                                     (lihat PROGRESS_STAGES) shown on the
                                     separate "Perkembangan" page, gated by
                                     the same school password.
   - admin_meta/{schoolId}        -> admin-only bookkeeping (current hash),
                                     readable/writable only when signed in.
                                     Never exposed to public visitors.

   This means: the raw password is never written to any document, and the
   editions/progress content of a protected school cannot be read unless the
   visitor already supplies the exact password (client hashes it, then
   requests the matching document path). There is no plaintext password
   sitting in the database or in the page's JS for someone to just look at. */

/* Every spine/cover gradient is built only from the site's own Color Hunt
   palette (navy / blue / sky / mint + their deep & bright siblings) so the
   shelf and cards always read as "one family" with the rest of the theme,
   instead of a rainbow of unrelated hues. */
const COVER_PALETTES = [
  { base: "linear-gradient(155deg,#293681,#4274D9)", accent: "#D0E7E6", name: "navy-blue" },
  { base: "linear-gradient(155deg,#4274D9,#95CCDD)", accent: "#0A0E2B", name: "blue-sky" },
  { base: "linear-gradient(155deg,#131A4A,#293681)", accent: "#D0E7E6", name: "deep-navy" },
  { base: "linear-gradient(155deg,#95CCDD,#D0E7E6)", accent: "#131A4A", name: "sky-mint" },
  { base: "linear-gradient(155deg,#293681,#6F97EA)", accent: "#D0E7E6", name: "navy-brightblue" },
  { base: "linear-gradient(155deg,#6F97EA,#95CCDD)", accent: "#0A0E2B", name: "brightblue-sky" },
  { base: "linear-gradient(155deg,#131A4A,#4274D9)", accent: "#D0E7E6", name: "deepnavy-blue" },
  { base: "linear-gradient(155deg,#4274D9,#D0E7E6)", accent: "#0A0E2B", name: "blue-mint" },
  { base: "linear-gradient(155deg,#293681,#95CCDD)", accent: "#D0E7E6", name: "navy-sky" },
  { base: "linear-gradient(155deg,#131A4A,#6F97EA)", accent: "#D0E7E6", name: "deepnavy-brightblue" },
];

/* ------------------------------------------------------------------ */
/* Produksi buku tahunan — 6 tahap resmi alur kerja ZADA.              */
/* Tahap 5 (cetak) bersifat kondisional: hanya relevan jika sekolah    */
/* memilih paket cetak fisik.                                          */
/* ------------------------------------------------------------------ */
const PROGRESS_STAGES = [
  {
    key: "konsep",
    order: 1,
    title: "Konsep & Konsultasi",
    desc: "Menentukan tema sampul, gaya fotografi, dan struktur halaman bersama pihak sekolah.",
  },
  {
    key: "produksi",
    order: 2,
    title: "Produksi",
    desc: "Fotografi studio & kandid, pengambilan dokumentasi kegiatan, serta kurasi data siswa.",
  },
  {
    key: "revisi",
    order: 3,
    title: "Revisi",
    desc: "Draf tata letak dikirim ke sekolah untuk dicek dan direvisi sebelum difinalisasi.",
  },
  {
    key: "flipbook",
    order: 4,
    title: "Publikasi Flipbook",
    desc: "Buku final diterbitkan sebagai flipbook interaktif melalui AnyFlip.",
  },
  {
    key: "cetak",
    order: 5,
    title: "Publikasi Cetakan",
    desc: "Opsional — dicetak fisik jika sekolah memilih paket cetak.",
    optional: true,
  },
  {
    key: "arsip",
    order: 6,
    title: "Pengarsipan",
    desc: "Buku dan seluruh berkas disimpan permanen sebagai arsip digital resmi ZADA.",
  },
];

function defaultProgress() {
  return {
    currentStage: 1,
    printOrdered: false,
    completed: false,
    note: "",
    pic: "Tim Produksi ZADA",
    statusBadge: "Lancar",
    teamReport: "",
    teamReports: [],
    updatedAt: null
  };
}

const ZadaData = {
  async getAllSchools() {
    const snap = await db.collection("schools").get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getSchoolById(id) {
    const doc = await db.collection("schools").doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  /* Attempt to unlock a protected school's portal (editions + progress)
     with a candidate password. Returns { editions, progress } on success,
     or null on failure. The check happens by trying to fetch a document
     whose ID embeds the hash of the candidate password — Firestore itself
     is the verifier. */
  async tryUnlockPortal(schoolId, candidatePassword) {
    const hash = await sha256Hex(candidatePassword);
    const doc = await db.collection("protected").doc(`${schoolId}__${hash}`).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return { editions: data.editions || [], progress: data.progress || defaultProgress() };
  },

  /* --- Admin-only writes below. Firestore rules require an authenticated
     admin session for all of these; see firestore.rules. --- */

  async addSchool(school) {
    const { id, password, editions, progress, ...meta } = school;
    const hasPassword = Boolean(password);
    const docData = {
      ...meta,
      hasPassword,
      editions: hasPassword ? [] : editions || [],
      editionCount: (editions || []).length,
      progress: hasPassword ? null : progress || defaultProgress(),
    };
    await db.collection("schools").doc(id).set(docData);
    if (hasPassword) {
      await this._writeProtectedData(id, password, {
        editions: editions || [],
        progress: progress || defaultProgress(),
      });
    }
    return school;
  },

  async updateSchool(id, patch) {
    const current = await this.getSchoolById(id);
    if (!current) return false;

    const { password, editions, progress, ...metaPatch } = patch;
    const nowHasPassword = password !== undefined ? Boolean(password) : current.hasPassword;

    let currentEditions = current.editions || [];
    let currentProgress = current.progress || defaultProgress();
    if (current.hasPassword) {
      const meta = await db.collection("admin_meta").doc(id).get();
      if (meta.exists && meta.data().hash) {
        const prot = await db.collection("protected").doc(`${id}__${meta.data().hash}`).get();
        currentEditions = prot.exists ? prot.data().editions : [];
        currentProgress = prot.exists ? prot.data().progress || defaultProgress() : defaultProgress();
      } else {
        currentEditions = [];
        currentProgress = defaultProgress();
      }
    }
    const nextEditions = editions !== undefined ? editions : currentEditions;
    const nextProgress = progress !== undefined ? progress : currentProgress;

    await db.collection("schools").doc(id).set(
      {
        ...metaPatch,
        hasPassword: nowHasPassword,
        editions: nowHasPassword ? [] : nextEditions,
        progress: nowHasPassword ? null : nextProgress,
      },
      { merge: true }
    );

    if (nowHasPassword) {
      if (password) {
        await this._writeProtectedData(id, password, { editions: nextEditions, progress: nextProgress });
      } else if (editions !== undefined || progress !== undefined) {
        // content changed but password wasn't resubmitted: keep same hash
        const meta = await db.collection("admin_meta").doc(id).get();
        if (meta.exists && meta.data().hash) {
          await db
            .collection("protected")
            .doc(`${id}__${meta.data().hash}`)
            .set({ editions: nextEditions, progress: nextProgress });
        }
      }
    } else {
      await this._clearProtectedData(id);
    }
    return true;
  },

  async _writeProtectedData(schoolId, password, { editions, progress }) {
    const hash = await sha256Hex(password);
    await this._clearProtectedData(schoolId);
    await db.collection("protected").doc(`${schoolId}__${hash}`).set({ editions, progress });
    await db.collection("admin_meta").doc(schoolId).set({ hash });
  },

  async _clearProtectedData(schoolId) {
    const meta = await db.collection("admin_meta").doc(schoolId).get();
    if (meta.exists && meta.data().hash) {
      await db.collection("protected").doc(`${schoolId}__${meta.data().hash}`).delete();
      await db.collection("admin_meta").doc(schoolId).delete();
    }
  },

  async removeSchool(id) {
    await this._clearProtectedData(id);
    await db.collection("schools").doc(id).delete();
  },

  async _loadPortalForAdmin(schoolId) {
    const school = await this.getSchoolById(schoolId);
    if (!school) return { school: null, editions: [], progress: defaultProgress() };
    if (!school.hasPassword) {
      return { school, editions: school.editions || [], progress: school.progress || defaultProgress() };
    }
    const meta = await db.collection("admin_meta").doc(schoolId).get();
    if (!meta.exists || !meta.data().hash) {
      return { school, editions: [], progress: defaultProgress() };
    }
    const prot = await db.collection("protected").doc(`${schoolId}__${meta.data().hash}`).get();
    return {
      school,
      editions: prot.exists ? prot.data().editions : [],
      progress: prot.exists ? prot.data().progress || defaultProgress() : defaultProgress(),
    };
  },

  async addEdition(schoolId, edition) {
    const { school, editions, progress } = await this._loadPortalForAdmin(schoolId);
    if (!school) return false;
    const next = [edition, ...editions];
    await this._savePortal(schoolId, school, next, progress);
    return true;
  },

  async updateEdition(schoolId, editionId, patch) {
    const { school, editions, progress } = await this._loadPortalForAdmin(schoolId);
    if (!school) return false;
    const idx = editions.findIndex((e) => e.id === editionId);
    if (idx === -1) return false;
    editions[idx] = { ...editions[idx], ...patch };
    await this._savePortal(schoolId, school, editions, progress);
    return true;
  },

  async removeEdition(schoolId, editionId) {
    const { school, editions, progress } = await this._loadPortalForAdmin(schoolId);
    if (!school) return false;
    const next = editions.filter((e) => e.id !== editionId);
    await this._savePortal(schoolId, school, next, progress);
    return true;
  },

  /* Update the 6-tahap workflow status for a school. `patch` may include
     currentStage (1-6), printOrdered (bool), note (string). */
  async saveProgress(schoolId, patch) {
    const { school, editions, progress } = await this._loadPortalForAdmin(schoolId);
    if (!school) return false;
    const nextProgress = {
      ...defaultProgress(),
      ...progress,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    await this._savePortal(schoolId, school, editions, nextProgress);
    return true;
  },

  async _savePortal(schoolId, school, editions, progress) {
  if (school.hasPassword) {
    const meta = await db.collection("admin_meta").doc(schoolId).get();
    if (meta.exists && meta.data().hash) {
      await db.collection("protected").doc(`${schoolId}__${meta.data().hash}`).set({ editions, progress });
    }
    await db.collection("schools").doc(schoolId).set({ editionCount: editions.length }, { merge: true }); // ← baru
  } else {
    await db.collection("schools").doc(schoolId).set({ editions, progress, editionCount: editions.length }, { merge: true }); // ← editionCount ditambah
  }
},

  palette(index) {
    return COVER_PALETTES[index % COVER_PALETTES.length];
  },

  slugFromSchool(school) {
    return school
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  },

  editionYears(schoolWithEditions) {
    return [...(schoolWithEditions.editions || []).map((e) => e.year)].sort((a, b) => b - a);
  },

  stages() {
    return PROGRESS_STAGES;
  },

  defaultProgress,

  /* ------------------------------------------------------------------ */
  /* Studio Photo Gallery Collection                                    */
  /* ------------------------------------------------------------------ */
  getDeletedGalleryIds() {
    try {
      const raw = localStorage.getItem("zada_deleted_gallery_ids");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  addDeletedGalleryId(id) {
    if (!id) return;
    const targetId = String(id).trim();
    const list = this.getDeletedGalleryIds();
    if (!list.includes(targetId)) {
      list.push(targetId);
      localStorage.setItem("zada_deleted_gallery_ids", JSON.stringify(list));
    }
  },

  async getAllGalleryPhotos() {
    const deletedIds = this.getDeletedGalleryIds();
    const isDeleted = (photoId) => deletedIds.includes(String(photoId).trim());

    let photos = [];

    // 1. Try fetching from Firestore first
    try {
      if (typeof db !== "undefined" && db) {
        const snap = await db.collection("gallery").get();
        if (!snap.empty) {
          const fsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          photos = fsList.filter((p) => p && p.id && !isDeleted(p.id));
        }
      }
    } catch (e) {
      console.warn("Firestore gallery fetch error, fallback to local", e);
    }

    // 2. Fallback to LocalStorage if Firestore is empty or unavailable
    if (!photos.length) {
      const local = localStorage.getItem("zada_studio_gallery");
      if (local !== null) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            photos = parsed.filter((p) => p && p.id && !isDeleted(p.id));
          }
        } catch (err) {}
      }
    }

    // 3. Fallback to default photos if still empty
    if (!photos.length) {
      photos = DEFAULT_GALLERY_PHOTOS.filter((p) => p && p.id && !isDeleted(p.id));
    }

    photos.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    localStorage.setItem("zada_studio_gallery", JSON.stringify(photos));
    return photos;
  },

  async addGalleryPhoto(photo) {
    const newPhoto = {
      ...photo,
      createdAt: photo.createdAt || new Date().toISOString()
    };
    try {
      if (typeof db !== "undefined" && db) {
        const ref = db.collection("gallery").doc();
        newPhoto.id = ref.id;
        await ref.set(newPhoto);
      } else {
        newPhoto.id = "gal-" + Date.now();
      }
    } catch (e) {
      console.warn("Firestore save gallery failed, using local", e);
      if (!newPhoto.id) newPhoto.id = "gal-" + Date.now();
    }
    const current = await this.getAllGalleryPhotos();
    const updated = [newPhoto, ...current.filter((p) => String(p.id) !== String(newPhoto.id))];
    localStorage.setItem("zada_studio_gallery", JSON.stringify(updated));
    return newPhoto;
  },

  async addGalleryPhotosBatch(photosList) {
    if (!Array.isArray(photosList) || !photosList.length) return [];
    const addedPhotos = [];
    const current = await this.getAllGalleryPhotos();
    let updated = [...current];

    for (let i = 0; i < photosList.length; i++) {
      const item = photosList[i];
      const newPhoto = {
        ...item,
        createdAt: item.createdAt || new Date().toISOString()
      };
      try {
        if (typeof db !== "undefined" && db) {
          const ref = db.collection("gallery").doc();
          newPhoto.id = ref.id;
          await ref.set(newPhoto);
        } else {
          newPhoto.id = "gal-" + Date.now() + "-" + i + "-" + Math.random().toString(36).substring(2, 6);
        }
      } catch (e) {
        console.warn("Firestore batch save gallery item failed", e);
        if (!newPhoto.id) newPhoto.id = "gal-" + Date.now() + "-" + i;
      }
      addedPhotos.push(newPhoto);
      updated = [newPhoto, ...updated.filter((p) => String(p.id) !== String(newPhoto.id))];
    }

    localStorage.setItem("zada_studio_gallery", JSON.stringify(updated));
    return addedPhotos;
  },

  async updateGalleryPhoto(id, patch) {
    const targetId = String(id).trim();
    try {
      if (typeof db !== "undefined" && db) {
        await db.collection("gallery").doc(targetId).update(patch);
      }
    } catch (e) {
      console.warn("Firestore update gallery failed", e);
    }
    const current = await this.getAllGalleryPhotos();
    const idx = current.findIndex((p) => String(p.id).trim() === targetId);
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...patch };
      localStorage.setItem("zada_studio_gallery", JSON.stringify(current));
    }
    return true;
  },

  async deleteGalleryPhoto(id) {
    if (!id) return false;
    const targetId = String(id).trim();

    // Blacklist the ID so it never resurfaces in this session or future reloads
    this.addDeletedGalleryId(targetId);

    // Delete from Firestore if available
    try {
      if (typeof db !== "undefined" && db) {
        await db.collection("gallery").doc(targetId).delete();
      }
    } catch (e) {
      console.warn("Firestore delete gallery failed", e);
    }

    // Always clean up local storage
    const local = localStorage.getItem("zada_studio_gallery");
    let current = [];
    if (local !== null) {
      try {
        current = JSON.parse(local);
      } catch (err) {
        current = [...DEFAULT_GALLERY_PHOTOS];
      }
    } else {
      current = [...DEFAULT_GALLERY_PHOTOS];
    }

    const updated = current.filter((p) => p && String(p.id).trim() !== targetId);
    localStorage.setItem("zada_studio_gallery", JSON.stringify(updated));
    return true;
  }
};

const DEFAULT_GALLERY_PHOTOS = [
  /* 🎓 WISUDA */
  {
    id: "gal-1",
    title: "Wisuda Sarjana & Magister Premium",
    category: "wisuda",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 520,
    tags: "Wisuda, Toga, Individual, Studio A",
    createdAt: "2026-07-28T10:00:00Z"
  },
  {
    id: "gal-8",
    title: "Selebrasi Angkatan & Momen Kelulusan",
    category: "wisuda",
    orientation: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?q=80&w=1920&auto=format&fit=crop",
    dimensions: "1920 x 1280 px",
    fileSizeKB: 830,
    tags: "Wisuda, Group, Kebaya & Toga",
    createdAt: "2026-07-21T08:30:00Z"
  },
  {
    id: "gal-101",
    title: "Potret Solo Kebaya Graduation Look",
    category: "wisuda",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 480,
    tags: "Wisuda, Kebaya Modern, Warm Soft",
    createdAt: "2026-07-20T11:00:00Z"
  },
  {
    id: "gal-102",
    title: "Momen Bahagia Wisuda Bersama Orang Tua",
    category: "wisuda",
    orientation: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1920&auto=format&fit=crop",
    dimensions: "1920 x 1280 px",
    fileSizeKB: 740,
    tags: "Wisuda, Family Graduation, Classic",
    createdAt: "2026-07-19T14:20:00Z"
  },

  /* 👨‍👩‍👧‍👦 KELUARGA */
  {
    id: "gal-2",
    title: "Foto Keluarga Besar Warm Tone",
    category: "keluarga",
    orientation: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1920&auto=format&fit=crop",
    dimensions: "1920 x 1280 px",
    fileSizeKB: 780,
    tags: "Keluarga, Group, Classic Background",
    createdAt: "2026-07-27T14:30:00Z"
  },
  {
    id: "gal-201",
    title: "Potret Keluarga Minimalist Modern",
    category: "keluarga",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1542037104857-ffbb0b9155fb?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 590,
    tags: "Keluarga, Minimalist, White Backdrop",
    createdAt: "2026-07-18T10:15:00Z"
  },
  {
    id: "gal-202",
    title: "Foto Sesi Kasual & Ceria Tiga Generasi",
    category: "keluarga",
    orientation: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1609234656388-0ff363383899?q=80&w=1920&auto=format&fit=crop",
    dimensions: "1920 x 1280 px",
    fileSizeKB: 810,
    tags: "Keluarga, Casual, Multi-Gen",
    createdAt: "2026-07-17T16:40:00Z"
  },

  /* 💍 PREWEDDING */
  {
    id: "gal-3",
    title: "Prewedding Modern Minimalist Studio",
    category: "prewedding",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 610,
    tags: "Prewedding, Couple, Soft Lighting",
    createdAt: "2026-07-26T09:15:00Z"
  },
  {
    id: "gal-301",
    title: "Elegant Indoor Black Tie Couple Look",
    category: "prewedding",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 660,
    tags: "Prewedding, Formal Tuxedo, Dark Mood",
    createdAt: "2026-07-16T13:00:00Z"
  },
  {
    id: "gal-302",
    title: "Outdoor Sunset Aesthetic Prewedding",
    category: "prewedding",
    orientation: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1920&auto=format&fit=crop",
    dimensions: "1920 x 1280 px",
    fileSizeKB: 880,
    tags: "Prewedding, Outdoor, Warm Sunset",
    createdAt: "2026-07-15T15:30:00Z"
  },

  /* 👤 PORTRAIT */
  {
    id: "gal-4",
    title: "Personal Branding & Corporate Profile",
    category: "portrait",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 440,
    tags: "Portrait, Profile Look, Studio B",
    createdAt: "2026-07-25T11:20:00Z"
  },
  {
    id: "gal-401",
    title: "Creative Dramatic Lighting Portrait",
    category: "portrait",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 510,
    tags: "Portrait, Editorial, Studio Shadow",
    createdAt: "2026-07-14T09:00:00Z"
  },

  /* 💼 PAS FOTO */
  {
    id: "gal-5",
    title: "Pas Foto Resmi & Kebutuhan Dokumen",
    category: "pasfoto",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 320,
    tags: "Pas Foto, Red/Blue Backdrop, Formal",
    createdAt: "2026-07-24T16:00:00Z"
  },
  {
    id: "gal-501",
    title: "Pas Foto Visa & Schengen Standards",
    category: "pasfoto",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 360,
    tags: "Pas Foto, White Backdrop, Professional",
    createdAt: "2026-07-13T10:45:00Z"
  },

  /* 📦 PRODUK */
  {
    id: "gal-6",
    title: "Katalog Produk Skincare & Beauty",
    category: "produk",
    orientation: "landscape",
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1920&auto=format&fit=crop",
    dimensions: "1920 x 1280 px",
    fileSizeKB: 890,
    tags: "Produk, Commercial, Macro Studio",
    createdAt: "2026-07-23T13:10:00Z"
  },
  {
    id: "gal-601",
    title: "Commercial Fashion & Outfit Catalog",
    category: "produk",
    orientation: "portrait",
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop",
    dimensions: "1200 x 1800 px",
    fileSizeKB: 680,
    tags: "Produk, Fashion, Lookbook Studio",
    createdAt: "2026-07-12T14:15:00Z"
  }
];
