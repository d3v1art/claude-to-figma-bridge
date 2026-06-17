figma.showUI(__html__, { width: 300, height: 160 });

function base64ToBytes(b64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((len * 3) / 4 - pad);
  let pos = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[clean.charCodeAt(i)], b = lookup[clean.charCodeAt(i+1)];
    const c = lookup[clean.charCodeAt(i+2)], d = lookup[clean.charCodeAt(i+3)];
    out[pos++] = (a << 2) | (b >> 4);
    if (pos < out.length) out[pos++] = ((b & 0xf) << 4) | (c >> 2);
    if (pos < out.length) out[pos++] = ((c & 0x3) << 6) | d;
  }
  return out;
}

function nodeInfo(n) {
  return {
    id: n.id,
    name: n.name,
    type: n.type,
    x: 'x' in n ? n.x : null,
    y: 'y' in n ? n.y : null,
    width: 'width' in n ? n.width : null,
    height: 'height' in n ? n.height : null,
    text: n.type === 'TEXT' ? n.characters : null,
  };
}

async function buildTree(n, depth) {
  const obj = nodeInfo(n);
  if (depth > 0 && 'children' in n) {
    obj.children = [];
    for (const c of n.children) {
      obj.children.push(await buildTree(c, depth - 1));
    }
  }
  return obj;
}

async function executeAction(action, params) {
  switch (action) {

    case 'get_selection':
      return figma.currentPage.selection.map(nodeInfo);

    case 'get_node': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      return { ...nodeInfo(node), visible: node.visible };
    }

    case 'get_parent': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const chain = [];
      let cur = node.parent;
      while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
        chain.push(nodeInfo(cur));
        cur = cur.parent;
      }
      return chain;
    }

    case 'get_tree': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      return buildTree(node, params.depth ?? 2);
    }

    case 'get_page_tree':
      return buildTree(figma.currentPage, params.depth ?? 1);

    case 'get_page_nodes':
      return figma.currentPage.children.map(n => ({
        id: n.id, name: n.name, type: n.type,
      }));

    case 'get_children': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('children' in node)) throw new Error('Node has no children');
      return node.children.map(nodeInfo);
    }

    case 'get_text': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
      return { text: node.characters };
    }

    case 'get_text_style': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
      const seg = node.getStyledTextSegments(['fontName', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textDecoration', 'textCase']);
      const first = seg[0] || {};
      return {
        fontFamily: first.fontName?.family ?? null,
        fontStyle: first.fontName?.style ?? null,
        fontSize: first.fontSize ?? null,
        lineHeight: first.lineHeight ?? null,
        letterSpacing: first.letterSpacing ?? null,
        textDecoration: first.textDecoration ?? null,
        textCase: first.textCase ?? null,
        characters: node.characters,
      };
    }

    case 'create_text_style': {
      // params: name, fontFamily, fontStyle, fontSize, lineHeight (optional), letterSpacing (optional)
      await figma.loadFontAsync({ family: params.fontFamily, style: params.fontStyle });
      const style = figma.createTextStyle();
      style.name = params.name;
      style.fontName = { family: params.fontFamily, style: params.fontStyle };
      style.fontSize = params.fontSize;
      if (params.lineHeight !== undefined) style.lineHeight = params.lineHeight;
      if (params.letterSpacing !== undefined) style.letterSpacing = params.letterSpacing;
      return { id: style.id, name: style.name };
    }

    case 'rename': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const oldName = node.name;
      node.name = params.name;
      return { success: true, oldName, newName: node.name };
    }

    case 'move': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('x' in node)) throw new Error('Node is not positionable');
      if (params.x !== undefined) node.x = params.x;
      if (params.y !== undefined) node.y = params.y;
      return { success: true, x: node.x, y: node.y };
    }

    case 'move_by': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('x' in node)) throw new Error('Node is not positionable');
      node.x += params.dx ?? 0;
      node.y += params.dy ?? 0;
      return { success: true, x: node.x, y: node.y };
    }

    case 'resize': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
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
    }

    case 'set_visible': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      node.visible = params.visible;
      return { success: true, visible: node.visible };
    }

    case 'set_text': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
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
    }

    case 'duplicate': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const clone = node.clone();
      if (params.x !== undefined) clone.x = params.x;
      if (params.y !== undefined) clone.y = params.y;
      return { success: true, id: clone.id, name: clone.name };
    }

    case 'create_frame': {
      const frame = figma.createFrame();
      frame.name = params.name ?? 'Frame';
      frame.resize(params.width ?? 100, params.height ?? 100);
      if (params.x !== undefined) frame.x = params.x;
      if (params.y !== undefined) frame.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && 'appendChild' in parent) parent.appendChild(frame);
      }
      if (params.fill !== undefined) {
        frame.fills = [{ type: 'SOLID', color: params.fill, opacity: params.fillOpacity ?? 1 }];
      } else {
        frame.fills = []; // transparent by default
      }
      if (params.cornerRadius !== undefined) frame.cornerRadius = params.cornerRadius;
      if (params.clipsContent !== undefined) frame.clipsContent = params.clipsContent;
      return { success: true, ...nodeInfo(frame) };
    }

    case 'create_rectangle': {
      const rect = figma.createRectangle();
      rect.name = params.name ?? 'Rectangle';
      rect.resize(params.width ?? 100, params.height ?? 100);
      if (params.x !== undefined) rect.x = params.x;
      if (params.y !== undefined) rect.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && 'appendChild' in parent) parent.appendChild(rect);
      }
      if (params.fill !== undefined) rect.fills = [{ type: 'SOLID', color: params.fill, opacity: params.fillOpacity ?? 1 }];
      if (params.cornerRadius !== undefined) rect.cornerRadius = params.cornerRadius;
      if (params.stroke !== undefined) {
        rect.strokes = [{ type: 'SOLID', color: params.stroke }];
        rect.strokeWeight = params.strokeWeight ?? 1;
      }
      return { success: true, ...nodeInfo(rect) };
    }

    case 'create_text': {
      const text = figma.createText();
      text.name = params.name ?? 'Text';
      await figma.loadFontAsync({ family: params.fontFamily ?? 'Inter', style: params.fontStyle ?? 'Regular' });
      text.fontName = { family: params.fontFamily ?? 'Inter', style: params.fontStyle ?? 'Regular' };
      text.characters = params.text ?? '';
      if (params.fontSize !== undefined) text.fontSize = params.fontSize;
      if (params.x !== undefined) text.x = params.x;
      if (params.y !== undefined) text.y = params.y;
      if (params.fill !== undefined) text.fills = [{ type: 'SOLID', color: params.fill }];
      if (params.textAlignHorizontal !== undefined) text.textAlignHorizontal = params.textAlignHorizontal;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && 'appendChild' in parent) parent.appendChild(text);
      }
      return { success: true, ...nodeInfo(text) };
    }

    case 'set_fill': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('fills' in node)) throw new Error('Node does not support fills');
      if (params.color === null) {
        node.fills = [];
      } else {
        node.fills = [{ type: 'SOLID', color: params.color, opacity: params.opacity ?? 1 }];
      }
      return { success: true };
    }

    case 'set_stroke': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('strokes' in node)) throw new Error('Node does not support strokes');
      if (params.color === null) {
        node.strokes = [];
      } else {
        node.strokes = [{ type: 'SOLID', color: params.color }];
        if (params.weight !== undefined) node.strokeWeight = params.weight;
        if (params.align !== undefined) node.strokeAlign = params.align;
      }
      return { success: true };
    }

    case 'set_corner_radius': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if ('cornerRadius' in node) {
        node.cornerRadius = params.radius;
      } else {
        throw new Error('Node does not support corner radius');
      }
      return { success: true };
    }

    case 'set_opacity': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      node.opacity = params.opacity;
      return { success: true };
    }

    case 'set_effect': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
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
    }

    case 'set_font': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
      const family = params.family ?? 'Inter';
      const style = params.style ?? 'Regular';
      await figma.loadFontAsync({ family, style });
      node.fontName = { family, style };
      if (params.size !== undefined) node.fontSize = params.size;
      if (params.lineHeight !== undefined) node.lineHeight = { value: params.lineHeight, unit: 'PIXELS' };
      if (params.letterSpacing !== undefined) node.letterSpacing = { value: params.letterSpacing, unit: 'PERCENT' };
      return { success: true };
    }

    case 'set_layout': {
      // Auto-layout settings for a frame
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
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
    }

    case 'reparent': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const newParent = await figma.getNodeByIdAsync(params.newParentId);
      if (!newParent) throw new Error(`New parent not found: ${params.newParentId}`);
      if (!('appendChild' in newParent)) throw new Error('New parent cannot have children');
      newParent.appendChild(node);
      return { success: true, newParentId: newParent.id, x: 'x' in node ? node.x : null, y: 'y' in node ? node.y : null };
    }

    case 'batch': {
      const results = [];
      for (const sub of params.commands) {
        try {
          results.push(await executeAction(sub.action, sub));
        } catch (e) {
          results.push({ error: e.message });
        }
      }
      return results;
    }

    case 'find_all_instances': {
      // Walk scope (scopeId or current page), collect all INSTANCE nodes
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found: ${params.scopeId}`);
      const nodes = scopeNode.findAllWithCriteria({ types: ['INSTANCE'] });
      return nodes.map(n => {
        const mc = n.mainComponent;
        return {
          id: n.id,
          name: n.name,
          mainComponentId: mc ? mc.id : null,
          mainComponentName: mc ? mc.name : null,
          x: 'x' in n ? n.x : null,
          y: 'y' in n ? n.y : null,
        };
      });
    }

    case 'get_local_components': {
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found: ${params.scopeId}`);
      const comps = scopeNode.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] });
      return comps.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent ? c.parent.id : null,
        parentName: c.parent ? c.parent.name : null,
        parentType: c.parent ? c.parent.type : null,
        childrenCount: 'children' in c ? c.children.length : 0,
      }));
    }

    case 'get_all_texts': {
      // Return all TEXT nodes under scopeId (or selection), with node name + layer name chain
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : (figma.currentPage.selection[0] ?? figma.currentPage);
      if (!scopeNode) throw new Error('No scope node');
      const texts = scopeNode.findAllWithCriteria({ types: ['TEXT'] });
      return texts.map(n => {
        let parentName = null;
        try { parentName = n.parent ? n.parent.name : null; } catch(e) {}
        return {
          id: n.id,
          name: n.name,
          text: n.characters,
          fontSize: typeof n.fontSize === 'number' ? n.fontSize : null,
          parentName,
        };
      });
    }

    case 'audit_contrast': {
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

      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found: ${params.scopeId}`);
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
    }

    case 'get_screenshot': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const scale = params.scale ?? 1;
      const bytes = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let base64 = '';
      for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i], b1 = bytes[i+1] ?? 0, b2 = bytes[i+2] ?? 0;
        base64 += chars[b0 >> 2] + chars[((b0 & 3) << 4) | (b1 >> 4)] +
          (i+1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=') +
          (i+2 < bytes.length ? chars[b2 & 63] : '=');
      }
      return { base64, mimeType: 'image/png', width: Math.round(node.width * scale), height: Math.round(node.height * scale) };
    }

    case 'get_fills': {
      function extractFills(n) {
        const result = { id: n.id, name: n.name, type: n.type, fills: [], gradients: [] };
        if ('fills' in n && n.fills) {
          for (const f of n.fills) {
            if (!f.visible) continue;
            if (f.type === 'SOLID') {
              result.fills.push({ r: Math.round(f.color.r * 255), g: Math.round(f.color.g * 255), b: Math.round(f.color.b * 255), opacity: f.opacity ?? 1 });
            } else if (f.type.startsWith('GRADIENT_')) {
              result.gradients.push({ type: f.type, stops: f.gradientStops.map(s => ({ r: Math.round(s.color.r*255), g: Math.round(s.color.g*255), b: Math.round(s.color.b*255), a: s.color.a, position: s.position })) });
            }
          }
        }
        return result;
      }
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const chain = [];
      let n = node;
      let depth = 0;
      while (n && n.type !== 'PAGE' && depth < 8) {
        chain.push(extractFills(n));
        n = n.parent;
        depth++;
      }
      return chain;
    }

    case 'get_annotations': {
      const node = await figma.getNodeByIdAsync(params.nodeId ?? null) ?? figma.currentPage;
      const result = { pluginData: {}, sharedData: {} };
      try {
        const keys = node.getPluginDataKeys();
        for (const k of keys) result.pluginData[k] = node.getPluginData(k);
      } catch(e) {}
      for (const ns of ['accessibility', 'annotations', 'a11y', 'contrast', 'figma', 'com.figma.accessibility']) {
        try {
          const sharedKeys = node.getSharedPluginDataKeys(ns);
          if (sharedKeys.length) {
            result.sharedData[ns] = {};
            for (const k of sharedKeys) result.sharedData[ns][k] = node.getSharedPluginData(ns, k);
          }
        } catch(e) {}
      }
      // Also scan children for annotation-like sticky/text nodes if scopeId provided
      if (params.includeChildren && 'children' in node) {
        result.childrenData = [];
        const textNodes = node.findAllWithCriteria({ types: ['TEXT'] });
        for (const t of textNodes) {
          const keys = t.getPluginDataKeys();
          if (keys.length) {
            const data = {};
            for (const k of keys) data[k] = t.getPluginData(k);
            result.childrenData.push({ id: t.id, name: t.name, text: t.characters, pluginData: data });
          }
        }
      }
      return result;
    }

    case 'get_variables': {
      const collections = figma.variables.getLocalVariableCollections();
      return collections.map(col => ({
        id: col.id,
        name: col.name,
        modes: col.modes,
        defaultModeId: col.defaultModeId,
        variables: col.variableIds.map(vid => {
          const v = figma.variables.getVariableById(vid);
          if (!v) return null;
          return {
            id: v.id,
            name: v.name,
            type: v.resolvedType,
            values: Object.fromEntries(
              Object.entries(v.valuesByMode).map(([modeId, val]) => {
                // Resolve aliases
                if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
                  const ref = figma.variables.getVariableById(val.id);
                  return [modeId, { alias: ref ? ref.name : val.id }];
                }
                return [modeId, val];
              })
            ),
          };
        }).filter(Boolean),
      }));
    }

    case 'get_variable': {
      const v = figma.variables.getVariableById(params.variableId);
      if (!v) throw new Error(`Variable not found: ${params.variableId}`);
      const col = figma.variables.getVariableCollectionById(v.variableCollectionId);
      return {
        id: v.id,
        name: v.name,
        type: v.resolvedType,
        collection: col ? { id: col.id, name: col.name, modes: col.modes } : null,
        values: Object.fromEntries(
          Object.entries(v.valuesByMode).map(([modeId, val]) => {
            if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
              const ref = figma.variables.getVariableById(val.id);
              return [modeId, { alias: ref ? ref.name : val.id, aliasId: val.id }];
            }
            return [modeId, val];
          })
        ),
      };
    }

    case 'create_instance': {
      // params: componentId, parentId, x, y
      const comp = await figma.getNodeByIdAsync(params.componentId);
      if (!comp || comp.type !== 'COMPONENT') throw new Error(`Not a component: ${params.componentId}`);
      const instance = comp.createInstance();
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (!parent) throw new Error(`Parent not found: ${params.parentId}`);
        parent.appendChild(instance);
      }
      if (params.x !== undefined) instance.x = params.x;
      if (params.y !== undefined) instance.y = params.y;
      return { id: instance.id, name: instance.name, type: instance.type, x: instance.x, y: instance.y };
    }

    case 'delete_node': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      node.remove();
      return { success: true };
    }

    case 'add_component_property': {
      // params: componentId, name, type ('TEXT'|'BOOLEAN'|'INSTANCE_SWAP'), defaultValue
      const node = await figma.getNodeByIdAsync(params.componentId);
      if (!node) throw new Error(`Node not found: ${params.componentId}`);
      if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') throw new Error('Node is not a component');
      const key = node.addComponentProperty(params.name, params.type, params.defaultValue ?? '');
      return { key, name: params.name, type: params.type };
    }

    case 'set_property_reference': {
      // params: nodeId, references { characters: 'key', mainComponent: 'key', visible: 'key' }
      // Links a layer inside a component to a component property
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      node.componentPropertyReferences = params.references;
      return { success: true, nodeId: params.nodeId, references: params.references };
    }

    case 'get_component_properties': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('componentPropertyDefinitions' in node)) throw new Error('Node has no component properties');
      return node.componentPropertyDefinitions;
    }

    case 'combine_as_variants': {
      // params: componentIds (array), parentId (optional), name (optional)
      const components = [];
      for (const id of params.componentIds) {
        const node = await figma.getNodeByIdAsync(id);
        if (!node || node.type !== 'COMPONENT') throw new Error(`Not a component: ${id}`);
        components.push(node);
      }
      const parent = params.parentId ? await figma.getNodeByIdAsync(params.parentId) : components[0].parent;
      const set = figma.combineAsVariants(components, parent);
      if (params.name) set.name = params.name;
      return { id: set.id, name: set.name, type: set.type, x: set.x, y: set.y, width: set.width, height: set.height };
    }

    case 'create_component_from_node': {
      // Convert an existing frame/group node into a component in-place
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const component = figma.createComponentFromNode(node);
      if (params.name) component.name = params.name;
      return { id: component.id, name: component.name, type: component.type };
    }

    case 'create_variable_collection': {
      // params: name, modes (optional array of mode names, default: ['Value'])
      const col = figma.variables.createVariableCollection(params.name);
      const modeNames = params.modes || ['Value'];
      // Rename the default mode
      col.renameMode(col.modes[0].modeId, modeNames[0]);
      // Add additional modes
      for (let i = 1; i < modeNames.length; i++) {
        col.addMode(modeNames[i]);
      }
      return { id: col.id, name: col.name, modes: col.modes };
    }

    case 'create_variable': {
      // params: collectionId, name, type ('COLOR'|'FLOAT'|'STRING'|'BOOLEAN'), values { modeId: value }
      // value for COLOR: { r, g, b, a } (0-1 range)
      const col = figma.variables.getVariableCollectionById(params.collectionId);
      if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
      const variable = figma.variables.createVariable(params.name, col, params.type);
      if (params.values) {
        for (const [modeId, value] of Object.entries(params.values)) {
          variable.setValueForMode(modeId, value);
        }
      }
      return { id: variable.id, name: variable.name, type: variable.resolvedType };
    }

    case 'update_variable': {
      // params: variableId, values { modeId: value }
      // For COLOR value: { r, g, b, a } (0-1 range)
      // For alias: { type: 'VARIABLE_ALIAS', id: variableId }
      const v = figma.variables.getVariableById(params.variableId);
      if (!v) throw new Error(`Variable not found: ${params.variableId}`);
      for (const [modeId, value] of Object.entries(params.values)) {
        v.setValueForMode(modeId, value);
      }
      return { id: v.id, name: v.name, type: v.resolvedType };
    }

    case 'delete_variable': {
      // params: variableId
      const v = figma.variables.getVariableById(params.variableId);
      if (!v) throw new Error(`Variable not found: ${params.variableId}`);
      v.remove();
      return { success: true };
    }

    case 'apply_variable': {
      // params: nodeId, property, variableId
      // property: 'fills' | 'strokes' | 'opacity' | 'width' | 'height' |
      //           'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight' |
      //           'itemSpacing' | 'cornerRadius' | 'characters' | 'fontSize' |
      //           'fontWeight' | 'lineHeight' | 'letterSpacing'
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const v = figma.variables.getVariableById(params.variableId);
      if (!v) throw new Error(`Variable not found: ${params.variableId}`);

      const prop = params.property;

      if (prop === 'fills' || prop === 'strokes') {
        const paints = node[prop];
        if (!paints || paints.length === 0) throw new Error(`Node has no ${prop}`);
        const index = params.index ?? 0;
        const bound = figma.variables.setBoundVariableForPaint(paints[index], 'color', v);
        const updated = [...paints];
        updated[index] = bound;
        node[prop] = updated;
      } else {
        node.setBoundVariable(prop, v);
      }
      return { success: true, nodeId: node.id, property: prop, variableId: v.id, variableName: v.name };
    }

    case 'detach_variable': {
      // params: nodeId, property, index (optional, for fills/strokes)
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const prop = params.property;

      if (prop === 'fills' || prop === 'strokes') {
        const paints = node[prop];
        if (!paints || paints.length === 0) throw new Error(`Node has no ${prop}`);
        const index = params.index ?? 0;
        const unbound = figma.variables.setBoundVariableForPaint(paints[index], 'color', null);
        const updated = [...paints];
        updated[index] = unbound;
        node[prop] = updated;
      } else {
        node.setBoundVariable(prop, null);
      }
      return { success: true };
    }

    case 'get_variable_bindings': {
      // params: nodeId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const result = { nodeId: node.id, name: node.name, bindings: {} };

      // Direct bound variables on the node
      if ('boundVariables' in node && node.boundVariables) {
        for (const [prop, binding] of Object.entries(node.boundVariables)) {
          if (!binding) continue;
          const resolve = (b) => {
            if (!b || !b.id) return null;
            const v = figma.variables.getVariableById(b.id);
            return v ? { id: v.id, name: v.name, type: v.resolvedType } : { id: b.id };
          };
          result.bindings[prop] = Array.isArray(binding) ? binding.map(resolve) : resolve(binding);
        }
      }

      // Paint bindings (fills/strokes)
      for (const paintProp of ['fills', 'strokes']) {
        if (!(paintProp in node) || !node[paintProp]) continue;
        const paints = node[paintProp];
        const paintBindings = [];
        for (const paint of paints) {
          if (paint.boundVariables?.color) {
            const v = figma.variables.getVariableById(paint.boundVariables.color.id);
            paintBindings.push(v ? { id: v.id, name: v.name, type: v.resolvedType } : null);
          } else {
            paintBindings.push(null);
          }
        }
        if (paintBindings.some(b => b !== null)) {
          result.bindings[paintProp] = paintBindings;
        }
      }

      return result;
    }

    case 'add_mode': {
      // params: collectionId, name
      // Adds a new mode to an existing variable collection
      const col = figma.variables.getVariableCollectionById(params.collectionId);
      if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
      const modeId = col.addMode(params.name);
      return { success: true, collectionId: col.id, modeId, modeName: params.name, modes: col.modes };
    }

    case 'rename_mode': {
      // params: collectionId, modeId, name
      const col = figma.variables.getVariableCollectionById(params.collectionId);
      if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
      col.renameMode(params.modeId, params.name);
      return { success: true, collectionId: col.id, modeId: params.modeId, modes: col.modes };
    }

    case 'remove_mode': {
      // params: collectionId, modeId
      const col = figma.variables.getVariableCollectionById(params.collectionId);
      if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
      col.removeMode(params.modeId);
      return { success: true, collectionId: col.id, modes: col.modes };
    }

    case 'switch_mode': {
      // params: nodeId, collectionId, modeId
      // Applies a variable mode to a specific frame/component
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('setExplicitVariableModeForCollection' in node)) {
        throw new Error('Node does not support explicit variable modes');
      }
      const col = figma.variables.getVariableCollectionById(params.collectionId);
      if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
      node.setExplicitVariableModeForCollection(col, params.modeId);
      return { success: true, nodeId: node.id, collectionId: params.collectionId, modeId: params.modeId };
    }

    case 'reset_mode': {
      // params: nodeId, collectionId
      // Removes explicit mode override, falls back to parent/default
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('clearExplicitVariableModeForCollection' in node)) {
        throw new Error('Node does not support explicit variable modes');
      }
      const col = figma.variables.getVariableCollectionById(params.collectionId);
      if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
      node.clearExplicitVariableModeForCollection(col);
      return { success: true };
    }

    case 'audit_missing_components': {
      // Find all detached instances (mainComponent is null)
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found: ${params.scopeId}`);
      const instances = scopeNode.findAllWithCriteria({ types: ['INSTANCE'] });
      return instances
        .filter(n => !n.mainComponent)
        .map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, parentId: n.parent?.id, parentName: n.parent?.name }));
    }

    case 'audit_hardcoded_colors': {
      // Find nodes with solid fills/strokes not bound to a variable
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found`);
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
    }

    case 'audit_detached_styles': {
      // Find text nodes not using a local text style
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found`);
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
    }

    case 'audit_empty_frames': {
      // Find frames with no visible children
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope node not found`);
      const frames = scopeNode.findAllWithCriteria({ types: ['FRAME'] });
      return frames
        .filter(n => n.children.length === 0 || n.children.every(c => c.visible === false))
        .map(n => ({ id: n.id, name: n.name, x: n.x, y: n.y, width: n.width, height: n.height, parentId: n.parent?.id }));
    }

    case 'audit_all': {
      // Run all audits and return grouped results
      const scopeId = params.scopeId ?? null;
      const run = async (action) => {
        try { return await executeAction(action, { scopeId }); }
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
    }

    case 'set_strokes': {
      // params: nodeId, strokes — full strokes array replacement
      // Each stroke: { type: 'SOLID', color: {r,g,b}, opacity?, visible? }
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('strokes' in node)) throw new Error('Node does not support strokes');
      node.strokes = params.strokes;
      return { success: true };
    }

    case 'add_stroke': {
      // params: nodeId, stroke — appends a stroke to the existing stack
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('strokes' in node)) throw new Error('Node does not support strokes');
      node.strokes = [...node.strokes, params.stroke];
      return { success: true, strokeCount: node.strokes.length };
    }

    case 'remove_stroke': {
      // params: nodeId, index (default: last)
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('strokes' in node)) throw new Error('Node does not support strokes');
      const strokes = [...node.strokes];
      const idx = params.index ?? strokes.length - 1;
      strokes.splice(idx, 1);
      node.strokes = strokes;
      return { success: true, strokeCount: node.strokes.length };
    }

    case 'set_stroke_dash': {
      // params: nodeId, dashPattern — array of numbers [dash, gap, dash, gap...]
      // e.g. [8, 4] — 8px dash, 4px gap
      // Pass [] to reset to solid
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('dashPattern' in node)) throw new Error('Node does not support dash pattern');
      node.dashPattern = params.dashPattern;
      return { success: true, dashPattern: node.dashPattern };
    }

    case 'set_text_auto_resize': {
      // params: nodeId, mode — 'NONE'|'HEIGHT'|'WIDTH_AND_HEIGHT'|'TRUNCATE'
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
      node.textAutoResize = params.mode;
      return { success: true, textAutoResize: node.textAutoResize };
    }

    case 'set_corner_radii': {
      // params: nodeId, topLeft?, topRight?, bottomRight?, bottomLeft?
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('topLeftRadius' in node)) throw new Error('Node does not support individual corner radii');
      if (params.topLeft !== undefined) node.topLeftRadius = params.topLeft;
      if (params.topRight !== undefined) node.topRightRadius = params.topRight;
      if (params.bottomRight !== undefined) node.bottomRightRadius = params.bottomRight;
      if (params.bottomLeft !== undefined) node.bottomLeftRadius = params.bottomLeft;
      return { success: true, topLeft: node.topLeftRadius, topRight: node.topRightRadius, bottomRight: node.bottomRightRadius, bottomLeft: node.bottomLeftRadius };
    }

    case 'set_layout_positioning': {
      // params: nodeId, positioning — 'AUTO'|'ABSOLUTE'
      // 'ABSOLUTE' — node is taken out of auto-layout flow, positioned freely inside parent
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('layoutPositioning' in node)) throw new Error('Node does not support layoutPositioning');
      node.layoutPositioning = params.positioning;
      return { success: true, layoutPositioning: node.layoutPositioning };
    }

    case 'set_min_max_size': {
      // params: nodeId, minWidth?, maxWidth?, minHeight?, maxHeight?
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (params.minWidth !== undefined) node.minWidth = params.minWidth;
      if (params.maxWidth !== undefined) node.maxWidth = params.maxWidth;
      if (params.minHeight !== undefined) node.minHeight = params.minHeight;
      if (params.maxHeight !== undefined) node.maxHeight = params.maxHeight;
      return { success: true, minWidth: node.minWidth, maxWidth: node.maxWidth, minHeight: node.minHeight, maxHeight: node.maxHeight };
    }

    case 'boolean_operation': {
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
    }

    case 'set_instance_property': {
      // params: nodeId, properties { propName: value }
      // value for TEXT property: string
      // value for BOOLEAN property: true/false
      // value for INSTANCE_SWAP property: componentId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
      for (const [key, value] of Object.entries(params.properties)) {
        node.setProperties({ [key]: value });
      }
      return { success: true };
    }

    case 'get_instance_properties': {
      // params: nodeId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
      const mainComp = node.mainComponent;
      const defsSource = mainComp?.parent?.type === 'COMPONENT_SET' ? mainComp.parent : mainComp;
      const defs = defsSource?.componentPropertyDefinitions ?? {};
      const vals = node.componentProperties ?? {};
      const result = {};
      for (const [key, def] of Object.entries(defs)) {
        result[key] = {
          type: def.type,
          defaultValue: def.defaultValue,
          currentValue: vals[key]?.value ?? def.defaultValue,
          ...(def.variantOptions ? { options: def.variantOptions } : {}),
          ...(def.preferredValues ? { preferredValues: def.preferredValues } : {}),
        };
      }
      return result;
    }

    case 'swap_instance': {
      // params: nodeId, componentId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
      const comp = await figma.getNodeByIdAsync(params.componentId);
      if (!comp || comp.type !== 'COMPONENT') throw new Error(`Not a component: ${params.componentId}`);
      node.swapComponent(comp);
      return { success: true, nodeId: node.id, newComponentId: comp.id, newComponentName: comp.name };
    }

    case 'create_component': {
      // params: name, width, height, x?, y?, parentId?
      const comp = figma.createComponent();
      comp.name = params.name ?? 'Component';
      comp.resize(params.width ?? 100, params.height ?? 100);
      if (params.x !== undefined) comp.x = params.x;
      if (params.y !== undefined) comp.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && 'appendChild' in parent) parent.appendChild(comp);
      }
      return { success: true, ...nodeInfo(comp) };
    }

    case 'create_ellipse': {
      // params: name?, width, height, x?, y?, fill?, stroke?, strokeWeight?, parentId?
      const ellipse = figma.createEllipse();
      ellipse.name = params.name ?? 'Ellipse';
      ellipse.resize(params.width ?? 100, params.height ?? 100);
      if (params.x !== undefined) ellipse.x = params.x;
      if (params.y !== undefined) ellipse.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && 'appendChild' in parent) parent.appendChild(ellipse);
      }
      if (params.fill !== undefined) ellipse.fills = [{ type: 'SOLID', color: params.fill, opacity: params.fillOpacity ?? 1 }];
      if (params.stroke !== undefined) {
        ellipse.strokes = [{ type: 'SOLID', color: params.stroke }];
        ellipse.strokeWeight = params.strokeWeight ?? 1;
      }
      return { success: true, ...nodeInfo(ellipse) };
    }

    case 'create_line': {
      // params: name?, x?, y?, length?, rotation?, stroke?, strokeWeight?, parentId?
      const line = figma.createLine();
      line.name = params.name ?? 'Line';
      if (params.x !== undefined) line.x = params.x;
      if (params.y !== undefined) line.y = params.y;
      if (params.length !== undefined) line.resize(params.length, 0);
      if (params.rotation !== undefined) line.rotation = params.rotation;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && 'appendChild' in parent) parent.appendChild(line);
      }
      if (params.stroke !== undefined) {
        line.strokes = [{ type: 'SOLID', color: params.stroke }];
        line.strokeWeight = params.strokeWeight ?? 1;
      }
      return { success: true, ...nodeInfo(line) };
    }

    case 'set_image_fill': {
      // params: nodeId, url? | base64? (one of them), mimeType? (default 'image/png'), scaleMode? ('FILL'|'FIT'|'CROP'|'TILE')
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
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
    }

    case 'apply_text_style': {
      // params: nodeId, styleId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
      node.textStyleId = params.styleId;
      return { success: true };
    }

    case 'rotate': {
      // params: nodeId, angle (degrees, clockwise)
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('rotation' in node)) throw new Error('Node does not support rotation');
      node.rotation = params.angle;
      return { success: true, rotation: node.rotation };
    }

    case 'set_constraints': {
      // params: nodeId, horizontal, vertical
      // horizontal: 'MIN'|'MAX'|'STRETCH'|'CENTER'|'SCALE'
      // vertical:   'MIN'|'MAX'|'STRETCH'|'CENTER'|'SCALE'
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('constraints' in node)) throw new Error('Node does not support constraints');
      node.constraints = {
        horizontal: params.horizontal ?? node.constraints.horizontal,
        vertical: params.vertical ?? node.constraints.vertical,
      };
      return { success: true, constraints: node.constraints };
    }

    case 'get_constraints': {
      // params: nodeId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('constraints' in node)) throw new Error('Node does not support constraints');
      return { nodeId: node.id, constraints: node.constraints };
    }

    case 'reset_instance': {
      // params: nodeId — reset all overrides on a component instance
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
      node.resetOverrides();
      return { success: true };
    }

    case 'detach_instance': {
      // params: nodeId — detach instance from its main component
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
      const frame = node.detachInstance();
      return { success: true, ...nodeInfo(frame) };
    }

    case 'export_svg': {
      // params: nodeId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const bytes = await node.exportAsync({ format: 'SVG' });
      const chunks = [];
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
      }
      const svg = chunks.join('');
      return { svg };
    }

    case 'set_fills': {
      // params: nodeId, fills — array of fill objects
      // Each fill: { type: 'SOLID', color: {r,g,b}, opacity? }
      //            { type: 'GRADIENT_LINEAR'|'GRADIENT_RADIAL', gradientStops: [{color:{r,g,b,a}, position}], gradientTransform? }
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('fills' in node)) throw new Error('Node does not support fills');
      node.fills = params.fills;
      return { success: true };
    }

    case 'add_fill': {
      // params: nodeId, fill — appends a fill to the existing stack
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('fills' in node)) throw new Error('Node does not support fills');
      node.fills = [...node.fills, params.fill];
      return { success: true, fillCount: node.fills.length };
    }

    case 'remove_fill': {
      // params: nodeId, index (default: last)
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('fills' in node)) throw new Error('Node does not support fills');
      const fills = [...node.fills];
      const idx = params.index ?? fills.length - 1;
      fills.splice(idx, 1);
      node.fills = fills;
      return { success: true, fillCount: node.fills.length };
    }

    // ── Search ────────────────────────────────────────────────────────────────

    case 'find_nodes': {
      // params: name? (substring, case-insensitive), text? (exact text content),
      //         type? (node type), scopeId?, limit?
      const scopeNode = params.scopeId
        ? await figma.getNodeByIdAsync(params.scopeId)
        : figma.currentPage;
      if (!scopeNode) throw new Error(`Scope not found`);
      const limit = params.limit ?? 50;
      const results = [];
      const nameLower = params.name?.toLowerCase();
      const walk = (n) => {
        if (results.length >= limit) return;
        const matchName = !nameLower || n.name.toLowerCase().includes(nameLower);
        const matchType = !params.type || n.type === params.type;
        const matchText = !params.text || (n.type === 'TEXT' && n.characters === params.text);
        const matchTextContains = !params.textContains || (n.type === 'TEXT' && n.characters?.includes(params.textContains));
        if (matchName && matchType && (params.text ? matchText : true) && matchTextContains) {
          results.push(nodeInfo(n));
        }
        if ('children' in n) n.children.forEach(walk);
      };
      if ('children' in scopeNode) scopeNode.children.forEach(walk);
      return results;
    }

    // ── Pages ─────────────────────────────────────────────────────────────────

    case 'get_pages': {
      return figma.root.children.map(p => ({
        id: p.id,
        name: p.name,
        isCurrent: p.id === figma.currentPage.id,
      }));
    }

    case 'switch_page': {
      // params: pageId
      const page = figma.root.children.find(p => p.id === params.pageId);
      if (!page) throw new Error(`Page not found: ${params.pageId}`);
      figma.currentPage = page;
      return { success: true, pageId: page.id, pageName: page.name };
    }

    case 'create_page': {
      // params: name, index? (position, default: end)
      const page = figma.createPage();
      page.name = params.name ?? 'Page';
      if (params.index !== undefined) figma.root.insertChild(params.index, page);
      return { id: page.id, name: page.name };
    }

    case 'delete_page': {
      // params: pageId
      if (figma.root.children.length <= 1) throw new Error('Cannot delete the only page');
      const page = figma.root.children.find(p => p.id === params.pageId);
      if (!page) throw new Error(`Page not found: ${params.pageId}`);
      page.remove();
      return { success: true };
    }

    case 'rename_page': {
      // params: pageId, name
      const page = figma.root.children.find(p => p.id === params.pageId);
      if (!page) throw new Error(`Page not found: ${params.pageId}`);
      page.name = params.name;
      return { success: true, pageId: page.id, name: page.name };
    }

    // ── Viewport & selection ──────────────────────────────────────────────────

    case 'scroll_to_node': {
      // params: nodeId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      figma.viewport.scrollAndZoomIntoView([node]);
      return { success: true };
    }

    case 'set_selection': {
      // params: nodeIds (array)
      const nodes = await Promise.all(params.nodeIds.map(id => figma.getNodeByIdAsync(id)));
      const valid = nodes.filter(Boolean);
      figma.currentPage.selection = valid;
      return { success: true, selected: valid.map(n => n.id) };
    }

    case 'notify': {
      // params: message, error? (boolean, shows red toast)
      figma.notify(params.message, { error: params.error ?? false });
      return { success: true };
    }

    // ── Layer order ───────────────────────────────────────────────────────────

    case 'reorder': {
      // params: nodeId, index (position within parent's children)
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const parent = node.parent;
      if (!parent || !('insertChild' in parent)) throw new Error('Node has no reorderable parent');
      parent.insertChild(params.index, node);
      return { success: true, index: params.index };
    }

    case 'bring_to_front': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const parent = node.parent;
      if (!parent || !('insertChild' in parent)) throw new Error('Node has no reorderable parent');
      parent.insertChild(parent.children.length - 1, node);
      return { success: true };
    }

    case 'send_to_back': {
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const parent = node.parent;
      if (!parent || !('insertChild' in parent)) throw new Error('Node has no reorderable parent');
      parent.insertChild(0, node);
      return { success: true };
    }

    // ── Grouping ──────────────────────────────────────────────────────────────

    case 'group': {
      // params: nodeIds (array), parentId?, name?
      const nodes = await Promise.all(params.nodeIds.map(id => figma.getNodeByIdAsync(id)));
      const valid = nodes.filter(Boolean);
      if (valid.length === 0) throw new Error('No valid nodes to group');
      const parent = params.parentId
        ? await figma.getNodeByIdAsync(params.parentId)
        : valid[0].parent;
      const group = figma.group(valid, parent);
      if (params.name) group.name = params.name;
      return { success: true, ...nodeInfo(group) };
    }

    case 'ungroup': {
      // params: nodeId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (node.type !== 'GROUP') throw new Error('Node is not a group');
      const children = [...node.children].map(nodeInfo);
      figma.ungroup(node);
      return { success: true, children };
    }

    // ── Color & effect styles ─────────────────────────────────────────────────

    case 'get_local_styles': {
      // Returns all local styles grouped by type
      const result = { paint: [], text: [], effect: [], grid: [] };
      for (const s of figma.getLocalPaintStyles()) {
        result.paint.push({
          id: s.id, name: s.name,
          paints: s.paints.map(p => p.type === 'SOLID'
            ? { type: 'SOLID', r: Math.round(p.color.r*255), g: Math.round(p.color.g*255), b: Math.round(p.color.b*255), opacity: p.opacity ?? 1 }
            : { type: p.type }),
        });
      }
      for (const s of figma.getLocalTextStyles()) {
        result.text.push({
          id: s.id, name: s.name,
          fontFamily: s.fontName.family, fontStyle: s.fontName.style,
          fontSize: s.fontSize, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
        });
      }
      for (const s of figma.getLocalEffectStyles()) {
        result.effect.push({ id: s.id, name: s.name, effects: s.effects });
      }
      for (const s of figma.getLocalGridStyles()) {
        result.grid.push({ id: s.id, name: s.name });
      }
      return result;
    }

    case 'apply_paint_style': {
      // params: nodeId, styleId, target ('fills'|'strokes', default 'fills')
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      const target = params.target ?? 'fills';
      if (target === 'fills') {
        if (!('fillStyleId' in node)) throw new Error('Node does not support fill styles');
        node.fillStyleId = params.styleId;
      } else {
        if (!('strokeStyleId' in node)) throw new Error('Node does not support stroke styles');
        node.strokeStyleId = params.styleId;
      }
      return { success: true };
    }

    case 'apply_effect_style': {
      // params: nodeId, styleId
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('effectStyleId' in node)) throw new Error('Node does not support effect styles');
      node.effectStyleId = params.styleId;
      return { success: true };
    }

    case 'create_paint_style': {
      // params: name, color {r,g,b} (0-1), opacity?
      const style = figma.createPaintStyle();
      style.name = params.name;
      style.paints = [{ type: 'SOLID', color: params.color, opacity: params.opacity ?? 1 }];
      return { id: style.id, name: style.name };
    }

    case 'create_effect_style': {
      // params: name, effects (array of effect objects)
      const style = figma.createEffectStyle();
      style.name = params.name;
      if (params.effects) style.effects = params.effects;
      return { id: style.id, name: style.name };
    }

    // ── Sizing modes ──────────────────────────────────────────────────────────

    case 'set_sizing': {
      // params: nodeId, axis ('horizontal'|'vertical'|'both'),
      //         mode ('FIXED'|'HUG'|'FILL')
      // Requires the node to be inside an auto-layout frame for HUG/FILL
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);

      const mode = params.mode; // 'FIXED' | 'HUG' | 'FILL'
      const axis = params.axis ?? 'both';

      // primaryAxisSizingMode / counterAxisSizingMode apply to FRAME (auto-layout container itself)
      // layoutSizingHorizontal / layoutSizingVertical apply to children inside auto-layout
      const isFrame = node.type === 'FRAME';

      if (isFrame && 'primaryAxisSizingMode' in node) {
        // Setting sizing mode of the frame itself
        if (axis === 'horizontal' || axis === 'both') {
          node.layoutSizingHorizontal = mode;
        }
        if (axis === 'vertical' || axis === 'both') {
          node.layoutSizingVertical = mode;
        }
      } else {
        // Setting sizing mode of a child inside auto-layout
        if ('layoutSizingHorizontal' in node) {
          if (axis === 'horizontal' || axis === 'both') node.layoutSizingHorizontal = mode;
          if (axis === 'vertical' || axis === 'both') node.layoutSizingVertical = mode;
        } else {
          throw new Error('Node does not support layout sizing');
        }
      }
      return { success: true, nodeId: node.id, axis, mode };
    }

    case 'set_blend_mode': {
      // params: nodeId, blendMode
      // e.g. 'NORMAL'|'MULTIPLY'|'SCREEN'|'OVERLAY'|'DARKEN'|'LIGHTEN'|
      //      'COLOR_DODGE'|'COLOR_BURN'|'HARD_LIGHT'|'SOFT_LIGHT'|'DIFFERENCE'|
      //      'EXCLUSION'|'HUE'|'SATURATION'|'COLOR'|'LUMINOSITY'
      const node = await figma.getNodeByIdAsync(params.nodeId);
      if (!node) throw new Error(`Node not found: ${params.nodeId}`);
      if (!('blendMode' in node)) throw new Error('Node does not support blend modes');
      node.blendMode = params.blendMode;
      return { success: true };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

figma.ui.onmessage = async (msg) => {
  const { id, action, ...params } = msg;
  let result;
  try {
    result = await executeAction(action, params);
  } catch (e) {
    result = { error: e.message };
  }
  figma.ui.postMessage({ id, result });
};
