# Claude Bridge

Figma plugin + local server that gives Claude direct, scripted control of your Figma file — read and edit designs through natural language.

## How it works

```
        Claude Code
            │  curl POST /command
            ▼
   Bridge server (localhost:3571)
            │  WebSocket
            ▼
   Claude Bridge plugin (Figma)
            │  Figma Plugin API
            ▼
       Your Figma file
```

Claude sends a command (e.g. *"create an auth screen"*), the bridge relays it over a WebSocket to the plugin running in Figma, the plugin executes it through the Plugin API and returns the result. ~109 actions cover reading, creating, editing, variables, components, styles, and audits — all through one local HTTP endpoint. No Figma token or cloud MCP required.

## Setup

### 1. Start the bridge server

```bash
cd server
npm install
node server.js
```

Runs on `http://localhost:3571` (loopback only — not exposed to your network).

### 2. Load the plugin in Figma

Figma Desktop → **Plugins → Development → Import plugin from manifest** → select `manifest.json`. Run it — a green dot means connected.

### 3. Talk to Claude

Open Claude Code in this folder. Claude reads `CLAUDE.md` automatically and drives Figma through the bridge.

```
"Create a responsive sign-up screen"
"Change all button labels to Sign Up"
"Build a pricing page using our existing components"
"Add a mobile variant of the dashboard"
"Audit contrast on the current page"
```

## Best practices (how to prompt)

- **Everything is responsive by default.** Claude builds with auto-layout and proper `FILL`/`HUG`/`FIXED` sizing, so screens reflow when resized — you don't need to ask for it.
- **Style is Claude's call unless you set rules.** For a quick mockup, Claude picks a clean, coherent look on its own. To enforce your design instead:
  - *"use the existing components"* → Claude instances your library rather than drawing new UI
  - *"use our tokens / variables"* → Claude binds existing variables and applies your text styles
  - *"match this brand: …"* → Claude sticks to the palette and type you give it
- **Name a file's conventions once.** Per-project notes live in `.figma-projects/{fileKey}/design.md` (private, git-ignored) — Claude reads and updates them so component IDs and style decisions persist across sessions.
- **Ask for a screenshot** any time to see the result inline (*"show me a screenshot"*).
- **Big builds are cheap.** Claude batches work into 2–3 requests, so *"build the whole onboarding flow"* in one go is fine.

## Development

```bash
npm install
npm run build   # build code.js (esbuild) + ui.html (vite)
npm run watch   # rebuild on change
```

Plugin source: `src/code.js` (thin entry, dispatches to handlers) → `src/handlers/*.js` (actions grouped by category) → `src/lib/helpers.js` (shared helpers). Server: `server/server.js`. After editing anything under `src/`, run `npm run build` and re-run the plugin in Figma to load the new bundle.
