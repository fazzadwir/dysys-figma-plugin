// DySys — Design System Generator Plugin
// Main thread: has access to the Figma document via the figma global object.

figma.showUI(__html__, { width: 440, height: 580 });

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
function roundToNearest8(value: number): number {
  return Math.round(value / 8) * 8;
}

function isOffGrid(value: number): boolean {
  return value % 8 !== 0;
}

function getValidChildren(node: ChildrenMixin): SceneNode[] {
  return (node.children as SceneNode[]).filter(child => {
    if (!child.visible) return false;
    if (!('absoluteBoundingBox' in child)) return false;
    return (child as SceneNode & { absoluteBoundingBox: Rect | null }).absoluteBoundingBox !== null;
  });
}

function scanAutoLayout(node: FrameNode | ComponentNode | InstanceNode): SpacingRecord[] {
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
    isValid:        !isOffGrid(spacing),
    suggestedValue: roundToNearest8(spacing),
    source:         'auto-layout',
  }];
}

function scanManualLayout(node: ChildrenMixin & SceneNode): SpacingRecord[] {
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
      spacing, isValid: !isOffGrid(spacing), suggestedValue: roundToNearest8(spacing),
      source: 'manual',
    });
  }
  return records;
}

function scanContainer(node: ChildrenMixin & SceneNode): SpacingRecord[] {
  if ('layoutMode' in node && (node as FrameNode).layoutMode !== 'NONE') {
    return scanAutoLayout(node as FrameNode);
  }
  return scanManualLayout(node);
}

function scanNode(selected: SceneNode): SpacingRecord[] {
  if (!('children' in selected)) return [];
  let records = scanContainer(selected as ChildrenMixin & SceneNode);
  for (const child of (selected as ChildrenMixin).children) {
    if (!child.visible) continue;
    if (!('children' in child)) continue;
    records = records.concat(scanContainer(child as ChildrenMixin & SceneNode));
  }
  return records;
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
    const fontFamily  = msg.fontFamily as string;
    const platform    = msg.platform as string;
    const styles      = msg.styles as TypoStyle[];

    try {
      const weightsNeeded = Array.from(new Set(styles.map(s => s.weight)));
      const weightToStyle: Record<number, string> = {};

      for (const w of weightsNeeded) {
        const resolved = await resolveFontStyle(fontFamily, w);
        weightToStyle[w] = resolved;
        await figma.loadFontAsync({ family: fontFamily, style: resolved });
      }

      const existing = await figma.getLocalTextStylesAsync();
      const prefix   = platform === 'web' ? 'Web' : 'Mobile';

      for (const typo of styles) {
        const fontStyle = weightToStyle[typo.weight];
        const fullName  = `${prefix}/${typo.styleName}`;

        let style = existing.find(s => s.name === fullName);
        if (!style) {
          style      = figma.createTextStyle();
          style.name = fullName;
        }

        style.fontName      = { family: fontFamily, style: fontStyle };
        style.fontSize      = typo.size;
        style.lineHeight    = { value: 160, unit: 'PERCENT' };
        style.letterSpacing = { value: typo.ls, unit: 'PIXELS' };
      }

      figma.ui.postMessage({ type: 'typography-done', count: styles.length });

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
    let records: SpacingRecord[] = [];
    for (const node of selection) {
      records = records.concat(scanNode(node));
    }
    figma.ui.postMessage({ type: 'scan-result', records });
  }

  // ══════════════════════════════════════════════
  //  SPACING CHECKER — FOCUS
  // ══════════════════════════════════════════════
  else if (msg.type === 'focus') {
    const fromId = msg.fromId as string;
    const toId   = msg.toId as string;
    const nodes: SceneNode[] = [];

    const tryResolve = (id: string) => {
      try {
        const n = figma.getNodeById(id);
        if (n && n.type !== 'DOCUMENT' && n.type !== 'PAGE') {
          nodes.push(n as SceneNode);
        }
      } catch (_) {
        // node not found or inaccessible
      }
    };

    tryResolve(fromId);
    tryResolve(toId);

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
      const node = figma.getNodeById(parentId);
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
