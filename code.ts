// DySys — Design System Generator Plugin
// Main thread: has access to the Figma document via the figma global object.

figma.showUI(__html__, { width: 520, height: 580 });

// ─────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────
interface ShadeEntry {
  shade: number;
  hex: string;
}

interface TypoStyle {
  size: number;
  weight: number;
  lh: number;
  ls: number;
  styleName: string;
}

interface TypographyStyleNew {
  id: string;
  size: number;
  lineHeight: string | number;
  weight: number;
  style?: string;
  letterSpacing: number;
  customName?: string;
}

interface TypographyGroup {
  id: string;
  name: string;
  styles: TypographyStyleNew[];
}

interface SpacingRecord {
  parentId: string;
  parentName: string;
  axis: 'horizontal' | 'vertical';
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  spacing: number;
  isValid: boolean;
  suggestedValue: number;
  source: 'auto-layout' | 'manual';
}

type RadiusIssue = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  source: 'single' | 'mixed';
  rule: number;
  invalidCorners?: Array<{
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
    value: number;
    suggestedValue: number;
  }>;
  value?: number;
  suggestedValue?: number;
};

interface FontIssue {
  nodeId: string;
  nodeName: string;
  issueType: "No text style applied" | "Mixed text styles";
  fontSize?: number;
  fontName?: string;
  lineHeight?: string;
  hasMatch: boolean;
  suggestedStyleId?: string;
  suggestedStyleName?: string;
}

interface FlatStyle {
  name: string;
}

// ─────────────────────────────────────────────────
//  UTILS — HEX → RGB
// ─────────────────────────────────────────────────
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

// ─────────────────────────────────────────────────
//  SPACING UTILITIES
// ─────────────────────────────────────────────────
function roundToGrid(value: number, grid: number): number {
  // Round half UP: if value is at or above the midpoint between two multiples,
  // snap to the upper multiple; strictly below midpoint → snap to lower.
  // e.g. grid=4: value=6 → midpoint(4,8)=6 → upper=8 ✓
  //      grid=8: value=3 → midpoint(0,8)=4 → lower=0 ✓
  //      grid=8: value=5 → midpoint(0,8)=4 → upper=8 ✓
  const lower = Math.floor(value / grid) * grid;
  const midpoint = lower + grid / 2;
  return value >= midpoint ? lower + grid : lower;
}

function isOffGrid(value: number, grid: number): boolean {
  return value % grid !== 0;
}

function getValidChildren(node: ChildrenMixin): SceneNode[] {
  return (node.children as SceneNode[]).filter(child => {
    if (!child.visible) return false;
    if (!('absoluteBoundingBox' in child)) return false;
    return (child as SceneNode & { absoluteBoundingBox: Rect | null }).absoluteBoundingBox !== null;
  });
}

function scanAutoLayout(node: FrameNode | ComponentNode | InstanceNode, grid: number): SpacingRecord[] {
  if (node.layoutMode === 'NONE') return [];
  const children = getValidChildren(node).filter(child => {
    return !('layoutPositioning' in child && (child as FrameNode).layoutPositioning === 'ABSOLUTE');
  });
  if (children.length < 2) return [];
  const spacing = node.itemSpacing;
  const axis: 'horizontal' | 'vertical' =
    node.layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
  return [{
    parentId:       node.id,
    parentName:     node.name,
    axis,
    fromId:         children[0].id,
    fromName:       children[0].name,
    toId:           children[1].id,
    toName:         children[1].name,
    spacing,
    isValid:        !isOffGrid(spacing, grid),
    suggestedValue: roundToGrid(spacing, grid),
    source:         'auto-layout',
  }];
}

function scanManualLayout(node: ChildrenMixin & SceneNode, grid: number): SpacingRecord[] {
  const records: SpacingRecord[] = [];
  const children = getValidChildren(node);
  if (children.length < 2) return [];

  const getBounds = (c: SceneNode): Rect =>
    (c as SceneNode & { absoluteBoundingBox: Rect }).absoluteBoundingBox;

  const yMin = Math.min(...children.map(c => getBounds(c).y));
  const yMax = Math.max(...children.map(c => getBounds(c).y + getBounds(c).height));
  const xMin = Math.min(...children.map(c => getBounds(c).x));
  const xMax = Math.max(...children.map(c => getBounds(c).x + getBounds(c).width));
  const isVertical = (yMax - yMin) >= (xMax - xMin);
  const axis: 'horizontal' | 'vertical' = isVertical ? 'vertical' : 'horizontal';

  const sorted = [...children].sort((a, b) =>
    isVertical ? getBounds(a).y - getBounds(b).y : getBounds(a).x - getBounds(b).x
  );

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const currBox = getBounds(curr);
    const nextBox = getBounds(next);
    const rawSpacing = isVertical
      ? nextBox.y - (currBox.y + currBox.height)
      : nextBox.x - (currBox.x + currBox.width);
    if (rawSpacing < 1) continue;
    const spacing = Math.round(rawSpacing);
    records.push({
      parentId: node.id, parentName: node.name, axis,
      fromId: curr.id, fromName: curr.name,
      toId: next.id, toName: next.name,
      spacing,
      isValid: !isOffGrid(spacing, grid),
      suggestedValue: roundToGrid(spacing, grid),
      source: 'manual',
    });
  }
  return records;
}

function scanContainer(node: ChildrenMixin & SceneNode, grid: number): SpacingRecord[] {
  if ('layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
    return scanAutoLayout(node as FrameNode, grid);
  }
  return scanManualLayout(node, grid);
}

// Deep-recursive: walks ALL descendants, not just direct children
function scanNodeDeep(node: SceneNode, grid: number): SpacingRecord[] {
  if (!('children' in node)) return [];
  const container = node as ChildrenMixin & SceneNode;
  let records = scanContainer(container, grid);
  for (const child of container.children) {
    if (!child.visible) continue;
    records = records.concat(scanNodeDeep(child, grid));
  }
  return records;
}

function scanNodeDeepForRadius(node: SceneNode, grid: number): RadiusIssue[] {
  let issues: RadiusIssue[] = [];
  
  if ('cornerRadius' in node && node.visible) {
    const cornerNode = node as CornerMixin & SceneNode;
    if (cornerNode.cornerRadius === figma.mixed) {
      const invalidCorners: Array<{ corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight', value: number, suggestedValue: number }> = [];
      const checkAndPush = (prop: 'topLeftRadius' | 'topRightRadius' | 'bottomLeftRadius' | 'bottomRightRadius') => {
        if (prop in cornerNode) {
          const val = Number((cornerNode as any)[prop]);
          if (!isNaN(val) && val !== 0 && isOffGrid(val, grid)) {
            const mappedCorner = prop.replace('Radius', '') as 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
            invalidCorners.push({ corner: mappedCorner, value: val, suggestedValue: roundToGrid(val, grid) });
          }
        }
      };
      checkAndPush('topLeftRadius');
      checkAndPush('topRightRadius');
      checkAndPush('bottomLeftRadius');
      checkAndPush('bottomRightRadius');
      if (invalidCorners.length > 0) {
        issues.push({
          nodeId: cornerNode.id, nodeName: cornerNode.name, nodeType: cornerNode.type,
          source: 'mixed', rule: grid, invalidCorners
        });
      }
    } else {
      const val = Number(cornerNode.cornerRadius);
      if (!isNaN(val) && val !== 0 && isOffGrid(val, grid)) {
        issues.push({
          nodeId: cornerNode.id, nodeName: cornerNode.name, nodeType: cornerNode.type,
          source: 'single', rule: grid, value: val, suggestedValue: roundToGrid(val, grid)
        });
      }
    }
  }

  if ('children' in node && node.visible) {
    const container = node as ChildrenMixin & SceneNode;
    for (const child of container.children) {
      issues = issues.concat(scanNodeDeepForRadius(child, grid));
    }
  }
  return issues;
}

function scanNodeDeepForFont(node: SceneNode, localStyles: TextStyle[]): FontIssue[] {
  let issues: FontIssue[] = [];
  
  if (node.type === 'TEXT') {
    if (node.textStyleId === figma.mixed) {
      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        issueType: "Mixed text styles",
        hasMatch: false
      });
    } else if (node.textStyleId === "") {
      const fontSize = typeof node.fontSize === 'number' ? node.fontSize : undefined;
      const fontNameObj = node.fontName !== figma.mixed ? node.fontName : undefined;
      const fontName = fontNameObj ? `${fontNameObj.family} ${fontNameObj.style}` : undefined;
      let lineHeightStr = "";
      if (node.lineHeight !== figma.mixed) {
        if (node.lineHeight.unit === 'AUTO') lineHeightStr = "Auto";
        else if (node.lineHeight.unit === 'PIXELS') lineHeightStr = `${Math.round(node.lineHeight.value)}px`;
        else if (node.lineHeight.unit === 'PERCENT') lineHeightStr = `${Math.round(node.lineHeight.value)}%`;
      }
      
      let matchedStyle: TextStyle | undefined = undefined;
      
      // Exact Match (semantic — unit-tolerant for zero values and equivalent line heights)
      if (fontNameObj && fontSize !== undefined && node.lineHeight !== figma.mixed && node.letterSpacing !== figma.mixed) {
        const nodeLineHeight = node.lineHeight;       // Narrowed to LineHeight (not mixed)
        const nodeLetterSpacing = node.letterSpacing; // Narrowed to LetterSpacing (not mixed)

        // Helper: letter spacing matches when values are both 0 (unit irrelevant) or strictly equal
        const lsMatch = (a: LetterSpacing, b: LetterSpacing): boolean => {
          if (a.value === 0 && b.value === 0) return true;
          return a.unit === b.unit && a.value === b.value;
        };

        // Helper: line height matches semantically
        const lhMatch = (a: LineHeight, b: LineHeight): boolean => {
          if (a.unit === 'AUTO' && b.unit === 'AUTO') return true;
          if (a.unit === 'AUTO' || b.unit === 'AUTO') return false;
          // Both have values — compare unit + value strictly
          return a.unit === b.unit && (a as { unit: string; value: number }).value === (b as { unit: string; value: number }).value;
        };

        matchedStyle = localStyles.find(ls => {
          return ls.fontName.family === fontNameObj.family &&
                 ls.fontName.style === fontNameObj.style &&
                 ls.fontSize === fontSize &&
                 lhMatch(ls.lineHeight, nodeLineHeight) &&
                 lsMatch(ls.letterSpacing, nodeLetterSpacing);
        });
      }

      issues.push({
        nodeId: node.id,
        nodeName: node.name,
        issueType: "No text style applied",
        fontSize,
        fontName,
        lineHeight: lineHeightStr,
        hasMatch: !!matchedStyle,
        suggestedStyleId: matchedStyle ? matchedStyle.id : undefined,
        suggestedStyleName: matchedStyle ? matchedStyle.name : undefined
      });
    }
  }

  if ('children' in node && node.visible) {
    const container = node as ChildrenMixin & SceneNode;
    for (const child of container.children) {
      issues = issues.concat(scanNodeDeepForFont(child, localStyles));
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────
//  FONT RESOLUTION
//  Resolves the actual Figma font style name for a
//  given CSS numeric weight (400, 500, 600, 700).
// ─────────────────────────────────────────────────

const WEIGHT_CANDIDATES: Record<number, string[]> = {
  300: ['Light', 'Book', 'Regular'],
  400: ['Regular', 'Normal', 'Book', 'Roman', 'Text', 'Light Regular'],
  500: ['Medium', 'Regular', 'Text', 'Normal'],
  600: ['SemiBold', 'Semi Bold', 'Semibold', 'Demi Bold', 'DemiBold', 'Medium'],
  700: ['Bold', 'SemiBold', 'Semi Bold', 'Demi Bold'],
  800: ['ExtraBold', 'Extra Bold', 'Heavy', 'Bold', 'Black'],
  900: ['Black', 'Heavy', 'ExtraBold', 'Extra Bold', 'Bold'],
};

const HEAVY_KEYWORDS = ['thin', 'extralight', 'extra light', 'light', 'medium',
  'semibold', 'semi bold', 'bold', 'extrabold', 'extra bold', 'black', 'heavy',
  'condensed', 'expanded', 'italic', 'oblique'];

async function resolveFontStyle(family: string, weight: number): Promise<string> {
  const allFonts = await figma.listAvailableFontsAsync();
  const variants = allFonts
    .filter(f => f.fontName.family.toLowerCase() === family.toLowerCase())
    .map(f => f.fontName.style);

  if (variants.length === 0) {
    throw new Error(`Font family "${family}" tidak tersedia di Figma.`);
  }

  const candidates = WEIGHT_CANDIDATES[weight] || WEIGHT_CANDIDATES[400];
  for (const candidate of candidates) {
    const match = variants.find(v => v.toLowerCase() === candidate.toLowerCase());
    if (match) return match;
  }

  const regularFallback = variants.find(v => {
    const lower = v.toLowerCase();
    if (lower.includes('italic') || lower.includes('oblique')) return false;
    if (lower.includes('condensed') || lower.includes('narrow')) return false;
    return !HEAVY_KEYWORDS.some(kw => lower.includes(kw));
  });
  if (regularFallback) return regularFallback;

  return variants[0];
}

// ─────────────────────────────────────────────────
//  MESSAGE HANDLER
// ─────────────────────────────────────────────────
figma.ui.onmessage = async (msg: { type: string; [key: string]: unknown }) => {

  // ══════════════════════════════════════════════
  //  GENERATE COLOR STYLES
  // ══════════════════════════════════════════════
  if (msg.type === 'generate-colors') {
    const colorName = msg.colorName as string;
    const shades    = msg.shades as ShadeEntry[];

    try {
      const existing = await figma.getLocalPaintStylesAsync();

      for (const { shade, hex } of shades) {
        const styleName = `${colorName}/${shade}`;
        const rgb       = hexToRgb(hex);

        let style = existing.find(s => s.name === styleName);
        if (!style) {
          style      = figma.createPaintStyle();
          style.name = styleName;
        }
        style.paints = [{ type: 'SOLID', color: rgb }];
      }

      figma.ui.postMessage({ type: 'colors-done', count: shades.length });

    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }
  }

  // ══════════════════════════════════════════════
  //  GENERATE TYPOGRAPHY STYLES
  // ══════════════════════════════════════════════
  else if (msg.type === 'generate-typography') {
    const isCustomFont = msg.isCustomFont as boolean;
    const fontFamily = msg.fontFamily as string;
    const platform   = (msg.platform as string) || '';
    const prefix     = platform.trim() || 'Web';

    type FlatStyle = { name: string; size: number; fontStyle: string; lh: string | number; ls: number };
    const stylesFlat: FlatStyle[] = [];

    const groups = msg.groups as TypographyGroup[] | undefined;

    if (groups && groups.length > 0) {
      for (const group of groups) {
        if (!group.name.trim() || group.styles.length === 0) continue;
        for (const s of group.styles) {
          let outputName: string;
          // UI must now pass `s.style` replacing weight label logic
          const styleLabel = s.style || 'Regular'; 
          if (s.customName && s.customName.trim()) {
            outputName = `${prefix}/${group.name}/${s.customName.trim()}`;
          } else {
            outputName = `${prefix}/${group.name}/${s.size} ${styleLabel}`;
          }
          const newStyle = {
            name: outputName,
            size: s.size,
            fontStyle: styleLabel,
            lh: s.lineHeight,
            ls: s.letterSpacing ?? 0,
          };
          const isDuplicate = stylesFlat.some(existingStyle => 
            existingStyle.name === newStyle.name &&
            existingStyle.size === newStyle.size &&
            existingStyle.fontStyle === newStyle.fontStyle &&
            existingStyle.lh === newStyle.lh &&
            existingStyle.ls === newStyle.ls
          );
          if (!isDuplicate) {
            stylesFlat.push(newStyle);
          }
        }
      }
    }

    if (stylesFlat.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'No styles to generate. Add at least one group with styles.' });
      return;
    }

    try {
      const existing = await figma.getLocalTextStylesAsync();
      const failedStyles: string[] = [];
      let successCount = 0;

      for (const s of stylesFlat) {
        // Individual font loading logic to allow Option A: skip behavior
        try {
          await figma.loadFontAsync({ family: fontFamily, style: s.fontStyle });
        } catch (err) {
          failedStyles.push(`"${fontFamily} ${s.fontStyle}"`);
          continue; // Skip style creation if font fails to load
        }

        let style = existing.find(e => e.name === s.name);
        if (!style) {
          style      = figma.createTextStyle();
          style.name = s.name;
        }
        style.fontName      = { family: fontFamily, style: s.fontStyle };
        style.fontSize      = s.size;
        let finalLh: LineHeight = { unit: 'AUTO' };
        const rawLh = String(s.lh).trim();

        if (rawLh.endsWith('%')) {
          const percentValue = parseFloat(rawLh.replace('%', ''));
          if (!isNaN(percentValue)) {
            finalLh = { unit: 'PERCENT', value: percentValue };
          }
        } else if (rawLh.toLowerCase() !== 'auto') {
          const pxValue = parseFloat(rawLh);
          if (!isNaN(pxValue)) {
            finalLh = { unit: 'PIXELS', value: pxValue };
          }
        }

        style.lineHeight    = finalLh;
        style.letterSpacing = { value: s.ls, unit: 'PIXELS' };
        successCount++;
      }

      if (failedStyles.length > 0) {
        // Inform UI about skipped styles via a warning toast
        figma.ui.postMessage({ 
          type: 'error', 
          message: `Generated ${successCount} styles. Skipped missing fonts: ${failedStyles.join(', ')}`,
          count: successCount
        });
      } else {
        figma.ui.postMessage({ type: 'typography-done', count: successCount });
      }

    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — SCAN
  // ══════════════════════════════════════════════
  else if (msg.type === 'scan') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'no-selection' });
      return;
    }
    // grid: 4 or 8 (default 8) sent from UI toggle
    const grid = (msg.grid as number) === 4 ? 4 : 8;
    const config = (msg.options as { margin: boolean, radius: boolean, font: boolean }) || { margin: true, radius: true, font: false };
    let records: SpacingRecord[] = [];
    let radiusIssues: RadiusIssue[] = [];
    let fontIssues: FontIssue[] = [];
    
    // We can fetch local styles once here if needed for sync matching
    let localStyles: TextStyle[] = [];
    
    const doScan = async () => {
      if (config.font) {
        localStyles = await figma.getLocalTextStylesAsync();
      }
      for (const node of selection) {
        if (config.margin) records = records.concat(scanNodeDeep(node, grid));
        if (config.radius) radiusIssues = radiusIssues.concat(scanNodeDeepForRadius(node, grid));
        if (config.font)   fontIssues = fontIssues.concat(scanNodeDeepForFont(node, localStyles));
      }
      figma.ui.postMessage({ type: 'scan-result', records, radiusIssues, fontIssues, grid });
    };
    
    doScan().catch(err => {
      figma.ui.postMessage({ type: 'error', message: 'Scan failed: ' + String(err) });
    });
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — FOCUS
  // ══════════════════════════════════════════════
  else if (msg.type === 'focus') {
    const fromId = msg.fromId as string;
    const toId   = msg.toId as string;
    const nodes: SceneNode[] = [];

    const tryResolve = async (id: string) => {
      try {
        const n = await figma.getNodeByIdAsync(id);
        if (n && n.type !== 'DOCUMENT' && n.type !== 'PAGE') {
          nodes.push(n as SceneNode);
        }
      } catch (_) {
        // node not found or inaccessible
      }
    };

    await tryResolve(fromId);
    await tryResolve(toId);

    if (nodes.length > 0) {
      figma.currentPage.selection = nodes;
      figma.viewport.scrollAndZoomIntoView(nodes);
      figma.ui.postMessage({ type: 'focus-done', count: nodes.length });
    } else {
      figma.ui.postMessage({ type: 'error', message: 'Could not find the layers. Try re-scanning.' });
    }
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — FIX
  // ══════════════════════════════════════════════
  else if (msg.type === 'fix') {
    const parentId      = msg.parentId as string;
    const suggestedValue = Number(msg.suggestedValue);

    try {
      const node = await figma.getNodeByIdAsync(parentId);
      if (!node) {
        figma.ui.postMessage({ type: 'error', message: 'Layer not found. Try re-scanning.' });
        return;
      }
      if (!('itemSpacing' in node)) {
        figma.ui.postMessage({ type: 'error', message: 'Layer is not an auto-layout frame.' });
        return;
      }
      (node as FrameNode).itemSpacing = suggestedValue;
      figma.ui.postMessage({ type: 'fix-done', parentId });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'Fix failed: ' + String(err) });
    }
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — FIX RADIUS
  // ══════════════════════════════════════════════
  else if (msg.type === 'fix-radius') {
    const nodeId = msg.nodeId as string;
    const rule = msg.rule as number;

    try {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) {
        figma.ui.postMessage({ type: 'error', message: 'Layer not found.'});
        return;
      }
      
      if (!('cornerRadius' in node)) {
        figma.ui.postMessage({ type: 'error', message: 'Layer does not support corner radius.'});
        return;
      }
      
      const cornerNode = node as CornerMixin;
      if (cornerNode.cornerRadius === figma.mixed) {
        const fix = (prop: 'topLeftRadius' | 'topRightRadius' | 'bottomLeftRadius' | 'bottomRightRadius') => {
          if (prop in cornerNode) {
            const val = Number((cornerNode as any)[prop]);
            if (!isNaN(val) && isOffGrid(val, rule)) {
              (cornerNode as any)[prop] = roundToGrid(val, rule);
            }
          }
        };
        fix('topLeftRadius');
        fix('topRightRadius');
        fix('bottomLeftRadius');
        fix('bottomRightRadius');
      } else {
        const val = Number(cornerNode.cornerRadius) || 0;
        cornerNode.cornerRadius = roundToGrid(val, rule);
      }
      
      figma.ui.postMessage({ type: 'fix-radius-done', nodeId });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'Fix radius failed: ' + String(err)});
    }
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — FIX FONT STYLE
  // ══════════════════════════════════════════════
  else if (msg.type === 'fix-font-style') {
    const nodeId = msg.nodeId as string;
    const styleId = msg.styleId as string;

    try {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node || node.type !== 'TEXT') {
        figma.ui.postMessage({ type: 'error', message: 'Text layer not found.'});
        return;
      }
      
      const textNode = node as TextNode;
      if (textNode.fontName === figma.mixed) {
        // Can't auto-resolve mixed text content style this way securely right now in this simple implementation
        figma.ui.postMessage({ type: 'error', message: 'Cannot auto-apply to mixed styles inside text.'});
        return;
      }
      if (textNode.hasMissingFont) {
         figma.ui.postMessage({ type: 'error', message: 'Cannot apply style cleanly while fonts are missing.'});
         return;
      }

      await figma.loadFontAsync(textNode.fontName);
      await textNode.setTextStyleIdAsync(styleId);
      
      figma.ui.postMessage({ type: 'fix-font-done', nodeId });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'Fix font failed: ' + String(err)});
    }
  }

  // ══════════════════════════════════════════════
  //  TYPOGRAPHY — GET ALL AVAILABLE FONTS
  // ══════════════════════════════════════════════
  else if (msg.type === 'get-available-fonts') {
    try {
      const allFonts = await figma.listAvailableFontsAsync();
      const grouped: Record<string, string[]> = {};
      for (const font of allFonts) {
        if (!grouped[font.fontName.family]) {
          grouped[font.fontName.family] = [];
        }
        grouped[font.fontName.family].push(font.fontName.style);
      }
      
      const families = Object.keys(grouped).map(family => ({
        name: family,
        styles: grouped[family]
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      figma.ui.postMessage({ type: 'available-fonts', fonts: families });
    } catch (_) {
      figma.ui.postMessage({ type: 'available-fonts', fonts: [] });
    }
  }

  // ══════════════════════════════════════════════
  //  TYPOGRAPHY — GET EXISTING PARENT GROUPS
  // ══════════════════════════════════════════════
  else if (msg.type === 'get-existing-parents') {
    try {
      const styles = await figma.getLocalTextStylesAsync();
      const parentsSet = new Set<string>();
      const stylesByParent: Record<string, string[]> = {};

      for (const style of styles) {
        const parts = style.name.split('/');
        if (parts.length > 1 && parts[0].trim()) {
          const parent = parts[0].trim();
          parentsSet.add(parent);
          // Child name = everything after the first segment
          const childName = parts.slice(1).join('/');
          if (!stylesByParent[parent]) stylesByParent[parent] = [];
          stylesByParent[parent].push(childName);
        }
      }

      const parents = Array.from(parentsSet).sort((a, b) => a.localeCompare(b));
      // Sort children alphabetically per parent
      for (const key of Object.keys(stylesByParent)) {
        stylesByParent[key].sort((a, b) => a.localeCompare(b));
      }

      figma.ui.postMessage({ type: 'existing-parents', parents, stylesByParent });
    } catch (_) {
      figma.ui.postMessage({ type: 'existing-parents', parents: [], stylesByParent: {} });
    }
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — CHECK SELECTION
  // ══════════════════════════════════════════════
  else if (msg.type === 'check-selection') {
    const sel = figma.currentPage.selection;
    figma.ui.postMessage({
      type: 'selection-status',
      hasSelection: sel.length > 0,
      count: sel.length,
    });
  }
};

// ── Live selection update ──
figma.on('selectionchange', () => {
  const sel = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-status',
    hasSelection: sel.length > 0,
    count: sel.length,
  });
});
