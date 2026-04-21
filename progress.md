# DySys — Progress Documentation

> **Tujuan file ini:** Memberikan konteks lengkap bagi siapapun (manusia maupun AI agent) yang melanjutkan pengembangan plugin ini, sehingga tidak kehilangan konteks dan bisa langsung produktif.

---

## 📌 Deskripsi Proyek

**DySys** adalah sebuah Figma plugin (Design System Generator) yang membantu designer membuat dan mengelola design system tokens langsung di dalam Figma. Plugin ini memiliki tiga fitur utama:

1. **Colors** — Generator palet warna dengan kontrol per-shade (HSL/HEX/RGB)
2. **Typography** — Builder untuk text styles berbasis group, dengan dukungan font dari Figma
3. **Consistency Checker** — Detektor pelanggaran grid untuk Margin spacing dan Rounded Corner radius

**Repository:** `https://github.com/fazzadwir/dysys-figma-plugin`
**Branch aktif:** `main`

---

## 🗂️ Struktur Proyek

```
DySys/
├── manifest.json          # Konfigurasi Figma plugin (entry: code.js + ui.html)
├── code.ts                # ⭐ Main thread plugin (akses Figma API) — source of truth
├── code.js                # ⚙️ Compiled output dari code.ts (jangan edit manual)
├── ui.html                # ⚙️ Built UI (di-generate oleh build script) — jangan edit manual
├── src/
│   ├── ui.html            # ⭐ Source HTML struktur UI (template — diedit via ini)
│   ├── ui.css             # ⭐ Source stylesheet UI
│   └── ui.js              # ⭐ Source JavaScript UI logic
├── scripts/
│   └── build-ui.js        # Build script: inlines CSS + JS ke dalam ui.html (output root)
├── rewrite_ui.js          # File sementara dari proses rewrite (masih ada, bisa diabaikan)
├── package.json           # npm scripts
└── tsconfig.json
```

### ⚠️ Penting: Build Workflow

Plugin menggunakan **dua langkah build terpisah**:

```bash
# Build TypeScript (code.ts → code.js)
npm run build

# Build UI (src/ui.html + src/ui.css + src/ui.js → ui.html di root)
npm run build:ui

# Build keduanya sekaligus
npm run build:all
```

> **JANGAN** edit `ui.html` di root atau `code.js` secara langsung.
> Semua perubahan harus dilakukan di `src/ui.html`, `src/ui.css`, `src/ui.js`, atau `code.ts`.

---

## ✅ Fitur yang Sudah Selesai

### 1. Colors Panel

- [x] Input nama warna (style name)
- [x] Input HEX + color picker visual
- [x] Generate otomatis palet 11 shade (50–950) menggunakan algoritma HSL
- [x] Setiap shade bisa diedit secara individual (H, S, L; atau HEX; atau R, G, B)
- [x] Format switch per-shade (HSL / HEX / RGB)
- [x] Preview warna real-time per shade
- [x] Generate & save langsung sebagai Figma Paint Styles dengan format `NamaWarna/shade`
- [x] Validasi form (tombol disabled jika belum valid)

### 2. Typography Panel (Typography Style Builder)

- [x] Platform toggle (Web / Mobile) — prefix nama style Web/Mobile
- [x] Font picker dengan **dropdown searchable** yang menampilkan font-font yang tersedia di Figma environment
- [x] Mode "Use Custom Font" (checkbox toggle) untuk input font custom sebagai alternatif
- [x] Sistem **group-based**: user mendefinisikan grup berisi beberapa style
- [x] Setiap group punya nama yang bisa di-rename
- [x] Setiap style row memiliki field: Size (px), Line Height (px), Weight/Style (dropdown), Custom Name (opsional)
- [x] Dropdown weight/style dinamis: menyesuaikan dengan style yang tersedia di font yang dipilih
- [x] Duplicate & Delete style
- [x] Delete group
- [x] **Output Preview** real-time: menampilkan nama lengkap style yang akan dibuat (format: `Platform/GroupName/Size Style` atau `Platform/GroupName/CustomName`)
- [x] Generate Styles → simpan sebagai Figma Text Styles
- [x] Penanganan font yang tidak tersedia: skip style yang gagal load, tampilkan warning toast
- [x] Line height dikirim ke Figma dalam unit PIXELS
- [x] Letter spacing dikirim dalam unit PIXELS

### 3. Consistency Checker (sebelumnya Spacing Panel)

- [x] Toggle rule config (4px atau 8px)
- [x] Checker dapat diatur untuk memindai Margin, Radius, atau sekaligus keduanya (multiselect)
- [x] Update empty state icon secara dinamis berdasarkan konfigurasi checker aktif
- [x] Status indicator (frame terpilih atau tidak)
- [x] Scan Frame: deep-recursive scan seluruh descendants untuk issue Margin dan Radius
- [x] Margin: Deteksi auto-layout spacing dan manual layout
- [x] Radius: Deteksi corner radius, mendukung single radius dan mixed radius per-corner
- [x] Menampilkan hanya issues berdasarkan filter aktif (Margin/Radius)
- [x] Per-issue: badge source, layer name, nilai saat ini vs. suggested
- [x] Tombol **Focus** per item margin → select & zoom to layers di Figma
- [x] Tombol **Fix** per auto-layout item / radius item → apply suggested value / rule
- [x] Tombol **Apply Fix to All** / Fix Margin/Radius Issues → fix semua sesuai filter aktif
- [x] Live update status selection (selectionchange event)

### 4. UI & UX

- [x] Sidebar layout (bukan tab-based)
- [x] Dark mode design dengan accent color (`#7C6AF7` ungu)
- [x] Inter font (Google Fonts)
- [x] Toast notification (success / error)
- [x] Responsive panel scroll

---

## 🐛 Bug yang Sudah Diperbaiki

| Bug                                                 | Perbaikan                                                       | Commit/Konversasi             |
| --------------------------------------------------- | --------------------------------------------------------------- | ----------------------------- |
| `getNodeById` sync tidak tersedia di Figma          | Ganti dengan `getNodeByIdAsync`                                 | `cb2000ee`                    |
| "Could not find the layers" error pada Focus button | Update routing message + async resolve                          | `f947de41`                    |
| Font dropdown ter-clipped oleh panel boundary       | Ubah positioning ke `fixed` menggunakan `getBoundingClientRect` | `2fa93419`                    |
| Tombol "Add Group" tidak responsif                  | Perbaiki event handler dan try-catch di `addGroup()`            | `4de07c37` + commit `49552c7` |
| Generate button tidak update state setelah loading  | Perbaiki `validateGenerateBtn()` untuk restore label            | `4de07c37`                    |

---

## 🔧 State & Arsitektur Internal (ui.js)

### State Utama

| Variabel              | Tipe      | Keterangan                                               |
| --------------------- | --------- | -------------------------------------------------------- |
| `currentPlatform`     | `string`  | `'web'` atau `'mobile'`                                  |
| `shadeState`          | `object`  | Map `shade → { h, s, l, format }` untuk Colors panel     |
| `typoGroups`          | `array`   | Array of `{ id, name, styles[] }` untuk Typography panel |
| `FIGMA_FONTS`         | `array`   | Cache font list dari Figma: `{ name, styles[], cat }`    |
| `selectedFont`        | `string`  | Nama font yang dipilih di dropdown                       |
| `availableFontStyles` | `array`   | Style yang tersedia untuk font yang dipilih              |
| `isCustomFontMode`    | `boolean` | Apakah mode custom font aktif                            |
| `customFontFamily`    | `string`  | Nama font custom yang diketik user                       |

### Message Flow (UI ↔ Plugin)

**UI → Plugin (`code.ts`):**
| `type` | Data | Action |
|---|---|---|
| `generate-colors` | `colorName`, `shades[]` | Buat Paint Styles |
| `generate-typography` | `fontFamily`, `platform`, `groups[]`, `isCustomFont` | Buat Text Styles |
| `scan` | `grid` | Scan spacing pada selection |
| `focus` | `fromId`, `toId` | Select & zoom nodes |
| `fix` | `parentId`, `suggestedValue` | Fix auto-layout spacing |
| `check-selection` | — | Cek status selection saat ini |
| `get-available-fonts` | — | Minta list font dari Figma |

**Plugin → UI:**
| `type` | Data | Action |
|---|---|---|
| `colors-done` | `count` | Toast sukses Colors |
| `typography-done` | `count` | Toast sukses Typography |
| `available-fonts` | `fonts[]` | Populate font dropdown |
| `scan-result` | `records[]`, `grid` | Render hasil scan |
| `no-selection` | — | Reset scan state |
| `selection-status` | `hasSelection`, `count` | Update status bar |
| `fix-done` | `parentId` | Mark item as fixed |
| `error` | `message` | Toast error |

### Naming Convention Output Style

- **Colors:** `{colorName}/{shade}` (e.g., `Purple/500`)
- **Typography:** `{Platform}/{GroupName}/{size} {style}` atau `{Platform}/{GroupName}/{customName}` (e.g., `Web/Heading/32 SemiBold`)

---

## 🚧 Hal yang Belum Selesai / Potensial Next Steps

Berikut adalah fitur/perbaikan yang belum diimplementasikan dan bisa diprioritaskan:

### High Priority

- [ ] **Persist Typography Groups** — State `typoGroups` hilang setiap kali plugin ditutup. Perlu implementasi `figma.clientStorage` untuk menyimpan dan me-restore konfigurasi group.
- [ ] **Drag-and-drop reorder groups** — Handle drag icon (`⋯`) sudah ada di UI tapi belum fungsional.

### Medium Priority

- [ ] **Export/Import konfigurasi** — Kemampuan export setting typography sebagai JSON dan re-import.
- [ ] **Preview typography "live"** — Tampilkan preview teks dengan font dan ukuran aktual di panel preview.
- [ ] **Spacing: show valid items as well** — Saat ini hanya issues yang tampil; valid spacing items disembunyikan.
- [ ] **Multiple color palettes** — Saat ini hanya bisa generate satu warna sekaligus.

### Low Priority

- [ ] **Dark/light mode toggle** — Plugin menggunakan dark mode hardcoded.
- [ ] **Undo support** — Tidak ada mekanisme undo setelah generate styles.
- [ ] **Unit test** — Tidak ada test coverage sama sekali.

---

## 📝 Catatan Penting untuk Agent Selanjutnya

1. **Build wajib sebelum test di Figma.** Setiap perubahan di `src/` harus di-build menggunakan `npm run build:all` sebelum ditest di Figma.

2. **Font dropdown menggunakan `position: fixed`** agar tidak ter-clip. Jangan ubah ke `position: absolute` atau dropdown akan ter-clip oleh parent panel yang `overflow: hidden`.

3. **`addGroup()` sudah dibungkus try-catch** karena sempat ada silent error yang menyebabkan tombol tidak responsif. Pertahankan pattern ini.

4. **`code.ts` adalah source,** `code.js` adalah compiled output. TypeScript interfaces ada di bagian atas `code.ts`. Jika menambah message baru, tambahkan handler di `figma.ui.onmessage` di `code.ts` dan handler respons di `window.onmessage` di `src/ui.js`.

5. **Spacing IIFE pattern** — Logic Spacing Checker dibungkus dalam IIFE `(function() { ... })()` di `src/ui.js` untuk isolasi scope. Message handler spacing di-chain ke handler utama via `_originalOnMessage`.

---

## 📅 Riwayat Pengembangan (Ringkas)

| Tanggal     | Milestone                                                                         |
| ----------- | --------------------------------------------------------------------------------- |
| 7 Apr 2026  | Implementasi line height 160% global untuk typography                             |
| 16 Apr 2026 | Mulai build 8pt Spacing Detector, refactoring arsitektur modular                  |
| 16 Apr 2026 | Fixing Spacing Checker: Focus & Fix fungsional, async API fix                     |
| 17 Apr 2026 | Redesign UI: sidebar layout, Colors page redesign                                 |
| 17 Apr 2026 | Upgrade Typography Generator → Typography Style Builder (group-based)             |
| 17 Apr 2026 | Fixing font dropdown (searchable, z-index/positioning)                            |
| 17 Apr 2026 | Fixing Add Group button, Generate button state                                    |
| 20 Apr 2026 | Commit `49552c7`: final bug fix Add Group button, push ke main                    |
| 20 Apr 2026 | Implementasi **Consistency Checker** dengan fitur baru **Rounded Corner Checker** |
| 20 Apr 2026 | Penyesuaian UI Consistency Checker (Dynamic Icon & Multiselect Config)            |
| 20 Apr 2026 | MEngubah naming dari Consistency ke Lint                                          |

---

_Terakhir diperbarui: 20 April 2026 oleh Antigravity (AI Agent)_
