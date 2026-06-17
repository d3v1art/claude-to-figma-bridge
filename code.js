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
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/code.js
  figma.showUI(__html__, { width: 300, height: 160 });
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
  function buildTree(n, depth) {
    return __async(this, null, function* () {
      const obj = nodeInfo(n);
      if (depth > 0 && "children" in n) {
        obj.children = [];
        for (const c of n.children) {
          obj.children.push(yield buildTree(c, depth - 1));
        }
      }
      return obj;
    });
  }
  function executeAction(action, params) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da, _ea, _fa, _ga, _ha, _ia, _ja, _ka, _la, _ma, _na, _oa, _pa, _qa, _ra, _sa, _ta, _ua, _va, _wa, _xa, _ya, _za, _Aa, _Ba, _Ca, _Da, _Ea, _Fa;
      switch (action) {
        case "get_selection":
          return figma.currentPage.selection.map(nodeInfo);
        case "get_node": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          return __spreadProps(__spreadValues({}, nodeInfo(node)), { visible: node.visible });
        }
        case "get_parent": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const chain = [];
          let cur = node.parent;
          while (cur && cur.type !== "PAGE" && cur.type !== "DOCUMENT") {
            chain.push(nodeInfo(cur));
            cur = cur.parent;
          }
          return chain;
        }
        case "get_tree": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          return buildTree(node, (_a = params.depth) != null ? _a : 2);
        }
        case "get_page_tree":
          return buildTree(figma.currentPage, (_b = params.depth) != null ? _b : 1);
        case "get_page_nodes":
          return figma.currentPage.children.map((n) => ({
            id: n.id,
            name: n.name,
            type: n.type
          }));
        case "get_children": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("children" in node))
            throw new Error("Node has no children");
          return node.children.map(nodeInfo);
        }
        case "get_text": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "TEXT")
            throw new Error("Node is not a text layer");
          return { text: node.characters };
        }
        case "get_text_style": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "TEXT")
            throw new Error("Node is not a text layer");
          const seg = node.getStyledTextSegments(["fontName", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textDecoration", "textCase"]);
          const first = seg[0] || {};
          return {
            fontFamily: (_d = (_c = first.fontName) == null ? void 0 : _c.family) != null ? _d : null,
            fontStyle: (_f = (_e = first.fontName) == null ? void 0 : _e.style) != null ? _f : null,
            fontSize: (_g = first.fontSize) != null ? _g : null,
            lineHeight: (_h = first.lineHeight) != null ? _h : null,
            letterSpacing: (_i = first.letterSpacing) != null ? _i : null,
            textDecoration: (_j = first.textDecoration) != null ? _j : null,
            textCase: (_k = first.textCase) != null ? _k : null,
            characters: node.characters
          };
        }
        case "create_text_style": {
          yield figma.loadFontAsync({ family: params.fontFamily, style: params.fontStyle });
          const style = figma.createTextStyle();
          style.name = params.name;
          style.fontName = { family: params.fontFamily, style: params.fontStyle };
          style.fontSize = params.fontSize;
          if (params.lineHeight !== void 0)
            style.lineHeight = params.lineHeight;
          if (params.letterSpacing !== void 0)
            style.letterSpacing = params.letterSpacing;
          return { id: style.id, name: style.name };
        }
        case "rename": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const oldName = node.name;
          node.name = params.name;
          return { success: true, oldName, newName: node.name };
        }
        case "move": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("x" in node))
            throw new Error("Node is not positionable");
          if (params.x !== void 0)
            node.x = params.x;
          if (params.y !== void 0)
            node.y = params.y;
          return { success: true, x: node.x, y: node.y };
        }
        case "move_by": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("x" in node))
            throw new Error("Node is not positionable");
          node.x += (_l = params.dx) != null ? _l : 0;
          node.y += (_m = params.dy) != null ? _m : 0;
          return { success: true, x: node.x, y: node.y };
        }
        case "resize": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const w = (_n = params.width) != null ? _n : node.width;
          const h = (_o = params.height) != null ? _o : node.height;
          if ("resizeWithoutConstraints" in node) {
            node.resizeWithoutConstraints(w, h);
          } else if ("resize" in node) {
            node.resize(w, h);
          } else {
            throw new Error("Node is not resizable");
          }
          return { success: true, width: node.width, height: node.height };
        }
        case "set_visible": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          node.visible = params.visible;
          return { success: true, visible: node.visible };
        }
        case "set_text": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "TEXT")
            throw new Error("Node is not a text layer");
          const fonts = /* @__PURE__ */ new Map();
          for (const seg of node.getStyledTextSegments(["fontName"])) {
            fonts.set(JSON.stringify(seg.fontName), seg.fontName);
          }
          if (fonts.size === 0 && node.fontName !== figma.mixed) {
            fonts.set(JSON.stringify(node.fontName), node.fontName);
          }
          yield Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
          const oldText = node.characters;
          node.characters = params.text;
          return { success: true, oldText, newText: node.characters };
        }
        case "duplicate": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const clone = node.clone();
          if (params.x !== void 0)
            clone.x = params.x;
          if (params.y !== void 0)
            clone.y = params.y;
          return { success: true, id: clone.id, name: clone.name };
        }
        case "create_frame": {
          const frame = figma.createFrame();
          frame.name = (_p = params.name) != null ? _p : "Frame";
          frame.resize((_q = params.width) != null ? _q : 100, (_r = params.height) != null ? _r : 100);
          if (params.x !== void 0)
            frame.x = params.x;
          if (params.y !== void 0)
            frame.y = params.y;
          if (params.parentId) {
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (parent && "appendChild" in parent)
              parent.appendChild(frame);
          }
          if (params.fill !== void 0) {
            frame.fills = [{ type: "SOLID", color: params.fill, opacity: (_s = params.fillOpacity) != null ? _s : 1 }];
          } else {
            frame.fills = [];
          }
          if (params.cornerRadius !== void 0)
            frame.cornerRadius = params.cornerRadius;
          if (params.clipsContent !== void 0)
            frame.clipsContent = params.clipsContent;
          return __spreadValues({ success: true }, nodeInfo(frame));
        }
        case "create_rectangle": {
          const rect = figma.createRectangle();
          rect.name = (_t = params.name) != null ? _t : "Rectangle";
          rect.resize((_u = params.width) != null ? _u : 100, (_v = params.height) != null ? _v : 100);
          if (params.x !== void 0)
            rect.x = params.x;
          if (params.y !== void 0)
            rect.y = params.y;
          if (params.parentId) {
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (parent && "appendChild" in parent)
              parent.appendChild(rect);
          }
          if (params.fill !== void 0)
            rect.fills = [{ type: "SOLID", color: params.fill, opacity: (_w = params.fillOpacity) != null ? _w : 1 }];
          if (params.cornerRadius !== void 0)
            rect.cornerRadius = params.cornerRadius;
          if (params.stroke !== void 0) {
            rect.strokes = [{ type: "SOLID", color: params.stroke }];
            rect.strokeWeight = (_x = params.strokeWeight) != null ? _x : 1;
          }
          return __spreadValues({ success: true }, nodeInfo(rect));
        }
        case "create_text": {
          const text = figma.createText();
          text.name = (_y = params.name) != null ? _y : "Text";
          yield figma.loadFontAsync({ family: (_z = params.fontFamily) != null ? _z : "Inter", style: (_A = params.fontStyle) != null ? _A : "Regular" });
          text.fontName = { family: (_B = params.fontFamily) != null ? _B : "Inter", style: (_C = params.fontStyle) != null ? _C : "Regular" };
          text.characters = (_D = params.text) != null ? _D : "";
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
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (parent && "appendChild" in parent)
              parent.appendChild(text);
          }
          return __spreadValues({ success: true }, nodeInfo(text));
        }
        case "set_fill": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("fills" in node))
            throw new Error("Node does not support fills");
          if (params.color === null) {
            node.fills = [];
          } else {
            node.fills = [{ type: "SOLID", color: params.color, opacity: (_E = params.opacity) != null ? _E : 1 }];
          }
          return { success: true };
        }
        case "set_stroke": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
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
        }
        case "set_corner_radius": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if ("cornerRadius" in node) {
            node.cornerRadius = params.radius;
          } else {
            throw new Error("Node does not support corner radius");
          }
          return { success: true };
        }
        case "set_opacity": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          node.opacity = params.opacity;
          return { success: true };
        }
        case "set_effect": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("effects" in node))
            throw new Error("Node does not support effects");
          const effectType = (_F = params.effectType) != null ? _F : "DROP_SHADOW";
          const isBlur = effectType === "LAYER_BLUR" || effectType === "BACKGROUND_BLUR";
          const effect = isBlur ? { type: effectType, visible: true, radius: (_H = (_G = params.blur) != null ? _G : params.radius) != null ? _H : 8 } : {
            type: effectType,
            visible: true,
            blendMode: (_I = params.blendMode) != null ? _I : "NORMAL",
            color: __spreadProps(__spreadValues({}, (_J = params.color) != null ? _J : { r: 0, g: 0, b: 0 }), { a: (_L = (_K = params.opacity) != null ? _K : params.alpha) != null ? _L : 0.15 }),
            offset: { x: (_M = params.offsetX) != null ? _M : 0, y: (_N = params.offsetY) != null ? _N : 4 },
            radius: (_P = (_O = params.blur) != null ? _O : params.radius) != null ? _P : 8,
            spread: (_Q = params.spread) != null ? _Q : 0
          };
          node.effects = [...node.effects, effect];
          return { success: true };
        }
        case "set_font": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "TEXT")
            throw new Error("Node is not a text layer");
          const family = (_R = params.family) != null ? _R : "Inter";
          const style = (_S = params.style) != null ? _S : "Regular";
          yield figma.loadFontAsync({ family, style });
          node.fontName = { family, style };
          if (params.size !== void 0)
            node.fontSize = params.size;
          if (params.lineHeight !== void 0)
            node.lineHeight = { value: params.lineHeight, unit: "PIXELS" };
          if (params.letterSpacing !== void 0)
            node.letterSpacing = { value: params.letterSpacing, unit: "PERCENT" };
          return { success: true };
        }
        case "set_layout": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
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
        }
        case "reparent": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const newParent = yield figma.getNodeByIdAsync(params.newParentId);
          if (!newParent)
            throw new Error(`New parent not found: ${params.newParentId}`);
          if (!("appendChild" in newParent))
            throw new Error("New parent cannot have children");
          newParent.appendChild(node);
          return { success: true, newParentId: newParent.id, x: "x" in node ? node.x : null, y: "y" in node ? node.y : null };
        }
        case "batch": {
          const results = [];
          for (const sub of params.commands) {
            try {
              results.push(yield executeAction(sub.action, sub));
            } catch (e) {
              results.push({ error: e.message });
            }
          }
          return results;
        }
        case "find_all_instances": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found: ${params.scopeId}`);
          const nodes = scopeNode.findAllWithCriteria({ types: ["INSTANCE"] });
          return nodes.map((n) => {
            const mc = n.mainComponent;
            return {
              id: n.id,
              name: n.name,
              mainComponentId: mc ? mc.id : null,
              mainComponentName: mc ? mc.name : null,
              x: "x" in n ? n.x : null,
              y: "y" in n ? n.y : null
            };
          });
        }
        case "get_local_components": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found: ${params.scopeId}`);
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
        }
        case "get_all_texts": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : (_T = figma.currentPage.selection[0]) != null ? _T : figma.currentPage;
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
        }
        case "audit_contrast": {
          let toLinear = function(c) {
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          }, luminance = function(r, g, b) {
            return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
          }, contrastRatio = function(l1, l2) {
            const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
            return (hi + 0.05) / (lo + 0.05);
          }, getSolidFill = function(node) {
            var _a2;
            if (!("fills" in node) || !node.fills || node.fills.length === 0)
              return null;
            for (const f of node.fills) {
              if (f.type === "SOLID" && f.visible !== false)
                return { r: f.color.r, g: f.color.g, b: f.color.b, opacity: (_a2 = f.opacity) != null ? _a2 : 1 };
            }
            return null;
          }, getGradientAvgColor = function(fills) {
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
          }, getEffectiveBg = function(node) {
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
          };
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found: ${params.scopeId}`);
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
                  bgIsGradient: (_U = bg.isGradient) != null ? _U : false
                });
              }
            }
          }
          return issues;
        }
        case "get_screenshot": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const scale = (_V = params.scale) != null ? _V : 1;
          const bytes = yield node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: scale } });
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
          let base64 = "";
          for (let i = 0; i < bytes.length; i += 3) {
            const b0 = bytes[i], b1 = (_W = bytes[i + 1]) != null ? _W : 0, b2 = (_X = bytes[i + 2]) != null ? _X : 0;
            base64 += chars[b0 >> 2] + chars[(b0 & 3) << 4 | b1 >> 4] + (i + 1 < bytes.length ? chars[(b1 & 15) << 2 | b2 >> 6] : "=") + (i + 2 < bytes.length ? chars[b2 & 63] : "=");
          }
          return { base64, mimeType: "image/png", width: Math.round(node.width * scale), height: Math.round(node.height * scale) };
        }
        case "get_fills": {
          let extractFills = function(n2) {
            var _a2;
            const result = { id: n2.id, name: n2.name, type: n2.type, fills: [], gradients: [] };
            if ("fills" in n2 && n2.fills) {
              for (const f of n2.fills) {
                if (!f.visible)
                  continue;
                if (f.type === "SOLID") {
                  result.fills.push({ r: Math.round(f.color.r * 255), g: Math.round(f.color.g * 255), b: Math.round(f.color.b * 255), opacity: (_a2 = f.opacity) != null ? _a2 : 1 });
                } else if (f.type.startsWith("GRADIENT_")) {
                  result.gradients.push({ type: f.type, stops: f.gradientStops.map((s) => ({ r: Math.round(s.color.r * 255), g: Math.round(s.color.g * 255), b: Math.round(s.color.b * 255), a: s.color.a, position: s.position })) });
                }
              }
            }
            return result;
          };
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const chain = [];
          let n = node;
          let depth = 0;
          while (n && n.type !== "PAGE" && depth < 8) {
            chain.push(extractFills(n));
            n = n.parent;
            depth++;
          }
          return chain;
        }
        case "get_annotations": {
          const node = (_Z = yield figma.getNodeByIdAsync((_Y = params.nodeId) != null ? _Y : null)) != null ? _Z : figma.currentPage;
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
        }
        case "get_variables": {
          const collections = figma.variables.getLocalVariableCollections();
          return collections.map((col) => ({
            id: col.id,
            name: col.name,
            modes: col.modes,
            defaultModeId: col.defaultModeId,
            variables: col.variableIds.map((vid) => {
              const v = figma.variables.getVariableById(vid);
              if (!v)
                return null;
              return {
                id: v.id,
                name: v.name,
                type: v.resolvedType,
                values: Object.fromEntries(
                  Object.entries(v.valuesByMode).map(([modeId, val]) => {
                    if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") {
                      const ref = figma.variables.getVariableById(val.id);
                      return [modeId, { alias: ref ? ref.name : val.id }];
                    }
                    return [modeId, val];
                  })
                )
              };
            }).filter(Boolean)
          }));
        }
        case "get_variable": {
          const v = figma.variables.getVariableById(params.variableId);
          if (!v)
            throw new Error(`Variable not found: ${params.variableId}`);
          const col = figma.variables.getVariableCollectionById(v.variableCollectionId);
          return {
            id: v.id,
            name: v.name,
            type: v.resolvedType,
            collection: col ? { id: col.id, name: col.name, modes: col.modes } : null,
            values: Object.fromEntries(
              Object.entries(v.valuesByMode).map(([modeId, val]) => {
                if (val && typeof val === "object" && val.type === "VARIABLE_ALIAS") {
                  const ref = figma.variables.getVariableById(val.id);
                  return [modeId, { alias: ref ? ref.name : val.id, aliasId: val.id }];
                }
                return [modeId, val];
              })
            )
          };
        }
        case "create_instance": {
          const comp = yield figma.getNodeByIdAsync(params.componentId);
          if (!comp || comp.type !== "COMPONENT")
            throw new Error(`Not a component: ${params.componentId}`);
          const instance = comp.createInstance();
          if (params.parentId) {
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (!parent)
              throw new Error(`Parent not found: ${params.parentId}`);
            parent.appendChild(instance);
          }
          if (params.x !== void 0)
            instance.x = params.x;
          if (params.y !== void 0)
            instance.y = params.y;
          return { id: instance.id, name: instance.name, type: instance.type, x: instance.x, y: instance.y };
        }
        case "delete_node": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          node.remove();
          return { success: true };
        }
        case "add_component_property": {
          const node = yield figma.getNodeByIdAsync(params.componentId);
          if (!node)
            throw new Error(`Node not found: ${params.componentId}`);
          if (node.type !== "COMPONENT" && node.type !== "COMPONENT_SET")
            throw new Error("Node is not a component");
          const key = node.addComponentProperty(params.name, params.type, (__ = params.defaultValue) != null ? __ : "");
          return { key, name: params.name, type: params.type };
        }
        case "set_property_reference": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          node.componentPropertyReferences = params.references;
          return { success: true, nodeId: params.nodeId, references: params.references };
        }
        case "get_component_properties": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("componentPropertyDefinitions" in node))
            throw new Error("Node has no component properties");
          return node.componentPropertyDefinitions;
        }
        case "combine_as_variants": {
          const components = [];
          for (const id of params.componentIds) {
            const node = yield figma.getNodeByIdAsync(id);
            if (!node || node.type !== "COMPONENT")
              throw new Error(`Not a component: ${id}`);
            components.push(node);
          }
          const parent = params.parentId ? yield figma.getNodeByIdAsync(params.parentId) : components[0].parent;
          const set = figma.combineAsVariants(components, parent);
          if (params.name)
            set.name = params.name;
          return { id: set.id, name: set.name, type: set.type, x: set.x, y: set.y, width: set.width, height: set.height };
        }
        case "create_component_from_node": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const component = figma.createComponentFromNode(node);
          if (params.name)
            component.name = params.name;
          return { id: component.id, name: component.name, type: component.type };
        }
        case "create_variable_collection": {
          const col = figma.variables.createVariableCollection(params.name);
          const modeNames = params.modes || ["Value"];
          col.renameMode(col.modes[0].modeId, modeNames[0]);
          for (let i = 1; i < modeNames.length; i++) {
            col.addMode(modeNames[i]);
          }
          return { id: col.id, name: col.name, modes: col.modes };
        }
        case "create_variable": {
          const col = figma.variables.getVariableCollectionById(params.collectionId);
          if (!col)
            throw new Error(`Collection not found: ${params.collectionId}`);
          const variable = figma.variables.createVariable(params.name, col, params.type);
          if (params.values) {
            for (const [modeId, value] of Object.entries(params.values)) {
              variable.setValueForMode(modeId, value);
            }
          }
          return { id: variable.id, name: variable.name, type: variable.resolvedType };
        }
        case "update_variable": {
          const v = figma.variables.getVariableById(params.variableId);
          if (!v)
            throw new Error(`Variable not found: ${params.variableId}`);
          for (const [modeId, value] of Object.entries(params.values)) {
            v.setValueForMode(modeId, value);
          }
          return { id: v.id, name: v.name, type: v.resolvedType };
        }
        case "delete_variable": {
          const v = figma.variables.getVariableById(params.variableId);
          if (!v)
            throw new Error(`Variable not found: ${params.variableId}`);
          v.remove();
          return { success: true };
        }
        case "apply_variable": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const v = figma.variables.getVariableById(params.variableId);
          if (!v)
            throw new Error(`Variable not found: ${params.variableId}`);
          const prop = params.property;
          if (prop === "fills" || prop === "strokes") {
            const paints = node[prop];
            if (!paints || paints.length === 0)
              throw new Error(`Node has no ${prop}`);
            const index = (_$ = params.index) != null ? _$ : 0;
            const bound = figma.variables.setBoundVariableForPaint(paints[index], "color", v);
            const updated = [...paints];
            updated[index] = bound;
            node[prop] = updated;
          } else {
            node.setBoundVariable(prop, v);
          }
          return { success: true, nodeId: node.id, property: prop, variableId: v.id, variableName: v.name };
        }
        case "detach_variable": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const prop = params.property;
          if (prop === "fills" || prop === "strokes") {
            const paints = node[prop];
            if (!paints || paints.length === 0)
              throw new Error(`Node has no ${prop}`);
            const index = (_aa = params.index) != null ? _aa : 0;
            const unbound = figma.variables.setBoundVariableForPaint(paints[index], "color", null);
            const updated = [...paints];
            updated[index] = unbound;
            node[prop] = updated;
          } else {
            node.setBoundVariable(prop, null);
          }
          return { success: true };
        }
        case "get_variable_bindings": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const result = { nodeId: node.id, name: node.name, bindings: {} };
          if ("boundVariables" in node && node.boundVariables) {
            for (const [prop, binding] of Object.entries(node.boundVariables)) {
              if (!binding)
                continue;
              const resolve = (b) => {
                if (!b || !b.id)
                  return null;
                const v = figma.variables.getVariableById(b.id);
                return v ? { id: v.id, name: v.name, type: v.resolvedType } : { id: b.id };
              };
              result.bindings[prop] = Array.isArray(binding) ? binding.map(resolve) : resolve(binding);
            }
          }
          for (const paintProp of ["fills", "strokes"]) {
            if (!(paintProp in node) || !node[paintProp])
              continue;
            const paints = node[paintProp];
            const paintBindings = [];
            for (const paint of paints) {
              if ((_ba = paint.boundVariables) == null ? void 0 : _ba.color) {
                const v = figma.variables.getVariableById(paint.boundVariables.color.id);
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
        }
        case "add_mode": {
          const col = figma.variables.getVariableCollectionById(params.collectionId);
          if (!col)
            throw new Error(`Collection not found: ${params.collectionId}`);
          const modeId = col.addMode(params.name);
          return { success: true, collectionId: col.id, modeId, modeName: params.name, modes: col.modes };
        }
        case "rename_mode": {
          const col = figma.variables.getVariableCollectionById(params.collectionId);
          if (!col)
            throw new Error(`Collection not found: ${params.collectionId}`);
          col.renameMode(params.modeId, params.name);
          return { success: true, collectionId: col.id, modeId: params.modeId, modes: col.modes };
        }
        case "remove_mode": {
          const col = figma.variables.getVariableCollectionById(params.collectionId);
          if (!col)
            throw new Error(`Collection not found: ${params.collectionId}`);
          col.removeMode(params.modeId);
          return { success: true, collectionId: col.id, modes: col.modes };
        }
        case "switch_mode": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("setExplicitVariableModeForCollection" in node)) {
            throw new Error("Node does not support explicit variable modes");
          }
          const col = figma.variables.getVariableCollectionById(params.collectionId);
          if (!col)
            throw new Error(`Collection not found: ${params.collectionId}`);
          node.setExplicitVariableModeForCollection(col, params.modeId);
          return { success: true, nodeId: node.id, collectionId: params.collectionId, modeId: params.modeId };
        }
        case "reset_mode": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("clearExplicitVariableModeForCollection" in node)) {
            throw new Error("Node does not support explicit variable modes");
          }
          const col = figma.variables.getVariableCollectionById(params.collectionId);
          if (!col)
            throw new Error(`Collection not found: ${params.collectionId}`);
          node.clearExplicitVariableModeForCollection(col);
          return { success: true };
        }
        case "audit_missing_components": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found: ${params.scopeId}`);
          const instances = scopeNode.findAllWithCriteria({ types: ["INSTANCE"] });
          return instances.filter((n) => !n.mainComponent).map((n) => {
            var _a2, _b2;
            return { id: n.id, name: n.name, x: n.x, y: n.y, parentId: (_a2 = n.parent) == null ? void 0 : _a2.id, parentName: (_b2 = n.parent) == null ? void 0 : _b2.name };
          });
        }
        case "audit_hardcoded_colors": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found`);
          const nodes = scopeNode.findAll((n) => "fills" in n || "strokes" in n);
          const issues = [];
          for (const n of nodes) {
            const hardcodedFills = [];
            const hardcodedStrokes = [];
            if ("fills" in n && Array.isArray(n.fills)) {
              for (const f of n.fills) {
                if (f.type === "SOLID" && f.visible !== false && !((_ca = f.boundVariables) == null ? void 0 : _ca.color)) {
                  hardcodedFills.push({ r: Math.round(f.color.r * 255), g: Math.round(f.color.g * 255), b: Math.round(f.color.b * 255) });
                }
              }
            }
            if ("strokes" in n && Array.isArray(n.strokes)) {
              for (const s of n.strokes) {
                if (s.type === "SOLID" && s.visible !== false && !((_da = s.boundVariables) == null ? void 0 : _da.color)) {
                  hardcodedStrokes.push({ r: Math.round(s.color.r * 255), g: Math.round(s.color.g * 255), b: Math.round(s.color.b * 255) });
                }
              }
            }
            if (hardcodedFills.length || hardcodedStrokes.length) {
              issues.push({ id: n.id, name: n.name, type: n.type, hardcodedFills, hardcodedStrokes });
            }
          }
          return issues;
        }
        case "audit_detached_styles": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found`);
          const texts = scopeNode.findAllWithCriteria({ types: ["TEXT"] });
          return texts.filter((n) => !n.textStyleId).map((n) => {
            var _a2;
            return {
              id: n.id,
              name: n.name,
              text: (_a2 = n.characters) == null ? void 0 : _a2.slice(0, 60),
              fontSize: typeof n.fontSize === "number" ? n.fontSize : null,
              fontFamily: typeof n.fontName === "object" && !("mixed" in n.fontName) ? n.fontName.family : null
            };
          });
        }
        case "audit_empty_frames": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope node not found`);
          const frames = scopeNode.findAllWithCriteria({ types: ["FRAME"] });
          return frames.filter((n) => n.children.length === 0 || n.children.every((c) => c.visible === false)).map((n) => {
            var _a2;
            return { id: n.id, name: n.name, x: n.x, y: n.y, width: n.width, height: n.height, parentId: (_a2 = n.parent) == null ? void 0 : _a2.id };
          });
        }
        case "audit_all": {
          const scopeId = (_ea = params.scopeId) != null ? _ea : null;
          const run = (action2) => __async(this, null, function* () {
            try {
              return yield executeAction(action2, { scopeId });
            } catch (e) {
              return { error: e.message };
            }
          });
          const [missingComponents, hardcodedColors, detachedStyles, emptyFrames, contrastIssues] = yield Promise.all([
            run("audit_missing_components"),
            run("audit_hardcoded_colors"),
            run("audit_detached_styles"),
            run("audit_empty_frames"),
            run("audit_contrast")
          ]);
          return { missingComponents, hardcodedColors, detachedStyles, emptyFrames, contrastIssues };
        }
        case "set_strokes": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("strokes" in node))
            throw new Error("Node does not support strokes");
          node.strokes = params.strokes;
          return { success: true };
        }
        case "add_stroke": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("strokes" in node))
            throw new Error("Node does not support strokes");
          node.strokes = [...node.strokes, params.stroke];
          return { success: true, strokeCount: node.strokes.length };
        }
        case "remove_stroke": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("strokes" in node))
            throw new Error("Node does not support strokes");
          const strokes = [...node.strokes];
          const idx = (_fa = params.index) != null ? _fa : strokes.length - 1;
          strokes.splice(idx, 1);
          node.strokes = strokes;
          return { success: true, strokeCount: node.strokes.length };
        }
        case "set_stroke_dash": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("dashPattern" in node))
            throw new Error("Node does not support dash pattern");
          node.dashPattern = params.dashPattern;
          return { success: true, dashPattern: node.dashPattern };
        }
        case "set_text_auto_resize": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "TEXT")
            throw new Error("Node is not a text layer");
          node.textAutoResize = params.mode;
          return { success: true, textAutoResize: node.textAutoResize };
        }
        case "set_corner_radii": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
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
        }
        case "set_layout_positioning": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("layoutPositioning" in node))
            throw new Error("Node does not support layoutPositioning");
          node.layoutPositioning = params.positioning;
          return { success: true, layoutPositioning: node.layoutPositioning };
        }
        case "set_min_max_size": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (params.minWidth !== void 0)
            node.minWidth = params.minWidth;
          if (params.maxWidth !== void 0)
            node.maxWidth = params.maxWidth;
          if (params.minHeight !== void 0)
            node.minHeight = params.minHeight;
          if (params.maxHeight !== void 0)
            node.maxHeight = params.maxHeight;
          return { success: true, minWidth: node.minWidth, maxWidth: node.maxWidth, minHeight: node.minHeight, maxHeight: node.maxHeight };
        }
        case "boolean_operation": {
          const nodes = yield Promise.all(params.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
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
        }
        case "set_instance_property": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "INSTANCE")
            throw new Error("Node is not a component instance");
          for (const [key, value] of Object.entries(params.properties)) {
            node.setProperties({ [key]: value });
          }
          return { success: true };
        }
        case "get_instance_properties": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "INSTANCE")
            throw new Error("Node is not a component instance");
          const mainComp = node.mainComponent;
          const defsSource = ((_ga = mainComp == null ? void 0 : mainComp.parent) == null ? void 0 : _ga.type) === "COMPONENT_SET" ? mainComp.parent : mainComp;
          const defs = (_ha = defsSource == null ? void 0 : defsSource.componentPropertyDefinitions) != null ? _ha : {};
          const vals = (_ia = node.componentProperties) != null ? _ia : {};
          const result = {};
          for (const [key, def] of Object.entries(defs)) {
            result[key] = __spreadValues(__spreadValues({
              type: def.type,
              defaultValue: def.defaultValue,
              currentValue: (_ka = (_ja = vals[key]) == null ? void 0 : _ja.value) != null ? _ka : def.defaultValue
            }, def.variantOptions ? { options: def.variantOptions } : {}), def.preferredValues ? { preferredValues: def.preferredValues } : {});
          }
          return result;
        }
        case "swap_instance": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "INSTANCE")
            throw new Error("Node is not a component instance");
          const comp = yield figma.getNodeByIdAsync(params.componentId);
          if (!comp || comp.type !== "COMPONENT")
            throw new Error(`Not a component: ${params.componentId}`);
          node.swapComponent(comp);
          return { success: true, nodeId: node.id, newComponentId: comp.id, newComponentName: comp.name };
        }
        case "create_component": {
          const comp = figma.createComponent();
          comp.name = (_la = params.name) != null ? _la : "Component";
          comp.resize((_ma = params.width) != null ? _ma : 100, (_na = params.height) != null ? _na : 100);
          if (params.x !== void 0)
            comp.x = params.x;
          if (params.y !== void 0)
            comp.y = params.y;
          if (params.parentId) {
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (parent && "appendChild" in parent)
              parent.appendChild(comp);
          }
          return __spreadValues({ success: true }, nodeInfo(comp));
        }
        case "create_ellipse": {
          const ellipse = figma.createEllipse();
          ellipse.name = (_oa = params.name) != null ? _oa : "Ellipse";
          ellipse.resize((_pa = params.width) != null ? _pa : 100, (_qa = params.height) != null ? _qa : 100);
          if (params.x !== void 0)
            ellipse.x = params.x;
          if (params.y !== void 0)
            ellipse.y = params.y;
          if (params.parentId) {
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (parent && "appendChild" in parent)
              parent.appendChild(ellipse);
          }
          if (params.fill !== void 0)
            ellipse.fills = [{ type: "SOLID", color: params.fill, opacity: (_ra = params.fillOpacity) != null ? _ra : 1 }];
          if (params.stroke !== void 0) {
            ellipse.strokes = [{ type: "SOLID", color: params.stroke }];
            ellipse.strokeWeight = (_sa = params.strokeWeight) != null ? _sa : 1;
          }
          return __spreadValues({ success: true }, nodeInfo(ellipse));
        }
        case "create_line": {
          const line = figma.createLine();
          line.name = (_ta = params.name) != null ? _ta : "Line";
          if (params.x !== void 0)
            line.x = params.x;
          if (params.y !== void 0)
            line.y = params.y;
          if (params.length !== void 0)
            line.resize(params.length, 0);
          if (params.rotation !== void 0)
            line.rotation = params.rotation;
          if (params.parentId) {
            const parent = yield figma.getNodeByIdAsync(params.parentId);
            if (parent && "appendChild" in parent)
              parent.appendChild(line);
          }
          if (params.stroke !== void 0) {
            line.strokes = [{ type: "SOLID", color: params.stroke }];
            line.strokeWeight = (_ua = params.strokeWeight) != null ? _ua : 1;
          }
          return __spreadValues({ success: true }, nodeInfo(line));
        }
        case "set_image_fill": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("fills" in node))
            throw new Error("Node does not support fills");
          let imageHash;
          if (params.base64) {
            const bytes = base64ToBytes(params.base64);
            const image = figma.createImage(bytes);
            imageHash = image.hash;
          } else if (params.url) {
            const response = yield fetch(params.url);
            const buffer = yield response.arrayBuffer();
            const image = figma.createImage(new Uint8Array(buffer));
            imageHash = image.hash;
          } else {
            throw new Error("Provide url or base64");
          }
          node.fills = [{
            type: "IMAGE",
            imageHash,
            scaleMode: (_va = params.scaleMode) != null ? _va : "FILL"
          }];
          return { success: true };
        }
        case "apply_text_style": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "TEXT")
            throw new Error("Node is not a text layer");
          node.textStyleId = params.styleId;
          return { success: true };
        }
        case "rotate": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("rotation" in node))
            throw new Error("Node does not support rotation");
          node.rotation = params.angle;
          return { success: true, rotation: node.rotation };
        }
        case "set_constraints": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("constraints" in node))
            throw new Error("Node does not support constraints");
          node.constraints = {
            horizontal: (_wa = params.horizontal) != null ? _wa : node.constraints.horizontal,
            vertical: (_xa = params.vertical) != null ? _xa : node.constraints.vertical
          };
          return { success: true, constraints: node.constraints };
        }
        case "get_constraints": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("constraints" in node))
            throw new Error("Node does not support constraints");
          return { nodeId: node.id, constraints: node.constraints };
        }
        case "reset_instance": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "INSTANCE")
            throw new Error("Node is not a component instance");
          node.resetOverrides();
          return { success: true };
        }
        case "detach_instance": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "INSTANCE")
            throw new Error("Node is not a component instance");
          const frame = node.detachInstance();
          return __spreadValues({ success: true }, nodeInfo(frame));
        }
        case "export_svg": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const bytes = yield node.exportAsync({ format: "SVG" });
          const chunks = [];
          const CHUNK = 8192;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
          }
          const svg = chunks.join("");
          return { svg };
        }
        case "set_fills": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("fills" in node))
            throw new Error("Node does not support fills");
          node.fills = params.fills;
          return { success: true };
        }
        case "add_fill": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("fills" in node))
            throw new Error("Node does not support fills");
          node.fills = [...node.fills, params.fill];
          return { success: true, fillCount: node.fills.length };
        }
        case "remove_fill": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("fills" in node))
            throw new Error("Node does not support fills");
          const fills = [...node.fills];
          const idx = (_ya = params.index) != null ? _ya : fills.length - 1;
          fills.splice(idx, 1);
          node.fills = fills;
          return { success: true, fillCount: node.fills.length };
        }
        case "find_nodes": {
          const scopeNode = params.scopeId ? yield figma.getNodeByIdAsync(params.scopeId) : figma.currentPage;
          if (!scopeNode)
            throw new Error(`Scope not found`);
          const limit = (_za = params.limit) != null ? _za : 50;
          const results = [];
          const nameLower = (_Aa = params.name) == null ? void 0 : _Aa.toLowerCase();
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
        }
        case "get_pages": {
          return figma.root.children.map((p) => ({
            id: p.id,
            name: p.name,
            isCurrent: p.id === figma.currentPage.id
          }));
        }
        case "switch_page": {
          const page = figma.root.children.find((p) => p.id === params.pageId);
          if (!page)
            throw new Error(`Page not found: ${params.pageId}`);
          figma.currentPage = page;
          return { success: true, pageId: page.id, pageName: page.name };
        }
        case "create_page": {
          const page = figma.createPage();
          page.name = (_Ba = params.name) != null ? _Ba : "Page";
          if (params.index !== void 0)
            figma.root.insertChild(params.index, page);
          return { id: page.id, name: page.name };
        }
        case "delete_page": {
          if (figma.root.children.length <= 1)
            throw new Error("Cannot delete the only page");
          const page = figma.root.children.find((p) => p.id === params.pageId);
          if (!page)
            throw new Error(`Page not found: ${params.pageId}`);
          page.remove();
          return { success: true };
        }
        case "rename_page": {
          const page = figma.root.children.find((p) => p.id === params.pageId);
          if (!page)
            throw new Error(`Page not found: ${params.pageId}`);
          page.name = params.name;
          return { success: true, pageId: page.id, name: page.name };
        }
        case "scroll_to_node": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          figma.viewport.scrollAndZoomIntoView([node]);
          return { success: true };
        }
        case "set_selection": {
          const nodes = yield Promise.all(params.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
          const valid = nodes.filter(Boolean);
          figma.currentPage.selection = valid;
          return { success: true, selected: valid.map((n) => n.id) };
        }
        case "notify": {
          figma.notify(params.message, { error: (_Ca = params.error) != null ? _Ca : false });
          return { success: true };
        }
        case "reorder": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const parent = node.parent;
          if (!parent || !("insertChild" in parent))
            throw new Error("Node has no reorderable parent");
          parent.insertChild(params.index, node);
          return { success: true, index: params.index };
        }
        case "bring_to_front": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const parent = node.parent;
          if (!parent || !("insertChild" in parent))
            throw new Error("Node has no reorderable parent");
          parent.insertChild(parent.children.length - 1, node);
          return { success: true };
        }
        case "send_to_back": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const parent = node.parent;
          if (!parent || !("insertChild" in parent))
            throw new Error("Node has no reorderable parent");
          parent.insertChild(0, node);
          return { success: true };
        }
        case "group": {
          const nodes = yield Promise.all(params.nodeIds.map((id) => figma.getNodeByIdAsync(id)));
          const valid = nodes.filter(Boolean);
          if (valid.length === 0)
            throw new Error("No valid nodes to group");
          const parent = params.parentId ? yield figma.getNodeByIdAsync(params.parentId) : valid[0].parent;
          const group = figma.group(valid, parent);
          if (params.name)
            group.name = params.name;
          return __spreadValues({ success: true }, nodeInfo(group));
        }
        case "ungroup": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (node.type !== "GROUP")
            throw new Error("Node is not a group");
          const children = [...node.children].map(nodeInfo);
          figma.ungroup(node);
          return { success: true, children };
        }
        case "get_local_styles": {
          const result = { paint: [], text: [], effect: [], grid: [] };
          for (const s of figma.getLocalPaintStyles()) {
            result.paint.push({
              id: s.id,
              name: s.name,
              paints: s.paints.map((p) => {
                var _a2;
                return p.type === "SOLID" ? { type: "SOLID", r: Math.round(p.color.r * 255), g: Math.round(p.color.g * 255), b: Math.round(p.color.b * 255), opacity: (_a2 = p.opacity) != null ? _a2 : 1 } : { type: p.type };
              })
            });
          }
          for (const s of figma.getLocalTextStyles()) {
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
          for (const s of figma.getLocalEffectStyles()) {
            result.effect.push({ id: s.id, name: s.name, effects: s.effects });
          }
          for (const s of figma.getLocalGridStyles()) {
            result.grid.push({ id: s.id, name: s.name });
          }
          return result;
        }
        case "apply_paint_style": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const target = (_Da = params.target) != null ? _Da : "fills";
          if (target === "fills") {
            if (!("fillStyleId" in node))
              throw new Error("Node does not support fill styles");
            node.fillStyleId = params.styleId;
          } else {
            if (!("strokeStyleId" in node))
              throw new Error("Node does not support stroke styles");
            node.strokeStyleId = params.styleId;
          }
          return { success: true };
        }
        case "apply_effect_style": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("effectStyleId" in node))
            throw new Error("Node does not support effect styles");
          node.effectStyleId = params.styleId;
          return { success: true };
        }
        case "create_paint_style": {
          const style = figma.createPaintStyle();
          style.name = params.name;
          style.paints = [{ type: "SOLID", color: params.color, opacity: (_Ea = params.opacity) != null ? _Ea : 1 }];
          return { id: style.id, name: style.name };
        }
        case "create_effect_style": {
          const style = figma.createEffectStyle();
          style.name = params.name;
          if (params.effects)
            style.effects = params.effects;
          return { id: style.id, name: style.name };
        }
        case "set_sizing": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          const mode = params.mode;
          const axis = (_Fa = params.axis) != null ? _Fa : "both";
          const isFrame = node.type === "FRAME";
          if (isFrame && "primaryAxisSizingMode" in node) {
            if (axis === "horizontal" || axis === "both") {
              node.layoutSizingHorizontal = mode;
            }
            if (axis === "vertical" || axis === "both") {
              node.layoutSizingVertical = mode;
            }
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
        }
        case "set_blend_mode": {
          const node = yield figma.getNodeByIdAsync(params.nodeId);
          if (!node)
            throw new Error(`Node not found: ${params.nodeId}`);
          if (!("blendMode" in node))
            throw new Error("Node does not support blend modes");
          node.blendMode = params.blendMode;
          return { success: true };
        }
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    });
  }
  figma.ui.onmessage = (msg) => __async(void 0, null, function* () {
    const _a = msg, { id, action } = _a, params = __objRest(_a, ["id", "action"]);
    let result;
    try {
      result = yield executeAction(action, params);
    } catch (e) {
      result = { error: e.message };
    }
    figma.ui.postMessage({ id, result });
  });
})();
