const fs = require('fs');
let content = fs.readFileSync('src/ui.js', 'utf8');

// 1. Remove GOOGLE_FONTS array
content = content.replace(/const GOOGLE_FONTS[\s\S]*?\];/m, 'let FIGMA_FONTS = [];');

// 2. Add custom font state and toggle fn
const customFontState = `
let isCustomFontMode = false;
let customFontFamily = "";

function toggleCustomFontMode(checked) {
  isCustomFontMode = checked;
  document.getElementById("standard-font-picker").style.display = checked ? "none" : "block";
  document.getElementById("custom-font-picker").style.display = checked ? "block" : "none";
  
  // Re-render rows to swap style inputs
  renderGroups();
  renderPreview();
  validateGenerateBtn();
}

function onCustomFontFamilyChange(val) {
  customFontFamily = val;
  validateGenerateBtn();
}
`;
content = content.replace('let selectedFont = "";', customFontState + '\nlet selectedFont = "";');

// 3. Update filterFonts & renderFontList to use FIGMA_FONTS
content = content.replace(/GOOGLE_FONTS/g, 'FIGMA_FONTS');

// 4. Update renderFontList element output
content = content.replace(
  /'<\/span><span class="font-category">' \+ f\.cat \+ "<\/span><\/div>"/g,
  `'</span></div>'`
);

// 5. availableFontWeights -> availableFontStyles
content = content.replace(/availableFontWeights/g, 'availableFontStyles');
content = content.replace(/let availableFontStyles = \[300, 400, 500, 600, 700, 800, 900\];/g, 'let availableFontStyles = ["Regular", "Medium", "Bold"];');
content = content.replace(/availableFontStyles = \[300, 400, 500, 600, 700, 800, 900\];/g, 'availableFontStyles = ["Regular", "Medium", "Bold"];');

// 6. Update selectFont
content = content.replace(
  /parent\.postMessage\(\s*\{\s*pluginMessage: \{\s*type: "get-font-weights", fontFamily: name\s*\}\s*\},\s*"\*",\s*\);/g,
  `// Update available styles based on the selected font
  const found = FIGMA_FONTS.find(function(f) { return f.name === name; });
  availableFontStyles = found && found.styles.length > 0 ? found.styles : ["Regular"];
  // Set all current styles to available
  typoGroups.forEach(function(group) {
    group.styles.forEach(function(s) {
      if (!availableFontStyles.includes(s.style)) {
        s.style = availableFontStyles[0];
      }
    });
  });
  renderGroups();
  renderPreview();
  validateGenerateBtn();`
);

// 7. Update addStyle default values
content = content.replace(
  /weight: last \? last\.weight : 400,/g,
  `style: last ? last.style : "Regular",`
);

// 8. Update updateStyleField
content = content.replace(
  /\} else if \(field === "weight"\) \{[\s\S]*?style\[field\] = parseInt\(value\);/g,
  `} else if (field === "style") { style[field] = value;`
);

// 9. Update renderStyleRow completely
const renderStyleRowOld = `function renderStyleRow(groupId, style) {
  const weightOptions = availableFontStyles
    .map(function (w) {
      return (
        '<option value="' +
        w +
        '" ' +
        (style.weight === w ? "selected" : "") +
        ">" +
        getWeightLabel(w) +
        "</option>"
      );
    })
    .join("");
  return (
    '<div class="typo-style-row" id="style-' +
    style.id +
    '">' +
    '<input class="typo-input typo-input-num" type="number" value="' +
    style.size +
    '" min="8" max="200" title="Font size (px)" oninput="updateStyleField(\\'' +
    groupId +
    "','\\" +
    style.id +
    "','size',this.value)\\"/>" +
    '<input class="typo-input typo-input-num" type="number" value="' +
    style.lineHeight +
    '" min="0" max="400" title="Line height (px)" oninput="updateStyleField(\\'' +
    groupId +
    "','\\" +
    style.id +
    "','lineHeight',this.value)\\"/>" +
    '<select class="typo-select" title="Font weight" onchange="updateStyleField(\\'' +
    groupId +
    "','\\" +
    style.id +
    "','weight',this.value)\\">" +
    weightOptions +
    "</select>" +
    '<input class="typo-input typo-input-name" type="text" value="' +
    escapeHtml(style.customName || "") +
    '" placeholder="e.g. Large" title="Custom name (optional)" oninput="updateStyleField(\\'' +
    groupId +
    "','\\" +
    style.id +
    "','customName',this.value)\\"/>" +
    '<div class="typo-style-actions">' +
    '<button class="btn-style-action btn-style-dupe" title="Duplicate" onclick="duplicateStyle(\\'' +
    groupId +
    "','\\" +
    style.id +
    "')\\">" +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1H9.5A1.5 1.5 0 0 1 11 2.5V6.5A1.5 1.5 0 0 1 9.5 8H8" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
    '<button class="btn-style-action btn-style-delete" title="Delete" onclick="deleteStyle(\\'' +
    groupId +
    "','\\" +
    style.id +
    "')\\">" +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M3.5 3V2h5v1M4.5 5.5v3M7.5 5.5v3M2 3l.6 6.3a.7.7 0 0 0 .7.7h5.4a.7.7 0 0 0 .7-.7L10 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    "</div></div>"
  );
}`;

const renderStyleRowNew = `function renderStyleRow(groupId, style) {
  let styleInput = "";
  let currentStyle = style.style || "Regular";
  if (isCustomFontMode) {
    styleInput = '<input class="typo-input typo-input-name" type="text" value="' +
      escapeHtml(currentStyle) +
      '" title="Font style" oninput="updateStyleField(\\'' +
      groupId + '\\', \\'' + style.id + '\\', \\'style\\', this.value)"/>';
  } else {
    const styleOptions = availableFontStyles
      .map(function (w) {
        return '<option value="' + escapeHtml(w) + '" ' + (currentStyle === w ? "selected" : "") + ">" + escapeHtml(w) + "</option>";
      }).join("");
    styleInput = '<select class="typo-select" title="Font style" onchange="updateStyleField(\\'' +
      groupId + '\\', \\'' + style.id + '\\', \\'style\\', this.value)">' +
      styleOptions + "</select>";
  }

  return (
    '<div class="typo-style-row" id="style-' + style.id + '">' +
    '<input class="typo-input typo-input-num" type="number" value="' +
    style.size +
    '" min="8" max="200" title="Font size (px)" oninput="updateStyleField(\\'' +
    groupId + "','\\" + style.id + "','size',this.value)\\"/>" +
    '<input class="typo-input typo-input-num" type="number" value="' +
    style.lineHeight +
    '" min="0" max="400" title="Line height (px)" oninput="updateStyleField(\\'' +
    groupId + "','\\" + style.id + "','lineHeight',this.value)\\"/>" +
    styleInput +
    '<input class="typo-input typo-input-name" type="text" value="' +
    escapeHtml(style.customName || "") +
    '" placeholder="e.g. Large" title="Custom name (optional)" oninput="updateStyleField(\\'' +
    groupId + "','\\" + style.id + "','customName',this.value)\\"/>" +
    '<div class="typo-style-actions">' +
    '<button class="btn-style-action btn-style-dupe" title="Duplicate" onclick="duplicateStyle(\\'' +
    groupId + "','\\" + style.id + "')\\">" +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="1" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4 4V2.5A1.5 1.5 0 0 1 5.5 1H9.5A1.5 1.5 0 0 1 11 2.5V6.5A1.5 1.5 0 0 1 9.5 8H8" stroke="currentColor" stroke-width="1.3"/></svg></button>' +
    '<button class="btn-style-action btn-style-delete" title="Delete" onclick="deleteStyle(\\'' +
    groupId + "','\\" + style.id + "')\\">" +
    '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1.5 3h9M3.5 3V2h5v1M4.5 5.5v3M7.5 5.5v3M2 3l.6 6.3a.7.7 0 0 0 .7.7h5.4a.7.7 0 0 0 .7-.7L10 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
    "</div></div>"
  );
}`;

content = content.replace(renderStyleRowOld, renderStyleRowNew);

// 10. Update getStyleOutputName
content = content.replace(
  /return group\.name \+ "\/" \+ style\.size \+ " " \+ getWeightLabel\(style\.weight\);/,
  `return group.name + "/" + style.size + " " + (style.style || "Regular");`
);

// 11. Remove getWeightLabel
content = content.replace(/function getWeightLabel\([\s\S]*?\}/, '');
content = content.replace(/const WEIGHT_LABELS = \{[\s\S]*?\};/, '');

// 12. Add validateGenerateBtn utility globally
content += `
function validateGenerateBtn() {
  const hasActiveGroups = typoGroups.some(function (g) {
    return g.name.trim() && g.styles.length > 0;
  });
  let isValidFont = isCustomFontMode ? customFontFamily.trim().length > 0 : !!selectedFont;
  if (btnTypo) btnTypo.disabled = !(isValidFont && hasActiveGroups);
}
`;

// 13. Replace all "btnTypo.disabled = ..." inside renderPreview with validateGenerateBtn
content = content.replace(
  /const hasActiveGroups = typoGroups.*?;\s*if \(btnTypo\) btnTypo\.disabled = .*?;/s,
  `validateGenerateBtn();`
);

// 14. Update btnTypo.addEventListener logic
const btnTypoLogicOld = `
btnTypo.addEventListener("click", function () {
  if (!selectedFont) {
    showToast("Please select a font first.", "error");
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
        fontFamily: selectedFont,
        platform: currentPlatform,
        groups: activeGroups,
      },
    },
    "*",
  );
});
`;

const btnTypoLogicNew = `
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
`;
content = content.replace(btnTypoLogicOld, btnTypoLogicNew);

// 15. Update onmessage to handle available-fonts
const onMessageOld = `  } else if (msg.type === "font-weights") {
    availableFontStyles = msg.weights;
    typoGroups.forEach(function (group) {
      group.styles.forEach(function (style) {
        if (!availableFontStyles.includes(style.weight)) {
          style.weight = snapToAvailable(style.weight, availableFontStyles);
        }
      });
    });
    renderGroups();
    renderPreview();
    const hasGroups = typoGroups.some(function (g) {
      return g.name.trim() && g.styles.length > 0;
    });
    btnTypo.disabled = !hasGroups;
    btnTypo.innerHTML = "&#10022; Generate Styles";
  }`;

const onMessageNew = `  } else if (msg.type === "available-fonts") {
    FIGMA_FONTS = msg.fonts || [];
    renderFontList();
  }`;
content = content.replace(onMessageOld, onMessageNew);

// 16. Also add the request for fonts at the end
content += `\n// Request fonts from backend on load
parent.postMessage({ pluginMessage: { type: "get-available-fonts" } }, "*");\n`;

fs.writeFileSync('src/ui.js', content, 'utf8');
