// ─────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────
let currentPlatform = "web";
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// ─────────────────────────────────────────────────
//  TAB NAVIGATION
// ─────────────────────────────────────────────────
function switchTab(tab) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById("panel-" + tab).classList.add("active");
}

// ─────────────────────────────────────────────────
//  PLATFORM TOGGLE
// ─────────────────────────────────────────────────
function setPlatform(p) {
  currentPlatform = p;
  document
    .getElementById("btn-web")
    .classList.toggle("active", p === "web");
  document
    .getElementById("btn-mobile")
    .classList.toggle("active", p === "mobile");
  renderTypoPreview();
}

// ─────────────────────────────────────────────────
//  COLOR UTILITIES
// ─────────────────────────────────────────────────
function hexToHsl(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{6})$/.test(hex);
}

// Generate shade palette from base hex
function generatePalette(hex) {
  const [h, s] = hexToHsl(hex);
  // Lightness map: 50 = very light, 950 = very dark
  const lightnessMap = {
    50: 95,
    100: 90,
    200: 80,
    300: 68,
    400: 55,
    500: 45,
    600: 36,
    700: 27,
    800: 18,
    900: 11,
    950: 7,
  };
  const palette = {};
  SHADES.forEach((shade) => {
    const l = lightnessMap[shade];
    // Slightly reduce saturation for very dark and very light shades
    const sFactor = shade <= 100 ? 0.55 : shade >= 850 ? 0.7 : 1;
    palette[shade] = hslToHex(h, s * sFactor, l);
  });
  return palette;
}

// ─────────────────────────────────────────────────
//  COLOR PALETTE UI
// ─────────────────────────────────────────────────
function renderPalette(hex) {
  const grid = document.getElementById("palette-grid");
  if (!isValidHex(hex)) {
    grid.innerHTML = SHADES.map(
      () => '<div class="empty-chip"></div>',
    ).join("");
    return;
  }
  const palette = generatePalette(hex);
  grid.innerHTML = SHADES.map((shade) => {
    const color = palette[shade];
    return `<div class="shade-chip" style="background:${color}" title="${shade}: ${color}"></div>`;
  }).join("");
}

// ─────────────────────────────────────────────────
//  COLOR INPUT HANDLERS
// ─────────────────────────────────────────────────
const hexInput = document.getElementById("hex-input");
const colorPicker = document.getElementById("color-picker");
const swatch = document.getElementById("swatch");
const colorNameInput = document.getElementById("color-name");
const btnColors = document.getElementById("btn-generate-colors");

function updateColorUI(hex) {
  if (isValidHex(hex)) {
    swatch.style.background = hex;
    colorPicker.value = hex;
    renderPalette(hex);
  } else {
    renderPalette("");
  }
  validateColorForm();
}

hexInput.addEventListener("input", (e) => {
  let val = e.target.value.trim();
  if (val && !val.startsWith("#")) val = "#" + val;
  hexInput.value = val;
  updateColorUI(val);
});

colorPicker.addEventListener("input", (e) => {
  hexInput.value = e.target.value.toUpperCase();
  updateColorUI(e.target.value);
});

colorNameInput.addEventListener("input", validateColorForm);

function validateColorForm() {
  const name = colorNameInput.value.trim();
  const hex = hexInput.value.trim();
  btnColors.disabled = !(name && isValidHex(hex));
}

// Init preview with default purple color
updateColorUI("#7C6AF7");
hexInput.value = "#7C6AF7";

// ─────────────────────────────────────────────────
//  TYPOGRAPHY DATA
// ─────────────────────────────────────────────────
// styleName convention:
//   Heading  → Heading/H1 ...
//   Display  → Display/Large, Display/Medium
//   Body     → Body/{size}/{weight}  e.g. Body/16/Regular
//   Caption  → Caption/{size}/Regular
const TYPO_WEB = [
  // Display
  { styleName: "Display/Large", size: 57, weight: 400, lh: 64, ls: -0.25 },
  { styleName: "Display/Medium", size: 45, weight: 400, lh: 52, ls: 0 },
  // Heading
  { styleName: "Heading/H1", size: 36, weight: 600, lh: 44, ls: 0 },
  { styleName: "Heading/H2", size: 28, weight: 600, lh: 36, ls: 0 },
  { styleName: "Heading/H3", size: 24, weight: 600, lh: 32, ls: 0 },
  { styleName: "Heading/H4", size: 20, weight: 600, lh: 28, ls: 0 },
  { styleName: "Heading/H5", size: 18, weight: 500, lh: 26, ls: 0 },
  { styleName: "Heading/H6", size: 16, weight: 500, lh: 24, ls: 0 },
  // Body — 5 sizes × 3 weights
  { styleName: "Body/20/Regular", size: 20, weight: 400, lh: 28, ls: 0 },
  { styleName: "Body/20/Medium", size: 20, weight: 500, lh: 28, ls: 0 },
  { styleName: "Body/20/SemiBold", size: 20, weight: 600, lh: 28, ls: 0 },
  { styleName: "Body/18/Regular", size: 18, weight: 400, lh: 26, ls: 0 },
  { styleName: "Body/18/Medium", size: 18, weight: 500, lh: 26, ls: 0 },
  { styleName: "Body/18/SemiBold", size: 18, weight: 600, lh: 26, ls: 0 },
  { styleName: "Body/16/Regular", size: 16, weight: 400, lh: 24, ls: 0 },
  { styleName: "Body/16/Medium", size: 16, weight: 500, lh: 24, ls: 0 },
  { styleName: "Body/16/SemiBold", size: 16, weight: 600, lh: 24, ls: 0 },
  { styleName: "Body/14/Regular", size: 14, weight: 400, lh: 20, ls: 0 },
  { styleName: "Body/14/Medium", size: 14, weight: 500, lh: 20, ls: 0 },
  { styleName: "Body/14/SemiBold", size: 14, weight: 600, lh: 20, ls: 0 },
  { styleName: "Body/12/Regular", size: 12, weight: 400, lh: 16, ls: 0 },
  { styleName: "Body/12/Medium", size: 12, weight: 500, lh: 16, ls: 0 },
  { styleName: "Body/12/SemiBold", size: 12, weight: 600, lh: 16, ls: 0 },
  // Caption — 2 sizes, Regular only
  { styleName: "Caption/11/Regular", size: 11, weight: 400, lh: 16, ls: 0 },
  { styleName: "Caption/10/Regular", size: 10, weight: 400, lh: 14, ls: 0 },
];

const TYPO_MOBILE = [
  // Display
  { styleName: "Display/34/SemiBold", size: 34, weight: 600, lh: 41, ls: 0 },
  // Heading
  { styleName: "Heading/H1", size: 28, weight: 600, lh: 34, ls: 0 },
  { styleName: "Heading/H2", size: 22, weight: 600, lh: 28, ls: 0 },
  { styleName: "Heading/H3", size: 20, weight: 600, lh: 25, ls: 0 },
  // Body — 3 sizes × 3 weights
  { styleName: "Body/16/Regular", size: 16, weight: 400, lh: 24, ls: 0 },
  { styleName: "Body/16/Medium", size: 16, weight: 500, lh: 24, ls: 0 },
  { styleName: "Body/16/SemiBold", size: 16, weight: 600, lh: 24, ls: 0 },
  { styleName: "Body/14/Regular", size: 14, weight: 400, lh: 20, ls: 0 },
  { styleName: "Body/14/Medium", size: 14, weight: 500, lh: 20, ls: 0 },
  { styleName: "Body/14/SemiBold", size: 14, weight: 600, lh: 20, ls: 0 },
  { styleName: "Body/12/Regular", size: 12, weight: 400, lh: 16, ls: 0 },
  { styleName: "Body/12/Medium", size: 12, weight: 500, lh: 16, ls: 0 },
  { styleName: "Body/12/SemiBold", size: 12, weight: 600, lh: 16, ls: 0 },
  // Caption — 2 sizes, Regular only
  { styleName: "Caption/11/Regular", size: 11, weight: 400, lh: 16, ls: 0 },
  { styleName: "Caption/10/Regular", size: 10, weight: 400, lh: 14, ls: 0 },
];

const weightLabel = {
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};

function updateTypoWeight(index, newWeight) {
  const rows = currentPlatform === "web" ? TYPO_WEB : TYPO_MOBILE;
  const oldWeight = rows[index].weight;

  rows[index].weight = newWeight;

  const oldLabel = weightLabel[oldWeight];
  const newLabel = weightLabel[newWeight];

  if (oldLabel && newLabel) {
    const parts = rows[index].styleName.split("/");
    const lastPart = parts[parts.length - 1];

    if (lastPart === oldLabel) {
      parts[parts.length - 1] = newLabel;
      rows[index].styleName = parts.join("/");
    } else if (lastPart.includes(oldLabel)) {
      parts[parts.length - 1] = lastPart.replace(oldLabel, newLabel);
      rows[index].styleName = parts.join("/");
    }
  }

  renderTypoPreview();
}

function renderTypoPreview() {
  const rows = currentPlatform === "web" ? TYPO_WEB : TYPO_MOBILE;
  const prefix = currentPlatform === "web" ? "Web" : "Mobile";
  const preview = document.getElementById("typo-preview");

  preview.innerHTML = `
    <div class="typo-preview-header">
      <span>Style Path</span>
      <span>Size</span>
      <span>Weight</span>
      <span>LH</span>
    </div>
    ${rows
      .map((r, i) => {
        // Split styleName into folder path parts for display
        const parts = r.styleName.split("/");
        const leaf = parts.pop();
        const folder = parts.length
          ? `<span class="style-group">${parts.join("/")} / </span>`
          : "";
        return `
        <div class="typo-row">
          <div class="style-name" title="${prefix}/${r.styleName}">${folder}${leaf}</div>
          <div class="style-val">${r.size}px</div>
          <div class="style-val">
            <select class="typo-weight-select" onchange="updateTypoWeight(${i}, parseInt(this.value))">
              ${[300, 400, 500, 600, 700, 800, 900]
                .map(
                  (w) =>
                    `<option value="${w}" ${r.weight === w ? "selected" : ""}>${w}</option>`,
                )
                .join("")}
            </select>
          </div>
          <div class="style-val">${r.lh}px</div>
        </div>`;
      })
      .join("")}
  `;
}

// ─────────────────────────────────────────────────
//  GOOGLE FONTS LIST
// ─────────────────────────────────────────────────
const GOOGLE_FONTS = [
  { name: "Inter", cat: "Sans Serif" },
  { name: "Roboto", cat: "Sans Serif" },
  { name: "Open Sans", cat: "Sans Serif" },
  { name: "Lato", cat: "Sans Serif" },
  { name: "Montserrat", cat: "Sans Serif" },
  { name: "Poppins", cat: "Sans Serif" },
  { name: "Nunito", cat: "Sans Serif" },
  { name: "Raleway", cat: "Sans Serif" },
  { name: "Rubik", cat: "Sans Serif" },
  { name: "Outfit", cat: "Sans Serif" },
  { name: "DM Sans", cat: "Sans Serif" },
  { name: "Plus Jakarta Sans", cat: "Sans Serif" },
  { name: "Figtree", cat: "Sans Serif" },
  { name: "Manrope", cat: "Sans Serif" },
  { name: "Work Sans", cat: "Sans Serif" },
  { name: "Mulish", cat: "Sans Serif" },
  { name: "Karla", cat: "Sans Serif" },
  { name: "Jost", cat: "Sans Serif" },
  { name: "Lexend", cat: "Sans Serif" },
  { name: "Geist", cat: "Sans Serif" },
  { name: "Source Sans 3", cat: "Sans Serif" },
  { name: "Barlow", cat: "Sans Serif" },
  { name: "IBM Plex Sans", cat: "Sans Serif" },
  { name: "Urbanist", cat: "Sans Serif" },
  { name: "Sora", cat: "Sans Serif" },
  { name: "Space Grotesk", cat: "Sans Serif" },
  { name: "Noto Sans", cat: "Sans Serif" },
  { name: "Quicksand", cat: "Sans Serif" },
  { name: "Oxanium", cat: "Sans Serif" },
  { name: "Josefin Sans", cat: "Sans Serif" },
  { name: "Playfair Display", cat: "Serif" },
  { name: "Merriweather", cat: "Serif" },
  { name: "Lora", cat: "Serif" },
  { name: "EB Garamond", cat: "Serif" },
  { name: "Cormorant Garamond", cat: "Serif" },
  { name: "DM Serif Display", cat: "Serif" },
  { name: "Libre Baskerville", cat: "Serif" },
  { name: "Source Serif 4", cat: "Serif" },
  { name: "IBM Plex Serif", cat: "Serif" },
  { name: "Noto Serif", cat: "Serif" },
  { name: "Bitter", cat: "Serif" },
  { name: "Crimson Text", cat: "Serif" },
  { name: "Fraunces", cat: "Serif" },
  { name: "Spectral", cat: "Serif" },
  { name: "Alegreya", cat: "Serif" },
  { name: "Fira Code", cat: "Monospace" },
  { name: "Source Code Pro", cat: "Monospace" },
  { name: "JetBrains Mono", cat: "Monospace" },
  { name: "IBM Plex Mono", cat: "Monospace" },
  { name: "Space Mono", cat: "Monospace" },
  { name: "Roboto Mono", cat: "Monospace" },
  { name: "Courier Prime", cat: "Monospace" },
  { name: "Inconsolata", cat: "Monospace" },
];

// ─────────────────────────────────────────────────
//  FONT DROPDOWN LOGIC
// ─────────────────────────────────────────────────
let selectedFont = "";
let dropdownOpen = false;
const btnTypo = document.getElementById("btn-generate-typo");

function renderFontList(filter = "") {
  const list = document.getElementById("font-list");
  const filtered = filter
    ? GOOGLE_FONTS.filter((f) =>
        f.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : GOOGLE_FONTS;

  if (filtered.length === 0) {
    list.innerHTML =
      '<div class="font-no-result">Font tidak ditemukan</div>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (f) => `
    <div class="font-item ${selectedFont === f.name ? "selected" : ""}"
         onclick="selectFont('${f.name}')">
      <span>${f.name}</span>
      <span class="font-category">${f.cat}</span>
    </div>
  `,
    )
    .join("");
}

function toggleFontDropdown() {
  dropdownOpen = !dropdownOpen;
  document
    .getElementById("font-dropdown")
    .classList.toggle("open", dropdownOpen);
  document
    .getElementById("font-chevron")
    .classList.toggle("open", dropdownOpen);
  if (dropdownOpen) {
    setTimeout(() => document.getElementById("font-search").focus(), 50);
    renderFontList();
  }
}

function filterFonts(val) {
  renderFontList(val);
}

function selectFont(name) {
  selectedFont = name;
  document.getElementById("font-display").textContent = name;
  document.getElementById("font-display").style.color =
    "var(--text-primary)";
  document.getElementById("font-search").value = "";
  renderFontList();
  closeFontDropdown();
  btnTypo.disabled = false;
}

function closeFontDropdown() {
  dropdownOpen = false;
  document.getElementById("font-dropdown").classList.remove("open");
  document.getElementById("font-chevron").classList.remove("open");
}

// Close when clicking outside
document.addEventListener("click", (e) => {
  if (!document.getElementById("font-search-wrap").contains(e.target)) {
    closeFontDropdown();
  }
});

// ─────────────────────────────────────────────────
//  GENERATE BUTTONS → postMessage to code.ts
// ─────────────────────────────────────────────────
btnColors.addEventListener("click", () => {
  const name = colorNameInput.value.trim();
  const hex = hexInput.value.trim();
  const shades = generatePalette(hex);

  btnColors.disabled = true;
  btnColors.textContent = "Generating…";

  parent.postMessage(
    {
      pluginMessage: {
        type: "generate-colors",
        colorName: name,
        shades: SHADES.map((s) => ({ shade: s, hex: shades[s] })),
      },
    },
    "*",
  );
});

btnTypo.addEventListener("click", () => {
  const font = selectedFont;
  const rows = currentPlatform === "web" ? TYPO_WEB : TYPO_MOBILE;
  const platform = currentPlatform;

  btnTypo.disabled = true;
  btnTypo.textContent = "Generating…";

  parent.postMessage(
    {
      pluginMessage: {
        type: "generate-typography",
        fontFamily: font,
        platform,
        styles: rows,
      },
    },
    "*",
  );
});

// ─────────────────────────────────────────────────
//  RECEIVE MESSAGES FROM code.ts
// ─────────────────────────────────────────────────
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "colors-done") {
    btnColors.disabled = false;
    btnColors.innerHTML = "✦ Generate &amp; Save to Styles";
    showToast("✓ " + msg.count + " color styles saved!", "success");
  } else if (msg.type === "typography-done") {
    btnTypo.disabled = false;
    btnTypo.innerHTML = "✦ Generate &amp; Save to Styles";
    showToast("✓ " + msg.count + " text styles saved!", "success");
  } else if (msg.type === "error") {
    btnColors.disabled = false;
    btnColors.innerHTML = "✦ Generate &amp; Save to Styles";
    btnTypo.disabled = false;
    btnTypo.innerHTML = "✦ Generate &amp; Save to Styles";
    validateColorForm();
    showToast("✕ " + msg.message, "error");
  }
};

// ─────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast " + type;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  });
}

// ─────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────
renderTypoPreview();
