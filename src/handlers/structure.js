// Structural operations: reparenting, batching, layer order, grouping, pages, viewport.
import { requireNode, nodeInfo } from '../lib/helpers.js';

// Resolve { "$ref": "<index-or-label>.<path>" } markers in a batch command's params
// against the results of earlier commands in the same batch. Plain values pass through,
// so commands without any $ref behave exactly as before.
function resolveRefs(value, scope) {
  if (Array.isArray(value)) return value.map(v => resolveRefs(v, scope));
  if (value && typeof value === 'object') {
    if (typeof value.$ref === 'string') return lookupRef(value.$ref, scope);
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveRefs(v, scope);
    return out;
  }
  return value;
}

function lookupRef(ref, scope) {
  const parts = ref.split('.');
  const key = parts[0];
  if (!(key in scope)) throw new Error(`batch ref "${ref}": no earlier command "${key}"`);
  let cur = scope[key];
  for (let i = 1; i < parts.length; i++) {
    if (cur == null) throw new Error(`batch ref "${ref}": "${parts.slice(0, i).join('.')}" is null`);
    cur = cur[parts[i]];
  }
  if (cur === undefined) throw new Error(`batch ref "${ref}": resolved to undefined`);
  return cur;
}

export const structureHandlers = {
  async reparent(params) {
    const node = await requireNode(params.nodeId);
    const newParent = await figma.getNodeByIdAsync(params.newParentId);
    if (!newParent) throw new Error(`New parent not found: ${params.newParentId}`);
    if (!('appendChild' in newParent)) throw new Error('New parent cannot have children');
    newParent.appendChild(node);
    return { success: true, newParentId: newParent.id, x: 'x' in node ? node.x : null, y: 'y' in node ? node.y : null };
  },

  async batch(params, dispatch) {
    // Sub-commands run sequentially. A command's params may reference an earlier
    // result via { "$ref": "<index-or-label>.<path>" }; tag a command with
    // "as": "<label>" to reference it by name. Return shape is unchanged: one
    // result per command, in order (failed commands become { error }).
    const results = [];
    const scope = {};
    let i = 0;
    for (const sub of params.commands) {
      let result;
      try {
        const resolved = resolveRefs(sub, scope);
        result = await dispatch(resolved.action, resolved);
      } catch (e) {
        result = { error: e.message };
      }
      results.push(result);
      scope[String(i)] = result;
      if (sub.as) scope[sub.as] = result;
      i++;
    }
    return results;
  },

  async delete_node(params) {
    const node = await requireNode(params.nodeId);
    node.remove();
    return { success: true };
  },

  async reorder(params) {
    // params: nodeId, index (position within parent's children)
    const node = await requireNode(params.nodeId);
    const parent = node.parent;
    if (!parent || !('insertChild' in parent)) throw new Error('Node has no reorderable parent');
    parent.insertChild(params.index, node);
    return { success: true, index: params.index };
  },

  async bring_to_front(params) {
    const node = await requireNode(params.nodeId);
    const parent = node.parent;
    if (!parent || !('insertChild' in parent)) throw new Error('Node has no reorderable parent');
    parent.insertChild(parent.children.length - 1, node);
    return { success: true };
  },

  async send_to_back(params) {
    const node = await requireNode(params.nodeId);
    const parent = node.parent;
    if (!parent || !('insertChild' in parent)) throw new Error('Node has no reorderable parent');
    parent.insertChild(0, node);
    return { success: true };
  },

  async group(params) {
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
  },

  async ungroup(params) {
    // params: nodeId
    const node = await requireNode(params.nodeId);
    if (node.type !== 'GROUP') throw new Error('Node is not a group');
    const children = [...node.children].map(nodeInfo);
    figma.ungroup(node);
    return { success: true, children };
  },

  async create_section(params) {
    // params: name?, x?, y?, width?, height?, parentId?
    const section = figma.createSection();
    section.name = params.name ?? 'Section';
    if (params.x !== undefined) section.x = params.x;
    if (params.y !== undefined) section.y = params.y;
    if (params.width !== undefined && params.height !== undefined) {
      section.resizeWithoutConstraints(params.width, params.height);
    }
    if (params.parentId) {
      const parent = await figma.getNodeByIdAsync(params.parentId);
      if (parent && 'appendChild' in parent) parent.appendChild(section);
    }
    return { success: true, ...nodeInfo(section) };
  },

  async resize_section_to_fit(params) {
    // params: nodeId (a SECTION), padding? (default 100) — Figma's "Resize to fit".
    // Sections don't auto-resize; this reflows children to `padding` and resizes the
    // section to their bounding box, keeping the children's absolute canvas positions.
    const section = await requireNode(params.nodeId);
    if (section.type !== 'SECTION') throw new Error('Node is not a section');
    const pad = params.padding ?? 100;
    const children = section.children;
    if (!children.length) throw new Error('Section has no children');
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of children) {
      minX = Math.min(minX, c.x);            minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + c.width);  maxY = Math.max(maxY, c.y + c.height);
    }
    const dx = pad - minX, dy = pad - minY;
    for (const c of children) { c.x += dx; c.y += dy; }
    section.x -= dx; section.y -= dy;
    section.resizeWithoutConstraints((maxX - minX) + pad * 2, (maxY - minY) + pad * 2);
    return { success: true, ...nodeInfo(section) };
  },

  async scroll_to_node(params) {
    // params: nodeId
    const node = await requireNode(params.nodeId);
    figma.viewport.scrollAndZoomIntoView([node]);
    return { success: true };
  },

  async set_selection(params) {
    // params: nodeIds (array)
    const nodes = await Promise.all(params.nodeIds.map(id => figma.getNodeByIdAsync(id)));
    const valid = nodes.filter(Boolean);
    figma.currentPage.selection = valid;
    return { success: true, selected: valid.map(n => n.id) };
  },

  notify(params) {
    // params: message, error? (boolean, shows red toast)
    figma.notify(params.message, { error: params.error ?? false });
    return { success: true };
  },

  async get_pages() {
    await figma.loadAllPagesAsync();
    return figma.root.children.map(p => ({
      id: p.id,
      name: p.name,
      isCurrent: p.id === figma.currentPage.id,
    }));
  },

  async switch_page(params) {
    // params: pageId
    const page = await figma.getNodeByIdAsync(params.pageId);
    if (!page || page.type !== 'PAGE') throw new Error(`Page not found: ${params.pageId}`);
    await figma.setCurrentPageAsync(page);
    return { success: true, pageId: page.id, pageName: page.name };
  },

  async create_page(params) {
    // params: name, index? (position, default: end)
    const page = figma.createPage();
    page.name = params.name ?? 'Page';
    if (params.index !== undefined) {
      await figma.loadAllPagesAsync();
      figma.root.insertChild(params.index, page);
    }
    return { id: page.id, name: page.name };
  },

  async delete_page(params) {
    // params: pageId
    await figma.loadAllPagesAsync();
    if (figma.root.children.length <= 1) throw new Error('Cannot delete the only page');
    const page = figma.root.children.find(p => p.id === params.pageId);
    if (!page) throw new Error(`Page not found: ${params.pageId}`);
    page.remove();
    return { success: true };
  },

  async rename_page(params) {
    // params: pageId, name
    const page = await figma.getNodeByIdAsync(params.pageId);
    if (!page || page.type !== 'PAGE') throw new Error(`Page not found: ${params.pageId}`);
    page.name = params.name;
    return { success: true, pageId: page.id, name: page.name };
  },
};
