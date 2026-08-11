# SchemaPad VS Code Extension

Welcome! Here’s a quick guide to getting it running in VS Code and using the main features.

## Opening SchemaPad

There are a few ways to open SchemaPad.

### 1. From the Sidebar

The easiest way is through the VS Code Activity Bar.

Look for the SchemaPad icon on the left side of VS Code. If it isn't already pinned, right-click it and select **Keep**.

Clicking the icon opens the SchemaPad sidebar, where you can quickly open the editor.

### 2. From the Command Palette

You can also open SchemaPad from anywhere in VS Code.

- **Windows / Linux:** `Ctrl + Shift + P`
- **macOS:** `Cmd + Shift + P`

Search for `SchemaPad,`, and you'll see:

- **SchemaPad: Open Visual Editor**
- **SchemaPad: Open in Split View**

### Open SchemaPad or Open in Split View?

When you open SchemaPad, you'll see two options:

**Open SchemaPad**

Opens the visual editor on its own. This gives you the most space for working with your database diagram and AI assistant.

**Open in Split View**

Opens your `contract.prisma` file on the left and SchemaPad on the right.

Both sides stay synced. Change the Prisma file and the diagram updates. Change something in the diagram and the Prisma file updates too.

You'll also find a few other commands here:

- **SchemaPad: Show Primary Sidebar**
- **SchemaPad: Show Command Center**
- **SchemaPad: Reset Onboarding**

These options are self-explanatory.

---

## Reporting a Bug or Requesting a Feature

Found something broken or have an idea for SchemaPad?

You can open a GitHub issue directly from the extension.

- Press `/`, type `issue`, and hit Enter or
- Click the **GitHub** icon in the top-right of the canvas and navigate to issues.

This opens the issue form on the SchemaPad GitHub repository.

---

## Using the AI Assistant

SchemaPad has an AI assistant built into the canvas.

You just need to add an API key from the provider you want to use. SchemaPad has first-class support for **OpenAI, Vercel AI Gateway, OpenRouter, Groq, and OpenAI-compatible endpoints**. The assistant runs through SchemaPad's integrated backend, so there's no need to set up your own server. Add your API key, choose a model or add a custom one, and you're ready to go.

SchemaPad gives you two AI modes: **Agent** and **Chat**.

**Agent mode** gives the AI access to your canvas and lets it make changes directly when you ask it to. It can create tables, modify fields, change relationships, and work directly with your schema.

**Chat mode** is more hands-off. The AI can see and understand your canvas, so you can ask questions, discuss your schema, or get suggestions without giving it permission to change anything. If you want the AI to actually make changes, just switch to **Agent mode**.

### Start a chat

Open the chat drawer at the bottom of the canvas and start typing.

You can ask it things like:

> Build a multi-tenant SaaS schema with billing and teams.

It can also help with things like:

- Adding authentication models
- Normalizing your database
- Changing relationships
- Refactoring a schema
- Improving a schema for better query performance

**You can also press `/` anywhere on the canvas to open the command menu and start typing a prompt.**

The controls in the top-right of the chat let you expand, minimize, or clear the conversation. 



---

## Working With Your Schema

### Add a Table

You can add a table in a few ways:

- Click the **Table** icon
- Press `T`
- Double-click an empty area of the canvas

### Organize Tables With Groups

Use the **Group** icon to create visual sections around related tables.

This is useful for keeping things like users, billing, and application data organized.

### Create Relationships

Drag from a column handle to a field on another table to create a relationship.

SchemaPad will update the Prisma schema for you.

### Two-Way Sync

SchemaPad keeps your visual diagram and `contract.prisma` in sync.

Change the Prisma code and the canvas updates automatically.

Make a change on the canvas and the Prisma code is updated too.

### View SQL

Click **View SQL** or press `V` to see the SQL DDL generated from your schema.

### Import SQL

Already have a database schema?

Click **Import SQL** and select your `.sql` file. SchemaPad will load it onto the canvas.

### Grid and Snapping

Click the **Grid** icon or press `G` to turn the grid and snapping on or off.

This makes it easier to line up your tables.

---

## Preferences

Click the **Gear** icon to change your SchemaPad preferences.

You can change:

- **Theme:** Light, Dark, or System
- Canvas background
- Font: Manrope, Inter, or Excalifont

---

## Undo, Redo, and Zoom

SchemaPad supports the usual undo and redo shortcuts:

- **Undo:** `Ctrl + Z` / `Cmd + Z`
- **Redo:** `Ctrl + Shift + Z` / `Cmd + Shift + Z`

You can also access these through the `/` command menu.

Use the zoom controls in the bottom corner of the canvas to zoom in, zoom out, or return to 100%.

---

## A Few Things to Know

### No Prisma File?

If your workspace doesn't have a `.prisma` file, SchemaPad will offer to create a `contract.prisma` file for you.

It'll be created at the root of your workspace with the basic datasource and generator configuration.

### Multiple Prisma Files?

If your project has more than one `.prisma` file, SchemaPad will ask you which one you want to open.

### Want to See the Onboarding Again?

Open the Command Palette:

- **Windows / Linux:** `Ctrl + Shift + P`
- **macOS:** `Cmd + Shift + P`

Then run **SchemaPad: Reset Onboarding**.

That's it. You can jump straight into the canvas and start designing your schema.