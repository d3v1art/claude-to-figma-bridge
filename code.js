(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __objRest = (source, exclude) => {
    var target = {};
    for (var prop in source)
      if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
        target[prop] = source[prop];
    if (source != null && __getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(source)) {
        if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
          target[prop] = source[prop];
      }
    return target;
  };

  // src/lib/helpers.js
  function base64ToBytes(b64) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++)
      lookup[chars.charCodeAt(i)] = i;
    const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
    const len = clean.length;
    const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
    const out = new Uint8Array(len * 3 / 4 - pad);
    let pos = 0;
    for (let i = 0; i < len; i += 4) {
      const a = lookup[clean.charCodeAt(i)], b = lookup[clean.charCodeAt(i + 1)];
      const c = lookup[clean.charCodeAt(i + 2)], d = lookup[clean.charCodeAt(i + 3)];
      out[pos++] = a << 2 | b >> 4;
      if (pos < out.length)
        out[pos++] = (b & 15) << 4 | c >> 2;
      if (pos < out.length)
        out[pos++] = (c & 3) << 6 | d;
    }
    return out;
  }
  function nodeInfo(n) {
    return {
      id: n.id,
      name: n.name,
      type: n.type,
      x: "x" in n ? n.x : null,
      y: "y" in n ? n.y : null,
      width: "width" in n ? n.width : null,
      height: "height" in n ? n.height : null,
      text: n.type === "TEXT" ? n.characters : null
    };
  }
  async function buildTree(n, depth) {
    const obj = nodeInfo(n);
    if (depth > 0 && "children" in n) {
      obj.children = [];
      for (const c of n.children) {
        obj.children.push(await buildTree(c, depth - 1));
      }
    }
    return obj;
  }
  async function requireNode(id) {
    const node = await figma.getNodeByIdAsync(id);
    if (!node)
      throw new Error(`Node not found: ${id}`);
    return node;
  }
  async function resolveScope(scopeId) {
    if (!scopeId)
      return figma.currentPage;
    const node = await figma.getNodeByIdAsync(scopeId);
    if (!node)
      throw new Error(`Scope node not found: ${scopeId}`);
    return node;
  }

  // src/handlers/read.js
  var readHandlers = {
    get_selection() {
      return figma.currentPage.selection.map(nodeInfo);
    },
    async get_node(params) {
      const node = await requireNode(params.nodeId);
      return __spreadProps(__spreadValues({}, nodeInfo(node)), { visible: node.visible });
    },
    async get_parent(params) {
      const node = await requireNode(params.nodeId);
      const chain = [];
      let cur = node.parent;
      while (cur && cur.type !== "PAGE" && cur.type !== "DOCUMENT") {
        chain.push(nodeInfo(cur));
        cur = cur.parent;
      }
      return chain;
    },
    async get_tree(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      return buildTree(node, (_a = params.depth) != null ? _a : 2);
    },
    get_page_tree(params) {
      var _a;
      return buildTree(figma.currentPage, (_a = params.depth) != null ? _a : 1);
    },
    get_page_nodes() {
      return figma.currentPage.children.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type
      }));
    },
    async get_children(params) {
      const node = await requireNode(params.nodeId);
      if (!("children" in node))
        throw new Error("Node has no children");
      return node.children.map(nodeInfo);
    },
    async get_text(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "TEXT")
        throw new Error("Node is not a text layer");
      return { text: node.characters };
    },
    async get_text_style(params) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i;
      const node = await requireNode(params.nodeId);
      if (node.type !== "TEXT")
        throw new Error("Node is not a text layer");
      const seg = node.getStyledTextSegments(["fontName", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textDecoration", "textCase"]);
      const first = seg[0] || {};
      return {
        fontFamily: (_b = (_a = first.fontName) == null ? void 0 : _a.family) != null ? _b : null,
        fontStyle: (_d = (_c = first.fontName) == null ? void 0 : _c.style) != null ? _d : null,
        fontSize: (_e = first.fontSize) != null ? _e : null,
        lineHeight: (_f = first.lineHeight) != null ? _f : null,
        letterSpacing: (_g = first.letterSpacing) != null ? _g : null,
        textDecoration: (_h = first.textDecoration) != null ? _h : null,
        textCase: (_i = first.textCase) != null ? _i : null,
        characters: node.characters
      };
    },
    async get_all_texts(params) {
      var _a;
      const scopeNode = params.scopeId ? await figma.getNodeByIdAsync(params.scopeId) : (_a = figma.currentPage.selection[0]) != null ? _a : figma.currentPage;
      if (!scopeNode)
        throw new Error("No scope node");
      const texts = scopeNode.findAllWithCriteria({ types: ["TEXT"] });
      return texts.map((n) => {
        let parentName = null;
        try {
          parentName = n.parent ? n.parent.name : null;
        } catch (e) {
        }
        return {
          id: n.id,
          name: n.name,
          text: n.characters,
          fontSize: typeof n.fontSize === "number" ? n.fontSize : null,
          parentName
        };
      });
    },
    async get_fills(params) {
      function extractFills(n2) {
        var _a;
        const result = { id: n2.id, name: n2.name, type: n2.type, fills: [], gradients: [] };
        if ("fills" in n2 && n2.fills) {
          for (const f of n2.fills) {
            if (!f.visible)
              continue;
            if (f.type === "SOLID") {
              result.fills.push({ r: Math.round(f.color.r * 255), g: Math.round(f.color.g * 255), b: Math.round(f.color.b * 255), opacity: (_a = f.opacity) != null ? _a : 1 });
            } else if (f.type.startsWith("GRADIENT_")) {
              result.gradients.push({ type: f.type, stops: f.gradientStops.map((s) => ({ r: Math.round(s.color.r * 255), g: Math.round(s.color.g * 255), b: Math.round(s.color.b * 255), a: s.color.a, position: s.position })) });
            }
          }
        }
        return result;
      }
      const node = await requireNode(params.nodeId);
      const chain = [];
      let n = node;
      let depth = 0;
      while (n && n.type !== "PAGE" && depth < 8) {
        chain.push(extractFills(n));
        n = n.parent;
        depth++;
      }
      return chain;
    },
    async get_annotations(params) {
      var _a, _b;
      const node = (_b = await figma.getNodeByIdAsync((_a = params.nodeId) != null ? _a : null)) != null ? _b : figma.currentPage;
      const result = { pluginData: {}, sharedData: {} };
      try {
        const keys = node.getPluginDataKeys();
        for (const k of keys)
          result.pluginData[k] = node.getPluginData(k);
      } catch (e) {
      }
      for (const ns of ["accessibility", "annotations", "a11y", "contrast", "figma", "com.figma.accessibility"]) {
        try {
          const sharedKeys = node.getSharedPluginDataKeys(ns);
          if (sharedKeys.length) {
            result.sharedData[ns] = {};
            for (const k of sharedKeys)
              result.sharedData[ns][k] = node.getSharedPluginData(ns, k);
          }
        } catch (e) {
        }
      }
      if (params.includeChildren && "children" in node) {
        result.childrenData = [];
        const textNodes = node.findAllWithCriteria({ types: ["TEXT"] });
        for (const t of textNodes) {
          const keys = t.getPluginDataKeys();
          if (keys.length) {
            const data = {};
            for (const k of keys)
              data[k] = t.getPluginData(k);
            result.childrenData.push({ id: t.id, name: t.name, text: t.characters, pluginData: data });
          }
        }
      }
      return result;
    },
    async get_screenshot(params) {
      var _a, _b, _c;
      const node = await requireNode(params.nodeId);
      const scale = (_a = params.scale) != null ? _a : 1;
      const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: scale } });
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      let base64 = "";
      for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i], b1 = (_b = bytes[i + 1]) != null ? _b : 0, b2 = (_c = bytes[i + 2]) != null ? _c : 0;
        base64 += chars[b0 >> 2] + chars[(b0 & 3) << 4 | b1 >> 4] + (i + 1 < bytes.length ? chars[(b1 & 15) << 2 | b2 >> 6] : "=") + (i + 2 < bytes.length ? chars[b2 & 63] : "=");
      }
      return { base64, mimeType: "image/png", width: Math.round(node.width * scale), height: Math.round(node.height * scale) };
    },
    async find_all_instances(params) {
      const scopeNode = await resolveScope(params.scopeId);
      const nodes = scopeNode.findAllWithCriteria({ types: ["INSTANCE"] });
      return Promise.all(nodes.map(async (n) => {
        const mc = await n.getMainComponentAsync();
        return {
          id: n.id,
          name: n.name,
          mainComponentId: mc ? mc.id : null,
          mainComponentName: mc ? mc.name : null,
          x: "x" in n ? n.x : null,
          y: "y" in n ? n.y : null
        };
      }));
    },
    async get_local_components(params) {
      const scopeNode = await resolveScope(params.scopeId);
      const comps = scopeNode.findAllWithCriteria({ types: ["COMPONENT", "COMPONENT_SET"] });
      return comps.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parent ? c.parent.id : null,
        parentName: c.parent ? c.parent.name : null,
        parentType: c.parent ? c.parent.type : null,
        childrenCount: "children" in c ? c.children.length : 0
      }));
    },
    async find_nodes(params) {
      var _a, _b;
      const scopeNode = await resolveScope(params.scopeId);
      const limit = (_a = params.limit) != null ? _a : 50;
      const results = [];
      const nameLower = (_b = params.name) == null ? void 0 : _b.toLowerCase();
      const walk = (n) => {
        var _a2;
        if (results.length >= limit)
          return;
        const matchName = !nameLower || n.name.toLowerCase().includes(nameLower);
        const matchType = !params.type || n.type === params.type;
        const matchText = !params.text || n.type === "TEXT" && n.characters === params.text;
        const matchTextContains = !params.textContains || n.type === "TEXT" && ((_a2 = n.characters) == null ? void 0 : _a2.includes(params.textContains));
        if (matchName && matchType && (params.text ? matchText : true) && matchTextContains) {
          results.push(nodeInfo(n));
        }
        if ("children" in n)
          n.children.forEach(walk);
      };
      if ("children" in scopeNode)
        scopeNode.children.forEach(walk);
      return results;
    },
    async export_svg(params) {
      const node = await requireNode(params.nodeId);
      const bytes = await node.exportAsync({ format: "SVG" });
      const chunks = [];
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
      }
      const svg = chunks.join("");
      return { svg };
    }
  };

  // src/handlers/edit.js
  var editHandlers = {
    async rename(params) {
      const node = await requireNode(params.nodeId);
      const oldName = node.name;
      node.name = params.name;
      return { success: true, oldName, newName: node.name };
    },
    async move(params) {
      const node = await requireNode(params.nodeId);
      if (!("x" in node))
        throw new Error("Node is not positionable");
      if (params.x !== void 0)
        node.x = params.x;
      if (params.y !== void 0)
        node.y = params.y;
      return { success: true, x: node.x, y: node.y };
    },
    async move_by(params) {
      var _a, _b;
      const node = await requireNode(params.nodeId);
      if (!("x" in node))
        throw new Error("Node is not positionable");
      node.x += (_a = params.dx) != null ? _a : 0;
      node.y += (_b = params.dy) != null ? _b : 0;
      return { success: true, x: node.x, y: node.y };
    },
    async resize(params) {
      var _a, _b;
      const node = await requireNode(params.nodeId);
      const w = (_a = params.width) != null ? _a : node.width;
      const h = (_b = params.height) != null ? _b : node.height;
      if ("resizeWithoutConstraints" in node) {
        node.resizeWithoutConstraints(w, h);
      } else if ("resize" in node) {
        node.resize(w, h);
      } else {
        throw new Error("Node is not resizable");
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
      if (node.type !== "TEXT")
        throw new Error("Node is not a text layer");
      const fonts = /* @__PURE__ */ new Map();
      for (const seg of node.getStyledTextSegments(["fontName"])) {
        fonts.set(JSON.stringify(seg.fontName), seg.fontName);
      }
      if (fonts.size === 0 && node.fontName !== figma.mixed) {
        fonts.set(JSON.stringify(node.fontName), node.fontName);
      }
      await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
      const oldText = node.characters;
      node.characters = params.text;
      return { success: true, oldText, newText: node.characters };
    },
    async set_fill(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      if (!("fills" in node))
        throw new Error("Node does not support fills");
      if (params.color === null) {
        node.fills = [];
      } else {
        node.fills = [{ type: "SOLID", color: params.color, opacity: (_a = params.opacity) != null ? _a : 1 }];
      }
      return { success: true };
    },
    async set_stroke(params) {
      const node = await requireNode(params.nodeId);
      if (!("strokes" in node))
        throw new Error("Node does not support strokes");
      if (params.color === null) {
        node.strokes = [];
      } else {
        node.strokes = [{ type: "SOLID", color: params.color }];
        if (params.weight !== void 0)
          node.strokeWeight = params.weight;
        if (params.align !== void 0)
          node.strokeAlign = params.align;
      }
      return { success: true };
    },
    async set_corner_radius(params) {
      const node = await requireNode(params.nodeId);
      if ("cornerRadius" in node) {
        node.cornerRadius = params.radius;
      } else {
        throw new Error("Node does not support corner radius");
      }
      return { success: true };
    },
    async set_opacity(params) {
      const node = await requireNode(params.nodeId);
      node.opacity = params.opacity;
      return { success: true };
    },
    async set_effect(params) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
      const node = await requireNode(params.nodeId);
      if (!("effects" in node))
        throw new Error("Node does not support effects");
      const effectType = (_a = params.effectType) != null ? _a : "DROP_SHADOW";
      const isBlur = effectType === "LAYER_BLUR" || effectType === "BACKGROUND_BLUR";
      const effect = isBlur ? { type: effectType, visible: true, radius: (_c = (_b = params.blur) != null ? _b : params.radius) != null ? _c : 8 } : {
        type: effectType,
        visible: true,
        blendMode: (_d = params.blendMode) != null ? _d : "NORMAL",
        color: __spreadProps(__spreadValues({}, (_e = params.color) != null ? _e : { r: 0, g: 0, b: 0 }), { a: (_g = (_f = params.opacity) != null ? _f : params.alpha) != null ? _g : 0.15 }),
        offset: { x: (_h = params.offsetX) != null ? _h : 0, y: (_i = params.offsetY) != null ? _i : 4 },
        radius: (_k = (_j = params.blur) != null ? _j : params.radius) != null ? _k : 8,
        spread: (_l = params.spread) != null ? _l : 0
      };
      node.effects = [...node.effects, effect];
      return { success: true };
    },
    async set_font(params) {
      var _a, _b;
      const node = await requireNode(params.nodeId);
      if (node.type !== "TEXT")
        throw new Error("Node is not a text layer");
      const family = (_a = params.family) != null ? _a : "Inter";
      const style = (_b = params.style) != null ? _b : "Regular";
      await figma.loadFontAsync({ family, style });
      node.fontName = { family, style };
      if (params.size !== void 0)
        node.fontSize = params.size;
      if (params.lineHeight !== void 0)
        node.lineHeight = { value: params.lineHeight, unit: "PIXELS" };
      if (params.letterSpacing !== void 0)
        node.letterSpacing = { value: params.letterSpacing, unit: "PERCENT" };
      return { success: true };
    },
    async set_layout(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "FRAME")
        throw new Error("Node is not a frame");
      if (params.mode !== void 0)
        node.layoutMode = params.mode;
      if (params.gap !== void 0)
        node.itemSpacing = params.gap;
      if (params.paddingTop !== void 0)
        node.paddingTop = params.paddingTop;
      if (params.paddingBottom !== void 0)
        node.paddingBottom = params.paddingBottom;
      if (params.paddingLeft !== void 0)
        node.paddingLeft = params.paddingLeft;
      if (params.paddingRight !== void 0)
        node.paddingRight = params.paddingRight;
      if (params.padding !== void 0) {
        node.paddingTop = node.paddingBottom = node.paddingLeft = node.paddingRight = params.padding;
      }
      if (params.align !== void 0)
        node.primaryAxisAlignItems = params.align;
      if (params.counterAlign !== void 0)
        node.counterAxisAlignItems = params.counterAlign;
      if (params.wrap !== void 0)
        node.layoutWrap = params.wrap ? "WRAP" : "NO_WRAP";
      return { success: true };
    },
    async set_strokes(params) {
      const node = await requireNode(params.nodeId);
      if (!("strokes" in node))
        throw new Error("Node does not support strokes");
      node.strokes = params.strokes;
      return { success: true };
    },
    async add_stroke(params) {
      const node = await requireNode(params.nodeId);
      if (!("strokes" in node))
        throw new Error("Node does not support strokes");
      node.strokes = [...node.strokes, params.stroke];
      return { success: true, strokeCount: node.strokes.length };
    },
    async remove_stroke(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      if (!("strokes" in node))
        throw new Error("Node does not support strokes");
      const strokes = [...node.strokes];
      const idx = (_a = params.index) != null ? _a : strokes.length - 1;
      strokes.splice(idx, 1);
      node.strokes = strokes;
      return { success: true, strokeCount: node.strokes.length };
    },
    async set_stroke_dash(params) {
      const node = await requireNode(params.nodeId);
      if (!("dashPattern" in node))
        throw new Error("Node does not support dash pattern");
      node.dashPattern = params.dashPattern;
      return { success: true, dashPattern: node.dashPattern };
    },
    async set_text_auto_resize(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "TEXT")
        throw new Error("Node is not a text layer");
      node.textAutoResize = params.mode;
      return { success: true, textAutoResize: node.textAutoResize };
    },
    async set_corner_radii(params) {
      const node = await requireNode(params.nodeId);
      if (!("topLeftRadius" in node))
        throw new Error("Node does not support individual corner radii");
      if (params.topLeft !== void 0)
        node.topLeftRadius = params.topLeft;
      if (params.topRight !== void 0)
        node.topRightRadius = params.topRight;
      if (params.bottomRight !== void 0)
        node.bottomRightRadius = params.bottomRight;
      if (params.bottomLeft !== void 0)
        node.bottomLeftRadius = params.bottomLeft;
      return { success: true, topLeft: node.topLeftRadius, topRight: node.topRightRadius, bottomRight: node.bottomRightRadius, bottomLeft: node.bottomLeftRadius };
    },
    async set_layout_positioning(params) {
      const node = await requireNode(params.nodeId);
      if (!("layoutPositioning" in node))
        throw new Error("Node does not support layoutPositioning");
      node.layoutPositioning = params.positioning;
      return { success: true, layoutPositioning: node.layoutPositioning };
    },
    async set_min_max_size(params) {
      const node = await requireNode(params.nodeId);
      if (params.minWidth !== void 0)
        node.minWidth = params.minWidth;
      if (params.maxWidth !== void 0)
        node.maxWidth = params.maxWidth;
      if (params.minHeight !== void 0)
        node.minHeight = params.minHeight;
      if (params.maxHeight !== void 0)
        node.maxHeight = params.maxHeight;
      return { success: true, minWidth: node.minWidth, maxWidth: node.maxWidth, minHeight: node.minHeight, maxHeight: node.maxHeight };
    },
    async set_fills(params) {
      const node = await requireNode(params.nodeId);
      if (!("fills" in node))
        throw new Error("Node does not support fills");
      node.fills = params.fills;
      return { success: true };
    },
    async add_fill(params) {
      const node = await requireNode(params.nodeId);
      if (!("fills" in node))
        throw new Error("Node does not support fills");
      node.fills = [...node.fills, params.fill];
      return { success: true, fillCount: node.fills.length };
    },
    async remove_fill(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      if (!("fills" in node))
        throw new Error("Node does not support fills");
      const fills = [...node.fills];
      const idx = (_a = params.index) != null ? _a : fills.length - 1;
      fills.splice(idx, 1);
      node.fills = fills;
      return { success: true, fillCount: node.fills.length };
    },
    async set_image_fill(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      if (!("fills" in node))
        throw new Error("Node does not support fills");
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
        throw new Error("Provide url or base64");
      }
      node.fills = [{
        type: "IMAGE",
        imageHash,
        scaleMode: (_a = params.scaleMode) != null ? _a : "FILL"
      }];
      return { success: true };
    },
    async rotate(params) {
      const node = await requireNode(params.nodeId);
      if (!("rotation" in node))
        throw new Error("Node does not support rotation");
      node.rotation = params.angle;
      return { success: true, rotation: node.rotation };
    },
    async set_constraints(params) {
      var _a, _b;
      const node = await requireNode(params.nodeId);
      if (!("constraints" in node))
        throw new Error("Node does not support constraints");
      node.constraints = {
        horizontal: (_a = params.horizontal) != null ? _a : node.constraints.horizontal,
        vertical: (_b = params.vertical) != null ? _b : node.constraints.vertical
      };
      return { success: true, constraints: node.constraints };
    },
    async get_constraints(params) {
      const node = await requireNode(params.nodeId);
      if (!("constraints" in node))
        throw new Error("Node does not support constraints");
      return { nodeId: node.id, constraints: node.constraints };
    },
    async boolean_operation(params) {
      const nodes = await Promise.all(params.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
      const valid = nodes.filter(Boolean);
      if (valid.length < 2)
        throw new Error("Need at least 2 nodes for boolean operation");
      const parent = valid[0].parent;
      let result;
      switch (params.operation) {
        case "UNION":
          result = figma.union(valid, parent);
          break;
        case "INTERSECT":
          result = figma.intersect(valid, parent);
          break;
        case "SUBTRACT":
          result = figma.subtract(valid, parent);
          break;
        case "EXCLUDE":
          result = figma.exclude(valid, parent);
          break;
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }
      if (params.name)
        result.name = params.name;
      return __spreadValues({ success: true }, nodeInfo(result));
    },
    async set_sizing(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      const mode = params.mode;
      const axis = (_a = params.axis) != null ? _a : "both";
      const isFrame = node.type === "FRAME";
      if (isFrame && "primaryAxisSizingMode" in node) {
        if (axis === "horizontal" || axis === "both")
          node.layoutSizingHorizontal = mode;
        if (axis === "vertical" || axis === "both")
          node.layoutSizingVertical = mode;
      } else {
        if ("layoutSizingHorizontal" in node) {
          if (axis === "horizontal" || axis === "both")
            node.layoutSizingHorizontal = mode;
          if (axis === "vertical" || axis === "both")
            node.layoutSizingVertical = mode;
        } else {
          throw new Error("Node does not support layout sizing");
        }
      }
      return { success: true, nodeId: node.id, axis, mode };
    },
    async set_blend_mode(params) {
      const node = await requireNode(params.nodeId);
      if (!("blendMode" in node))
        throw new Error("Node does not support blend modes");
      node.blendMode = params.blendMode;
      return { success: true };
    }
  };

  // src/handlers/create.js
  var createHandlers = {
    async duplicate(params) {
      const node = await requireNode(params.nodeId);
      const clone = node.clone();
      if (params.x !== void 0)
        clone.x = params.x;
      if (params.y !== void 0)
        clone.y = params.y;
      return { success: true, id: clone.id, name: clone.name };
    },
    async create_frame(params) {
      var _a, _b, _c, _d;
      const frame = figma.createFrame();
      frame.name = (_a = params.name) != null ? _a : "Frame";
      frame.resize((_b = params.width) != null ? _b : 100, (_c = params.height) != null ? _c : 100);
      if (params.x !== void 0)
        frame.x = params.x;
      if (params.y !== void 0)
        frame.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && "appendChild" in parent)
          parent.appendChild(frame);
      }
      if (params.fill !== void 0) {
        frame.fills = [{ type: "SOLID", color: params.fill, opacity: (_d = params.fillOpacity) != null ? _d : 1 }];
      } else {
        frame.fills = [];
      }
      if (params.cornerRadius !== void 0)
        frame.cornerRadius = params.cornerRadius;
      if (params.clipsContent !== void 0)
        frame.clipsContent = params.clipsContent;
      return __spreadValues({ success: true }, nodeInfo(frame));
    },
    async create_rectangle(params) {
      var _a, _b, _c, _d, _e;
      const rect = figma.createRectangle();
      rect.name = (_a = params.name) != null ? _a : "Rectangle";
      rect.resize((_b = params.width) != null ? _b : 100, (_c = params.height) != null ? _c : 100);
      if (params.x !== void 0)
        rect.x = params.x;
      if (params.y !== void 0)
        rect.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && "appendChild" in parent)
          parent.appendChild(rect);
      }
      if (params.fill !== void 0)
        rect.fills = [{ type: "SOLID", color: params.fill, opacity: (_d = params.fillOpacity) != null ? _d : 1 }];
      if (params.cornerRadius !== void 0)
        rect.cornerRadius = params.cornerRadius;
      if (params.stroke !== void 0) {
        rect.strokes = [{ type: "SOLID", color: params.stroke }];
        rect.strokeWeight = (_e = params.strokeWeight) != null ? _e : 1;
      }
      return __spreadValues({ success: true }, nodeInfo(rect));
    },
    async create_text(params) {
      var _a, _b, _c, _d, _e, _f;
      const text = figma.createText();
      text.name = (_a = params.name) != null ? _a : "Text";
      await figma.loadFontAsync({ family: (_b = params.fontFamily) != null ? _b : "Inter", style: (_c = params.fontStyle) != null ? _c : "Regular" });
      text.fontName = { family: (_d = params.fontFamily) != null ? _d : "Inter", style: (_e = params.fontStyle) != null ? _e : "Regular" };
      text.characters = (_f = params.text) != null ? _f : "";
      if (params.fontSize !== void 0)
        text.fontSize = params.fontSize;
      if (params.x !== void 0)
        text.x = params.x;
      if (params.y !== void 0)
        text.y = params.y;
      if (params.fill !== void 0)
        text.fills = [{ type: "SOLID", color: params.fill }];
      if (params.textAlignHorizontal !== void 0)
        text.textAlignHorizontal = params.textAlignHorizontal;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && "appendChild" in parent)
          parent.appendChild(text);
      }
      return __spreadValues({ success: true }, nodeInfo(text));
    },
    async create_ellipse(params) {
      var _a, _b, _c, _d, _e;
      const ellipse = figma.createEllipse();
      ellipse.name = (_a = params.name) != null ? _a : "Ellipse";
      ellipse.resize((_b = params.width) != null ? _b : 100, (_c = params.height) != null ? _c : 100);
      if (params.x !== void 0)
        ellipse.x = params.x;
      if (params.y !== void 0)
        ellipse.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && "appendChild" in parent)
          parent.appendChild(ellipse);
      }
      if (params.fill !== void 0)
        ellipse.fills = [{ type: "SOLID", color: params.fill, opacity: (_d = params.fillOpacity) != null ? _d : 1 }];
      if (params.stroke !== void 0) {
        ellipse.strokes = [{ type: "SOLID", color: params.stroke }];
        ellipse.strokeWeight = (_e = params.strokeWeight) != null ? _e : 1;
      }
      return __spreadValues({ success: true }, nodeInfo(ellipse));
    },
    async create_line(params) {
      var _a, _b;
      const line = figma.createLine();
      line.name = (_a = params.name) != null ? _a : "Line";
      if (params.x !== void 0)
        line.x = params.x;
      if (params.y !== void 0)
        line.y = params.y;
      if (params.length !== void 0)
        line.resize(params.length, 0);
      if (params.rotation !== void 0)
        line.rotation = params.rotation;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && "appendChild" in parent)
          parent.appendChild(line);
      }
      if (params.stroke !== void 0) {
        line.strokes = [{ type: "SOLID", color: params.stroke }];
        line.strokeWeight = (_b = params.strokeWeight) != null ? _b : 1;
      }
      return __spreadValues({ success: true }, nodeInfo(line));
    }
  };

  // src/handlers/variables.js
  var variablesHandlers = {
    async get_variables() {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      return Promise.all(collections.map(async (col) => ({
        id: col.id,
        name: col.name,
        modes: col.modes,
        defaultModeId: col.defaultModeId,
        variables: (await Promise.all(col.variableIds.map(async (vid) => {
          const v = await figma.variables.getVariableByIdAsync(vid);
          if (!v)
            return null;
          return {
            id: v.id,
            name: v.name,
            type: v.resolvedType,
            values: Object.fromEntries(
              await Promise.all(Object.entries(v.valuesByMode).map(async ([modeId, val]) => {
                if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") {
                  const ref = await figma.variables.getVariableByIdAsync(val.id);
                  return [modeId, { alias: ref ? ref.name : val.id }];
                }
                return [modeId, val];
              }))
            )
          };
        }))).filter(Boolean)
      })));
    },
    async get_variable(params) {
      const v = await figma.variables.getVariableByIdAsync(params.variableId);
      if (!v)
        throw new Error(`Variable not found: ${params.variableId}`);
      const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
      return {
        id: v.id,
        name: v.name,
        type: v.resolvedType,
        collection: col ? { id: col.id, name: col.name, modes: col.modes } : null,
        values: Object.fromEntries(
          await Promise.all(Object.entries(v.valuesByMode).map(async ([modeId, val]) => {
            if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") {
              const ref = await figma.variables.getVariableByIdAsync(val.id);
              return [modeId, { alias: ref ? ref.name : val.id, aliasId: val.id }];
            }
            return [modeId, val];
          }))
        )
      };
    },
    create_variable_collection(params) {
      const col = figma.variables.createVariableCollection(params.name);
      const modeNames = params.modes || ["Value"];
      col.renameMode(col.modes[0].modeId, modeNames[0]);
      for (let i = 1; i < modeNames.length; i++) {
        col.addMode(modeNames[i]);
      }
      return { id: col.id, name: col.name, modes: col.modes };
    },
    async create_variable(params) {
      const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
      if (!col)
        throw new Error(`Collection not found: ${params.collectionId}`);
      const variable = figma.variables.createVariable(params.name, col, params.type);
      if (params.values) {
        for (const [modeId, value] of Object.entries(params.values)) {
          variable.setValueForMode(modeId, value);
        }
      }
      return { id: variable.id, name: variable.name, type: variable.resolvedType };
    },
    async update_variable(params) {
      const v = await figma.variables.getVariableByIdAsync(params.variableId);
      if (!v)
        throw new Error(`Variable not found: ${params.variableId}`);
      for (const [modeId, value] of Object.entries(params.values)) {
        v.setValueForMode(modeId, value);
      }
      return { id: v.id, name: v.name, type: v.resolvedType };
    },
    async delete_variable(params) {
      const v = await figma.variables.getVariableByIdAsync(params.variableId);
      if (!v)
        throw new Error(`Variable not found: ${params.variableId}`);
      v.remove();
      return { success: true };
    },
    async apply_variable(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      const v = await figma.variables.getVariableByIdAsync(params.variableId);
      if (!v)
        throw new Error(`Variable not found: ${params.variableId}`);
      const prop = params.property;
      if (prop === "fills" || prop === "strokes") {
        const paints = node[prop];
        if (!paints || paints.length === 0)
          throw new Error(`Node has no ${prop}`);
        const index = (_a = params.index) != null ? _a : 0;
        const bound = figma.variables.setBoundVariableForPaint(paints[index], "color", v);
        const updated = [...paints];
        updated[index] = bound;
        node[prop] = updated;
      } else {
        node.setBoundVariable(prop, v);
      }
      return { success: true, nodeId: node.id, property: prop, variableId: v.id, variableName: v.name };
    },
    async detach_variable(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      const prop = params.property;
      if (prop === "fills" || prop === "strokes") {
        const paints = node[prop];
        if (!paints || paints.length === 0)
          throw new Error(`Node has no ${prop}`);
        const index = (_a = params.index) != null ? _a : 0;
        const unbound = figma.variables.setBoundVariableForPaint(paints[index], "color", null);
        const updated = [...paints];
        updated[index] = unbound;
        node[prop] = updated;
      } else {
        node.setBoundVariable(prop, null);
      }
      return { success: true };
    },
    async get_variable_bindings(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      const result = { nodeId: node.id, name: node.name, bindings: {} };
      const resolve = async (b) => {
        if (!b || !b.id)
          return null;
        const v = await figma.variables.getVariableByIdAsync(b.id);
        return v ? { id: v.id, name: v.name, type: v.resolvedType } : { id: b.id };
      };
      if ("boundVariables" in node && node.boundVariables) {
        for (const [prop, binding] of Object.entries(node.boundVariables)) {
          if (!binding)
            continue;
          result.bindings[prop] = Array.isArray(binding) ? await Promise.all(binding.map(resolve)) : await resolve(binding);
        }
      }
      for (const paintProp of ["fills", "strokes"]) {
        if (!(paintProp in node) || !node[paintProp])
          continue;
        const paints = node[paintProp];
        const paintBindings = [];
        for (const paint of paints) {
          if ((_a = paint.boundVariables) == null ? void 0 : _a.color) {
            const v = await figma.variables.getVariableByIdAsync(paint.boundVariables.color.id);
            paintBindings.push(v ? { id: v.id, name: v.name, type: v.resolvedType } : null);
          } else {
            paintBindings.push(null);
          }
        }
        if (paintBindings.some((b) => b !== null)) {
          result.bindings[paintProp] = paintBindings;
        }
      }
      return result;
    },
    async add_mode(params) {
      const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
      if (!col)
        throw new Error(`Collection not found: ${params.collectionId}`);
      const modeId = col.addMode(params.name);
      return { success: true, collectionId: col.id, modeId, modeName: params.name, modes: col.modes };
    },
    async rename_mode(params) {
      const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
      if (!col)
        throw new Error(`Collection not found: ${params.collectionId}`);
      col.renameMode(params.modeId, params.name);
      return { success: true, collectionId: col.id, modeId: params.modeId, modes: col.modes };
    },
    async remove_mode(params) {
      const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
      if (!col)
        throw new Error(`Collection not found: ${params.collectionId}`);
      col.removeMode(params.modeId);
      return { success: true, collectionId: col.id, modes: col.modes };
    },
    async switch_mode(params) {
      const node = await requireNode(params.nodeId);
      if (!("setExplicitVariableModeForCollection" in node)) {
        throw new Error("Node does not support explicit variable modes");
      }
      const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
      if (!col)
        throw new Error(`Collection not found: ${params.collectionId}`);
      node.setExplicitVariableModeForCollection(col, params.modeId);
      return { success: true, nodeId: node.id, collectionId: params.collectionId, modeId: params.modeId };
    },
    async reset_mode(params) {
      const node = await requireNode(params.nodeId);
      if (!("clearExplicitVariableModeForCollection" in node)) {
        throw new Error("Node does not support explicit variable modes");
      }
      const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
      if (!col)
        throw new Error(`Collection not found: ${params.collectionId}`);
      node.clearExplicitVariableModeForCollection(col);
      return { success: true };
    }
  };

  // src/handlers/components.js
  var componentsHandlers = {
    async create_instance(params) {
      const comp = await figma.getNodeByIdAsync(params.componentId);
      if (!comp || comp.type !== "COMPONENT")
        throw new Error(`Not a component: ${params.componentId}`);
      const instance = comp.createInstance();
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (!parent)
          throw new Error(`Parent not found: ${params.parentId}`);
        parent.appendChild(instance);
      }
      if (params.x !== void 0)
        instance.x = params.x;
      if (params.y !== void 0)
        instance.y = params.y;
      return { id: instance.id, name: instance.name, type: instance.type, x: instance.x, y: instance.y };
    },
    async add_component_property(params) {
      var _a;
      const node = await requireNode(params.componentId);
      if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET")
        throw new Error("Node is not a component");
      const key = node.addComponentProperty(params.name, params.type, (_a = params.defaultValue) != null ? _a : "");
      return { key, name: params.name, type: params.type };
    },
    async set_property_reference(params) {
      const node = await requireNode(params.nodeId);
      node.componentPropertyReferences = params.references;
      return { success: true, nodeId: params.nodeId, references: params.references };
    },
    async get_component_properties(params) {
      const node = await requireNode(params.nodeId);
      if (!("componentPropertyDefinitions" in node))
        throw new Error("Node has no component properties");
      return node.componentPropertyDefinitions;
    },
    async combine_as_variants(params) {
      const components = [];
      for (const id of params.componentIds) {
        const node = await figma.getNodeByIdAsync(id);
        if (!node || node.type !== "COMPONENT")
          throw new Error(`Not a component: ${id}`);
        components.push(node);
      }
      const parent = params.parentId ? await figma.getNodeByIdAsync(params.parentId) : components[0].parent;
      const set = figma.combineAsVariants(components, parent);
      if (params.name)
        set.name = params.name;
      return { id: set.id, name: set.name, type: set.type, x: set.x, y: set.y, width: set.width, height: set.height };
    },
    async create_component_from_node(params) {
      const node = await requireNode(params.nodeId);
      const component = figma.createComponentFromNode(node);
      if (params.name)
        component.name = params.name;
      return { id: component.id, name: component.name, type: component.type };
    },
    async create_component(params) {
      var _a, _b, _c;
      const comp = figma.createComponent();
      comp.name = (_a = params.name) != null ? _a : "Component";
      comp.resize((_b = params.width) != null ? _b : 100, (_c = params.height) != null ? _c : 100);
      if (params.x !== void 0)
        comp.x = params.x;
      if (params.y !== void 0)
        comp.y = params.y;
      if (params.parentId) {
        const parent = await figma.getNodeByIdAsync(params.parentId);
        if (parent && "appendChild" in parent)
          parent.appendChild(comp);
      }
      return __spreadValues({ success: true }, nodeInfo(comp));
    },
    async set_instance_property(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "INSTANCE")
        throw new Error("Node is not a component instance");
      for (const [key, value] of Object.entries(params.properties)) {
        node.setProperties({ [key]: value });
      }
      return { success: true };
    },
    async get_instance_properties(params) {
      var _a, _b, _c, _d, _e;
      const node = await requireNode(params.nodeId);
      if (node.type !== "INSTANCE")
        throw new Error("Node is not a component instance");
      const mainComp = await node.getMainComponentAsync();
      const defsSource = ((_a = mainComp == null ? void 0 : mainComp.parent) == null ? void 0 : _a.type) === "COMPONENT_SET" ? mainComp.parent : mainComp;
      const defs = (_b = defsSource == null ? void 0 : defsSource.componentPropertyDefinitions) != null ? _b : {};
      const vals = (_c = node.componentProperties) != null ? _c : {};
      const result = {};
      for (const [key, def] of Object.entries(defs)) {
        result[key] = __spreadValues(__spreadValues({
          type: def.type,
          defaultValue: def.defaultValue,
          currentValue: (_e = (_d = vals[key]) == null ? void 0 : _d.value) != null ? _e : def.defaultValue
        }, def.variantOptions ? { options: def.variantOptions } : {}), def.preferredValues ? { preferredValues: def.preferredValues } : {});
      }
      return result;
    },
    async swap_instance(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "INSTANCE")
        throw new Error("Node is not a component instance");
      const comp = await figma.getNodeByIdAsync(params.componentId);
      if (!comp || comp.type !== "COMPONENT")
        throw new Error(`Not a component: ${params.componentId}`);
      node.swapComponent(comp);
      return { success: true, nodeId: node.id, newComponentId: comp.id, newComponentName: comp.name };
    },
    async reset_instance(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "INSTANCE")
        throw new Error("Node is not a component instance");
      node.resetOverrides();
      return { success: true };
    },
    async detach_instance(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "INSTANCE")
        throw new Error("Node is not a component instance");
      const frame = node.detachInstance();
      return __spreadValues({ success: true }, nodeInfo(frame));
    }
  };

  // src/handlers/audit.js
  var auditHandlers = {
    async audit_contrast(params) {
      var _a;
      function toLinear(c) {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      function luminance(r, g, b) {
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
      }
      function contrastRatio(l1, l2) {
        const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
        return (hi + 0.05) / (lo + 0.05);
      }
      function getSolidFill(node) {
        var _a2;
        if (!("fills" in node) || !node.fills || node.fills.length === 0)
          return null;
        for (const f of node.fills) {
          if (f.type === "SOLID" && f.visible !== false)
            return { r: f.color.r, g: f.color.g, b: f.color.b, opacity: (_a2 = f.opacity) != null ? _a2 : 1 };
        }
        return null;
      }
      function getGradientAvgColor(fills) {
        var _a2;
        for (const f of fills) {
          if (f.type && f.type.startsWith("GRADIENT_") && f.visible !== false && ((_a2 = f.gradientStops) == null ? void 0 : _a2.length)) {
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
        while (n && n.type !== "PAGE") {
          if ("fills" in n && n.fills) {
            const solid = getSolidFill(n);
            if (solid && solid.opacity > 0.1)
              return solid;
            const grad = getGradientAvgColor(n.fills);
            if (grad)
              return grad;
          }
          n = n.parent;
        }
        return { r: 1, g: 1, b: 1, opacity: 1 };
      }
      const scopeNode = await resolveScope(params.scopeId);
      const textNodes = scopeNode.findAllWithCriteria({ types: ["TEXT"] });
      const issues = [];
      for (const node of textNodes) {
        const tf = getSolidFill(node);
        if (tf) {
          const bg = getEffectiveBg(node);
          const ratio = contrastRatio(luminance(tf.r, tf.g, tf.b), luminance(bg.r, bg.g, bg.b));
          const size = typeof node.fontSize === "number" ? node.fontSize : 12;
          const bold = typeof node.fontWeight === "number" && node.fontWeight >= 700;
          const isLarge = size >= 18 || size >= 14 && bold;
          const required = isLarge ? 3 : 4.5;
          if (ratio < required) {
            issues.push({
              id: node.id,
              name: node.name,
              text: node.characters ? node.characters.slice(0, 60) : "",
              fontSize: size,
              bold,
              ratio: Math.round(ratio * 100) / 100,
              required,
              textColor: { r: Math.round(tf.r * 255), g: Math.round(tf.g * 255), b: Math.round(tf.b * 255) },
              bgColor: { r: Math.round(bg.r * 255), g: Math.round(bg.g * 255), b: Math.round(bg.b * 255) },
              bgIsGradient: (_a = bg.isGradient) != null ? _a : false
            });
          }
        }
      }
      return issues;
    },
    async audit_missing_components(params) {
      const scopeNode = await resolveScope(params.scopeId);
      const instances = scopeNode.findAllWithCriteria({ types: ["INSTANCE"] });
      const withMain = await Promise.all(instances.map(async (n) => ({ n, mc: await n.getMainComponentAsync() })));
      return withMain.filter(({ mc }) => !mc).map(({ n }) => {
        var _a, _b;
        return { id: n.id, name: n.name, x: n.x, y: n.y, parentId: (_a = n.parent) == null ? void 0 : _a.id, parentName: (_b = n.parent) == null ? void 0 : _b.name };
      });
    },
    async audit_hardcoded_colors(params) {
      var _a, _b;
      const scopeNode = await resolveScope(params.scopeId);
      const nodes = scopeNode.findAll((n) => "fills" in n || "strokes" in n);
      const issues = [];
      for (const n of nodes) {
        const hardcodedFills = [];
        const hardcodedStrokes = [];
        if ("fills" in n && Array.isArray(n.fills)) {
          for (const f of n.fills) {
            if (f.type === "SOLID" && f.visible !== false && !((_a = f.boundVariables) == null ? void 0 : _a.color)) {
              hardcodedFills.push({ r: Math.round(f.color.r * 255), g: Math.round(f.color.g * 255), b: Math.round(f.color.b * 255) });
            }
          }
        }
        if ("strokes" in n && Array.isArray(n.strokes)) {
          for (const s of n.strokes) {
            if (s.type === "SOLID" && s.visible !== false && !((_b = s.boundVariables) == null ? void 0 : _b.color)) {
              hardcodedStrokes.push({ r: Math.round(s.color.r * 255), g: Math.round(s.color.g * 255), b: Math.round(s.color.b * 255) });
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
      const scopeNode = await resolveScope(params.scopeId);
      const texts = scopeNode.findAllWithCriteria({ types: ["TEXT"] });
      return texts.filter((n) => !n.textStyleId).map((n) => {
        var _a;
        return {
          id: n.id,
          name: n.name,
          text: (_a = n.characters) == null ? void 0 : _a.slice(0, 60),
          fontSize: typeof n.fontSize === "number" ? n.fontSize : null,
          fontFamily: typeof n.fontName === "object" && !("mixed" in n.fontName) ? n.fontName.family : null
        };
      });
    },
    async audit_empty_frames(params) {
      const scopeNode = await resolveScope(params.scopeId);
      const frames = scopeNode.findAllWithCriteria({ types: ["FRAME"] });
      return frames.filter((n) => n.children.length === 0 || n.children.every((c) => c.visible === false)).map((n) => {
        var _a;
        return { id: n.id, name: n.name, x: n.x, y: n.y, width: n.width, height: n.height, parentId: (_a = n.parent) == null ? void 0 : _a.id };
      });
    },
    async audit_all(params, dispatch2) {
      var _a;
      const scopeId = (_a = params.scopeId) != null ? _a : null;
      const run = async (action) => {
        try {
          return await dispatch2(action, { scopeId });
        } catch (e) {
          return { error: e.message };
        }
      };
      const [missingComponents, hardcodedColors, detachedStyles, emptyFrames, contrastIssues] = await Promise.all([
        run("audit_missing_components"),
        run("audit_hardcoded_colors"),
        run("audit_detached_styles"),
        run("audit_empty_frames"),
        run("audit_contrast")
      ]);
      return { missingComponents, hardcodedColors, detachedStyles, emptyFrames, contrastIssues };
    }
  };

  // src/handlers/styles.js
  var stylesHandlers = {
    async create_text_style(params) {
      await figma.loadFontAsync({ family: params.fontFamily, style: params.fontStyle });
      const style = figma.createTextStyle();
      style.name = params.name;
      style.fontName = { family: params.fontFamily, style: params.fontStyle };
      style.fontSize = params.fontSize;
      if (params.lineHeight !== void 0)
        style.lineHeight = params.lineHeight;
      if (params.letterSpacing !== void 0)
        style.letterSpacing = params.letterSpacing;
      return { id: style.id, name: style.name };
    },
    async get_local_styles() {
      const result = { paint: [], text: [], effect: [], grid: [] };
      for (const s of await figma.getLocalPaintStylesAsync()) {
        result.paint.push({
          id: s.id,
          name: s.name,
          paints: s.paints.map((p) => {
            var _a;
            return p.type === "SOLID" ? { type: "SOLID", r: Math.round(p.color.r * 255), g: Math.round(p.color.g * 255), b: Math.round(p.color.b * 255), opacity: (_a = p.opacity) != null ? _a : 1 } : { type: p.type };
          })
        });
      }
      for (const s of await figma.getLocalTextStylesAsync()) {
        result.text.push({
          id: s.id,
          name: s.name,
          fontFamily: s.fontName.family,
          fontStyle: s.fontName.style,
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing
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
      const node = await requireNode(params.nodeId);
      if (node.type !== "TEXT")
        throw new Error("Node is not a text layer");
      await node.setTextStyleIdAsync(params.styleId);
      return { success: true };
    },
    async apply_paint_style(params) {
      var _a;
      const node = await requireNode(params.nodeId);
      const target = (_a = params.target) != null ? _a : "fills";
      if (target === "fills") {
        if (!("fillStyleId" in node))
          throw new Error("Node does not support fill styles");
        await node.setFillStyleIdAsync(params.styleId);
      } else {
        if (!("strokeStyleId" in node))
          throw new Error("Node does not support stroke styles");
        await node.setStrokeStyleIdAsync(params.styleId);
      }
      return { success: true };
    },
    async apply_effect_style(params) {
      const node = await requireNode(params.nodeId);
      if (!("effectStyleId" in node))
        throw new Error("Node does not support effect styles");
      await node.setEffectStyleIdAsync(params.styleId);
      return { success: true };
    },
    create_paint_style(params) {
      var _a;
      const style = figma.createPaintStyle();
      style.name = params.name;
      style.paints = [{ type: "SOLID", color: params.color, opacity: (_a = params.opacity) != null ? _a : 1 }];
      return { id: style.id, name: style.name };
    },
    create_effect_style(params) {
      const style = figma.createEffectStyle();
      style.name = params.name;
      if (params.effects)
        style.effects = params.effects;
      return { id: style.id, name: style.name };
    }
  };

  // src/handlers/structure.js
  var structureHandlers = {
    async reparent(params) {
      const node = await requireNode(params.nodeId);
      const newParent = await figma.getNodeByIdAsync(params.newParentId);
      if (!newParent)
        throw new Error(`New parent not found: ${params.newParentId}`);
      if (!("appendChild" in newParent))
        throw new Error("New parent cannot have children");
      newParent.appendChild(node);
      return { success: true, newParentId: newParent.id, x: "x" in node ? node.x : null, y: "y" in node ? node.y : null };
    },
    async batch(params, dispatch2) {
      const results = [];
      for (const sub of params.commands) {
        try {
          results.push(await dispatch2(sub.action, sub));
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
      const node = await requireNode(params.nodeId);
      const parent = node.parent;
      if (!parent || !("insertChild" in parent))
        throw new Error("Node has no reorderable parent");
      parent.insertChild(params.index, node);
      return { success: true, index: params.index };
    },
    async bring_to_front(params) {
      const node = await requireNode(params.nodeId);
      const parent = node.parent;
      if (!parent || !("insertChild" in parent))
        throw new Error("Node has no reorderable parent");
      parent.insertChild(parent.children.length - 1, node);
      return { success: true };
    },
    async send_to_back(params) {
      const node = await requireNode(params.nodeId);
      const parent = node.parent;
      if (!parent || !("insertChild" in parent))
        throw new Error("Node has no reorderable parent");
      parent.insertChild(0, node);
      return { success: true };
    },
    async group(params) {
      const nodes = await Promise.all(params.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
      const valid = nodes.filter(Boolean);
      if (valid.length === 0)
        throw new Error("No valid nodes to group");
      const parent = params.parentId ? await figma.getNodeByIdAsync(params.parentId) : valid[0].parent;
      const group = figma.group(valid, parent);
      if (params.name)
        group.name = params.name;
      return __spreadValues({ success: true }, nodeInfo(group));
    },
    async ungroup(params) {
      const node = await requireNode(params.nodeId);
      if (node.type !== "GROUP")
        throw new Error("Node is not a group");
      const children = [...node.children].map(nodeInfo);
      figma.ungroup(node);
      return { success: true, children };
    },
    async scroll_to_node(params) {
      const node = await requireNode(params.nodeId);
      figma.viewport.scrollAndZoomIntoView([node]);
      return { success: true };
    },
    async set_selection(params) {
      const nodes = await Promise.all(params.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
      const valid = nodes.filter(Boolean);
      figma.currentPage.selection = valid;
      return { success: true, selected: valid.map((n) => n.id) };
    },
    notify(params) {
      var _a;
      figma.notify(params.message, { error: (_a = params.error) != null ? _a : false });
      return { success: true };
    },
    async get_pages() {
      await figma.loadAllPagesAsync();
      return figma.root.children.map((p) => ({
        id: p.id,
        name: p.name,
        isCurrent: p.id === figma.currentPage.id
      }));
    },
    async switch_page(params) {
      const page = await figma.getNodeByIdAsync(params.pageId);
      if (!page || page.type !== "PAGE")
        throw new Error(`Page not found: ${params.pageId}`);
      await figma.setCurrentPageAsync(page);
      return { success: true, pageId: page.id, pageName: page.name };
    },
    async create_page(params) {
      var _a;
      const page = figma.createPage();
      page.name = (_a = params.name) != null ? _a : "Page";
      if (params.index !== void 0) {
        await figma.loadAllPagesAsync();
        figma.root.insertChild(params.index, page);
      }
      return { id: page.id, name: page.name };
    },
    async delete_page(params) {
      await figma.loadAllPagesAsync();
      if (figma.root.children.length <= 1)
        throw new Error("Cannot delete the only page");
      const page = figma.root.children.find((p) => p.id === params.pageId);
      if (!page)
        throw new Error(`Page not found: ${params.pageId}`);
      page.remove();
      return { success: true };
    },
    async rename_page(params) {
      const page = await figma.getNodeByIdAsync(params.pageId);
      if (!page || page.type !== "PAGE")
        throw new Error(`Page not found: ${params.pageId}`);
      page.name = params.name;
      return { success: true, pageId: page.id, name: page.name };
    }
  };

  // src/handlers/index.js
  var handlers = __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, readHandlers), editHandlers), createHandlers), variablesHandlers), componentsHandlers), auditHandlers), stylesHandlers), structureHandlers);

  // src/code.js
  figma.showUI(__html__, { width: 300, height: 160 });
  async function dispatch(action, params) {
    const handler = handlers[action];
    if (!handler)
      throw new Error(`Unknown action: ${action}`);
    return handler(params, dispatch);
  }
  figma.ui.onmessage = async (msg) => {
    const _a = msg, { id, action } = _a, params = __objRest(_a, ["id", "action"]);
    let result;
    try {
      result = await dispatch(action, params);
    } catch (e) {
      result = { error: e.message };
    }
    figma.ui.postMessage({ id, result });
  };
})();
