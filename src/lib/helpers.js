// Shared helpers used across handler modules.

export function base64ToBytes(b64) {
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

export function nodeInfo(n) {
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

export async function buildTree(n, depth) {
  const obj = nodeInfo(n);
  if (depth > 0 && 'children' in n) {
    obj.children = [];
    for (const c of n.children) {
      obj.children.push(await buildTree(c, depth - 1));
    }
  }
  return obj;
}

// Look up a node by id and throw the standard "Node not found" error if missing.
// Replaces the `getNodeByIdAsync` + `if (!node) throw` boilerplate repeated across handlers.
export async function requireNode(id) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node) throw new Error(`Node not found: ${id}`);
  return node;
}

// Resolve a scope node: the node named by scopeId, or the current page when omitted.
// Throws if an explicit scopeId points at nothing.
export async function resolveScope(scopeId) {
  if (!scopeId) return figma.currentPage;
  const node = await figma.getNodeByIdAsync(scopeId);
  if (!node) throw new Error(`Scope node not found: ${scopeId}`);
  return node;
}
