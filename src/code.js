// Claude Bridge — Figma plugin main thread.
// Receives commands from the UI (relayed over WebSocket from the local server),
// dispatches them to the matching handler, and posts the result back.
import { handlers } from './handlers/index.js';

figma.showUI(__html__, { width: 300, height: 160 });

async function dispatch(action, params) {
  const handler = handlers[action];
  if (!handler) throw new Error(`Unknown action: ${action}`);
  return handler(params, dispatch);
}

figma.ui.onmessage = async (msg) => {
  const { id, action, ...params } = msg;
  let result;
  try {
    result = await dispatch(action, params);
  } catch (e) {
    result = { error: e.message };
  }
  figma.ui.postMessage({ id, result });
};
