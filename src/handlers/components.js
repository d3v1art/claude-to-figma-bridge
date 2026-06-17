// Components, component sets, variants, and instances.
import { requireNode, nodeInfo } from '../lib/helpers.js';

export const componentsHandlers = {
  async create_instance(params) {
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
  },

  async add_component_property(params) {
    // params: componentId, name, type ('TEXT'|'BOOLEAN'|'INSTANCE_SWAP'), defaultValue
    const node = await requireNode(params.componentId);
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') throw new Error('Node is not a component');
    const key = node.addComponentProperty(params.name, params.type, params.defaultValue ?? '');
    return { key, name: params.name, type: params.type };
  },

  async set_property_reference(params) {
    // params: nodeId, references { characters: 'key', mainComponent: 'key', visible: 'key' }
    // Links a layer inside a component to a component property
    const node = await requireNode(params.nodeId);
    node.componentPropertyReferences = params.references;
    return { success: true, nodeId: params.nodeId, references: params.references };
  },

  async get_component_properties(params) {
    const node = await requireNode(params.nodeId);
    if (!('componentPropertyDefinitions' in node)) throw new Error('Node has no component properties');
    return node.componentPropertyDefinitions;
  },

  async combine_as_variants(params) {
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
  },

  async create_component_from_node(params) {
    // Convert an existing frame/group node into a component in-place
    const node = await requireNode(params.nodeId);
    const component = figma.createComponentFromNode(node);
    if (params.name) component.name = params.name;
    return { id: component.id, name: component.name, type: component.type };
  },

  async create_component(params) {
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
  },

  async set_instance_property(params) {
    // params: nodeId, properties { propName: value }
    const node = await requireNode(params.nodeId);
    if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
    for (const [key, value] of Object.entries(params.properties)) {
      node.setProperties({ [key]: value });
    }
    return { success: true };
  },

  async get_instance_properties(params) {
    // params: nodeId
    const node = await requireNode(params.nodeId);
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
  },

  async swap_instance(params) {
    // params: nodeId, componentId
    const node = await requireNode(params.nodeId);
    if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
    const comp = await figma.getNodeByIdAsync(params.componentId);
    if (!comp || comp.type !== 'COMPONENT') throw new Error(`Not a component: ${params.componentId}`);
    node.swapComponent(comp);
    return { success: true, nodeId: node.id, newComponentId: comp.id, newComponentName: comp.name };
  },

  async reset_instance(params) {
    // params: nodeId — reset all overrides on a component instance
    const node = await requireNode(params.nodeId);
    if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
    node.resetOverrides();
    return { success: true };
  },

  async detach_instance(params) {
    // params: nodeId — detach instance from its main component
    const node = await requireNode(params.nodeId);
    if (node.type !== 'INSTANCE') throw new Error('Node is not a component instance');
    const frame = node.detachInstance();
    return { success: true, ...nodeInfo(frame) };
  },
};
