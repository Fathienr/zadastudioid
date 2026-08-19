/* ==========================================================================
   ZADA STUDIO — Admin Invoice & Digital Receipt Generator Logic
   ========================================================================== */

let currentInvoice = null;
let invoiceItems = [];

// Auth Guard
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "admin-login.html";
  } else {
    initInvoicePage();
  }
});

const toast = document.getElementById("toast");
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number || 0);
}

function generateInvoiceNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(100 + Math.random() * 900);
  return `INV/ZD/${year}/${month}/${random}`;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch (e) {
    return dateString;
  }
}

/* ==========================================================================
   INITIALIZATION & PRESETS
   ========================================================================== */
function initInvoicePage() {
  resetInvoiceForm();
  renderInvoiceHistory();
  setupEventListeners();
}

function resetInvoiceForm() {
  document.getElementById("inv-id").value = "";
  document.getElementById("inv-number").value = generateInvoiceNumber();
  document.getElementById("inv-date").value = getTodayDateString();
  document.getElementById("inv-due-date").value = getTodayDateString();
  if (document.getElementById("inv-served-by")) {
    document.getElementById("inv-served-by").value = "Fatih";
  }
  document.getElementById("inv-client-name").value = "";
  document.getElementById("inv-client-phone").value = "";
  document.getElementById("inv-client-email").value = "";
  document.getElementById("inv-client-address").value = "";
  document.getElementById("inv-service-type").value = "studio";
  document.getElementById("inv-service-title").value = "Paket Foto Studio";
  document.getElementById("inv-discount").value = "0";
  document.getElementById("inv-dp").value = "0";
  document.getElementById("inv-payment-method").value = "Transfer BCA";
  document.getElementById("inv-status").value = "lunas";
  document.getElementById("inv-notes").value = "Harap hadir 15 menit sebelum jadwal sesi foto. File softcopy dikirimkan via Google Drive dalam 1-2 hari kerja.";
  const presetSelect = document.getElementById("inv-package-preset");
  if (presetSelect) presetSelect.value = "";
  const quickPasfoto = document.getElementById("quick-pasfoto-select");
  if (quickPasfoto) quickPasfoto.value = "";
  const quickVisa = document.getElementById("quick-visa-select");
  if (quickVisa) quickVisa.value = "";

  invoiceItems = [
    { description: "Sesi Foto Studio Reguler (60 Menit & 5 Retouch)", qty: 1, price: 350000, total: 350000 },
    { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
  ];

  renderItemInputs();
  calculateAndRenderPreview();
}

/* Preset Quick Packages matching the official website pricelist */
const ALL_PRESETS = {
  // FOTO WISUDA
  wisuda_premium: {
    serviceType: "studio",
    serviceTitle: "Foto Wisuda Premium Pack",
    items: [
      { description: "Sesi Foto Wisuda Studio (40 Menit & 10 Retouch)", qty: 1, price: 599000, total: 599000 },
      { description: "Cetak Foto Ukuran A3 + Bingkai Minimalis", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sesi foto wisuda studio. Termasuk cetak ukuran A3 dan bingkai minimalis. Harap membawa toga lengkap dan hadir 15 menit sebelum jadwal."
  },
  wisuda_platinum: {
    serviceType: "studio",
    serviceTitle: "Foto Wisuda Platinum Exclusive",
    items: [
      { description: "Sesi Foto Wisuda Platinum (120 Menit & 10 Retouch)", qty: 1, price: 750000, total: 750000 },
      { description: "Cetak Foto Frame Ukuran 16RS", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sesi foto wisuda platinum eksklusif. Bebas foto di berbagai pilihan background studio."
  },
  wisuda_standard: {
    serviceType: "studio",
    serviceTitle: "Foto Wisuda Standard Pack",
    items: [
      { description: "Sesi Foto Wisuda Standard (45 Menit & 5 Retouch)", qty: 1, price: 450000, total: 450000 },
      { description: "Cetak Foto Ukuran 12R + Bingkai", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sesi foto wisuda standar studio. Harap hadir tepat waktu sesuai slot reservasi."
  },

  // FOTO KELUARGA
  keluarga_bestseller: {
    serviceType: "studio",
    serviceTitle: "Foto Keluarga Best Seller",
    items: [
      { description: "Sesi Foto Keluarga s.d 15 Orang (45 Menit & 10 Retouch)", qty: 1, price: 599000, total: 599000 },
      { description: "Cetak Foto Ukuran A3 + Bingkai Minimalis", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sesi foto keluarga s.d 15 orang. Termasuk cetak ukuran A3 dan bingkai. Bebas foto di berbagai background studio."
  },
  keluarga_premium: {
    serviceType: "studio",
    serviceTitle: "Foto Keluarga Premium Pack",
    items: [
      { description: "Sesi Foto Keluarga Besar s.d 30 Orang (60 Menit & 10 Retouch)", qty: 1, price: 899000, total: 899000 },
      { description: "Cetak Foto Ukuran A3 + Bingkai Minimalis", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sesi foto keluarga besar s.d 30 orang durasi 60 menit. Termasuk cetak A3 dan bingkai minimalis."
  },

  // PREWEDDING
  prewed_bestseller: {
    serviceType: "studio",
    serviceTitle: "Prewedding Best Seller",
    items: [
      { description: "Sesi Foto Prewedding (60 Menit & 10 File Retouch)", qty: 1, price: 699000, total: 699000 },
      { description: "Cetak Foto Ukuran A3 + Bingkai Minimalis", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sesi foto prewedding 60 menit. Bebas foto di berbagai pilihan background studio."
  },
  prewed_premium: {
    serviceType: "studio",
    serviceTitle: "Prewedding Premium Complete",
    items: [
      { description: "Sesi Foto Prewedding Complete (120 Menit & 10 Retouch)", qty: 1, price: 1700000, total: 1700000 },
      { description: "Make Up Artist (MUA) Profesional & Baju Adat", qty: 1, price: 0, total: 0 },
      { description: "Cetak Foto Ukuran A3 + Bingkai Minimalis", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Paket prewedding komplit termasuk MUA profesional dan kostum baju adat. Harap hadir 60 menit sebelum sesi foto untuk rias makeup."
  },

  // PAS FOTO (PILIHAN UKURAN & LEMBAR CETAK)
  pasfoto_3x4_9: {
    serviceType: "studio",
    serviceTitle: "Pas Foto 3x4 (9 Lembar)",
    items: [
      { description: "Pas Foto Cetak 3x4 = 9 Lembar", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto ukuran 3x4 = 9 lembar. Pilihan background merah, biru, atau putih. Hasil cetak langsung jadi."
  },
  pasfoto_4x6_4: {
    serviceType: "studio",
    serviceTitle: "Pas Foto 4x6 (4 Lembar)",
    items: [
      { description: "Pas Foto Cetak 4x6 = 4 Lembar", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto ukuran 4x6 = 4 lembar. Pilihan background merah, biru, atau putih. Hasil cetak langsung jadi."
  },
  pasfoto_mix_34_46: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Mix 3x4 & 4x6",
    items: [
      { description: "Pas Foto Cetak Mix: 3x4 = 4 Lembar, 4x6 = 2 Lembar", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto kombinasi cetak: 3x4 = 4 lembar dan 4x6 = 2 lembar. Background merah, biru, atau putih."
  },
  pasfoto_mix_23_34_46: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Mix 2x3, 3x4 & 4x6",
    items: [
      { description: "Pas Foto Cetak Mix: 2x3 = 4 Lembar, 3x4 = 4 Lembar, 4x6 = 2 Lembar", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto kombinasi lengkap: 2x3 = 4 lembar, 3x4 = 4 lembar, 4x6 = 2 lembar. Background merah, biru, atau putih."
  },
  pasfoto_mix_23_34: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Mix 2x3 & 3x4",
    items: [
      { description: "Pas Foto Cetak Mix: 2x3 = 4 Lembar, 3x4 = 4 Lembar", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto kombinasi cetak: 2x3 = 4 lembar dan 3x4 = 4 lembar. Background merah, biru, atau putih."
  },
  pasfoto_2x3_12: {
    serviceType: "studio",
    serviceTitle: "Pas Foto 2x3 (12 Lembar)",
    items: [
      { description: "Pas Foto Cetak 2x3 = 12 Lembar", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto ukuran 2x3 = 12 lembar. Pilihan background merah, biru, atau putih. Hasil cetak langsung jadi."
  },

  // PAS FOTO VISA NEGARA
  visa_default: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Visa Standar 3,5 x 4,5 cm",
    items: [
      { description: "Pas Foto Visa Standar 3,5 x 4,5 cm (Cetak 4 Lembar)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Format Kedutaan & Imigrasi", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto visa internasional ukuran standar 3,5 x 4,5 cm background putih, telinga terlihat, tanpa kacamata."
  },
  visa_jepang: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Visa Jepang 3,5 x 4,5 cm",
    items: [
      { description: "Pas Foto Visa Jepang 3,5 x 4,5 cm (Cetak 4 Lembar)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Format Kedutaan Jepang", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto visa Jepang ukuran 3,5 x 4,5 cm background putih polos, pencahayaan merata, tanpa kacamata."
  },
  visa_amerika: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Visa Amerika US 5 x 5 cm",
    items: [
      { description: "Pas Foto Visa Amerika US 5 x 5 cm (Cetak 2 Lembar)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Format DS-160 (600x600 px)", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto visa US Amerika ukuran 5 x 5 cm background putih tanpa kacamata siap upload DS-160."
  },
  visa_china: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Visa China 3,3 x 4,8 cm",
    items: [
      { description: "Pas Foto Visa China 3,3 x 4,8 cm (Cetak 4 Lembar)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Format Kedutaan China (354x472 px)", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto visa China ukuran 3,3 x 4,8 cm background putih, telinga dan dahi terlihat jelas."
  },
  visa_eropa: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Visa Eropa Schengen 3,5 x 4,5 cm",
    items: [
      { description: "Pas Foto Visa Eropa Schengen 3,5 x 4,5 cm (Cetak 4 Lembar)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Format Kedutaan Schengen (VFS/TLS)", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto visa Schengen Eropa ukuran 3,5 x 4,5 cm proporsi wajah 70-80%, background putih atau abu-abu terang."
  },
  visa_korea: {
    serviceType: "studio",
    serviceTitle: "Pas Foto Visa Korea 3,5 x 4,5 cm",
    items: [
      { description: "Pas Foto Visa Korea 3,5 x 4,5 cm (Cetak 4 Lembar)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Format KVAC Kedutaan Korea", qty: 1, price: 0, total: 0 }
    ],
    notes: "Pas foto visa Korea Selatan ukuran 3,5 x 4,5 cm background putih, telinga dan dahi terlihat jelas, siap registrasi KVAC."
  },

  // FOTO PROFILE & COMBO
  profile_korean: {
    serviceType: "studio",
    serviceTitle: "Foto Profile Korean Look",
    items: [
      { description: "Sesi Foto Profile Korean Look (5 Pose Pilihan)", qty: 1, price: 200000, total: 200000 },
      { description: "Cetak Foto Ukuran 4R (1 Lembar)", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Foto profile personal branding, resume, LinkedIn, atau modeling."
  },
  profile_combo: {
    serviceType: "studio",
    serviceTitle: "Foto Profile & Pas Foto Combo",
    items: [
      { description: "Sesi Foto Formal Dokumen & Profile Korean Look (10 Pose)", qty: 1, price: 300000, total: 300000 },
      { description: "Cetak Foto Ukuran 4R (2 Lembar)", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Paket combo lengkap foto formal dokumen dan foto profile aesthetic profesional."
  },

  // FOTO PRODUK & PROFESI ANAK
  produk_commercial: {
    serviceType: "studio",
    serviceTitle: "Foto Produk Commercial",
    items: [
      { description: "Foto Produk Commercial Studio (5 Retouch per Produk)", qty: 1, price: 75000, total: 75000 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Foto produk komersial katalog dan e-commerce. Harga per produk."
  },
  profesi_anak: {
    serviceType: "studio",
    serviceTitle: "Foto Profesi Cita-Cita Anak",
    items: [
      { description: "Sesi Foto Profesi Anak & Kostum Lengkap (5 Pose)", qty: 1, price: 150000, total: 150000 },
      { description: "Cetak Foto Ukuran A3 + Bingkai Minimalis", qty: 1, price: 0, total: 0 },
      { description: "Master Soft File Google Drive", qty: 1, price: 0, total: 0 }
    ],
    notes: "Foto profesi anak TK, PAUD, SD sudah termasuk kostum lengkap dan cetak bingkai A3."
  },

  // SEWA STUDIO SPACE (TANPA FOTOGRAFER)
  sewa_2spot_1h: {
    serviceType: "studio",
    serviceTitle: "Sewa Studio 2 Spot (60 Menit)",
    items: [
      { description: "Sewa Studio Space 2 Spot (Durasi 60 Menit)", qty: 1, price: 250000, total: 250000 },
      { description: "Lighting Godox + Softbox & Reflector", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sewa studio mandiri tanpa fotografer. Peralatan lighting standar sudah disediakan."
  },
  sewa_2spot_3h: {
    serviceType: "studio",
    serviceTitle: "Sewa Studio 2 Spot (3 Jam)",
    items: [
      { description: "Sewa Studio Space 2 Spot (Durasi 3 Jam)", qty: 1, price: 500000, total: 500000 },
      { description: "Lighting Godox + Aksesoris Studio", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sewa ruang studio 3 jam untuk photoshoot atau videography mandiri."
  },
  sewa_all_3h: {
    serviceType: "studio",
    serviceTitle: "Sewa Studio All Access (3 Jam)",
    items: [
      { description: "Sewa All Access Seluruh Area Studio (Durasi 3 Jam)", qty: 1, price: 600000, total: 600000 },
      { description: "Full Lighting Godox + Seluruh Spot Background", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sewa all access seluruh area studio dan lighting selama 3 jam."
  },
  sewa_all_fullday: {
    serviceType: "studio",
    serviceTitle: "Sewa Studio All Access (Full Day 8 Jam)",
    items: [
      { description: "Sewa All Access Full Day (Durasi 8 Jam)", qty: 1, price: 1300000, total: 1300000 },
      { description: "Full Akses Seluruh Fasilitas & Lighting Pro", qty: 1, price: 0, total: 0 }
    ],
    notes: "Sewa studio full day 8 jam untuk produksi konten besar, iklan, atau syuting."
  },

  // PHOTO BOOTH UNLIMITED
  pb_classic_2h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth Classic (2 Jam Unlimited)",
    items: [
      { description: "Photo Booth Classic Unlimited Cetak (Durasi 2 Jam)", qty: 1, price: 1800000, total: 1800000 },
      { description: "Paper Frame Eksklusif & Custom Template", qty: 1, price: 0, total: 0 },
      { description: "Soft File GIF Animasi & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Layanan photobooth 2 jam unlimited cetak. DP 50% untuk reservasi tanggal acara."
  },
  pb_classic_3h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth Classic (3 Jam Unlimited)",
    items: [
      { description: "Photo Booth Classic Unlimited Cetak (Durasi 3 Jam)", qty: 1, price: 2400000, total: 2400000 },
      { description: "Paper Frame Eksklusif & Custom Template", qty: 1, price: 0, total: 0 },
      { description: "Soft File GIF Animasi & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Layanan photobooth 3 jam unlimited cetak untuk resepsi pernikahan atau gathering."
  },
  pb_highangle_2h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth High Angle (2 Jam Unlimited)",
    items: [
      { description: "Photo Booth High Angle Unlimited Cetak (Durasi 2 Jam)", qty: 1, price: 2000000, total: 2000000 },
      { description: "Paper Frame & Custom Frame Design", qty: 1, price: 0, total: 0 },
      { description: "Soft File GIF Boomerang & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Photobooth sudut pandang atas kekinian dan estetik."
  },
  pb_highangle_3h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth High Angle (3 Jam Unlimited)",
    items: [
      { description: "Photo Booth High Angle Unlimited Cetak (Durasi 3 Jam)", qty: 1, price: 2700000, total: 2700000 },
      { description: "Paper Frame & Custom Frame Design", qty: 1, price: 0, total: 0 },
      { description: "Soft File GIF Boomerang & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Photobooth high angle durasi 3 jam unlimited cetak."
  },
  pb_premium_2h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth Premium Studio Lighting (2 Jam)",
    items: [
      { description: "Photo Booth Premium Studio Lighting (Durasi 2 Jam)", qty: 1, price: 2100000, total: 2100000 },
      { description: "Paper Frame & Custom Template Design", qty: 1, price: 0, total: 0 },
      { description: "Soft File High Resolution & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Photobooth premium dengan pencahayaan studio terbaik dan warna kulit halus cerah."
  },
  pb_premium_3h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth Premium Studio Lighting (3 Jam)",
    items: [
      { description: "Photo Booth Premium Studio Lighting (Durasi 3 Jam)", qty: 1, price: 2900000, total: 2900000 },
      { description: "Paper Frame & Custom Template Design", qty: 1, price: 0, total: 0 },
      { description: "Soft File High Resolution & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Photobooth premium durasi 3 jam unlimited cetak untuk acara formal dan resepsi."
  },
  pb_mingle_2h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth Mingle Roaming (2 Jam)",
    items: [
      { description: "Photo Booth Mingle Roaming Keliling Meja (Durasi 2 Jam)", qty: 1, price: 2500000, total: 2500000 },
      { description: "Unlimited Cetak Instan + Paper Frame", qty: 1, price: 0, total: 0 },
      { description: "Soft File GIF & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Photobooth interaktif tanpa antrean, fotografer berkeliling mengabadikan momen tamu."
  },
  pb_mingle_3h: {
    serviceType: "photobooth",
    serviceTitle: "Photo Booth Mingle Roaming (3 Jam)",
    items: [
      { description: "Photo Booth Mingle Roaming Keliling Meja (Durasi 3 Jam)", qty: 1, price: 3500000, total: 3500000 },
      { description: "Unlimited Cetak Instan + Paper Frame", qty: 1, price: 0, total: 0 },
      { description: "Soft File GIF & QR Code Download", qty: 1, price: 0, total: 0 }
    ],
    notes: "Mingle photobooth durasi 3 jam keliling meja tamu."
  },

  // YEARBOOK & BUKU TAHUNAN
  yearbook_hardcover: {
    serviceType: "yearbook",
    serviceTitle: "Yearbook Hardcover Premium (150 Eks)",
    items: [
      { description: "Produksi Buku Tahunan Hardcover Premium (150 Eks @ Rp 175.000)", qty: 150, price: 175000, total: 26250000 },
      { description: "E-Book Flipbook Digital Interaktif", qty: 1, price: 0, total: 0 }
    ],
    notes: "Produksi buku tahunan sekolah hardcover premium. Pembayaran bertahap: DP 30%, Termin 2 setelah sesi foto 40%, Pelunasan 30% saat serah terima buku."
  },
  yearbook_softcover: {
    serviceType: "yearbook",
    serviceTitle: "Yearbook Softcover Standard (150 Eks)",
    items: [
      { description: "Produksi Buku Tahunan Softcover Standard (150 Eks @ Rp 135.000)", qty: 150, price: 135000, total: 20250000 },
      { description: "E-Book Flipbook Digital Interaktif", qty: 1, price: 0, total: 0 }
    ],
    notes: "Produksi buku tahunan sekolah softcover. Pembayaran bertahap: DP 30%, Termin 2 40%, Pelunasan 30%."
  },
  yearbook_digital: {
    serviceType: "yearbook",
    serviceTitle: "Yearbook Digital Flipbook (100 Siswa)",
    items: [
      { description: "Paket Flipbook Digital & Sesi Foto (100 Siswa @ Rp 75.000)", qty: 100, price: 75000, total: 7500000 }
    ],
    notes: "Paket dokumentasi foto dan flipbook digital interaktif tanpa cetak fisik."
  }
};

function applyPreset(presetKey) {
  if (!presetKey) return;
  const preset = ALL_PRESETS[presetKey];
  if (!preset) return;

  document.getElementById("inv-service-type").value = preset.serviceType;
  document.getElementById("inv-service-title").value = preset.serviceTitle;
  document.getElementById("inv-notes").value = preset.notes;
  invoiceItems = JSON.parse(JSON.stringify(preset.items));

  // Sync main preset select if option exists
  const presetSelect = document.getElementById("inv-package-preset");
  if (presetSelect) {
    presetSelect.value = presetKey;
  }

  // Sync quick selects
  const quickPasfoto = document.getElementById("quick-pasfoto-select");
  if (quickPasfoto) {
    quickPasfoto.value = presetKey.startsWith("pasfoto_") ? presetKey : "";
  }
  const quickVisa = document.getElementById("quick-visa-select");
  if (quickVisa) {
    quickVisa.value = presetKey.startsWith("visa_") ? presetKey : "";
  }

  // Visual feedback badge
  const badge = document.getElementById("preset-applied-badge");
  if (badge) {
    badge.style.display = "inline-block";
    setTimeout(() => {
      badge.style.display = "none";
    }, 4000);
  }

  renderItemInputs();
  calculateAndRenderPreview();
  showToast(`Paket "${preset.serviceTitle}" berhasil diterapkan.`);
}

/* ==========================================================================
   DYNAMIC ITEM LIST
   ========================================================================== */
function renderItemInputs() {
  const container = document.getElementById("items-container");
  if (!container) return;

  container.innerHTML = invoiceItems
    .map((item, index) => {
      return `
      <div class="item-row" style="display: grid; grid-template-columns: 1fr 70px 120px 36px; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;" data-index="${index}">
        <input type="text" class="item-desc" placeholder="Deskripsi Layanan / Item" value="${item.description || ""}" required style="padding: 0.5rem 0.7rem; font-size: 0.85rem;" />
        <input type="number" class="item-qty" placeholder="Qty" value="${item.qty || 1}" min="1" required style="padding: 0.5rem 0.5rem; font-size: 0.85rem; text-align: center;" />
        <input type="number" class="item-price" placeholder="Harga (Rp)" value="${item.price || 0}" min="0" step="5000" required style="padding: 0.5rem 0.6rem; font-size: 0.85rem;" />
        <button type="button" class="btn-remove-item" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; border-radius: 6px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">&times;</button>
      </div>
    `;
    })
    .join("");

  // Attach event listeners to input fields
  container.querySelectorAll(".item-row").forEach((row) => {
    const idx = parseInt(row.dataset.index, 10);
    const descInput = row.querySelector(".item-desc");
    const qtyInput = row.querySelector(".item-qty");
    const priceInput = row.querySelector(".item-price");
    const removeBtn = row.querySelector(".btn-remove-item");

    descInput.addEventListener("input", (e) => {
      invoiceItems[idx].description = e.target.value;
      calculateAndRenderPreview();
    });

    qtyInput.addEventListener("input", (e) => {
      const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
      invoiceItems[idx].qty = qty;
      invoiceItems[idx].total = qty * (invoiceItems[idx].price || 0);
      calculateAndRenderPreview();
    });

    priceInput.addEventListener("input", (e) => {
      const price = Math.max(0, parseInt(e.target.value, 10) || 0);
      invoiceItems[idx].price = price;
      invoiceItems[idx].total = (invoiceItems[idx].qty || 1) * price;
      calculateAndRenderPreview();
    });

    removeBtn.addEventListener("click", () => {
      if (invoiceItems.length > 1) {
        invoiceItems.splice(idx, 1);
        renderItemInputs();
        calculateAndRenderPreview();
      } else {
        showToast("Minimal harus ada 1 item pada struk.");
      }
    });
  });
}

function addNewItemRow() {
  invoiceItems.push({ description: "", qty: 1, price: 0, total: 0 });
  renderItemInputs();
  calculateAndRenderPreview();
}

/* ==========================================================================
   CALCULATION & LIVE PREVIEW
   ========================================================================== */
function calculateAndRenderPreview() {
  const invNumber = document.getElementById("inv-number").value || "INV/ZD/2026/000";
  const dateVal = document.getElementById("inv-date").value;
  const dueDateVal = document.getElementById("inv-due-date").value;
  const clientName = document.getElementById("inv-client-name").value || "Nama Klien";
  const clientPhone = document.getElementById("inv-client-phone").value || "—";
  const clientEmail = document.getElementById("inv-client-email").value || "";
  const clientAddress = document.getElementById("inv-client-address").value || "";
  const serviceTitle = document.getElementById("inv-service-title").value || "Layanan ZADA Studio";
  const paymentMethod = document.getElementById("inv-payment-method").value || "Transfer Bank";
  const notesVal = document.getElementById("inv-notes").value || "";

  const discount = Math.max(0, parseInt(document.getElementById("inv-discount").value, 10) || 0);
  let downPayment = Math.max(0, parseInt(document.getElementById("inv-dp").value, 10) || 0);

  // Calculate Subtotal
  let subtotal = 0;
  invoiceItems.forEach((item) => {
    const qty = parseInt(item.qty, 10) || 1;
    const price = parseInt(item.price, 10) || 0;
    item.total = qty * price;
    subtotal += item.total;
  });

  const totalAmount = Math.max(0, subtotal - discount);

  // Auto handle status and DP if DP is greater than or equal to total
  let paymentStatus = document.getElementById("inv-status").value;
  let remainingBalance = 0;

  if (paymentStatus === "lunas") {
    downPayment = totalAmount;
    document.getElementById("inv-dp").value = totalAmount;
    remainingBalance = 0;
  } else if (paymentStatus === "dp") {
    remainingBalance = Math.max(0, totalAmount - downPayment);
    if (downPayment >= totalAmount && totalAmount > 0) {
      paymentStatus = "lunas";
      document.getElementById("inv-status").value = "lunas";
      remainingBalance = 0;
    }
  } else {
    // pending
    downPayment = 0;
    document.getElementById("inv-dp").value = 0;
    remainingBalance = totalAmount;
  }

  // Update summary badges in form
  document.getElementById("calc-subtotal").textContent = formatRupiah(subtotal);
  document.getElementById("calc-total").textContent = formatRupiah(totalAmount);
  document.getElementById("calc-remaining").textContent = formatRupiah(remainingBalance);

  // Served by staff
  const servedBy = (document.getElementById("inv-served-by")?.value || "Fatih").trim();
  const prevServedBy = document.getElementById("prev-served-by");
  if (prevServedBy) prevServedBy.textContent = servedBy;
  const prevServedByMeta = document.getElementById("prev-served-by-meta");
  if (prevServedByMeta) prevServedByMeta.textContent = servedBy;

  // Render to Receipt Preview
  document.getElementById("prev-inv-number").textContent = invNumber;
  document.getElementById("prev-inv-date").textContent = formatDisplayDate(dateVal);
  document.getElementById("prev-inv-due-date").textContent = formatDisplayDate(dueDateVal);
  document.getElementById("prev-client-name").textContent = clientName;
  document.getElementById("prev-client-phone").textContent = clientPhone;
  document.getElementById("prev-client-address").textContent = clientAddress || "—";
  document.getElementById("prev-service-title").textContent = serviceTitle;
  document.getElementById("prev-payment-method").textContent = paymentMethod;
  document.getElementById("prev-notes").textContent = notesVal || "Terima kasih atas kepercayaan Anda.";

  // Status Stamp
  const stampEl = document.getElementById("prev-status-stamp");
  if (paymentStatus === "lunas") {
    stampEl.className = "receipt-badge-stamp stamp-lunas";
    stampEl.innerHTML = `LUNAS`;
  } else if (paymentStatus === "dp") {
    stampEl.className = "receipt-badge-stamp stamp-dp";
    stampEl.innerHTML = `DP DITERIMA`;
  } else {
    stampEl.className = "receipt-badge-stamp stamp-pending";
    stampEl.innerHTML = `BELUM LUNAS`;
  }

  // Table rows in preview
  const prevItemsTable = document.getElementById("prev-items-body");
  if (prevItemsTable) {
    prevItemsTable.innerHTML = invoiceItems
      .map((item) => {
        const isFree = !item.price || item.price === 0;
        const priceLabel = isFree ? `<span style="color:#16a34a; font-weight:600; font-size:0.78rem;">Include</span>` : formatRupiah(item.price);
        const totalLabel = isFree ? `<span style="color:#16a34a; font-weight:600; font-size:0.78rem;">Include</span>` : formatRupiah(item.total);
        return `
        <tr>
          <td>
            <strong>${item.description || "Layanan"}</strong>
          </td>
          <td style="text-align: center;">${item.qty || 1}</td>
          <td style="text-align: right;">${priceLabel}</td>
          <td style="text-align: right; font-weight: 600;">${totalLabel}</td>
        </tr>
      `;
      })
      .join("");
  }

  // Totals in preview
  document.getElementById("prev-subtotal").textContent = formatRupiah(subtotal);
  const prevDiscountRow = document.getElementById("prev-discount-row");
  if (discount > 0) {
    prevDiscountRow.style.display = "flex";
    document.getElementById("prev-discount").textContent = `- ${formatRupiah(discount)}`;
  } else {
    prevDiscountRow.style.display = "none";
  }

  document.getElementById("prev-total").textContent = formatRupiah(totalAmount);
  document.getElementById("prev-dp").textContent = formatRupiah(downPayment);
  document.getElementById("prev-remaining").textContent = formatRupiah(remainingBalance);
}

/* ==========================================================================
   ACTIONS: SAVE, PRINT, WHATSAPP, HISTORY
   ========================================================================== */
async function saveCurrentInvoice() {
  const clientName = document.getElementById("inv-client-name").value.trim();
  if (!clientName) {
    showToast("Mohon isi Nama Klien terlebih dahulu.");
    document.getElementById("inv-client-name").focus();
    return;
  }

  const servedBy = (document.getElementById("inv-served-by")?.value || "Fatih").trim();

  const invoiceData = {
    id: document.getElementById("inv-id").value || undefined,
    invoiceNumber: document.getElementById("inv-number").value.trim() || generateInvoiceNumber(),
    date: document.getElementById("inv-date").value,
    dueDate: document.getElementById("inv-due-date").value,
    servedBy: servedBy,
    adminName: servedBy,
    clientName: clientName,
    clientPhone: document.getElementById("inv-client-phone").value.trim(),
    clientEmail: document.getElementById("inv-client-email").value.trim(),
    clientAddress: document.getElementById("inv-client-address").value.trim(),
    serviceType: document.getElementById("inv-service-type").value,
    serviceTitle: document.getElementById("inv-service-title").value.trim(),
    items: invoiceItems,
    subtotal: invoiceItems.reduce((acc, item) => acc + (item.total || 0), 0),
    discount: parseInt(document.getElementById("inv-discount").value, 10) || 0,
    totalAmount: parseInt(document.getElementById("calc-total").textContent.replace(/[^0-9]/g, ""), 10) || 0,
    downPayment: parseInt(document.getElementById("inv-dp").value, 10) || 0,
    remainingBalance: parseInt(document.getElementById("calc-remaining").textContent.replace(/[^0-9]/g, ""), 10) || 0,
    paymentMethod: document.getElementById("inv-payment-method").value,
    paymentStatus: document.getElementById("inv-status").value,
    notes: document.getElementById("inv-notes").value.trim()
  };

  const btnSave = document.getElementById("btn-save-invoice");
  if (btnSave) {
    btnSave.disabled = true;
    btnSave.textContent = "Menyimpan...";
  }

  try {
    const saved = await ZadaData.saveInvoice(invoiceData);
    document.getElementById("inv-id").value = saved.id;
    showToast(`Struk ${saved.invoiceNumber} berhasil disimpan ke sistem.`);
    renderInvoiceHistory();
  } catch (err) {
    console.error("Gagal simpan invoice:", err);
    showToast("Terjadi kesalahan saat menyimpan invoice.");
  } finally {
    if (btnSave) {
      btnSave.disabled = false;
      btnSave.textContent = "Simpan Struk ke Database";
    }
  }
}

function sendWhatsAppInvoice() {
  const phone = document.getElementById("inv-client-phone").value.trim();
  const name = document.getElementById("inv-client-name").value.trim() || "Kak";
  const invNumber = document.getElementById("inv-number").value.trim();
  const dateStr = formatDisplayDate(document.getElementById("inv-date").value);
  const servedBy = (document.getElementById("inv-served-by")?.value || "Fatih").trim();
  const serviceTitle = document.getElementById("inv-service-title").value.trim();
  const total = document.getElementById("calc-total").textContent;
  const dp = formatRupiah(parseInt(document.getElementById("inv-dp").value, 10) || 0);
  const remaining = document.getElementById("calc-remaining").textContent;
  const status = document.getElementById("inv-status").value;
  const paymentMethod = document.getElementById("inv-payment-method").value;
  const notes = document.getElementById("inv-notes").value.trim();

  let statusText = "LUNAS";
  if (status === "dp") statusText = `DP Diterima, sisa ${remaining}`;
  if (status === "pending") statusText = "Menunggu Pembayaran";

  const itemsListText = invoiceItems
    .map((item) => {
      const isFree = !item.total || item.total === 0;
      if (isFree) {
        return `• ${item.description} (Include)`;
      }
      return `• ${item.description} (${item.qty}x) = ${formatRupiah(item.total)}`;
    })
    .join("\n");

  const message = `Halo ${name}, terima kasih telah mempercayakan kebutuhan visual Anda bersama ZADA Studio.

Berikut adalah rincian struk resmi pesanan Anda:

No. Invoice: ${invNumber}
Tanggal: ${dateStr}
Dilayani oleh: ${servedBy}
Layanan: ${serviceTitle}

Rincian Pesanan:
${itemsListText}

Total Biaya: ${total}
DP Terbayar: ${dp}
Sisa Tagihan: ${remaining}
Status: ${statusText}
Metode Pembayaran: ${paymentMethod}

Catatan dan Ketentuan:
${notes || "Harap hadir 15 menit sebelum jadwal sesi foto."}

Jika ada pertanyaan atau konfirmasi jadwal, silakan langsung membalas pesan ini.

Salam hangat,
ZADA Studio`;

  // Format clean phone number (replace leading 0 with 62)
  let cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  }

  const encodedMsg = encodeURIComponent(message);
  let waUrl = `https://wa.me/?text=${encodedMsg}`;
  if (cleanPhone.length >= 9) {
    waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  }

  window.open(waUrl, "_blank");
}

/* ==========================================================================
   INVOICE HISTORY TABLE & STATS
   ========================================================================== */
async function renderInvoiceHistory() {
  const historyBody = document.getElementById("invoice-history-body");
  if (!historyBody) return;

  historyBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--color-text-dim);">Memuat riwayat struk dan transaksi...</td></tr>`;

  const invoices = await ZadaData.getAllInvoices();

  // Calculate statistics
  const totalCount = invoices.length;
  const totalRevenue = invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const totalDP = invoices.reduce((acc, i) => acc + (i.downPayment || 0), 0);
  const totalRemaining = invoices.reduce((acc, i) => acc + (i.remainingBalance || 0), 0);

  document.getElementById("stat-inv-total").textContent = totalCount;
  document.getElementById("stat-inv-revenue").textContent = formatRupiah(totalRevenue);
  document.getElementById("stat-inv-dp").textContent = formatRupiah(totalDP);
  document.getElementById("stat-inv-remaining").textContent = formatRupiah(totalRemaining);

  // Search & Filter
  const searchInput = document.getElementById("inv-search");
  const filterService = document.getElementById("inv-filter-service");
  const filterStatus = document.getElementById("inv-filter-status");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const sFilter = filterService ? filterService.value : "all";
  const stFilter = filterStatus ? filterStatus.value : "all";

  const filtered = invoices.filter((inv) => {
    const matchQuery =
      !query ||
      (inv.clientName && inv.clientName.toLowerCase().includes(query)) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(query)) ||
      (inv.servedBy && inv.servedBy.toLowerCase().includes(query)) ||
      (inv.clientPhone && inv.clientPhone.includes(query));

    const matchService = sFilter === "all" || inv.serviceType === sFilter;
    const matchStatus = stFilter === "all" || inv.paymentStatus === stFilter;

    return matchQuery && matchService && matchStatus;
  });

  if (!filtered.length) {
    historyBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--color-text-dim);">Belum ada riwayat struk yang cocok dengan filter pencarian.</td></tr>`;
    return;
  }

  historyBody.innerHTML = filtered
    .map((inv) => {
      const isLunas = inv.paymentStatus === "lunas";
      const isDP = inv.paymentStatus === "dp";
      const statusBadge = isLunas
        ? `<span class="pill" style="background:rgba(34,197,94,0.15);color:#4ade80;border-color:rgba(34,197,94,0.3);font-size:0.75rem;">Lunas</span>`
        : isDP
        ? `<span class="pill" style="background:rgba(234,179,8,0.15);color:#facc15;border-color:rgba(234,179,8,0.3);font-size:0.75rem;">DP ${formatRupiah(inv.downPayment)}</span>`
        : `<span class="pill" style="background:rgba(239,68,68,0.15);color:#f87171;border-color:rgba(239,68,68,0.3);font-size:0.75rem;">Belum Lunas</span>`;

      const staffName = inv.servedBy || inv.adminName || "Fatih";

      return `
      <tr>
        <td>
          <strong style="color:var(--color-text); font-family:'IBM Plex Mono', monospace; font-size:0.85rem;">${inv.invoiceNumber}</strong>
          <br/>
          <small style="color:var(--color-text-dim);">${formatDisplayDate(inv.date)}</small>
        </td>
        <td>
          <strong style="color:var(--color-text); font-size:0.92rem;">${inv.clientName}</strong>
          <br/>
          <small style="color:var(--color-text-dim);">${inv.clientPhone || "Tanpa No HP"}</small>
        </td>
        <td>
          <span style="font-size:0.82rem; color:var(--accent-300); font-weight:500;">${inv.serviceTitle}</span>
          <br/>
          <small style="color:var(--color-text-dim); font-size:0.75rem;">Petugas: ${staffName}</small>
        </td>
        <td><strong>${formatRupiah(inv.totalAmount)}</strong></td>
        <td>
          <span style="font-size:0.82rem; color:${inv.remainingBalance > 0 ? '#f87171' : '#4ade80'}; font-weight:600;">
            ${inv.remainingBalance > 0 ? formatRupiah(inv.remainingBalance) : 'Rp 0'}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-sm btn-outline btn-load-inv" data-id="${inv.id}" title="Buka dan Edit Struk">Edit</button>
            <button class="btn btn-sm btn-outline btn-print-inv" data-id="${inv.id}" title="Cetak Struk">Cetak</button>
            <button class="btn btn-sm btn-outline btn-wa-inv" data-id="${inv.id}" title="Kirim ke WhatsApp" style="color:#4ade80;">WA</button>
            <button class="btn btn-sm btn-outline btn-del-inv" data-id="${inv.id}" title="Hapus Struk" style="color:#f87171; border-color:rgba(248,113,113,0.3);">&times;</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

function loadInvoiceIntoEditor(invoiceData) {
  if (!invoiceData) return;

  document.getElementById("inv-id").value = invoiceData.id || "";
  document.getElementById("inv-number").value = invoiceData.invoiceNumber || generateInvoiceNumber();
  document.getElementById("inv-date").value = invoiceData.date || getTodayDateString();
  document.getElementById("inv-due-date").value = invoiceData.dueDate || getTodayDateString();
  if (document.getElementById("inv-served-by")) {
    document.getElementById("inv-served-by").value = invoiceData.servedBy || invoiceData.adminName || "Fatih";
  }
  document.getElementById("inv-client-name").value = invoiceData.clientName || "";
  document.getElementById("inv-client-phone").value = invoiceData.clientPhone || "";
  document.getElementById("inv-client-email").value = invoiceData.clientEmail || "";
  document.getElementById("inv-client-address").value = invoiceData.clientAddress || "";
  document.getElementById("inv-service-type").value = invoiceData.serviceType || "studio";
  document.getElementById("inv-service-title").value = invoiceData.serviceTitle || "Layanan Foto";
  document.getElementById("inv-discount").value = invoiceData.discount || 0;
  document.getElementById("inv-dp").value = invoiceData.downPayment || 0;
  document.getElementById("inv-payment-method").value = invoiceData.paymentMethod || "Transfer BCA";
  document.getElementById("inv-status").value = invoiceData.paymentStatus || "lunas";
  document.getElementById("inv-notes").value = invoiceData.notes || "";

  invoiceItems = Array.isArray(invoiceData.items) && invoiceData.items.length
    ? JSON.parse(JSON.stringify(invoiceData.items))
    : [{ description: "Sesi Foto Studio", qty: 1, price: invoiceData.totalAmount || 0, total: invoiceData.totalAmount || 0 }];

  renderItemInputs();
  calculateAndRenderPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast(`Struk ${invoiceData.invoiceNumber} dimuat ke editor.`);
}

/* ==========================================================================
   EVENT LISTENERS SETUP
   ========================================================================== */
function setupEventListeners() {
  // Input triggers for live preview
  [
    "inv-number",
    "inv-date",
    "inv-due-date",
    "inv-served-by",
    "inv-client-name",
    "inv-client-phone",
    "inv-client-email",
    "inv-client-address",
    "inv-service-title",
    "inv-payment-method",
    "inv-notes",
    "inv-discount",
    "inv-dp",
    "inv-status"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", calculateAndRenderPreview);
      el.addEventListener("change", calculateAndRenderPreview);
    }
  });

  // Add new item button
  document.getElementById("btn-add-item")?.addEventListener("click", addNewItemRow);

  // Generate new invoice number button
  document.getElementById("btn-gen-number")?.addEventListener("click", () => {
    document.getElementById("inv-number").value = generateInvoiceNumber();
    calculateAndRenderPreview();
  });

  // Preset Dropdown & Buttons
  const presetSelect = document.getElementById("inv-package-preset");
  if (presetSelect) {
    presetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        applyPreset(e.target.value);
      }
    });
  }

  const quickPasfoto = document.getElementById("quick-pasfoto-select");
  if (quickPasfoto) {
    quickPasfoto.addEventListener("change", (e) => {
      if (e.target.value) {
        applyPreset(e.target.value);
      }
    });
  }

  const quickVisa = document.getElementById("quick-visa-select");
  if (quickVisa) {
    quickVisa.addEventListener("change", (e) => {
      if (e.target.value) {
        applyPreset(e.target.value);
      }
    });
  }

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyPreset(btn.dataset.preset);
    });
  });

  // Action Buttons
  document.getElementById("btn-save-invoice")?.addEventListener("click", saveCurrentInvoice);
  document.getElementById("btn-print-invoice")?.addEventListener("click", () => window.print());
  document.getElementById("btn-wa-invoice")?.addEventListener("click", sendWhatsAppInvoice);
  document.getElementById("btn-reset-invoice")?.addEventListener("click", resetInvoiceForm);

  // View Mode Toggle (Standard vs Thermal Receipt)
  const toggleThermal = document.getElementById("btn-toggle-thermal");
  const receiptPaper = document.getElementById("receipt-paper");
  if (toggleThermal && receiptPaper) {
    toggleThermal.addEventListener("click", () => {
      const isThermal = receiptPaper.classList.toggle("thermal-mode");
      toggleThermal.textContent = isThermal ? "📄 Mode Standar (A4/A5)" : "🧾 Mode Struk Kasir (Thermal 58/80mm)";
    });
  }

  // History search and filter listeners
  document.getElementById("inv-search")?.addEventListener("input", renderInvoiceHistory);
  document.getElementById("inv-filter-service")?.addEventListener("change", renderInvoiceHistory);
  document.getElementById("inv-filter-status")?.addEventListener("change", renderInvoiceHistory);

  // Delegated table actions
  const historyTable = document.getElementById("invoice-history-body");
  if (historyTable) {
    historyTable.addEventListener("click", async (e) => {
      const loadBtn = e.target.closest(".btn-load-inv");
      if (loadBtn && loadBtn.dataset.id) {
        const inv = await ZadaData.getInvoiceById(loadBtn.dataset.id);
        if (inv) loadInvoiceIntoEditor(inv);
        return;
      }

      const printBtn = e.target.closest(".btn-print-inv");
      if (printBtn && printBtn.dataset.id) {
        const inv = await ZadaData.getInvoiceById(printBtn.dataset.id);
        if (inv) {
          loadInvoiceIntoEditor(inv);
          setTimeout(() => window.print(), 300);
        }
        return;
      }

      const waBtn = e.target.closest(".btn-wa-inv");
      if (waBtn && waBtn.dataset.id) {
        const inv = await ZadaData.getInvoiceById(waBtn.dataset.id);
        if (inv) {
          loadInvoiceIntoEditor(inv);
          sendWhatsAppInvoice();
        }
        return;
      }

      const delBtn = e.target.closest(".btn-del-inv");
      if (delBtn && delBtn.dataset.id) {
        if (confirm("Apakah Anda yakin ingin menghapus struk ini dari riwayat?")) {
          await ZadaData.deleteInvoice(delBtn.dataset.id);
          showToast("Struk telah dihapus.");
          renderInvoiceHistory();
        }
      }
    });
  }

  // Logout listener
  document.getElementById("btn-logout")?.addEventListener("click", () => {
    auth.signOut().then(() => (window.location.href = "admin-login.html"));
  });
}
