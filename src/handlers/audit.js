// Design-system audits: contrast, missing components, hardcoded colors, etc.
import { resolveScope } from '../lib/helpers.js';

export const auditHandlers = {
  async audit_contrast(params) {
    // Walk scope, find TEXT nodes failing WCAG contrast
    function toLinear(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    function luminance(r, g, b) { return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b); }
    function contrastRatio(l1, l2) {
      const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05);
    }
    function getSolidFill(node) {
      if (!('fills' in node) || !node.fills || node.fills.length === 0) return null;
      for (const f of node.fills) {
        if (f.type === 'SOLID' && f.visible !== false)
          return { r: f.color.r, g: f.color.g, b: f.color.b, opacity: f.opacity ?? 1 };
      }
      return null;
    }
    function getGradientAvgColor(fills) {
      for (const f of fills) {
        if (f.type && f.type.startsWith('GRADIENT_') && f.visible !== false && f.gradientStops?.length) {
          const stops = f.gradientStops;
          const r = stops.reduce((s, x) => s + x.color.r, 0) / stops.length;
          const g = stops.reduce((s, x) => s + x.color.g, 0) / stops.length;
          const b = stops.reduce((s, x) => s + x.color.b, 0) / stops.length;
          return { r, g, b, opacity: 1, isGradient: true };
        }
      }
      return null;
    }
    function getEffectiveBg(node) {
      let n = node.parent;
      while (n && n.type !== 'PAGE') {
        if ('fills' in n && n.fills) {
          const solid = getSolidFill(n);
          if (solid && solid.opacity > 0.1) return solid;
          const grad = getGradientAvgColor(n.fills);
          if (grad) return grad;
        }
        n = n.parent;
      }
      return { r: 1, g: 1, b: 1, opacity: 1 };
    }

    const scopeNode = await resolveScope(params.scopeId);
    const textNodes = scopeNode.findAllWithCriteria({ types: ['TEXT'] });

    const issues = [];
    for (const node of textNodes) {
        const tf = getSolidFill(node);
        if (tf) {
          const bg = getEffectiveBg(node);
          const ratio = contrastRatio(luminance(tf.r, tf.g, tf.b), luminance(bg.r, bg.g, bg.b));
          const size = typeof node.fontSize === 'number' ? node.fontSize : 12;
          const bold = typeof node.fontWeight === 'number' && node.fontWeight >= 700;
          const isLarge = size >= 18 || (size >= 14 && bold);
          const required = isLarge ? 3.0 : 4.5;
          if (ratio < required) {
            issues.push({
              id: node.id,
              name: node.name,
              text: node.characters ? node.characters.slice(0, 60) : '',
              fontSize: size,
              bold,
              ratio: Math.round(ratio * 100) / 100,
              required,
              textColor: { r: Math.round(tf.r*255), g: Math.round(tf.g*255), b: Math.round(tf.b*255) },
              bgColor:   { r: Math.round(bg.r*255), g: Math.round(bg.g*255), b: Math.round(bg.b*255) },
              bgIsGradient: bg.isGradient ?? false,
            });
          }
        }
    }
    return issues;
  },

  async audit_missing_components(params) {
    // Find all detached instances (mainComponent is null)
    const scopeNode = await resolveScope(params.scopeId);
    const instances = scopeNode.findAllWithCriteria({ types: ['INSTANCE'] });
    return instances
      .filter(n => !n.mainComponent)
      .map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, parentId: n.parent?.id, parentName: n.parent?.name }));
  },

  async audit_hardcoded_colors(params) {
    // Find nodes with solid fills/strokes not bound to a variable
    const scopeNode = await resolveScope(params.scopeId);
    const nodes = scopeNode.findAll(n => 'fills' in n || 'strokes' in n);
    const issues = [];
    for (const n of nodes) {
      const hardcodedFills = [];
      const hardcodedStrokes = [];
      if ('fills' in n && Array.isArray(n.fills)) {
        for (const f of n.fills) {
          if (f.type === 'SOLID' && f.visible !== false && !f.boundVariables?.color) {
            hardcodedFills.push({ r: Math.round(f.color.r*255), g: Math.round(f.color.g*255), b: Math.round(f.color.b*255) });
          }
        }
      }
      if ('strokes' in n && Array.isArray(n.strokes)) {
        for (const s of n.strokes) {
          if (s.type === 'SOLID' && s.visible !== false && !s.boundVariables?.color) {
            hardcodedStrokes.push({ r: Math.round(s.color.r*255), g: Math.round(s.color.g*255), b: Math.round(s.color.b*255) });
          }
        }
      }
      if (hardcodedFills.length || hardcodedStrokes.length) {
        issues.push({ id: n.id, name: n.name, type: n.type, hardcodedFills, hardcodedStrokes });
      }
    }
    return issues;
  },

  async audit_detached_styles(params) {
    // Find text nodes not using a local text style
    const scopeNode = await resolveScope(params.scopeId);
    const texts = scopeNode.findAllWithCriteria({ types: ['TEXT'] });
    return texts
      .filter(n => !n.textStyleId)
      .map(n => ({
        id: n.id,
        name: n.name,
        text: n.characters?.slice(0, 60),
        fontSize: typeof n.fontSize === 'number' ? n.fontSize : null,
        fontFamily: typeof n.fontName === 'object' && !('mixed' in n.fontName) ? n.fontName.family : null,
      }));
  },

  async audit_empty_frames(params) {
    // Find frames with no visible children
    const scopeNode = await resolveScope(params.scopeId);
    const frames = scopeNode.findAllWithCriteria({ types: ['FRAME'] });
    return frames
      .filter(n => n.children.length === 0 || n.children.every(c => c.visible === false))
      .map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, width: n.width, height: n.height, parentId: n.parent?.id }));
  },

  async audit_all(params, dispatch) {
    // Run all audits and return grouped results
    const scopeId = params.scopeId ?? null;
    const run = async (action) => {
      try { return await dispatch(action, { scopeId }); }
      catch(e) { return { error: e.message }; }
    };
    const [missingComponents, hardcodedColors, detachedStyles, emptyFrames, contrastIssues] = await Promise.all([
      run('audit_missing_components'),
      run('audit_hardcoded_colors'),
      run('audit_detached_styles'),
      run('audit_empty_frames'),
      run('audit_contrast'),
    ]);
    return { missingComponents, hardcodedColors, detachedStyles, emptyFrames, contrastIssues };
  },
};
