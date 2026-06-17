// Variables, collections, modes, and variable bindings.
// All getters are async — required under manifest `documentAccess: "dynamic-page"`.
import { requireNode } from '../lib/helpers.js';

export const variablesHandlers = {
  async get_variables() {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    return Promise.all(collections.map(async col => ({
      id: col.id,
      name: col.name,
      modes: col.modes,
      defaultModeId: col.defaultModeId,
      variables: (await Promise.all(col.variableIds.map(async vid => {
        const v = await figma.variables.getVariableByIdAsync(vid);
        if (!v) return null;
        return {
          id: v.id,
          name: v.name,
          type: v.resolvedType,
          values: Object.fromEntries(
            await Promise.all(Object.entries(v.valuesByMode).map(async ([modeId, val]) => {
              // Resolve aliases
              if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
                const ref = await figma.variables.getVariableByIdAsync(val.id);
                return [modeId, { alias: ref ? ref.name : val.id }];
              }
              return [modeId, val];
            }))
          ),
        };
      }))).filter(Boolean),
    })));
  },

  async get_variable(params) {
    const v = await figma.variables.getVariableByIdAsync(params.variableId);
    if (!v) throw new Error(`Variable not found: ${params.variableId}`);
    const col = await figma.variables.getVariableCollectionByIdAsync(v.variableCollectionId);
    return {
      id: v.id,
      name: v.name,
      type: v.resolvedType,
      collection: col ? { id: col.id, name: col.name, modes: col.modes } : null,
      values: Object.fromEntries(
        await Promise.all(Object.entries(v.valuesByMode).map(async ([modeId, val]) => {
          if (val && typeof val === 'object' && val.type === 'VARIABLE_ALIAS') {
            const ref = await figma.variables.getVariableByIdAsync(val.id);
            return [modeId, { alias: ref ? ref.name : val.id, aliasId: val.id }];
          }
          return [modeId, val];
        }))
      ),
    };
  },

  create_variable_collection(params) {
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
  },

  async create_variable(params) {
    // params: collectionId, name, type ('COLOR'|'FLOAT'|'STRING'|'BOOLEAN'), values { modeId: value }
    const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
    if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
    const variable = figma.variables.createVariable(params.name, col, params.type);
    if (params.values) {
      for (const [modeId, value] of Object.entries(params.values)) {
        variable.setValueForMode(modeId, value);
      }
    }
    return { id: variable.id, name: variable.name, type: variable.resolvedType };
  },

  async update_variable(params) {
    // params: variableId, values { modeId: value }
    const v = await figma.variables.getVariableByIdAsync(params.variableId);
    if (!v) throw new Error(`Variable not found: ${params.variableId}`);
    for (const [modeId, value] of Object.entries(params.values)) {
      v.setValueForMode(modeId, value);
    }
    return { id: v.id, name: v.name, type: v.resolvedType };
  },

  async delete_variable(params) {
    // params: variableId
    const v = await figma.variables.getVariableByIdAsync(params.variableId);
    if (!v) throw new Error(`Variable not found: ${params.variableId}`);
    v.remove();
    return { success: true };
  },

  async apply_variable(params) {
    // params: nodeId, property, variableId
    const node = await requireNode(params.nodeId);
    const v = await figma.variables.getVariableByIdAsync(params.variableId);
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
  },

  async detach_variable(params) {
    // params: nodeId, property, index (optional, for fills/strokes)
    const node = await requireNode(params.nodeId);
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
  },

  async get_variable_bindings(params) {
    // params: nodeId
    const node = await requireNode(params.nodeId);
    const result = { nodeId: node.id, name: node.name, bindings: {} };

    const resolve = async (b) => {
      if (!b || !b.id) return null;
      const v = await figma.variables.getVariableByIdAsync(b.id);
      return v ? { id: v.id, name: v.name, type: v.resolvedType } : { id: b.id };
    };

    // Direct bound variables on the node
    if ('boundVariables' in node && node.boundVariables) {
      for (const [prop, binding] of Object.entries(node.boundVariables)) {
        if (!binding) continue;
        result.bindings[prop] = Array.isArray(binding) ? await Promise.all(binding.map(resolve)) : await resolve(binding);
      }
    }

    // Paint bindings (fills/strokes)
    for (const paintProp of ['fills', 'strokes']) {
      if (!(paintProp in node) || !node[paintProp]) continue;
      const paints = node[paintProp];
      const paintBindings = [];
      for (const paint of paints) {
        if (paint.boundVariables?.color) {
          const v = await figma.variables.getVariableByIdAsync(paint.boundVariables.color.id);
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
  },

  async add_mode(params) {
    // params: collectionId, name
    const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
    if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
    const modeId = col.addMode(params.name);
    return { success: true, collectionId: col.id, modeId, modeName: params.name, modes: col.modes };
  },

  async rename_mode(params) {
    // params: collectionId, modeId, name
    const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
    if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
    col.renameMode(params.modeId, params.name);
    return { success: true, collectionId: col.id, modeId: params.modeId, modes: col.modes };
  },

  async remove_mode(params) {
    // params: collectionId, modeId
    const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
    if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
    col.removeMode(params.modeId);
    return { success: true, collectionId: col.id, modes: col.modes };
  },

  async switch_mode(params) {
    // params: nodeId, collectionId, modeId — applies a variable mode to a specific frame/component
    const node = await requireNode(params.nodeId);
    if (!('setExplicitVariableModeForCollection' in node)) {
      throw new Error('Node does not support explicit variable modes');
    }
    const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
    if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
    node.setExplicitVariableModeForCollection(col, params.modeId);
    return { success: true, nodeId: node.id, collectionId: params.collectionId, modeId: params.modeId };
  },

  async reset_mode(params) {
    // params: nodeId, collectionId — removes explicit mode override, falls back to parent/default
    const node = await requireNode(params.nodeId);
    if (!('clearExplicitVariableModeForCollection' in node)) {
      throw new Error('Node does not support explicit variable modes');
    }
    const col = await figma.variables.getVariableCollectionByIdAsync(params.collectionId);
    if (!col) throw new Error(`Collection not found: ${params.collectionId}`);
    node.clearExplicitVariableModeForCollection(col);
    return { success: true };
  },
};
