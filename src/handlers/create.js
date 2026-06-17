// Creating new shapes and nodes.
import { requireNode, nodeInfo } from '../lib/helpers.js';

export const createHandlers = {
  async duplicate(params) {
    const node = await requireNode(params.nodeId);
    const clone = node.clone();
    if (params.x !== undefined) clone.x = params.x;
    if (params.y !== undefined) clone.y = params.y;
    return { success: true, id: clone.id, name: clone.name };
  },

  async create_frame(params) {
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
  },

  async create_rectangle(params) {
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
  },

  async create_text(params) {
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
  },

  async create_ellipse(params) {
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
  },

  async create_line(params) {
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
  },
};
