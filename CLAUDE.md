# Claude Bridge

This project includes a local bridge server that lets you control Figma directly.

## How you control Figma

All Figma operations go through this project's local **bridge** — `curl` POST requests to `http://localhost:3571/command`. This is the only mode: **do not use the `use_figma` tool or the Figma MCP.** Everything — reading, building, editing, auditing — is done through the bridge actions listed below.

## Connecting to Figma

The bridge server runs at **http://localhost:3571**. Before any Figma operation, check its status and start it if needed:

```bash
curl -s http://localhost:3571/status
```

**If the request fails (server not running)** — start it:
```bash
node /Users/cutpixel/Work/GIT/Claude\ Bridge/server/server.js &
```
Then wait 1–2 seconds and check status again.

**If `connected: false`** (server up but Figma plugin not open) — ask the user to open the Claude Bridge plugin in Figma. You cannot proceed without the plugin connected.

**If `connected: true`** — ready, send commands.

**Send a command:**
```bash
curl -s -X POST http://localhost:3571/command \
  -H "Content-Type: application/json" \
  -d '{"action": "ACTION_NAME", ...params}'
```

## Available actions

**Reading:**
- `get_selection` — what's selected right now
- `get_node` — node by ID (`nodeId`)
- `get_children` — direct children (`nodeId`)
- `get_tree` — node subtree (`nodeId`, `depth`)
- `get_page_nodes` — top-level nodes on current page
- `get_text` — text content (`nodeId`)
- `get_text_style` — typography (`nodeId`)
- `get_fills` — fill colors with parent chain (`nodeId`)
- `get_variables` — all local variable collections
- `get_local_components` — all components and component sets
- `find_all_instances` — all component instances
- `get_all_texts` — all text nodes in scope (`scopeId`)
- `get_screenshot` — export as base64 PNG (`nodeId`, `scale`)
- `audit_contrast` — WCAG contrast failures (`scopeId`)

**Editing:**
- `rename` — rename node (`nodeId`, `name`)
- `move` — set position (`nodeId`, `x`, `y`)
- `resize` — set size (`nodeId`, `width`, `height`)
- `set_visible` — show/hide (`nodeId`, `visible`)
- `set_text` — update text (`nodeId`, `text`)
- `set_fill` — set fill color (`nodeId`, `color: {r,g,b}`, `opacity`)
- `set_stroke` — set stroke (`nodeId`, `color`, `weight`)
- `set_corner_radius` — corner radius (`nodeId`, `radius`)
- `set_opacity` — opacity (`nodeId`, `opacity`)
- `set_font` — typography (`nodeId`, `family`, `style`, `size`)
- `set_layout` — auto-layout on FRAME only (`nodeId`, `mode`, `gap`, `padding`) — for components: create Frame with auto-layout first, then `create_component_from_node`
- `set_effect` — add shadow/effect (`nodeId`, `effectType`, ...)

**Variables & modes:**
- `create_variable_collection` — создать коллекцию (`name`, `modes?: string[]`)
- `create_variable` — создать переменную (`collectionId`, `name`, `type: COLOR|FLOAT|STRING|BOOLEAN`, `values: { modeId: value }`)
- `update_variable` — изменить значение переменной (`variableId`, `values: { modeId: value }`)
- `delete_variable` — удалить переменную (`variableId`)
- `apply_variable` — привязать переменную к свойству ноды (`nodeId`, `property`, `variableId`)
- `detach_variable` — отвязать переменную от свойства (`nodeId`, `property`)
- `get_variable_bindings` — посмотреть все привязки переменных на ноде (`nodeId`)
- `switch_mode` — переключить режим на фрейме (`nodeId`, `collectionId`, `modeId`)
- `reset_mode` — сбросить явный режим, вернуться к родительскому (`nodeId`, `collectionId`)

**Audit:**
- `audit_missing_components` — detached instances без main component
- `audit_hardcoded_colors` — заливки/обводки не из переменных
- `audit_detached_styles` — текстовые слои без text style
- `audit_empty_frames` — фреймы без содержимого
- `audit_contrast` — нарушения контраста WCAG
- `audit_all` — все проверки за один запрос (возвращает сгруппированный отчёт)

**Search:**
- `find_nodes` — find by name/text/type (`name`, `text`, `textContains`, `type`, `scopeId`, `limit`)

**Pages:**
- `get_pages` — list all pages
- `switch_page` — switch to page (`pageId`)
- `create_page` — create new page (`name`, `index?`)
- `delete_page` — delete page (`pageId`)
- `rename_page` — rename page (`pageId`, `name`)

**Viewport & selection:**
- `scroll_to_node` — zoom to node (`nodeId`)
- `set_selection` — select nodes (`nodeIds`)
- `notify` — show toast in Figma (`message`, `error?`)

**Layer order:**
- `bring_to_front` — bring to front (`nodeId`)
- `send_to_back` — send to back (`nodeId`)
- `reorder` — set exact index in parent (`nodeId`, `index`)

**Grouping:**
- `group` — group nodes (`nodeIds`, `name?`, `parentId?`)
- `ungroup` — ungroup (`nodeId`)

**Styles:**
- `get_local_styles` — all local paint/text/effect/grid styles
- `apply_paint_style` — apply color style (`nodeId`, `styleId`, `target?`)
- `apply_text_style` — apply text style to text node (`nodeId`, `styleId`)
- `apply_effect_style` — apply effect style (`nodeId`, `styleId`)
- `create_paint_style` — create color style (`name`, `color`, `opacity?`)
- `create_effect_style` — create effect style (`name`, `effects`)

**Sizing, rotation & blend:**
- `set_sizing` — layout sizing mode (`nodeId`, `axis`, `mode: FIXED|HUG|FILL`)
- `set_min_max_size` — min/max dimensions (`nodeId`, `minWidth?`, `maxWidth?`, `minHeight?`, `maxHeight?`)
- `set_blend_mode` — blend mode (`nodeId`, `blendMode`)
- `rotate` — rotation in degrees (`nodeId`, `angle`)
- `set_constraints` — layout constraints (`nodeId`, `horizontal`, `vertical`) — values: `MIN|MAX|STRETCH|CENTER|SCALE`
- `get_constraints` — read constraints (`nodeId`)
- `set_layout_positioning` — auto-layout flow (`nodeId`, `positioning: AUTO|ABSOLUTE`)
- `set_corner_radii` — individual corner radii (`nodeId`, `topLeft?`, `topRight?`, `bottomRight?`, `bottomLeft?`)

**Text:**
- `set_text_auto_resize` — text overflow mode (`nodeId`, `mode: NONE|HEIGHT|WIDTH_AND_HEIGHT|TRUNCATE`)

**Boolean operations:**
- `boolean_operation` — combine shapes (`nodeIds`, `operation: UNION|INTERSECT|SUBTRACT|EXCLUDE`, `name?`)

**Fills stack:**
- `set_fills` — replace entire fills array (`nodeId`, `fills`)
- `add_fill` — append a fill (`nodeId`, `fill`)
- `remove_fill` — remove fill by index (`nodeId`, `index?`)

**Strokes stack:**
- `set_strokes` — replace entire strokes array (`nodeId`, `strokes`)
- `add_stroke` — append a stroke (`nodeId`, `stroke`)
- `remove_stroke` — remove stroke by index (`nodeId`, `index?`)
- `set_stroke_dash` — dash pattern (`nodeId`, `dashPattern: [dash, gap, ...]`) — `[]` resets to solid

**Export:**
- `export_svg` — export node as SVG string (`nodeId`)

**Component instances:**
- `get_instance_properties` — read current property values on instance (`nodeId`)
- `set_instance_property` — set property values (`nodeId`, `properties: { key: value }`)
- `swap_instance` — swap to different component (`nodeId`, `componentId`)
- `reset_instance` — reset all overrides (`nodeId`)
- `detach_instance` — detach from component (`nodeId`)

**Creating:**
- `create_frame` — new frame (`name`, `width`, `height`, `x`, `y`, `parentId?`, `fill`, `cornerRadius`) — if no `fill` is provided, frame is transparent (empty fills)
- `create_rectangle` — rectangle (`name`, `width`, `height`, `x`, `y`, `parentId?`, `fill`, `stroke`)
- `create_ellipse` — ellipse/circle (`name`, `width`, `height`, `x`, `y`, `parentId?`, `fill`, `stroke`)
- `create_line` — line (`name`, `x`, `y`, `length`, `rotation`, `parentId?`, `stroke`, `strokeWeight`)
- `create_text` — text layer (`text`, `fontSize`, `x`, `y`, `parentId?`, `fill`)
- `create_component` — blank component (`name`, `width`, `height`, `x`, `y`, `parentId?`)
- `create_instance` — instantiate component (`componentId`, `parentId`, `x`, `y`)
- `create_component_from_node` — convert node to component (`nodeId`)
- `duplicate` — clone node (`nodeId`, `x`, `y`)

**Images:**
- `set_image_fill` — fill node with image (`nodeId`, `url` or `base64`, `scaleMode?: FILL|FIT|CROP|TILE`)

**Structure:**
- `reparent` — move to new parent (`nodeId`, `newParentId`)
- `delete_node` — delete (`nodeId`)
- `batch` — multiple commands in one call (`commands: [{action, ...params}]`)

## Colors

Colors are passed as normalized floats `{r, g, b}` in range 0–1, not 0–255.

```json
{ "r": 1, "g": 0, "b": 0 }  // red
{ "r": 0.2, "g": 0.6, "b": 1 }  // blue
```

## Design defaults

Two defaults apply to everything you create, unless the designer says otherwise.

### 1. Responsive by default

Every mockup you build must be **responsive in Figma** — it should reflow when its frame is resized, the way a real CSS layout does. This is not optional.

- **Auto-layout everywhere.** Every container frame gets `set_layout` (`HORIZONTAL` / `VERTICAL`). Avoid absolutely-positioned children unless an element genuinely floats (badge, overlay, FAB) — then use `set_layout_positioning ABSOLUTE` + `set_constraints`.
- **Choose sizing modes deliberately** (`set_sizing`, axis `horizontal` / `vertical` / `both`):
  - `FILL` — stretches to fill the parent (like `width: 100%`). Sections, columns, grid cards, inputs in a form row.
  - `HUG` — wraps its content (like `width: fit-content`). Buttons, tags, labels, inline elements.
  - `FIXED` — explicit size that doesn't change. Icons, avatars, fixed sidebars.
- **Constrain fluid elements:** modals / drawers / dialogs → `FILL` width + `set_min_max_size maxWidth`; full-page sections → `FILL` both axes.
- **Top-level screen frame:** realistic viewport width (e.g. 1440 / 390), `FIXED` width, vertical auto-layout, `HUG` or `FIXED` height — its children `FILL` the width so the whole screen reflows.
- Do not default to `HUG` for everything — `FILL` is the most common case in real layouts.

**Auto-layout gotchas (these silently break responsiveness):**
- `set_sizing FILL` only works when the **parent already has auto-layout** — set the parent's `set_layout` first, then set children to `FILL`.
- A `HUG` parent collapses `FILL` children to zero width/height — a `FILL` child needs a parent that is `FILL` or `FIXED` on that axis.
- `resize` resets a frame's sizing modes to `FIXED`. Apply `FILL` / `HUG` via `set_sizing` **after** any `resize`, never before.
- `counterAxisAlignItems` does not accept `STRETCH` — to stretch children across the counter axis, set each child to `FILL` on that axis individually.

### 2. Styling — your call, unless the designer sets rules

When the designer has **not** specified visual rules, choose colors, typography, spacing and radii yourself with good taste — ship a clean, modern, coherent look. Don't ask "what colors?" for a quick mockup; just make it good.

The moment the designer **does** name a system — "use the existing components", "use our library / tokens", "match this brand", "stick to the design system" — follow it strictly:
- Reuse existing components via `create_instance` instead of drawing new ones (`get_local_components` first).
- Bind existing variables / tokens (see Variables usage policy) and apply existing text styles via `apply_text_style`.
- Never invent new tokens or one-off colors while a system is in force.

Rule of thumb: **free styling by default, strict adherence the moment a system or brand is named.**

### Images

- Do not try to set real images unless explicitly provided.
- Use a placeholder frame with a gray fill and fixed dimensions instead.
- Name it clearly: `Image placeholder`, `Avatar placeholder`, `Cover image`, etc.

## Variables usage policy

When creating or editing elements, always check for existing variables first via `get_variables`.

- **If no variables exist at all and the task would benefit from tokens** — ask the user: *"No variables found. Should I create tokens or use hardcoded values?"*
- **If the user just wants a quick mockup** — hardcode everything, no need to ask
- **If a design system exists and is still scaling** (e.g. spacing scale has gaps, new breakpoints being added) — create missing variables that logically extend the system, no need to ask
- **If a design system is finalized** — always ask before introducing any new variable: *"This value has no matching token. Should I create one or use the closest existing variable?"* Prefer rounding to the nearest existing token over creating a new one

The goal: use the design system when it exists, don't invent one unless asked. Introducing unnecessary variables pollutes the token namespace and breaks consistency.

### Binding variables — applies to ALL nodes, not just components

After creating or editing **any** node (frame, section, component, container), immediately bind matching variables via `apply_variable`. This is not optional and not limited to components — every auto-layout frame, card, and shape must use tokens wherever they exist.

**Color variables** → bind to `fills` and `strokes` on any node with a solid fill or stroke.

**Spacing variables** → bind to every layout property on auto-layout frames:
- `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight` — all four, individually
- `itemSpacing` — the gap between children

**Radius variables** → bind to `cornerRadius` on every node that has rounded corners (cards, buttons, inputs, pills, badges, etc.).

**Matching rule:** pick the closest variable value. If the current pixel value doesn't exactly match any token, round to the nearest one and update the node value — design system compliance takes priority over pixel-perfect matching of original intent.

**Workflow — apply right after setting the value, not as an afterthought:**
1. Set the hardcoded value (e.g. `set_layout gap=16`, `set_corner_radius radius=24`)
2. Immediately follow with `apply_variable` for each property that has a matching token
3. Do not defer variable binding to a "cleanup pass" at the end — bind as you build

**What to bind — full property list:**

| Variable type | Properties to bind |
|--------------|-------------------|
| Color | `fills`, `strokes` |
| Spacing | `paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`, `itemSpacing` |
| Radius | `cornerRadius` |

**Text styles** — same rule applies. After `create_text` or when editing existing text:
- Check `get_local_styles` for available text styles
- Apply the closest matching style via `apply_text_style` (`nodeId`, `styleId`)
- Applying a style sets font, size, line-height, and letter-spacing in one step — always prefer it over setting properties individually
- For components: apply the style to the base component's text node — it propagates to all instances automatically

## Batching commands — execute in as few round-trips as possible

**Always use `batch` when making more than one change.** The goal is to complete any design task in the minimum number of curl requests — ideally 2–3 total, regardless of complexity.

```bash
curl -s -X POST http://localhost:3571/command \
  -H "Content-Type: application/json" \
  -d '{
    "action": "batch",
    "commands": [
      { "action": "set_text", "nodeId": "123:1", "text": "Hello" },
      { "action": "set_fill", "nodeId": "123:2", "color": { "r": 1, "g": 0, "b": 0 } },
      { "action": "scroll_to_node", "nodeId": "123:1" }
    ]
  }'
```

### 2-pass execution model

The only reason to split into multiple requests is when you need an ID returned by one command before you can write the next. Structure all work around this constraint:

**Pass 1 — create all nodes** (one batch): create every frame, component, text, and shape needed for the entire task. Collect all returned IDs.

**Pass 2 — style everything** (one batch): using the IDs from Pass 1, apply all fills, strokes, text content, text styles, layout properties, corner radii, spacing variables, color variables — everything — in a single batch.

**Pass 3 — screenshot** (one request): take a single screenshot at the very end to verify the result. Do not screenshot after each section or each step.

This means a complex screen with 30 nodes, 50 variable bindings, and 20 text overrides should take exactly 3 requests total.

### Known API gotchas (do not repeat these mistakes)

- **`counterAxisAlignItems` does NOT accept `"STRETCH"`** — valid values: `MIN | MAX | CENTER | BASELINE`. To make children fill the counter axis, set `set_sizing` with `axis=horizontal, mode=FILL` on each child individually.
- **`create_frame` without `fill` is now transparent** (fixed in plugin) — but always pass `fill` explicitly if a background color is intended, never rely on defaults.
- **`set_text` does NOT work on INSTANCE nodes** — use `set_instance_property` with the full property key (e.g. `"Label#2044:0"`). Get keys via `get_instance_properties` first, or reuse keys from previous calls on the same component type.
- **Fixed-size frames inside auto-layout must have `primaryAxisSizingMode = 'FIXED'` and `counterAxisSizingMode = 'FIXED'`** — if you create a frame with `layoutMode` set and then call `resize(w, h)`, auto-layout will still shrink it to fit content. Always set both sizing modes to `'FIXED'` before `resize()` on any frame that must hold a specific size (circles, icons, avatars).
- **`set_layout` failures are partial** — if one property in a `set_layout` call throws (e.g. invalid `counterAlign`), properties set before the error DO apply, those after do NOT. Order the properties in `set_layout` to put safe ones first.
- **Coordinates of nodes inside Figma Sections are RELATIVE to the section**, not absolute page coordinates — and sections do not auto-resize to fit their children. After appending frames to a section: `get_children` to read their boxes, compute the bounding box, `move` each child so the group sits at ~`(100, 100)` padding, then `resize` the section to `bbox + ~100px` on every side (Figma's native "Resize to fit"). Watch the relative-coordinate offset when positioning.

### Rules to enforce this

- **Always use `parentId` when creating nodes.** All `create_*` actions support `parentId` — pass it to place the node directly in its parent, eliminating the need for a separate `reparent` pass entirely. Creating nodes at the page level and then reparenting is always unnecessary.
- **Plan structure, not values.** Before executing, decide the node hierarchy and which operations are sequential vs. parallel. Do NOT pre-calculate pixel coordinates, spacing values, or variable IDs in your head — read them from Figma instead. Mental arithmetic is slow and error-prone; a `get_tree` or `get_variables` call is faster and always correct.
- **Prefer read → correct over pre-calculate.** If you're unsure about a position, size, or order: create it approximately, take a screenshot or get_tree, then fix with a targeted batch. This is faster than computing the perfect values upfront.
- **Don't over-plan internally before writing code.** Write the first reasonable script and execute it — don't deliberate over layout details (step indicator structure, spacing edge cases, etc.) in your head before running. Internal deliberation adds wall-clock time just like extra API calls. If the result looks wrong, fix it from the screenshot in 30 seconds.
- **Never send a request just to inspect state you already know.** If you just created a frame, you know its structure — don't `get_tree` to confirm it.
- **Never send a separate request to apply variables after creation.** Variables go in Pass 2, immediately after getting IDs from Pass 1 — not in a later cleanup round.
- **No mid-build screenshots.** Only screenshot at the end, or when something clearly went wrong and you need to diagnose it visually.
- **Avoid re-reading variable IDs.** Call `get_variables` once at the start of the task. Cache the IDs mentally and reuse them throughout all batches.
- **Only split passes when genuinely blocked on an unknown ID.** If you already know the ID, it goes in the current batch — not a new request.

## Visual hierarchy and spacing

Within a single container, **don't use one uniform gap for everything**. Spacing communicates grouping — related items sit closer together, unrelated sections sit further apart.

When a layout contains logically distinct groups (e.g. header, form fields, action buttons), wrap each group in its own section frame and set spacing at two levels:

- **Inter-section gap** (on the parent container): larger — typically 32–48px
- **Intra-section gap** (within each section frame): smaller — typically 12–20px

**Example — auth form:**
```
Form Card  [gap: 40px]
├── Header Section  [gap: 8px]   ← title + subtitle sit tight
├── Fields Section  [gap: 16px]  ← inputs stay close (they're one task)
└── Actions Section [gap: 12px]  ← buttons + footer
```

**When to split into sections:**
- Content has multiple distinct purposes (identity vs. input vs. action)
- A uniform gap makes the layout feel flat or undifferentiated
- Design needs visual breathing room between groups but not within them

Always ask: *does the same gap make sense between every pair of adjacent elements?* If not, group and apply different gaps.

## Component design

Components must be built for reuse — not as frozen snapshots of one screen.

### Text properties

Every piece of text that changes across instances must be a component property:

| Text in component | Property to add | Default value |
|-------------------|-----------------|---------------|
| Button label | `Label` (TEXT) | `"Button"` |
| Input label | `Label` (TEXT) | `"Label"` |
| Input placeholder | `Placeholder` (TEXT) | `"Placeholder"` |
| Card title | `Title` (TEXT) | `"Title"` |
| Badge / tag text | `Label` (TEXT) | `"Label"` |

The text node inside the component must stay as a **generic placeholder** — never the actual value used in the screen. Override happens on the instance, not in the component itself.

**Workflow:**
1. `add_component_property` — add TEXT property with generic default (`componentId`, `name`, `type: "TEXT"`, `defaultValue`)
2. `set_property_reference` — link the text layer to the property key returned in step 1 (`nodeId` of the text layer, `references: { characters: "<key>" }`)
3. On instances, override with `set_text` on the specific child node

### Variants

Related components (e.g. button styles, input states, card types) must be grouped into a **single COMPONENT_SET** with a `Variant` property — not left as separate top-level components.

**Workflow:**
1. Name each component with the variant encoding before combining: `"Variant=Primary"`, `"Variant=Secondary"`, etc. (use `rename`)
2. Call `combine_as_variants` with all component IDs and the shared name (e.g. `"Button"`)
3. After combining, add shared properties (Label, etc.) to the COMPONENT_SET

**Naming convention for variant property values:** use PascalCase — `Primary`, `Secondary`, `Default`, `Active`, `Error`, etc.

### Variables on components

The same variable binding rules from "Variables usage policy" apply to components — `cornerRadius`, `paddingTop/Bottom/Left/Right`, `itemSpacing`, `fills`, `strokes`. Bind them immediately when building the component, before converting to a component set or adding instances to the canvas.

### Updating an existing component

When adding variants or properties to an existing COMPONENT_SET:
1. Read current state: `get_children` on the component set + `get_component_properties`
2. Build the new variant frame, convert with `create_component_from_node`
3. Use `combine_as_variants` to add it to the existing set — pass the existing set ID as parent
4. Add new shared properties via `add_component_property` on the set if needed
5. Existing instances on screens **inherit updates automatically** — no need to touch them unless the property keys changed
6. Update `design.md` with new variant IDs and any changed property keys

**After `combine_as_variants`**, apply the component-set styling via bridge actions — the API does not add it automatically:
1. `set_strokes` on the set: one SOLID stroke in Figma's variant purple `{ r: 0.541, g: 0.220, b: 0.961 }`
2. `set_stroke` weight `1`, align `INSIDE`
3. `move` each child variant to `x=20`, stacking `y` by previous heights + ~30px gaps (the set has no auto-layout)
4. `resize` the set to `pad + widest child + pad` × total height

**Renaming a component property in place is not exposed by the bridge** — rename it manually in Figma if needed (the internal `#ID` is preserved, so instances keep their overrides). To change it programmatically, use the add-new → migrate → delete-old flow below.

**Deleting a property** is destructive — all instance overrides for that property are permanently lost. If you need to replace a property: add the new one first, update all instances manually, then delete the old one.

### Component placement

All components live in a dedicated Section named `Components` on the same page as the screens. Its ID is stored in `design.md`.

**Layout rules:**
- Components are grouped by type: `Forms`, `Actions`, `Navigation`, `Icons`, etc.
- Within a group: `40px` gap between components
- Between groups: `80px` gap
- Group label (Label/SM, gray/400) sits `8px` above each group's components
- Top padding: `60px` (section header space), left/right: `40px`, bottom: `40px`
- After adding padding/stroke to a component set, always check neighbors don't overlap — resize section after every change

**When creating a new component:**
1. Determine which group it belongs to (Forms / Actions / Navigation / Icons / …)
2. Place it inside the correct group with `40px` gap to the previous component in that group
3. If it's a new group, add a group label text node and `80px` gap from the previous group
4. Resize the section: `section.resizeWithoutConstraints(newWidth, newHeight)`
5. Record the component in `design.md`

Never place components loose on the page or inside screen frames. Never use emoji in node names — use plain text only.

### After creating a component or style

Update `.figma-projects/{fileKey}/design.md` immediately:
- **New component / component set** — add its ID and all property keys (from `add_component_property` responses)
- **New variant** — add variant ID read from `componentSet.children`, never guessed
- **New text style** — add its name and style ID
- **New effect style** — add its name and style ID

**Always verify IDs before writing to design.md.** Never guess or infer node IDs — read them from the API response or via `get_children`. Guessed IDs will silently point to the wrong node.

## Per-project design notes

Each Figma project has a private `design.md` at:
```
.figma-projects/{fileKey}/design.md
```

Folder is git-ignored (private). Bound to the Figma **file key** (not project name) — survives renames.

**At the start of any Figma session:** check if the file exists and read it for project conventions before touching the canvas.

**Update the file when:**
- A new design decision is made (panel sizes, spacing choices, component patterns)
- A new screen is added (update the screen map)
- A new component or component set is created — add its ID and all property keys
- A new text style or effect style is created — add its ID
- A convention changes or is refined

**Rules to prevent bloat:**
- Max ~60 lines — prune stale or redundant entries when the file grows
- Only document decisions made by the designer, not current Figma state (positions and IDs are read live)
- Variable collection IDs are worth keeping — they don't change and save a `get_variables` parse

## Screen layout on the canvas

### Rule #1 — detect the existing pattern first

Before placing any new screen, call `get_page_nodes` and analyse what's already there:
- **Naming** — what convention is used? (`Auth / Desktop`, `Onboarding/Step 1`, `dashboard-mobile`, etc.)
- **Axis** — are screens arranged horizontally (varying x, same y) or in rows (varying both)?
- **Gaps** — measure the space between existing frames (x2 - x1 - width1)
- **Grouping** — are there Figma Sections? Are viewport variants side-by-side or stacked?

**Match that pattern exactly.** Do not impose a new layout scheme on a file that already has one.

### Rule #2 — default layout for new projects (no pattern yet)

When the canvas is empty or has only one screen, use this structure:

```
Row per flow, flows stacked vertically:

  ┌─────────────────────────────────────────────┐  ← Figma Section "Auth"
  │ [Desktop 1440]  [Mobile 390]  [Tablet 1024] │
  └─────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────┐  ← Figma Section "Register"
  │ [Desktop 1440]  [Mobile 390]  [Tablet 1024] │
  └─────────────────────────────────────────────┘
```

- Gap between screens within a row: **200px**
- Gap between rows (flows): **400px**
- All screens in a row share the same **y = 0** (top-aligned)
- Naming: `Flow / Viewport` — e.g. `Auth / Desktop`, `Auth / Mobile`

### Rule #3 — adding a screen to an existing file

1. `get_page_nodes` — read current positions and names
2. Identify which row (flow) the new screen belongs to
3. Place it at `x = rightmost_screen_in_that_row + width + gap`, same `y` as that row
4. Match the existing naming convention — do not invent a new one
5. Update `design.md` screen map with the new position

### Rule #4 — viewport variants

When adding a mobile/tablet variant of an existing desktop screen:
1. Read the desktop screen structure (`get_tree`) — don't rebuild from memory
2. Adapt layout: adjust panel widths, font sizes, spacing to fit the new viewport
3. Reuse the same component instances — don't recreate components
4. Place it to the right of the desktop screen in the same row (same y)
5. Update `design.md` screen map

## Accessibility

Run `audit_contrast` only when explicitly requested — not automatically after creating screens. Use `scopeId` (not `nodeId`) to scope the check.

## Typical workflow

1. **Read `design.md`** for the active Figma project before any Figma operation
2. `get_selection` or `get_page_nodes` — understand what's on the canvas
3. `find_nodes` — locate specific elements by name, text, or type
4. `get_tree` — inspect structure of a specific node if needed
5. Make targeted edits with specific actions
6. Use `batch` for multiple changes at once
7. **`scroll_to_node`** — always scroll to the result at the end so the user sees it
