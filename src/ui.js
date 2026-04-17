// ─────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────
let currentPlatform = "web";
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Per-shade editable state: { h, s, l, format }
let shadeState = {};

// ─────────────────────────────────────────────────
//  SIDEBAR NAVIGATION (replaces tab switching)
// ─────────────────────────────────────────────────
function switchPanel(panel) {
  document
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("nav-" + panel).classList.add("active");
  document.getElementById("panel-" + panel).classList.add("active");
}

// ─────────────────────────────────────────────────
//  PLATFORM TOGGLE
// ─────────────────────────────────────────────────
function setPlatform(p) {
  currentPlatform = p;
  document.getElementById("btn-web").classList.toggle("active", p === "web");
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
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
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

function hslToRgb(h, s, l) {
  const hex = hslToHex(h, s, l);
  const rv = parseInt(hex.slice(1, 3), 16);
  const gv = parseInt(hex.slice(3, 5), 16);
  const bv = parseInt(hex.slice(5, 7), 16);
  return `rgb(${rv}, ${gv}, ${bv})`;
}

function hexToRgbArr(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function isValidHex(hex) {
  return /^#([0-9A-Fa-f]{6})$/.test(hex);
}

// Generate shade palette from base hex
function generatePalette(hex) {
  const [h, s] = hexToHsl(hex);
  const lightnessMap = {
    50: 98,
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
    const sFactor = shade <= 100 ? 0.55 : shade >= 850 ? 0.7 : 1;
    const sv = Math.round(s * sFactor);
    palette[shade] = { h, s: sv, l, hex: hslToHex(h, sv, l) };
  });
  return palette;
}

// ─────────────────────────────────────────────────
//  SHADE PARAMS HTML BUILDER
// ─────────────────────────────────────────────────
function buildParamsHTML(shade, h, s, l, fmt) {
  const hex = hslToHex(h, s, l).toUpperCase();
  const [rv, gv, bv] = hexToRgbArr(hex);

  const formatSelect = `
    <select class="shade-format-select" id="shade-fmt-${shade}"
      onchange="onShadeFormatChange(${shade}, this.value)">
      <option value="HSL" ${fmt === "HSL" ? "selected" : ""}>HSL</option>
      <option value="HEX" ${fmt === "HEX" ? "selected" : ""}>HEX</option>
      <option value="RGB" ${fmt === "RGB" ? "selected" : ""}>RGB</option>
    </select>`;

  if (fmt === "HEX") {
    return `
      <input class="shade-param-input shade-hex-input" type="text"
        value="${hex}" id="shade-hexval-${shade}" maxlength="7"
        placeholder="#RRGGBB"
        oninput="onShadeHexInputChange(${shade}, this.value)"
      />
      ${formatSelect}`;
  }

  if (fmt === "RGB") {
    return `
      <span class="shade-param-label">R:</span>
      <input class="shade-param-input" type="number" min="0" max="255" value="${rv}"
        id="shade-r-${shade}" oninput="onShadeRGBChange(${shade})"/>
      <span class="shade-param-label">G:</span>
      <input class="shade-param-input" type="number" min="0" max="255" value="${gv}"
        id="shade-g-${shade}" oninput="onShadeRGBChange(${shade})"/>
      <span class="shade-param-label">B:</span>
      <input class="shade-param-input" type="number" min="0" max="255" value="${bv}"
        id="shade-b-${shade}" oninput="onShadeRGBChange(${shade})"/>
      ${formatSelect}`;
  }

  // Default: HSL
  return `
    <span class="shade-param-label">H:</span>
    <input class="shade-param-input" type="number" min="0" max="360" value="${h}"
      id="shade-h-${shade}" oninput="onShadeHSLChange(${shade})"/>
    <span class="shade-param-label">S:</span>
    <input class="shade-param-input" type="number" min="0" max="100" value="${s}"
      id="shade-s-${shade}" oninput="onShadeHSLChange(${shade})"/>
    <span class="shade-param-label">L:</span>
    <input class="shade-param-input" type="number" min="0" max="100" value="${l}"
      id="shade-l-${shade}" oninput="onShadeHSLChange(${shade})"/>
    ${formatSelect}`;
}

// ─────────────────────────────────────────────────
//  SHADE LIST RENDER
// ─────────────────────────────────────────────────
function renderShadeList(baseHex) {
  const list = document.getElementById("shade-list");
  const colorName = (colorNameInput.value.trim() || "Color").replace(
    /\s+$/,
    "",
  );

  if (!isValidHex(baseHex)) {
    list.innerHTML =
      '<div class="shade-empty-hint">Enter a valid HEX color above to preview shades.</div>';
    return;
  }

  const palette = generatePalette(baseHex);

  // Init shadeState from palette (only for shades not yet customised)
  SHADES.forEach((shade) => {
    if (!shadeState[shade]) {
      const p = palette[shade];
      shadeState[shade] = { h: p.h, s: p.s, l: p.l, format: "HSL" };
    }
  });

  // Render 950 → 50 (descending, darkest first)
  const shadeSorted = [...SHADES].sort((a, b) => b - a);

  list.innerHTML = shadeSorted
    .map((shade) => {
      const st = shadeState[shade];
      const { h, s, l, format: fmt } = st;
      const hex = hslToHex(h, s, l);
      const shadeName = `${colorName}-${shade}`;

      return `
      <div class="shade-item" data-shade="${shade}">
        <div class="shade-preview" id="prev-${shade}" style="background:${hex}"></div>
        <div class="shade-info">
          <input
            class="shade-name-input"
            type="text"
            value="${shadeName}"
            id="shade-name-${shade}"
            onblur="onShadeNameBlur(${shade}, this)"
          />
          <div class="shade-params-row" id="shade-params-${shade}">
            ${buildParamsHTML(shade, h, s, l, fmt)}
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// ─────────────────────────────────────────────────
//  SHADE INPUT HANDLERS
// ─────────────────────────────────────────────────
function onShadeHSLChange(shade) {
  const h = parseInt(document.getElementById("shade-h-" + shade).value) || 0;
  const s = parseInt(document.getElementById("shade-s-" + shade).value) || 0;
  const l = parseInt(document.getElementById("shade-l-" + shade).value) || 0;
  if (!shadeState[shade]) shadeState[shade] = { h, s, l, format: "HSL" };
  shadeState[shade].h = Math.max(0, Math.min(360, h));
  shadeState[shade].s = Math.max(0, Math.min(100, s));
  shadeState[shade].l = Math.max(0, Math.min(100, l));
  const hex = hslToHex(
    shadeState[shade].h,
    shadeState[shade].s,
    shadeState[shade].l,
  );
  document.getElementById("prev-" + shade).style.background = hex;
}

function onShadeHexInputChange(shade, val) {
  let v = val.trim();
  if (v && !v.startsWith("#")) v = "#" + v;
  if (!isValidHex(v)) return;
  const [h, s, l] = hexToHsl(v);
  if (!shadeState[shade]) shadeState[shade] = { h, s, l, format: "HEX" };
  shadeState[shade].h = Math.round(h);
  shadeState[shade].s = Math.round(s);
  shadeState[shade].l = Math.round(l);
  document.getElementById("prev-" + shade).style.background = v;
}

function onShadeRGBChange(shade) {
  const r = Math.min(
    255,
    Math.max(
      0,
      parseInt(document.getElementById("shade-r-" + shade).value) || 0,
    ),
  );
  const g = Math.min(
    255,
    Math.max(
      0,
      parseInt(document.getElementById("shade-g-" + shade).value) || 0,
    ),
  );
  const b = Math.min(
    255,
    Math.max(
      0,
      parseInt(document.getElementById("shade-b-" + shade).value) || 0,
    ),
  );
  const hexVal =
    "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  const [h, s, l] = hexToHsl(hexVal);
  if (!shadeState[shade])
    shadeState[shade] = {
      h: Math.round(h),
      s: Math.round(s),
      l: Math.round(l),
      format: "RGB",
    };
  shadeState[shade].h = Math.round(h);
  shadeState[shade].s = Math.round(s);
  shadeState[shade].l = Math.round(l);
  document.getElementById("prev-" + shade).style.background = hexVal;
}

function onShadeFormatChange(shade, fmt) {
  if (!shadeState[shade]) return;
  shadeState[shade].format = fmt;
  // Re-render only the params row for this shade
  const paramsRow = document.getElementById("shade-params-" + shade);
  if (!paramsRow) return;
  const { h, s, l } = shadeState[shade];
  paramsRow.innerHTML = buildParamsHTML(shade, h, s, l, fmt);
}

function onShadeNameBlur(shade, input) {
  input.value = input.value.replace(/[\s\W]+$/, "").trim();
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
    // Reset shade state so it re-derives from new base color
    shadeState = {};
    renderShadeList(hex);
  } else {
    renderShadeList("");
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

colorNameInput.addEventListener("input", () => {
  // Re-render shade names when color name changes
  const hex = hexInput.value.trim();
  if (isValidHex(hex)) renderShadeList(hex);
  validateColorForm();
});

colorNameInput.addEventListener("blur", () => {
  // Strip trailing spaces from the style name
  colorNameInput.value = colorNameInput.value.replace(/\s+$/, "");
  validateColorForm();
});

function validateColorForm() {
  const name = colorNameInput.value.trim();
  const hex = hexInput.value.trim();
  btnColors.disabled = !(name && isValidHex(hex));
}

// Init with default purple
updateColorUI("#7C6AF7");
hexInput.value = "#7C6AF7";

// ─────────────────────────────────────────────────
//  TYPOGRAPHY DATA
// ─────────────────────────────────────────────────
const TYPO_WEB = [
  { styleName: "Display/Large", size: 57, weight: 400, lh: 64, ls: -0.25 },
  { styleName: "Display/Medium", size: 45, weight: 400, lh: 52, ls: 0 },
  { styleName: "Heading/H1", size: 36, weight: 600, lh: 44, ls: 0 },
  { styleName: "Heading/H2", size: 28, weight: 600, lh: 36, ls: 0 },
  { styleName: "Heading/H3", size: 24, weight: 600, lh: 32, ls: 0 },
  { styleName: "Heading/H4", size: 20, weight: 600, lh: 28, ls: 0 },
  { styleName: "Heading/H5", size: 18, weight: 500, lh: 26, ls: 0 },
  { styleName: "Heading/H6", size: 16, weight: 500, lh: 24, ls: 0 },
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
  { styleName: "Caption/11/Regular", size: 11, weight: 400, lh: 16, ls: 0 },
  { styleName: "Caption/10/Regular", size: 10, weight: 400, lh: 14, ls: 0 },
];

const TYPO_MOBILE = [
  { styleName: "Display/34/SemiBold", size: 34, weight: 600, lh: 41, ls: 0 },
  { styleName: "Heading/H1", size: 28, weight: 600, lh: 34, ls: 0 },
  { styleName: "Heading/H2", size: 22, weight: 600, lh: 28, ls: 0 },
  { styleName: "Heading/H3", size: 20, weight: 600, lh: 25, ls: 0 },
  { styleName: "Body/16/Regular", size: 16, weight: 400, lh: 24, ls: 0 },
  { styleName: "Body/16/Medium", size: 16, weight: 500, lh: 24, ls: 0 },
  { styleName: "Body/16/SemiBold", size: 16, weight: 600, lh: 24, ls: 0 },
  { styleName: "Body/14/Regular", size: 14, weight: 400, lh: 20, ls: 0 },
  { styleName: "Body/14/Medium", size: 14, weight: 500, lh: 20, ls: 0 },
  { styleName: "Body/14/SemiBold", size: 14, weight: 600, lh: 20, ls: 0 },
  { styleName: "Body/12/Regular", size: 12, weight: 400, lh: 16, ls: 0 },
  { styleName: "Body/12/Medium", size: 12, weight: 500, lh: 16, ls: 0 },
  { styleName: "Body/12/SemiBold", size: 12, weight: 600, lh: 16, ls: 0 },
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
      <span>Style Path</span><span>Size</span><span>Weight</span><span>LH</span>
    </div>
    ${rows
      .map((r, i) => {
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
    list.innerHTML = '<div class="font-no-result">Font tidak ditemukan</div>';
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
  document.getElementById("font-display").style.color = "var(--text-primary)";
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

document.addEventListener("click", (e) => {
  if (!document.getElementById("font-search-wrap").contains(e.target)) {
    closeFontDropdown();
  }
});

// ─────────────────────────────────────────────────
//  GENERATE BUTTONS → postMessage to code.ts
// ─────────────────────────────────────────────────
btnColors.addEventListener("click", () => {
  // Strip trailing whitespace from style name before sending
  const name = colorNameInput.value.trim().replace(/\s+$/, "");
  const hex = hexInput.value.trim();

  // Collect per-shade hex from shadeState (user may have edited HSL)
  const shades = SHADES.map((s) => {
    const st = shadeState[s];
    return { shade: s, hex: st ? hslToHex(st.h, st.s, st.l) : hex };
  });

  btnColors.disabled = true;
  btnColors.textContent = "Generating…";

  parent.postMessage(
    { pluginMessage: { type: "generate-colors", colorName: name, shades } },
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

// ─────────────────────────────────────────────────
//  SPACING CHECKER
// ─────────────────────────────────────────────────
(function () {
  let spHasSelection = false;
  let spResults = [];
  let gridRule = 8; // default 8px

  // Grid toggle
  window.setGridRule = function (px) {
    gridRule = px;
    document.getElementById("grid-btn-4").classList.toggle("active", px === 4);
    document.getElementById("grid-btn-8").classList.toggle("active", px === 8);
    // Reset results so user re-scans with new rule
    document.getElementById("spacing-results").style.display = "none";
    document.getElementById("spacing-empty-state").style.display = "flex";
    document.getElementById("btn-scan-empty").style.display = "flex";
    document
      .getElementById("spacing-empty-state")
      .querySelector(".spacing-empty-title").textContent =
      "Select a frame to start";
    document
      .getElementById("spacing-empty-state")
      .querySelector(".spacing-empty-desc").innerHTML =
      `Select any frame or container, then click <strong>Scan Frame</strong> to detect spacing issues.`;
  };

  // Both scan buttons (empty-state one + action-bar one)
  const btnScanEmpty = document.getElementById("btn-scan-empty");
  const btnScan = document.getElementById("btn-scan"); // inside results action bar
  const btnFixAll = document.getElementById("btn-fix-all");
  const spEmptyState = document.getElementById("spacing-empty-state");
  const spResultsEl = document.getElementById("spacing-results");
  const spStatusDot = document.getElementById("spacing-status-dot");
  const spStatusText = document.getElementById("spacing-status-text");
  const spSummaryEl = document.getElementById("spacing-summary");
  const spListIssues = document.getElementById("spacing-list-issues");
  const spBadgeIssues = document.getElementById("spacing-badge-issues");
  const spEmptyIssues = document.getElementById("spacing-empty-issues");

  function truncate(str, max = 20) {
    return str.length > max ? str.slice(0, max - 1) + "…" : str;
  }

  function sendScan() {
    parent.postMessage(
      { pluginMessage: { type: "scan", grid: gridRule } },
      "*",
    );
  }
  function sendFocus(a, b) {
    parent.postMessage(
      { pluginMessage: { type: "focus", fromId: a, toId: b } },
      "*",
    );
  }
  function sendFix(pId, val) {
    parent.postMessage(
      { pluginMessage: { type: "fix", parentId: pId, suggestedValue: val } },
      "*",
    );
  }
  function sendCheckSelection() {
    parent.postMessage({ pluginMessage: { type: "check-selection" } }, "*");
  }

  // Fix all auto-layout issues at once
  function sendFixAll() {
    const issues = spResults.filter(
      (r) => !r.isValid && r.source === "auto-layout",
    );
    if (issues.length === 0) return;
    btnFixAll.disabled = true;
    btnFixAll.textContent = "Fixing…";
    issues.forEach((r) => sendFix(r.parentId, r.suggestedValue));
  }

  function setScanButtonsDisabled(disabled) {
    btnScanEmpty.disabled = disabled;
    btnScan.disabled = disabled;
  }

  function updateSelectionStatus(active, count) {
    spHasSelection = active;
    setScanButtonsDisabled(!active);
    if (active) {
      spStatusDot.classList.add("active");
      spStatusText.textContent =
        count === 1 ? "1 frame selected" : `${count} frames selected`;
    } else {
      spStatusDot.classList.remove("active");
      spStatusText.textContent = "No selection — select a frame first";
    }
  }

  function renderSpacingItem(record, isIssue) {
    const div = document.createElement("div");
    div.className = `spacing-item ${isIssue ? "is-issue" : "is-valid"}`;

    const srcLabel = record.source === "auto-layout" ? "AUTO" : "MANUAL";
    const srcClass = record.source === "auto-layout" ? "" : "manual";

    const valueHTML = record.isValid
      ? `<span class="sp-value-pill valid">${record.spacing}px</span>`
      : `<span class="sp-value-pill invalid">${record.spacing}px</span><span class="sp-value-arrow">→</span><span class="sp-value-suggest">${record.suggestedValue}px</span>`;

    const focusBtn = `<button class="btn-sp-action btn-sp-focus">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 3.5V1.5A.5.5 0 0 1 1.5 1H3.5M6.5 1H8.5A.5.5 0 0 1 9 1.5V3.5M9 6.5V8.5A.5.5 0 0 1 8.5 9H6.5M3.5 9H1.5A.5.5 0 0 1 1 8.5V6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>Focus</button>`;

    let actionBtn = "";
    if (record.source === "auto-layout" && isIssue) {
      actionBtn = `<button class="btn-sp-action btn-sp-fix" data-parent-id="${record.parentId}" data-suggested="${record.suggestedValue}">✦ Fix to ${record.suggestedValue}px</button>`;
    } else if (isIssue) {
      actionBtn = `<button class="btn-sp-action btn-sp-suggestion" disabled>Suggestion only</button>`;
    }

    div.innerHTML = `
      <div class="sp-item-top">
        <div class="sp-item-meta">
          <span class="sp-badge-source ${srcClass}">${srcLabel}</span>
          <span class="sp-badge-axis">${record.axis}</span>
        </div>
        <div class="sp-item-value">${valueHTML}</div>
      </div>
      <div class="sp-item-layers">
        <span class="sp-layer-name" title="${record.fromName}">${truncate(record.fromName)}</span>
        <span class="sp-layer-sep">→</span>
        <span class="sp-layer-name" title="${record.toName}">${truncate(record.toName)}</span>
      </div>
      <div class="sp-item-actions">${focusBtn}${actionBtn}</div>
    `;

    div
      .querySelector(".btn-sp-focus")
      .addEventListener("click", () => sendFocus(record.fromId, record.toId));

    const fixBtn = div.querySelector(".btn-sp-fix");
    if (fixBtn) {
      fixBtn.addEventListener("click", () =>
        sendFix(record.parentId, record.suggestedValue),
      );
    }

    return div;
  }

  function renderSpacingResults(records, grid) {
    spResults = records;
    const issues = records.filter((r) => !r.isValid);
    const fixableIssues = issues.filter((r) => r.source === "auto-layout");
    const g = grid || gridRule;

    spEmptyState.style.display = "none";
    btnScanEmpty.style.display = "none"; // hide empty-state scan btn
    spResultsEl.style.display = "block";

    // Enable/disable Fix All based on fixable issues
    btnFixAll.disabled = fixableIssues.length === 0;
    if (fixableIssues.length > 0) {
      btnFixAll.innerHTML = `✦ Apply Fix to All`;
    } else {
      btnFixAll.innerHTML = `✔️ No Issues`;
    }

    spSummaryEl.innerHTML = `
      <div class="sp-stat-card">
        <div class="sp-stat-value ${issues.length > 0 ? "warn" : "success"}">${issues.length}</div>
        <div class="sp-stat-label">Off-Grid Issues</div>
      </div>
      <div class="sp-stat-card">
        <div style="display:flex;align-items:center;gap:6px">
          <div class="sp-stat-value" style="font-size:14px">${g}px</div>
          <div class="sp-stat-label" style="text-transform:none;font-size:11px">grid rule — scanned recursively</div>
        </div>
      </div>
    `;

    spBadgeIssues.textContent = issues.length;
    spBadgeIssues.className = `spacing-section-badge ${issues.length > 0 ? "badge-warn" : "badge-ok"}`;
    spListIssues.innerHTML = "";
    if (issues.length === 0) {
      spEmptyIssues.style.display = "block";
    } else {
      spEmptyIssues.style.display = "none";
      issues.forEach((r) =>
        spListIssues.appendChild(renderSpacingItem(r, true)),
      );
    }
  }

  const SCAN_ICON = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 4V2a1 1 0 0 1 1-1h2M9 1h2a1 1 0 0 1 1 1v2M12 9v2a1 1 0 0 1-1 1H9M4 12H2a1 1 0 0 1-1-1V9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.4"/></svg>`;

  function triggerScan() {
    setScanButtonsDisabled(true);
    btnScanEmpty.innerHTML = SCAN_ICON + " Scanning…";
    btnScan.innerHTML = SCAN_ICON + " Scanning…";
    sendScan();
  }

  btnScanEmpty.addEventListener("click", triggerScan);
  btnScan.addEventListener("click", triggerScan);
  btnFixAll.addEventListener("click", sendFixAll);

  // Piggyback on the existing onmessage handler
  const _originalOnMessage = window.onmessage;
  window.onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    if (msg.type === "scan-result") {
      setScanButtonsDisabled(!spHasSelection);
      btnScanEmpty.innerHTML = SCAN_ICON + " Scan Frame";
      btnScan.innerHTML = SCAN_ICON + " Select Frame";
      const usedGrid = msg.grid || gridRule;
      renderSpacingResults(msg.records, usedGrid);
    } else if (msg.type === "no-selection") {
      setScanButtonsDisabled(false);
      btnScanEmpty.innerHTML = SCAN_ICON + " Scan Frame";
      btnScan.innerHTML = SCAN_ICON + " Select Frame";
    } else if (msg.type === "selection-status") {
      updateSelectionStatus(msg.hasSelection, msg.count);
    } else if (msg.type === "fix-done") {
      const allFixBtns = document.querySelectorAll(
        `.btn-sp-fix[data-parent-id="${msg.parentId}"]`,
      );
      allFixBtns.forEach((b) => {
        b.classList.add("fixed");
        b.textContent = "✓ Fixed";
        b.disabled = true;
      });
      // Check if all fixable items are now fixed — update Fix All button
      const remaining = document.querySelectorAll(".btn-sp-fix:not(.fixed)");
      if (remaining.length === 0) {
        btnFixAll.disabled = true;
        btnFixAll.innerHTML = "✔️ All Fixed";
      }
      showToast("✓ Spacing fixed!", "success");
    } else if (msg.type === "focus-done") {
      // confirmed
    } else {
      if (_originalOnMessage) _originalOnMessage.call(window, event);
    }
  };

  sendCheckSelection();
})();
