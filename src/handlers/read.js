// Read-only inspection actions.
import { nodeInfo, buildTree, requireNode, resolveScope } from '../lib/helpers.js';

export const readHandlers = {
  get_selection() {
    return figma.currentPage.selection.map(nodeInfo);
  },

  async get_node(params) {
    const node = await requireNode(params.nodeId);
    return { ...nodeInfo(node), visible: node.visible };
  },

  async get_parent(params) {
    const node = await requireNode(params.nodeId);
    const chain = [];
    let cur = node.parent;
    while (cur && cur.type !== 'PAGE' && cur.type !== 'DOCUMENT') {
      chain.push(nodeInfo(cur));
      cur = cur.parent;
    }
    return chain;
  },

  async get_tree(params) {
    const node = await requireNode(params.nodeId);
    return buildTree(node, params.depth ?? 2);
  },

  get_page_tree(params) {
    return buildTree(figma.currentPage, params.depth ?? 1);
  },

  get_page_nodes() {
    return figma.currentPage.children.map(n => ({
      id: n.id, name: n.name, type: n.type,
    }));
  },

  async get_children(params) {
    const node = await requireNode(params.nodeId);
    if (!('children' in node)) throw new Error('Node has no children');
    return node.children.map(nodeInfo);
  },

  async get_text(params) {
    const node = await requireNode(params.nodeId);
    if (node.type !== 'TEXT') throw new Error('Node is not a text layer');
    return { text: node.characters };
  },

  async get_text_style(params) {
    const node = await requireNode(params.nodeId);
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
  },

  async get_all_texts(params) {
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
  },

  async get_fills(params) {
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
    const node = await requireNode(params.nodeId);
    const chain = [];
    let n = node;
    let depth = 0;
    while (n && n.type !== 'PAGE' && depth < 8) {
      chain.push(extractFills(n));
      n = n.parent;
      depth++;
    }
    return chain;
  },

  async get_annotations(params) {
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
  },

  async get_screenshot(params) {
    const node = await requireNode(params.nodeId);
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
  },

  async find_all_instances(params) {
    // Walk scope (scopeId or current page), collect all INSTANCE nodes
    const scopeNode = await resolveScope(params.scopeId);
    const nodes = scopeNode.findAllWithCriteria({ types: ['INSTANCE'] });
    return Promise.all(nodes.map(async n => {
      const mc = await n.getMainComponentAsync();
      return {
        id: n.id,
        name: n.name,
        mainComponentId: mc ? mc.id : null,
        mainComponentName: mc ? mc.name : null,
        x: 'x' in n ? n.x : null,
        y: 'y' in n ? n.y : null,
      };
    }));
  },

  async get_local_components(params) {
    const scopeNode = await resolveScope(params.scopeId);
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
  },

  async find_nodes(params) {
    // params: name? (substring, case-insensitive), text? (exact text content),
    //         type? (node type), scopeId?, limit?
    const scopeNode = await resolveScope(params.scopeId);
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
  },

  async export_svg(params) {
    const node = await requireNode(params.nodeId);
    const bytes = await node.exportAsync({ format: 'SVG' });
    const chunks = [];
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
    }
    const svg = chunks.join('');
    return { svg };
  },
};
