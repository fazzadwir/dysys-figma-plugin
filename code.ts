// DySys — Design System Generator Plugin
// Main thread: has access to the Figma document via the figma global object.

figma.showUI(__html__, { width: 320, height: 560 });

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
//  FONT RESOLUTION
//  Resolves the actual Figma font style name for a
//  given CSS numeric weight (400, 500, 600, 700).
//
//  Different fonts name their weights differently:
//    Inter 400  → "Regular"
//    Poppins 600→ "SemiBold"   or   "Semi Bold"
//    Some fonts → "Book", "Medium Text", etc.
//  We query available styles and pick the best match.
// ─────────────────────────────────────────────────

// Priority candidate lists per CSS weight bucket
const WEIGHT_CANDIDATES: Record<number, string[]> = {
  400: ['Regular', 'Normal', 'Book', 'Roman', 'Text', 'Light Regular'],
  500: ['Medium', 'Regular', 'Text', 'Normal'],
  600: ['SemiBold', 'Semi Bold', 'Semibold', 'Demi Bold', 'DemiBold', 'Medium'],
  700: ['Bold', 'SemiBold', 'Semi Bold', 'Demi Bold'],
};

// Weight-sounding words to exclude when looking for a "Regular" equivalent
const HEAVY_KEYWORDS = ['thin', 'extralight', 'extra light', 'light', 'medium',
  'semibold', 'semi bold', 'bold', 'extrabold', 'extra bold', 'black', 'heavy',
  'condensed', 'expanded', 'italic', 'oblique'];

async function resolveFontStyle(family: string, weight: number): Promise<string> {
  // Get all available fonts for this family
  const allFonts = await figma.listAvailableFontsAsync();
  const variants = allFonts
    .filter(f => f.fontName.family.toLowerCase() === family.toLowerCase())
    .map(f => f.fontName.style);

  if (variants.length === 0) {
    throw new Error(`Font family "${family}" tidak tersedia di Figma.`);
  }

  // Try each candidate in priority order
  const candidates = WEIGHT_CANDIDATES[weight] || WEIGHT_CANDIDATES[400];
  for (const candidate of candidates) {
    const match = variants.find(
      v => v.toLowerCase() === candidate.toLowerCase()
    );
    if (match) return match;
  }

  // Fallback: find ANY non-italic, non-condensed style that has no heavy keyword
  // (heuristic "regular-ish" fallback)
  const regularFallback = variants.find(v => {
    const lower = v.toLowerCase();
    if (lower.includes('italic') || lower.includes('oblique')) return false;
    if (lower.includes('condensed') || lower.includes('narrow')) return false;
    return !HEAVY_KEYWORDS.some(kw => lower.includes(kw));
  });
  if (regularFallback) return regularFallback;

  // Last resort: just use whatever style is available
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
      // ── 1. Resolve actual font style name per weight ──
      const weightsNeeded = Array.from(new Set(styles.map(s => s.weight)));
      const weightToStyle: Record<number, string> = {};

      for (const w of weightsNeeded) {
        const resolved = await resolveFontStyle(fontFamily, w);
        weightToStyle[w] = resolved;
        await figma.loadFontAsync({ family: fontFamily, style: resolved });
      }

      // ── 2. Create / update text styles ──
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
        style.lineHeight    = { value: typo.lh, unit: 'PIXELS' };
        style.letterSpacing = { value: typo.ls, unit: 'PIXELS' };
      }

      figma.ui.postMessage({ type: 'typography-done', count: styles.length });

    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: String(err) });
    }
  }
};
