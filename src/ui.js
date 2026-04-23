// -------------------------------------------------
//  STATE
// -------------------------------------------------
let currentPlatform = "Web";
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Per-shade editable state: { h, s, l, format }
let shadeState = {};

// -------------------------------------------------
//  SIDEBAR NAVIGATION
// -------------------------------------------------
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

// -------------------------------------------------
//  PLATFORM TOGGLE
// -------------------------------------------------
function setPlatform(p) {
  currentPlatform = p;
}

// -------------------------------------------------
//  COLOR UTILITIES
// -------------------------------------------------
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
  return "rgb(" + rv + ", " + gv + ", " + bv + ")";
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

// -------------------------------------------------
//  SHADE PARAMS HTML BUILDER
// -------------------------------------------------
function buildParamsHTML(shade, h, s, l, fmt) {
  const hex = hslToHex(h, s, l).toUpperCase();
  const [rv, gv, bv] = hexToRgbArr(hex);

  const formatSelect =
    '<select class="shade-format-select" id="shade-fmt-' +
    shade +
    '" onchange="onShadeFormatChange(' +
    shade +
    ', this.value)">' +
    '<option value="HSL" ' +
    (fmt === "HSL" ? "selected" : "") +
    ">HSL</option>" +
    '<option value="HEX" ' +
    (fmt === "HEX" ? "selected" : "") +
    ">HEX</option>" +
    '<option value="RGB" ' +
    (fmt === "RGB" ? "selected" : "") +
    ">RGB</option>" +
    "</select>";

  if (fmt === "HEX") {
    return (
      '<input class="shade-param-input shade-hex-input" type="text" value="' +
      hex +
      '" id="shade-hexval-' +
      shade +
      '" maxlength="7" placeholder="#RRGGBB" oninput="onShadeHexInputChange(' +
      shade +
      ', this.value)"/>' +
      formatSelect
    );
  }
  if (fmt === "RGB") {
    return (
      '<span class="shade-param-label">R:</span><input class="shade-param-input" type="number" min="0" max="255" value="' +
      rv +
      '" id="shade-r-' +
      shade +
      '" oninput="onShadeRGBChange(' +
      shade +
      ')"/>' +
      '<span class="shade-param-label">G:</span><input class="shade-param-input" type="number" min="0" max="255" value="' +
      gv +
      '" id="shade-g-' +
      shade +
      '" oninput="onShadeRGBChange(' +
      shade +
      ')"/>' +
      '<span class="shade-param-label">B:</span><input class="shade-param-input" type="number" min="0" max="255" value="' +
      bv +
      '" id="shade-b-' +
      shade +
      '" oninput="onShadeRGBChange(' +
      shade +
      ')"/>' +
      formatSelect
    );
  }
  // Default: HSL
  return (
    '<span class="shade-param-label">H:</span><input class="shade-param-input" type="number" min="0" max="360" value="' +
    h +
    '" id="shade-h-' +
    shade +
    '" oninput="onShadeHSLChange(' +
    shade +
    ')"/>' +
    '<span class="shade-param-label">S:</span><input class="shade-param-input" type="number" min="0" max="100" value="' +
    s +
    '" id="shade-s-' +
    shade +
    '" oninput="onShadeHSLChange(' +
    shade +
    ')"/>' +
    '<span class="shade-param-label">L:</span><input class="shade-param-input" type="number" min="0" max="100" value="' +
    l +
    '" id="shade-l-' +
    shade +
    '" oninput="onShadeHSLChange(' +
    shade +
    ')"/>' +
    formatSelect
  );
}

// -------------------------------------------------
//  SHADE LIST RENDERER
// -------------------------------------------------
function renderShadeList(hex) {
  const list = document.getElementById("shade-list");
  if (!hex || !isValidHex(hex)) {
    list.innerHTML = "";
    return;
  }

  const palette = generatePalette(hex);
  const name = document.getElementById("color-name").value.trim() || "Color";

  list.innerHTML = SHADES.map((shade) => {
    const { h, s, l } = palette[shade];
    if (!shadeState[shade]) shadeState[shade] = { h, s, l, format: "HSL" };
    const st = shadeState[shade];
    const previewColor = hslToHex(st.h, st.s, st.l);
    return (
      '<div class="shade-item" id="shade-row-' +
      shade +
      '">' +
      '<div class="shade-preview" id="prev-' +
      shade +
      '" style="background:' +
      previewColor +
      '"></div>' +
      '<div class="shade-info">' +
      '<div class="shade-label" style="font-size:13px; font-weight:500; margin-bottom:5px;">' +
      escapeHtml(name) +
      "/" +
      shade +
      "</div>" +
      '<div class="shade-params-row" id="shade-params-' +
      shade +
      '">' +
      buildParamsHTML(shade, st.h, st.s, st.l, st.format) +
      "</div></div></div>"
    );
  }).join("");
}

// -------------------------------------------------
//  SHADE INPUT HANDLERS
// -------------------------------------------------
function onShadeHSLChange(shade) {
  const h = parseInt(document.getElementById("shade-h-" + shade).value) || 0;
  const s = parseInt(document.getElementById("shade-s-" + shade).value) || 0;
  const l = parseInt(document.getElementById("shade-l-" + shade).value) || 0;
  if (!shadeState[shade]) shadeState[shade] = { h, s, l, format: "HSL" };
  shadeState[shade].h = Math.max(0, Math.min(360, h));
  shadeState[shade].s = Math.max(0, Math.min(100, s));
  shadeState[shade].l = Math.max(0, Math.min(100, l));
  document.getElementById("prev-" + shade).style.background = hslToHex(
    shadeState[shade].h,
    shadeState[shade].s,
    shadeState[shade].l,
  );
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
  const paramsRow = document.getElementById("shade-params-" + shade);
  if (!paramsRow) return;
  const { h, s, l } = shadeState[shade];
  paramsRow.innerHTML = buildParamsHTML(shade, h, s, l, fmt);
}

// -------------------------------------------------
//  COLOR INPUT HANDLERS
// -------------------------------------------------
const hexInput = document.getElementById("hex-input");
const colorPicker = document.getElementById("color-picker");
const swatch = document.getElementById("swatch");
const colorNameInput = document.getElementById("color-name");
const btnColors = document.getElementById("btn-generate-colors");

function updateColorUI(hex) {
  if (isValidHex(hex)) {
    swatch.style.background = hex;
    colorPicker.value = hex;
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
  const hex = hexInput.value.trim();
  if (isValidHex(hex)) renderShadeList(hex);
  validateColorForm();
});

colorNameInput.addEventListener("blur", () => {
  colorNameInput.value = colorNameInput.value.replace(/\s+$/, "");
  validateColorForm();
});

function validateColorForm() {
  const name = colorNameInput.value.trim();
  const hex = hexInput.value.trim();
  btnColors.disabled = !(name && isValidHex(hex));
}

updateColorUI("#7C6AF7");
hexInput.value = "#7C6AF7";

// -------------------------------------------------
//  TYPOGRAPHY BUILDER -- STATE
// -------------------------------------------------
let typoGroups = [];
let _idCounter = 0;

function generateId(prefix) {
  return prefix + "-" + Date.now() + "-" + ++_idCounter;
}

function getStyleOutputName(group, style) {
  if (style.customName && style.customName.trim()) {
    return group.name + "/" + style.customName.trim();
  }
  return group.name + "/" + style.size + " " + (style.style || "Regular");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -- Group operations --
function addGroup() {
  try {
    const group = {
      id: generateId("g"),
      name: "New Group",
      styles: [
        {
          id: generateId("s"),
          size: 16,
          lineHeight: "auto",
          style: "Regular",
          letterSpacing: 0,
          customName: "",
        },
      ],
    };
    typoGroups.push(group);
    renderGroups();
    renderPreview();
    setTimeout(function () {
      const input = document.getElementById("group-name-" + group.id);
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  } catch (e) {
    showToast("Error adding group: " + String(e), "error");
  }
}

function deleteGroup(groupId) {
  typoGroups = typoGroups.filter(function (g) {
    return g.id !== groupId;
  });
  renderGroups();
  renderPreview();
}

function renameGroup(groupId, name) {
  const group = typoGroups.find(function (g) {
    return g.id === groupId;
  });
  if (group) group.name = name;
  renderPreview();
}

// -- Style operations --
function addStyle(groupId) {
  const group = typoGroups.find(function (g) {
    return g.id === groupId;
  });
  if (!group) return;
  const last = group.styles[group.styles.length - 1];
  const style = {
    id: generateId("s"),
    size: last ? last.size : 16,
    lineHeight: last ? last.lineHeight : "auto",
    style: last ? last.style : "Regular",
    letterSpacing: 0,
    customName: "",
  };
  group.styles.push(style);
  renderGroups();
  renderPreview();
}

function duplicateStyle(groupId, styleId) {
  const group = typoGroups.find(function (g) {
    return g.id === groupId;
  });
  if (!group) return;
  const idx = group.styles.findIndex(function (s) {
    return s.id === styleId;
  });
  if (idx === -1) return;
  const copy = Object.assign({}, group.styles[idx], { id: generateId("s") });
  group.styles.splice(idx + 1, 0, copy);
  renderGroups();
  renderPreview();
}

function deleteStyle(groupId, styleId) {
  const group = typoGroups.find(function (g) {
    return g.id === groupId;
  });
  if (!group) return;
  group.styles = group.styles.filter(function (s) {
    return s.id !== styleId;
  });
  renderGroups();
  renderPreview();
}

function validateLineHeight(groupId, styleId, value) {
  const group = typoGroups.find(function (g) { return g.id === groupId; });
  if (!group) return;
  const style = group.styles.find(function (s) { return s.id === styleId; });
  if (!style) return;

  const raw = String(value).trim();
  let finalVal = "auto";
  
  if (raw.endsWith('%')) {
    const num = parseFloat(raw.replace('%', ''));
    if (!isNaN(num)) {
      finalVal = num + '%';
    }
  } else if (raw.toLowerCase() !== 'auto') {
    const num = parseFloat(raw);
    if (!isNaN(num)) {
      finalVal = String(num);
    }
  }
  
  style.lineHeight = finalVal;
  renderGroups();
  renderPreview();
}

function updateStyleField(groupId, styleId, field, value) {
  const group = typoGroups.find(function (g) {
    return g.id === groupId;
  });
  if (!group) return;
  const style = group.styles.find(function (s) {
    return s.id === styleId;
  });
  if (!style) return;
  if (field === "size") {
    style[field] = parseInt(value) || 0;
  } else if (field === "letterSpacing") {
    style[field] = parseFloat(value) || 0;
  } else if (field === "lineHeight") {
    style[field] = value;
  } else if (field === "style") {
    style[field] = value;
  } else {
    style[field] = value;
  }
  renderPreview();
}

// -- Render groups --
function renderGroups() {
  const container = document.getElementById("typo-groups-list");
  if (!container) return;
  if (typoGroups.length === 0) {
    container.innerHTML =
      '<div style="text-align:center;padding:20px 0;color:var(--text-muted);font-size:11px;">No groups yet</div>';
    return;
  }
  container.innerHTML = typoGroups
    .map(function (group) {
      const colHeader =
        group.styles.length > 0
          ? '<div class="typo-styles-cols-header"><span>Size</span><span>Line H.</span><span>Weight</span><span>Name (opt.)</span><span></span></div>'
          : "";
      const emptyRow =
        group.styles.length === 0
          ? '<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:8px 0;">No styles &mdash; click Add Style</div>'
          : "";
      return (
        '<div class="typo-group" id="group-' +
        group.id +
        '">' +
        '<div class="typo-group-header">' +
        '<div class="typo-group-title-row">' +
        '<span class="typo-group-drag">&#8943;</span>' +
        '<input class="typo-group-name-input" id="group-name-' +
        group.id +
        '" type="text" value="' +
        escapeHtml(group.name) +
        '" placeholder="Group name" oninput="renameGroup(\'' +
        group.id +
        "', this.value)\"/>" +
        "</div>" +
        '<div class="typo-group-actions">' +
        '<button class="btn-typo-group-action btn-add-style" onclick="addStyle(\'' +
        group.id +
        '\')" title="Add style">' +
        '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> Add Style</button>' +
        '<button class="btn-typo-group-action btn-delete-group" onclick="deleteGroup(\'' +
        group.id +
        '\')" title="Delete group">' +
        '<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M4 3V2h4v1M5 6v3M7 6v3M2 3l.7 7.3a.7.7 0 0 0 .7.7h5.2a.7.7 0 0 0 .7-.7L10 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</button></div></div>" +
        '<div class="typo-styles-list">' +
        colHeader +
        group.styles
          .map(function (style) {
            return renderStyleRow(group.id, style);
          })
          .join("") +
        emptyRow +
        "</div></div>"
      );
    })
    .join("");
}

function renderStyleRow(groupId, style) {
  let styleInput = "";
  let currentStyle = style.style || "Regular";
  if (isCustomFontMode) {
    styleInput =
      '<input class="typo-input typo-input-name" type="text" value="' +
      escapeHtml(currentStyle) +
      '" title="Font style" oninput="updateStyleField(\'' +
      groupId +
      "', '" +
      style.id +
      "', 'style', this.value)\"/>";
  } else {
    const styleOptions = availableFontStyles
      .map(function (w) {
        return (
          '<option value="' +
          escapeHtml(w) +
          '" ' +
          (currentStyle === w ? "selected" : "") +
          ">" +
          escapeHtml(w) +
          "</option>"
        );
      })
      .join("");
    styleInput =
      '<select class="typo-select" title="Font style" onchange="updateStyleField(\'' +
      groupId +
      "', '" +
      style.id +
      "', 'style', this.value)\">" +
      styleOptions +
      "</select>";
  }

  return (
    '<div class="typo-style-row" id="style-' +
    style.id +
    '">' +
    '<input class="typo-input typo-input-num" type="number" value="' +
    style.size +
    '" min="8" max="200" title="Font size (px)" oninput="updateStyleField(\'' +
    groupId +
    "','" +
    style.id +
    "','size',this.value)\"/>" +
    '<input class="typo-input typo-input-num" type="text" value="' +
    escapeHtml(style.lineHeight) +
    '" title="Line height (px, %, auto)" ' +
    'oninput="updateStyleField(\'' + groupId + '\',\'' + style.id + '\',\'lineHeight\',this.value)" ' +
    'onchange="validateLineHeight(\'' + groupId + '\',\'' + style.id + '\',this.value)"/>' +
    styleInput +
    '<input class="typo-input typo-input-name" type="text" value="' +
    escapeHtml(style.customName || "") +
    '" placeholder="e.g. Large" title="Custom name (optional)" oninput="updateStyleField(\'' +
    groupId +
    "','" +
    style.id +
    "','customName',this.value)\"/>" +
    '<div class="typo-style-actions">' +
    '<button class="btn-style-action btn-style-dupe" title="Duplicate" onclick="duplicateStyle(\'' +
    groupId +
    "','" +
    style.id +
    "')\">" +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1H9.5A1.5 1.5 0 0 1 11 2.5V6.5A1.5 1.5 0 0 1 9.5 8H8" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
    '<button class="btn-style-action btn-style-delete" title="Delete" onclick="deleteStyle(\'' +
    groupId +
    "','" +
    style.id +
    "')\">" +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M3.5 3V2h5v1M4.5 5.5v3M7.5 5.5v3M2 3l.6 6.3a.7.7 0 0 0 .7.7h5.4a.7.7 0 0 0 .7-.7L10 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    "</div></div>"
  );
}

// -- Render preview --
function renderPreview() {
  const list = document.getElementById("typo-preview-list");
  if (!list) return;

  const allItems = [];
  typoGroups.forEach(function (group) {
    if (!group.name.trim() || group.styles.length === 0) return;
    group.styles.forEach(function (style) {
      allItems.push({
        groupName: group.name,
        name: getStyleOutputName(group, style),
      });
    });
  });

  if (allItems.length === 0) {
    list.innerHTML =
      '<div class="typo-preview-empty">Add groups and styles above to see the output preview.</div>';
    return;
  }

  const byGroup = new Map();
  allItems.forEach(function (item) {
    if (!byGroup.has(item.groupName)) byGroup.set(item.groupName, []);
    byGroup.get(item.groupName).push(item.name);
  });

  list.innerHTML = Array.from(byGroup.entries())
    .map(function (entry, index) {
      const names = entry[1];
      const displayLabel = "Group " + (index + 1);
      return (
        '<div class="typo-preview-group">' +
        '<div class="typo-preview-group-label">' +
        escapeHtml(displayLabel) +
        "</div>" +
        names
          .map(function (name) {
            return (
              '<div class="typo-preview-item"><span class="typo-preview-path">' +
              escapeHtml(name) +
              "</span></div>"
            );
          })
          .join("") +
        "</div>"
      );
    })
    .join("");

  // Update generate button state
  validateGenerateBtn();
}

// -------------------------------------------------
//  GOOGLE FONTS LIST
// -------------------------------------------------
let FIGMA_FONTS = [];

// -------------------------------------------------
//  FONT DROPDOWN LOGIC
// -------------------------------------------------

let isCustomFontMode = false;
let customFontFamily = "";

function toggleCustomFontMode(checked) {
  isCustomFontMode = checked;
  document.getElementById("standard-font-picker").style.display = checked
    ? "none"
    : "block";
  document.getElementById("custom-font-picker").style.display = checked
    ? "block"
    : "none";

  // Re-render rows to swap style inputs
  renderGroups();
  renderPreview();
  validateGenerateBtn();
}

function onCustomFontFamilyChange(val) {
  customFontFamily = val;
  validateGenerateBtn();
}

let selectedFont = "";
let dropdownOpen = false;
let availableFontStyles = ["Regular", "Medium", "Bold"];
let currentFontItems = [];
let fontFocusIndex = -1;
const btnTypo = document.getElementById("btn-generate-typo");

function updateFontFocusUI() {
  const items = document.querySelectorAll("#font-list .font-item");
  items.forEach(function (item, idx) {
    if (idx === fontFocusIndex) {
      item.classList.add("focused");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("focused");
    }
  });
}

function handleFontSearchKey(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (fontFocusIndex < currentFontItems.length - 1) {
      fontFocusIndex++;
      updateFontFocusUI();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (fontFocusIndex > 0) {
      fontFocusIndex--;
      updateFontFocusUI();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (fontFocusIndex >= 0 && fontFocusIndex < currentFontItems.length) {
      selectFont(currentFontItems[fontFocusIndex].name);
    } else if (currentFontItems.length === 1) {
      selectFont(currentFontItems[0].name);
    }
  }
}

function renderFontList(filter) {
  filter = filter || "";
  const list = document.getElementById("font-list");
  const filtered = filter
    ? FIGMA_FONTS.filter(function (f) {
        return f.name.toLowerCase().includes(filter.toLowerCase());
      })
    : FIGMA_FONTS;

  currentFontItems = filtered;
  fontFocusIndex = -1;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="font-no-result">Font tidak ditemukan</div>';
    return;
  }
  list.innerHTML = filtered
    .map(function (f) {
      return (
        '<div class="font-item ' +
        (selectedFont === f.name ? "selected" : "") +
        '" onclick="selectFont(\'' +
        f.name +
        "')\">" +
        "<span>" +
        f.name +
        '</span><span class="font-category">' +
        f.cat +
        "</span></div>"
      );
    })
    .join("");
}

function toggleFontDropdown() {
  dropdownOpen = !dropdownOpen;
  const dropdown = document.getElementById("font-dropdown");
  const chevron = document.getElementById("font-chevron");
  const trigger = document.getElementById("font-trigger");
  chevron.classList.toggle("open", dropdownOpen);
  if (dropdownOpen) {
    // Position the fixed dropdown relative to the trigger element
    const rect = trigger.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 4 + "px";
    dropdown.style.left = rect.left + "px";
    dropdown.style.width = rect.width + "px";
    dropdown.style.display = "block";
    setTimeout(function () {
      document.getElementById("font-search").focus();
    }, 50);
    renderFontList();
  } else {
    dropdown.style.display = "none";
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

  // Update available styles based on the selected font
  const found = FIGMA_FONTS.find(function (f) {
    return f.name === name;
  });
  availableFontStyles =
    found && found.styles && found.styles.length > 0
      ? found.styles
      : ["Regular"];

  // Clamp existing style rows to available styles
  typoGroups.forEach(function (group) {
    group.styles.forEach(function (s) {
      if (!availableFontStyles.includes(s.style)) {
        s.style = availableFontStyles[0];
      }
    });
  });
  renderGroups();
  renderPreview();
  validateGenerateBtn();
}

function closeFontDropdown() {
  dropdownOpen = false;
  const dropdown = document.getElementById("font-dropdown");
  const chevron = document.getElementById("font-chevron");
  if (dropdown) dropdown.style.display = "none";
  if (chevron) chevron.classList.remove("open");
}

document.addEventListener("click", function (e) {
  const wrap = document.getElementById("font-search-wrap");
  const dropdown = document.getElementById("font-dropdown");
  if (
    wrap &&
    !wrap.contains(e.target) &&
    dropdown &&
    !dropdown.contains(e.target)
  ) {
    closeFontDropdown();
  }
});

// -------------------------------------------------
//  GENERATE BUTTONS
// -------------------------------------------------
btnColors.addEventListener("click", function () {
  const name = colorNameInput.value.trim().replace(/\s+$/, "");
  const hex = hexInput.value.trim();
  const shades = SHADES.map(function (s) {
    const st = shadeState[s];
    return { shade: s, hex: st ? hslToHex(st.h, st.s, st.l) : hex };
  });
  btnColors.disabled = true;
  btnColors.textContent = "Generating...";
  parent.postMessage(
    {
      pluginMessage: {
        type: "generate-colors",
        colorName: name,
        shades: shades,
      },
    },
    "*",
  );
});

btnTypo.addEventListener("click", function () {
  const fontToUse = isCustomFontMode ? customFontFamily.trim() : selectedFont;
  if (!fontToUse) {
    showToast("Please select or enter a font first.", "error");
    return;
  }
  const activeGroups = typoGroups.filter(function (g) {
    return g.name.trim() && g.styles.length > 0;
  });
  if (activeGroups.length === 0) {
    showToast("Add at least one group with styles.", "error");
    return;
  }
  btnTypo.disabled = true;
  btnTypo.textContent = "Generating...";
  parent.postMessage(
    {
      pluginMessage: {
        type: "generate-typography",
        isCustomFont: isCustomFontMode,
        fontFamily: fontToUse,
        platform: currentPlatform,
        groups: activeGroups,
      },
    },
    "*",
  );
});

// -------------------------------------------------
//  RECEIVE MESSAGES FROM code.js
// -------------------------------------------------
function snapToAvailable(w, list) {
  if (!list || list.length === 0) return w;
  return list.reduce(function (prev, curr) {
    return Math.abs(curr - w) < Math.abs(prev - w) ? curr : prev;
  });
}

window.onmessage = function (event) {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === "colors-done") {
    btnColors.disabled = false;
    btnColors.innerHTML = "&#10022; Generate &amp; Save to Styles";
    showToast(msg.count + " color styles saved!", "success");
  } else if (msg.type === "typography-done") {
    btnTypo.disabled = false;
    btnTypo.innerHTML = "&#10022; Generate Styles";
    showToast(msg.count + " text styles saved!", "success");
  } else if (msg.type === "available-fonts") {
    FIGMA_FONTS = msg.fonts || [];
    renderFontList();
  } else if (msg.type === "error") {
    btnColors.disabled = false;
    btnColors.innerHTML = "&#10022; Generate &amp; Save to Styles";
    btnTypo.disabled = false;
    btnTypo.innerHTML = "&#10022; Generate Styles";
    validateColorForm();
    showToast(msg.message, "error");
  }
};

// -------------------------------------------------
//  TOAST
// -------------------------------------------------
let toastTimer;
function showToast(msg, type) {
  type = type || "success";
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast " + type;
  clearTimeout(toastTimer);
  requestAnimationFrame(function () {
    toast.classList.add("show");
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 3000);
  });
}

// -------------------------------------------------
//  INIT
// -------------------------------------------------
renderGroups();
renderPreview();

// -------------------------------------------------
//  SPACING CHECKER
// -------------------------------------------------
(function () {
  let spHasSelection = false;
  let spResults = [];
  let radiusResults = [];
  let currentFilter = "margin";
  let gridRule = 8;

  let checkState = { margin: true, radius: false };

  window.setCheckerType = function (type) {
    const isNowActive = !checkState[type];

    // Prevent unchecking the last active checker
    if (!isNowActive && !checkState[type === "margin" ? "radius" : "margin"]) {
      return;
    }

    checkState[type] = isNowActive;
    document
      .getElementById("checker-btn-" + type)
      .classList.toggle("active", isNowActive);

    updateEmptyStateIcon();
  };

  function updateEmptyStateIcon() {
    const iconContainer = document.getElementById("spacing-empty-icon");
    if (!iconContainer) return;

    if (checkState.margin && checkState.radius) {
      iconContainer.innerHTML =
        '<svg width="44" height="44" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3.5 2.5"/></svg>';
    } else if (checkState.margin) {
      iconContainer.innerHTML =
        '<svg width="44" height="44" viewBox="0 0 48 48" fill="none"><rect x="4" y="4" width="40" height="40" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3.5 2.5"/><line x1="4" y1="24" x2="44" y2="24" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/><line x1="24" y1="4" x2="24" y2="44" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/></svg>';
    } else if (checkState.radius) {
      iconContainer.innerHTML =
        '<svg width="44" height="44" viewBox="0 0 48 48" fill="none"><rect x="8" y="8" width="32" height="32" rx="12" stroke="currentColor" stroke-width="2"/></svg>';
    }
  }

  window.setIssueFilter = function (type) {
    currentFilter = type;
    document
      .getElementById("filter-margin")
      .classList.toggle("active", type === "margin");
    document
      .getElementById("filter-radius")
      .classList.toggle("active", type === "radius");
    if (spResultsEl.style.display === "block") {
      renderCurrentIssues();
    }
  };

  window.setGridRule = function (px) {
    gridRule = px;
    document.getElementById("grid-btn-4").classList.toggle("active", px === 4);
    document.getElementById("grid-btn-8").classList.toggle("active", px === 8);
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
      "Select any frame or container, then click <strong>Scan Frame</strong> to detect spacing issues.";
  };

  const btnScanEmpty = document.getElementById("btn-scan-empty");
  const btnScan = document.getElementById("btn-scan");
  const btnFixAll = document.getElementById("btn-fix-all");
  const spEmptyState = document.getElementById("spacing-empty-state");
  const spResultsEl = document.getElementById("spacing-results");
  const spStatusDot = document.getElementById("spacing-status-dot");
  const spStatusText = document.getElementById("spacing-status-text");
  const spSummaryEl = document.getElementById("spacing-summary");
  const spListIssues = document.getElementById("spacing-list-issues");
  const spBadgeIssues = document.getElementById("spacing-badge-issues");
  const spEmptyIssues = document.getElementById("spacing-empty-issues");

  function truncate(str, max) {
    max = max || 20;
    return str.length > max ? str.slice(0, max - 1) + "..." : str;
  }

  function sendScan() {
    parent.postMessage(
      { pluginMessage: { type: "scan", grid: gridRule, config: checkState } },
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
  function sendFixRadius(nodeId) {
    parent.postMessage(
      { pluginMessage: { type: "fix-radius", nodeId: nodeId, rule: gridRule } },
      "*",
    );
  }

  function sendCheckSelection() {
    parent.postMessage({ pluginMessage: { type: "check-selection" } }, "*");
  }

  function sendFixAll() {
    if (currentFilter === "radius") {
      const issues = radiusResults;
      if (issues.length === 0) return;
      btnFixAll.disabled = true;
      btnFixAll.textContent = "Fixing...";
      issues.forEach(function (r) {
        sendFixRadius(r.nodeId);
      });
    } else {
      const issues = spResults.filter(function (r) {
        return !r.isValid && r.source === "auto-layout";
      });
      if (issues.length === 0) return;
      btnFixAll.disabled = true;
      btnFixAll.textContent = "Fixing...";
      issues.forEach(function (r) {
        sendFix(r.parentId, r.suggestedValue);
      });
    }
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
        count === 1 ? "1 frame selected" : count + " frames selected";
    } else {
      spStatusDot.classList.remove("active");
      spStatusText.textContent = "No selection -- select a frame first";
    }
  }

  function renderSpacingItem(record, isIssue) {
    const div = document.createElement("div");
    div.className = "spacing-item " + (isIssue ? "is-issue" : "is-valid");

    const srcLabel = record.source === "auto-layout" ? "AUTO" : "MANUAL";
    const srcClass = record.source === "auto-layout" ? "" : "manual";

    const valueHTML = record.isValid
      ? '<span class="sp-value-pill valid">' + record.spacing + "px</span>"
      : '<span class="sp-value-pill invalid">' +
        record.spacing +
        'px</span><span class="sp-value-arrow">&#8594;</span><span class="sp-value-suggest">' +
        record.suggestedValue +
        "px</span>";

    const focusBtn =
      '<button class="btn-sp-action btn-sp-focus">' +
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none">' +
      '<path d="M1 3.5V1.5A.5.5 0 0 1 1.5 1H3.5M6.5 1H8.5A.5.5 0 0 1 9 1.5V3.5M9 6.5V8.5A.5.5 0 0 1 8.5 9H6.5M3.5 9H1.5A.5.5 0 0 1 1 8.5V6.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
      "</svg>Focus</button>";

    let actionBtn = "";
    if (record.source === "auto-layout" && isIssue) {
      actionBtn =
        '<button class="btn-sp-action btn-sp-fix" data-parent-id="' +
        record.parentId +
        '" data-suggested="' +
        record.suggestedValue +
        '">Fix to ' +
        record.suggestedValue +
        "px</button>";
    } else if (isIssue) {
      actionBtn =
        '<button class="btn-sp-action btn-sp-suggestion" disabled>Suggestion only</button>';
    }

    div.innerHTML =
      '<div class="sp-item-top">' +
      '<div class="sp-item-meta"><span class="sp-badge-source ' +
      srcClass +
      '">' +
      srcLabel +
      '</span><span class="sp-badge-axis">' +
      record.axis +
      "</span></div>" +
      '<div class="sp-item-value">' +
      valueHTML +
      "</div></div>" +
      '<div class="sp-item-layers">' +
      '<span class="sp-layer-name" title="' +
      record.fromName +
      '">' +
      truncate(record.fromName) +
      "</span>" +
      '<span class="sp-layer-sep">&#8594;</span>' +
      '<span class="sp-layer-name" title="' +
      record.toName +
      '">' +
      truncate(record.toName) +
      "</span>" +
      "</div>" +
      '<div class="sp-item-actions">' +
      focusBtn +
      actionBtn +
      "</div>";

    div.querySelector(".btn-sp-focus").addEventListener("click", function () {
      sendFocus(record.fromId, record.toId);
    });
    const fixBtn = div.querySelector(".btn-sp-fix");
    if (fixBtn)
      fixBtn.addEventListener("click", function () {
        sendFix(record.parentId, record.suggestedValue);
      });

    return div;
  }

  function renderRadiusItem(record) {
    const div = document.createElement("div");
    div.className = "spacing-item is-issue";

    let valueHTML = "";
    if (record.source === "single") {
      valueHTML +=
        '<span class="sp-value-pill invalid">' +
        record.value +
        'px</span><span class="sp-value-arrow">&#8594;</span><span class="sp-value-suggest">' +
        record.suggestedValue +
        "px</span>";
    } else {
      const corners = record.invalidCorners
        .map(function (c) {
          const crn = c.corner.replace("Radius", "");
          return crn + " " + c.value + "px \u2192 " + c.suggestedValue + "px";
        })
        .join(", ");
      valueHTML +=
        '<div class="sp-value-pill invalid" style="font-size:9px;white-space:normal;line-height:1.4">' +
        corners +
        "</div>";
    }

    const actionBtn =
      '<button class="btn-sp-action btn-sp-fix-radius" data-node-id="' +
      record.nodeId +
      '">Fix to ' +
      record.rule +
      "px Rule</button>";

    div.innerHTML =
      '<div class="sp-item-top">' +
      '<div class="sp-item-meta"><span class="sp-badge-source">RADIUS</span><span class="sp-badge-axis">' +
      record.source +
      "</span></div>" +
      '<div class="sp-item-value">' +
      valueHTML +
      "</div></div>" +
      '<div class="sp-item-layers">' +
      '<span class="sp-layer-name" title="' +
      record.nodeName +
      '">' +
      truncate(record.nodeName) +
      "</span>" +
      '<span class="sp-layer-sep">-</span>' +
      '<span class="sp-layer-name" style="color:var(--text-muted)">' +
      record.nodeType +
      "</span>" +
      "</div>" +
      '<div class="sp-item-actions">' +
      actionBtn +
      "</div>";

    const fixBtn = div.querySelector(".btn-sp-fix-radius");
    if (fixBtn) {
      fixBtn.addEventListener("click", function () {
        sendFixRadius(record.nodeId);
      });
    }

    return div;
  }

  function renderCurrentIssues() {
    const isRadius = currentFilter === "radius";
    document.getElementById("spacing-section-title").textContent = isRadius
      ? "Radius Issues"
      : "Margin Issues";

    let issues = [];
    if (isRadius) {
      issues = radiusResults;
      btnFixAll.innerHTML = "✦ Fix Radius Issues";
      btnFixAll.disabled = issues.length === 0;
    } else {
      issues = spResults.filter(function (r) {
        return !r.isValid;
      });
      const fixable = issues.filter(function (r) {
        return r.source === "auto-layout";
      });
      btnFixAll.innerHTML = "✦ Fix Margin Issues";
      btnFixAll.disabled = fixable.length === 0;
    }

    if (issues.length === 0) {
      btnFixAll.innerHTML = "No Issues";
      btnFixAll.disabled = true;
    }

    spBadgeIssues.textContent = issues.length;
    spBadgeIssues.className =
      "spacing-section-badge " +
      (issues.length > 0 ? "badge-warn" : "badge-ok");
    spSummaryEl.innerHTML =
      '<div class="sp-stat-card"><div class="sp-stat-value ' +
      (issues.length > 0 ? "warn" : "success") +
      '">' +
      issues.length +
      '</div><div class="sp-stat-label">Total Issues</div></div>' +
      '<div class="sp-stat-card"><div style="display:flex;align-items:center;gap:6px"><div class="sp-stat-value" style="font-size:14px">' +
      gridRule +
      'px</div><div class="sp-stat-label" style="text-transform:none;font-size:11px">grid rule</div></div></div>';

    spListIssues.innerHTML = "";
    if (issues.length === 0) {
      spEmptyIssues.style.display = "block";
      spEmptyIssues.textContent = isRadius
        ? "✓ All radius values are valid"
        : "✓ All margin values are on the grid";
    } else {
      spEmptyIssues.style.display = "none";
      issues.forEach(function (r) {
        if (isRadius) spListIssues.appendChild(renderRadiusItem(r));
        else spListIssues.appendChild(renderSpacingItem(r, true));
      });
    }
  }

  function renderAllIssues(records, rRecords, grid) {
    spResults = records;
    radiusResults = rRecords;

    // Choose which filter is active based on config and issues found
    if (checkState.margin && !checkState.radius) {
      currentFilter = "margin";
    } else if (!checkState.margin && checkState.radius) {
      currentFilter = "radius";
    } else if (checkState.margin && checkState.radius) {
      const hasMarginIssues = spResults.some(function (r) {
        return !r.isValid;
      });
      if (hasMarginIssues && radiusResults.length === 0) {
        currentFilter = "margin";
      } else if (!hasMarginIssues && radiusResults.length > 0) {
        currentFilter = "radius";
      } else {
        currentFilter = "margin"; // Default
      }
    }

    document.getElementById("filter-margin").style.display = checkState.margin
      ? ""
      : "none";
    document.getElementById("filter-radius").style.display = checkState.radius
      ? ""
      : "none";

    document
      .getElementById("filter-margin")
      .classList.toggle("active", currentFilter === "margin");
    document
      .getElementById("filter-radius")
      .classList.toggle("active", currentFilter === "radius");

    spEmptyState.style.display = "none";
    btnScanEmpty.style.display = "none";
    spResultsEl.style.display = "block";

    renderCurrentIssues();
  }

  const SCAN_ICON =
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 4V2a1 1 0 0 1 1-1h2M9 1h2a1 1 0 0 1 1 1v2M12 9v2a1 1 0 0 1-1 1H9M4 12H2a1 1 0 0 1-1-1V9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="6.5" cy="6.5" r="2" stroke="currentColor" stroke-width="1.4"/></svg>';

  function triggerScan() {
    setScanButtonsDisabled(true);
    btnScanEmpty.innerHTML = SCAN_ICON + " Scanning...";
    btnScan.innerHTML = SCAN_ICON + " Scanning...";
    sendScan();
  }

  btnScanEmpty.addEventListener("click", triggerScan);
  btnScan.addEventListener("click", triggerScan);
  btnFixAll.addEventListener("click", sendFixAll);

  const _originalOnMessage = window.onmessage;
  window.onmessage = function (event) {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    if (msg.type === "scan-result") {
      setScanButtonsDisabled(!spHasSelection);
      btnScanEmpty.innerHTML = SCAN_ICON + " Scan Frame";
      btnScan.innerHTML = SCAN_ICON + " Select Frame";
      renderAllIssues(msg.records, msg.radiusIssues, msg.grid || gridRule);
    } else if (msg.type === "no-selection") {
      setScanButtonsDisabled(false);
      btnScanEmpty.innerHTML = SCAN_ICON + " Scan Frame";
      btnScan.innerHTML = SCAN_ICON + " Select Frame";
    } else if (msg.type === "selection-status") {
      updateSelectionStatus(msg.hasSelection, msg.count);
    } else if (msg.type === "fix-done") {
      const allFixBtns = document.querySelectorAll(
        '.btn-sp-fix[data-parent-id="' + msg.parentId + '"]',
      );
      allFixBtns.forEach(function (b) {
        b.classList.add("fixed");
        b.textContent = "Fixed";
        b.disabled = true;
      });
      const remaining = document.querySelectorAll(".btn-sp-fix:not(.fixed)");
      if (remaining.length === 0) {
        btnFixAll.disabled = true;
        btnFixAll.innerHTML = "All Fixed";
      }
      showToast("Spacing fixed!", "success");
    } else if (msg.type === "fix-radius-done") {
      const allFixBtns = document.querySelectorAll(
        '.btn-sp-fix-radius[data-node-id="' + msg.nodeId + '"]',
      );
      allFixBtns.forEach(function (b) {
        b.classList.add("fixed");
        b.textContent = "Fixed";
        b.disabled = true;
      });
      const remaining = document.querySelectorAll(
        ".btn-sp-fix-radius:not(.fixed)",
      );
      if (remaining.length === 0) {
        btnFixAll.disabled = true;
        btnFixAll.innerHTML = "All Fixed";
      }
      showToast("Radius fixed!", "success");
    } else if (msg.type === "focus-done") {
      // confirmed
    } else {
      if (_originalOnMessage) _originalOnMessage.call(window, event);
    }
  };

  sendCheckSelection();
})();

function validateGenerateBtn() {
  const hasActiveGroups = typoGroups.some(function (g) {
    return g.name.trim() && g.styles.length > 0;
  });
  const isValidFont = isCustomFontMode
    ? customFontFamily.trim().length > 0
    : !!selectedFont;
  if (btnTypo) {
    btnTypo.disabled = !(isValidFont && hasActiveGroups);
    // Always restore button label when not actively generating
    if (btnTypo.textContent !== "Generating...") {
      btnTypo.innerHTML = "&#10022; Generate Styles";
    }
  }
}

// Request fonts from backend on load
parent.postMessage({ pluginMessage: { type: "get-available-fonts" } }, "*");
