// Mutating actions on existing nodes: geometry, fills, strokes, typography, layout.
import { requireNode, nodeInfo, base64ToBytes } from '../lib/helpers.js';

export const editHandlers = {
  async rename(params) {
    const node = await requireNode(params.nodeId);
    const oldName = node.name;
    node.name = params.name;
    return { success: true, oldName, newName: node.name };
  },

  async move(params) {
    const node = await requireNode(params.nodeId);
    if (!('x' in node)) throw new Error('Node is not positionable');
    if (params.x !== undefined) node.x = params.x;
    if (params.y !== undefined) node.y = params.y;
    return { success: true, x: node.x, y: node.y };
  },

  async move_by(params) {
    const node = await requireNode(params.nodeId);
    if (!('x' in node)) throw new Error('Node is not positionable');
    node.x += params.dx ?? 0;
    node.y += params.dy ?? 0;
    return { success: true, x: node.x, y: node.y };
  },

  async resize(params) {
    const node = await requireNode(params.nodeId);
    const w = params.width ?? node.width;
    const h = params.height ?? node.height;
    if ('resizeWithoutConstraints' in node) {
      node.resizeWithoutConstraints(w, h);
    } else if ('resize' in node) {
      node.resize(w, h);
    } else {
      throw new Error('Node is not resizable');
    }
    return { success: true, width: node.width, height: node.height };
  },

  async set_visible(params) {
    const node = await requireNode(params.nodeId);
    node.visible = params.visible;
    return { success: true, visible: node.visible };
  },

  async set_text(params) {
    const node = await requireNode(params.nodeId);
    if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
    // Load every font used in the node in one pass via segments, not a per-character loop.
    const fonts = new Map();
    for (const seg of node.getStyledTextSegments(['fontName'])) {
      fonts.set(JSON.stringify(seg.fontName), seg.fontName);
    }
    // Empty text nodes report no segments but still need their base font loaded.
    if (fonts.size === 0 && node.fontName !== figma.mixed) {
      fonts.set(JSON.stringify(node.fontName), node.fontName);
    }
    await Promise.all([...fonts.values()].map(f => figma.loadFontAsync(f)));
    const oldText = node.characters;
    node.characters = params.text;
    return { success: true, oldText, newText: node.characters };
  },

  async set_fill(params) {
    const node = await requireNode(params.nodeId);
    if (!('fills' in node)) throw new Error('Node does not support fills');
    if (params.color === null) {
      node.fills = [];
    } else {
      node.fills = [{ type: 'SOLID', color: params.color, opacity: params.opacity ?? 1 }];
    }
    return { success: true };
  },

  async set_stroke(params) {
    const node = await requireNode(params.nodeId);
    if (!('strokes' in node)) throw new Error('Node does not support strokes');
    if (params.color === null) {
      node.strokes = [];
    } else {
      node.strokes = [{ type: 'SOLID', color: params.color }];
      if (params.weight !== undefined) node.strokeWeight = params.weight;
      if (params.align !== undefined) node.strokeAlign = params.align;
    }
    return { success: true };
  },

  async set_corner_radius(params) {
    const node = await requireNode(params.nodeId);
    if ('cornerRadius' in node) {
      node.cornerRadius = params.radius;
    } else {
      throw new Error('Node does not support corner radius');
    }
    return { success: true };
  },

  async set_opacity(params) {
    const node = await requireNode(params.nodeId);
    node.opacity = params.opacity;
    return { success: true };
  },

  async set_effect(params) {
    const node = await requireNode(params.nodeId);
    if (!('effects' in node)) throw new Error('Node does not support effects');
    const effectType = params.effectType ?? 'DROP_SHADOW';
    const isBlur = effectType === 'LAYER_BLUR' || effectType === 'BACKGROUND_BLUR';
    const effect = isBlur
      ? { type: effectType, visible: true, radius: params.blur ?? params.radius ?? 8 }
      : { type: effectType, visible: true, blendMode: params.blendMode ?? 'NORMAL',
          color: { ...(params.color ?? { r: 0, g: 0, b: 0 }), a: params.opacity ?? params.alpha ?? 0.15 },
          offset: { x: params.offsetX ?? 0, y: params.offsetY ?? 4 },
          radius: params.blur ?? params.radius ?? 8, spread: params.spread ?? 0,
        };
    node.effects = [...node.effects, effect];
    return { success: true };
  },

  async set_font(params) {
    const node = await requireNode(params.nodeId);
    if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
    const family = params.family ?? 'Inter';
    const style = params.style ?? 'Regular';
    await figma.loadFontAsync({ family, style });
    node.fontName = { family, style };
    if (params.size !== undefined) node.fontSize = params.size;
    if (params.lineHeight !== undefined) node.lineHeight = { value: params.lineHeight, unit: 'PIXELS' };
    if (params.letterSpacing !== undefined) node.letterSpacing = { value: params.letterSpacing, unit: 'PERCENT' };
    return { success: true };
  },

  async set_layout(params) {
    // Auto-layout settings for a frame
    const node = await requireNode(params.nodeId);
    if (node.type !== 'FRAME') throw new Error('Node is not a frame');
    if (params.mode !== undefined) node.layoutMode = params.mode; // 'HORIZONTAL' | 'VERTICAL' | 'NONE'
    if (params.gap !== undefined) node.itemSpacing = params.gap;
    if (params.paddingTop !== undefined) node.paddingTop = params.paddingTop;
    if (params.paddingBottom !== undefined) node.paddingBottom = params.paddingBottom;
    if (params.paddingLeft !== undefined) node.paddingLeft = params.paddingLeft;
    if (params.paddingRight !== undefined) node.paddingRight = params.paddingRight;
    if (params.padding !== undefined) {
      node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = params.padding;
    }
    if (params.align !== undefined) node.primaryAxisAlignItems = params.align;
    if (params.counterAlign !== undefined) node.counterAxisAlignItems = params.counterAlign;
    if (params.wrap !== undefined) node.layoutWrap = params.wrap ? 'WRAP' : 'NO_WRAP';
    return { success: true };
  },

  async set_strokes(params) {
    // params: nodeId, strokes — full strokes array replacement
    const node = await requireNode(params.nodeId);
    if (!('strokes' in node)) throw new Error('Node does not support strokes');
    node.strokes = params.strokes;
    return { success: true };
  },

  async add_stroke(params) {
    // params: nodeId, stroke — appends a stroke to the existing stack
    const node = await requireNode(params.nodeId);
    if (!('strokes' in node)) throw new Error('Node does not support strokes');
    node.strokes = [...node.strokes, params.stroke];
    return { success: true, strokeCount: node.strokes.length };
  },

  async remove_stroke(params) {
    // params: nodeId, index (default: last)
    const node = await requireNode(params.nodeId);
    if (!('strokes' in node)) throw new Error('Node does not support strokes');
    const strokes = [...node.strokes];
    const idx = params.index ?? strokes.length - 1;
    strokes.splice(idx, 1);
    node.strokes = strokes;
    return { success: true, strokeCount: node.strokes.length };
  },

  async set_stroke_dash(params) {
    // params: nodeId, dashPattern — array of numbers [dash, gap, ...]; [] resets to solid
    const node = await requireNode(params.nodeId);
    if (!('dashPattern' in node)) throw new Error('Node does not support dash pattern');
    node.dashPattern = params.dashPattern;
    return { success: true, dashPattern: node.dashPattern };
  },

  async set_text_auto_resize(params) {
    // params: nodeId, mode — 'NONE'|'HEIGHT'|'WIDTH_AND_HEIGHT'|'TRUNCATE'
    const node = await requireNode(params.nodeId);
    if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
    node.textAutoResize = params.mode;
    return { success: true, textAutoResize: node.textAutoResize };
  },

  async set_corner_radii(params) {
    // params: nodeId, topLeft?, topRight?, bottomRight?, bottomLeft?
    const node = await requireNode(params.nodeId);
    if (!('topLeftRadius' in node)) throw new Error('Node does not support individual corner radii');
    if (params.topLeft !== undefined) node.topLeftRadius = params.topLeft;
    if (params.topRight !== undefined) node.topRightRadius = params.topRight;
    if (params.bottomRight !== undefined) node.bottomRightRadius = params.bottomRight;
    if (params.bottomLeft !== undefined) node.bottomLeftRadius = params.bottomLeft;
    return { success: true, topLeft: node.topLeftRadius, topRight: node.topRightRadius, bottomRight: node.bottomRightRadius, bottomLeft: node.bottomLeftRadius };
  },

  async set_layout_positioning(params) {
    // params: nodeId, positioning — 'AUTO'|'ABSOLUTE'
    const node = await requireNode(params.nodeId);
    if (!('layoutPositioning' in node)) throw new Error('Node does not support layoutPositioning');
    node.layoutPositioning = params.positioning;
    return { success: true, layoutPositioning: node.layoutPositioning };
  },

  async set_min_max_size(params) {
    // params: nodeId, minWidth?, maxWidth?, minHeight?, maxHeight?
    const node = await requireNode(params.nodeId);
    if (params.minWidth !== undefined) node.minWidth = params.minWidth;
    if (params.maxWidth !== undefined) node.maxWidth = params.maxWidth;
    if (params.minHeight !== undefined) node.minHeight = params.minHeight;
    if (params.maxHeight !== undefined) node.maxHeight = params.maxHeight;
    return { success: true, minWidth: node.minWidth, maxWidth: node.maxWidth, minHeight: node.minHeight, maxHeight: node.maxHeight };
  },

  async set_fills(params) {
    // params: nodeId, fills — array of fill objects (solid/gradient)
    const node = await requireNode(params.nodeId);
    if (!('fills' in node)) throw new Error('Node does not support fills');
    node.fills = params.fills;
    return { success: true };
  },

  async add_fill(params) {
    // params: nodeId, fill — appends a fill to the existing stack
    const node = await requireNode(params.nodeId);
    if (!('fills' in node)) throw new Error('Node does not support fills');
    node.fills = [...node.fills, params.fill];
    return { success: true, fillCount: node.fills.length };
  },

  async remove_fill(params) {
    // params: nodeId, index (default: last)
    const node = await requireNode(params.nodeId);
    if (!('fills' in node)) throw new Error('Node does not support fills');
    const fills = [...node.fills];
    const idx = params.index ?? fills.length - 1;
    fills.splice(idx, 1);
    node.fills = fills;
    return { success: true, fillCount: node.fills.length };
  },

  async set_image_fill(params) {
    // params: nodeId, url? | base64? (one of them), scaleMode? ('FILL'|'FIT'|'CROP'|'TILE')
    const node = await requireNode(params.nodeId);
    if (!('fills' in node)) throw new Error('Node does not support fills');

    let imageHash;
    if (params.base64) {
      const bytes = base64ToBytes(params.base64);
      const image = figma.createImage(bytes);
      imageHash = image.hash;
    } else if (params.url) {
      const response = await fetch(params.url);
      const buffer = await response.arrayBuffer();
      const image = figma.createImage(new Uint8Array(buffer));
      imageHash = image.hash;
    } else {
      throw new Error('Provide url or base64');
    }

    node.fills = [{
      type: 'IMAGE',
      imageHash,
      scaleMode: params.scaleMode ?? 'FILL',
    }];
    return { success: true };
  },

  async rotate(params) {
    // params: nodeId, angle (degrees, clockwise)
    const node = await requireNode(params.nodeId);
    if (!('rotation' in node)) throw new Error('Node does not support rotation');
    node.rotation = params.angle;
    return { success: true, rotation: node.rotation };
  },

  async set_constraints(params) {
    // params: nodeId, horizontal, vertical — 'MIN'|'MAX'|'STRETCH'|'CENTER'|'SCALE'
    const node = await requireNode(params.nodeId);
    if (!('constraints' in node)) throw new Error('Node does not support constraints');
    node.constraints = {
      horizontal: params.horizontal ?? node.constraints.horizontal,
      vertical: params.vertical ?? node.constraints.vertical,
    };
    return { success: true, constraints: node.constraints };
  },

  async get_constraints(params) {
    // params: nodeId
    const node = await requireNode(params.nodeId);
    if (!('constraints' in node)) throw new Error('Node does not support constraints');
    return { nodeId: node.id, constraints: node.constraints };
  },

  async boolean_operation(params) {
    // params: nodeIds (array, min 2), operation — 'UNION'|'INTERSECT'|'SUBTRACT'|'EXCLUDE', name?
    const nodes = await Promise.all(params.nodeIds.map(id => figma.getNodeByIdAsync(id)));
    const valid = nodes.filter(Boolean);
    if (valid.length < 2) throw new Error('Need at least 2 nodes for boolean operation');
    const parent = valid[0].parent;
    let result;
    switch (params.operation) {
      case 'UNION':     result = figma.union(valid, parent); break;
      case 'INTERSECT': result = figma.intersect(valid, parent); break;
      case 'SUBTRACT':  result = figma.subtract(valid, parent); break;
      case 'EXCLUDE':   result = figma.exclude(valid, parent); break;
      default: throw new Error(`Unknown operation: ${params.operation}`);
    }
    if (params.name) result.name = params.name;
    return { success: true, ...nodeInfo(result) };
  },

  async set_sizing(params) {
    // params: nodeId, axis ('horizontal'|'vertical'|'both'), mode ('FIXED'|'HUG'|'FILL')
    const node = await requireNode(params.nodeId);
    const mode = params.mode;
    const axis = params.axis ?? 'both';

    // primaryAxisSizingMode / counterAxisSizingMode apply to FRAME (auto-layout container itself);
    // layoutSizingHorizontal / layoutSizingVertical apply to children inside auto-layout.
    const isFrame = node.type === 'FRAME';

    if (isFrame && 'primaryAxisSizingMode' in node) {
      if (axis === 'horizontal' || axis === 'both') node.layoutSizingHorizontal = mode;
      if (axis === 'vertical' || axis === 'both') node.layoutSizingVertical = mode;
    } else {
      if ('layoutSizingHorizontal' in node) {
        if (axis === 'horizontal' || axis === 'both') node.layoutSizingHorizontal = mode;
        if (axis === 'vertical' || axis === 'both') node.layoutSizingVertical = mode;
      } else {
        throw new Error('Node does not support layout sizing');
      }
    }
    return { success: true, nodeId: node.id, axis, mode };
  },

  async set_blend_mode(params) {
    // params: nodeId, blendMode — e.g. 'NORMAL'|'MULTIPLY'|'SCREEN'|'OVERLAY'|...
    const node = await requireNode(params.nodeId);
    if (!('blendMode' in node)) throw new Error('Node does not support blend modes');
    node.blendMode = params.blendMode;
    return { success: true };
  },

  async set_annotation(params) {
    // params: nodeId, label (markdown). Empty/omitted label clears annotations.
    // Native Dev Mode annotations (node.annotations) — NOT Figma comments (REST-only).
    const node = await requireNode(params.nodeId);
    if (!('annotations' in node)) throw new Error('Node does not support annotations');
    node.annotations = params.label ? [{ labelMarkdown: String(params.label) }] : [];
    return { success: true, annotations: node.annotations };
  },
};
