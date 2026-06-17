// Structural operations: reparenting, batching, layer order, grouping, pages, viewport.
import { requireNode, nodeInfo } from '../lib/helpers.js';

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
    const results = [];
    for (const sub of params.commands) {
      try {
        results.push(await dispatch(sub.action, sub));
      } catch (e) {
        results.push({ error: e.message });
      }
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
