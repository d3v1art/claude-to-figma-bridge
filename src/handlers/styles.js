// Local paint, text, and effect styles.
// Style getters/setters are async — required under `documentAccess: "dynamic-page"`.
import { requireNode } from '../lib/helpers.js';

export const stylesHandlers = {
  async create_text_style(params) {
    // params: name, fontFamily, fontStyle, fontSize, lineHeight (optional), letterSpacing (optional)
    await figma.loadFontAsync({ family: params.fontFamily, style: params.fontStyle });
    const style = figma.createTextStyle();
    style.name = params.name;
    style.fontName = { family: params.fontFamily, style: params.fontStyle };
    style.fontSize = params.fontSize;
    if (params.lineHeight !== undefined) style.lineHeight = params.lineHeight;
    if (params.letterSpacing !== undefined) style.letterSpacing = params.letterSpacing;
    return { id: style.id, name: style.name };
  },

  async get_local_styles() {
    // Returns all local styles grouped by type
    const result = { paint: [], text: [], effect: [], grid: [] };
    for (const s of await figma.getLocalPaintStylesAsync()) {
      result.paint.push({
        id: s.id, name: s.name,
        paints: s.paints.map(p => p.type === 'SOLID'
          ? { type: 'SOLID', r: Math.round(p.color.r*255), g: Math.round(p.color.g*255), b: Math.round(p.color.b*255), opacity: p.opacity ?? 1 }
          : { type: p.type }),
      });
    }
    for (const s of await figma.getLocalTextStylesAsync()) {
      result.text.push({
        id: s.id, name: s.name,
        fontFamily: s.fontName.family, fontStyle: s.fontName.style,
        fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
      });
    }
    for (const s of await figma.getLocalEffectStylesAsync()) {
      result.effect.push({ id: s.id, name: s.name, effects: s.effects });
    }
    for (const s of await figma.getLocalGridStylesAsync()) {
      result.grid.push({ id: s.id, name: s.name });
    }
    return result;
  },

  async apply_text_style(params) {
    // params: nodeId, styleId
    const node = await requireNode(params.nodeId);
    if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
    await node.setTextStyleIdAsync(params.styleId);
    return { success: true };
  },

  async apply_paint_style(params) {
    // params: nodeId, styleId, target ('fills'|'strokes', default 'fills')
    const node = await requireNode(params.nodeId);
    const target = params.target ?? 'fills';
    if (target === 'fills') {
      if (!('fillStyleId' in node)) throw new Error('Node does not support fill styles');
      await node.setFillStyleIdAsync(params.styleId);
    } else {
      if (!('strokeStyleId' in node)) throw new Error('Node does not support stroke styles');
      await node.setStrokeStyleIdAsync(params.styleId);
    }
    return { success: true };
  },

  async apply_effect_style(params) {
    // params: nodeId, styleId
    const node = await requireNode(params.nodeId);
    if (!('effectStyleId' in node)) throw new Error('Node does not support effect styles');
    await node.setEffectStyleIdAsync(params.styleId);
    return { success: true };
  },

  create_paint_style(params) {
    // params: name, color {r,g,b} (0-1), opacity?
    const style = figma.createPaintStyle();
    style.name = params.name;
    style.paints = [{ type: 'SOLID', color: params.color, opacity: params.opacity ?? 1 }];
    return { id: style.id, name: style.name };
  },

  create_effect_style(params) {
    // params: name, effects (array of effect objects)
    const style = figma.createEffectStyle();
    style.name = params.name;
    if (params.effects) style.effects = params.effects;
    return { id: style.id, name: style.name };
  },
};
