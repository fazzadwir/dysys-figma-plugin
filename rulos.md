# 🚨 GLOBAL RULES — DESIGN & IMPLEMENTATION CONSTRAINTS

These rules are **MANDATORY** and must be followed in every task.

Before starting any work:

1. Read this file (`rules.md`)
2. Understand all constraints
3. Follow them strictly

After completing any task:

- Log all changes into `progress.md`

---

# 🎯 CORE PRINCIPLE

This project prioritizes:

- Design consistency
- Accessibility (WCAG)
- Controlled UI system

NOT:

- AI-generated redesign
- Visual improvisation
- Style guessing

---

# ❌ STRICTLY FORBIDDEN

The AI MUST NOT:

1. Change UI layout structure
2. Change spacing, typography, or visual hierarchy
3. Replace components with new visual styles
4. Modify colors, shadows, borders, or radius
5. Introduce new design patterns without instruction
6. “Improve” or “modernize” UI visually
7. Refactor UI markup that affects visual output

Even if:

- the UI looks outdated
- the AI thinks it can improve it
- the request is ambiguous

👉 UI must remain EXACTLY as implemented

---

# ✅ ALLOWED CHANGES

The AI is ONLY allowed to:

### 1. Add or modify LOGIC

- feature behavior
- data processing
- validation
- state management

### 2. Add FUNCTIONAL UI (without changing design)

- new buttons (must follow existing style)
- new fields (must reuse existing components)
- new states (error, loading, empty)

### 3. Connect UI to logic

- event handlers
- message passing
- API integration

---

# 🎨 DESIGN SYSTEM LOCK

The current UI is **final and locked**.

The AI must:

- reuse existing components
- follow existing spacing and layout
- follow current typography scale
- follow current color usage

If a new UI element is required:

- it must visually match existing components
- do NOT invent new styles

---

# ♿ ACCESSIBILITY (WCAG)

All implementation MUST respect:

- sufficient color contrast
- readable text sizes
- proper button semantics
- clear interaction states

If unsure:

- follow safe WCAG defaults
- DO NOT reduce accessibility

---

# 🧩 COMPONENT REUSE RULE

Before creating anything new:

1. Check if a similar component already exists
2. Reuse it
3. Extend it if needed

DO NOT:

- duplicate components
- create variations without reason

---

# 🧠 IMPLEMENTATION BEHAVIOR

If a request is unclear:

- DO NOT guess UI changes
- DO NOT redesign

Instead:

- keep UI unchanged
- implement only the logic
- or ask for clarification

---

# 🔒 UI CHANGE PROTOCOL

If a task requires UI change:

The AI must:

1. STOP
2. Explicitly state:
   - what UI change is needed
   - why it is needed

3. Wait for confirmation

Without confirmation:
❌ DO NOT CHANGE UI

---

# 📝 PROGRESS LOGGING (MANDATORY)

After completing any task:

Update `progress.md` with:

- What was implemented
- What files were changed
- What logic was added
- Any assumptions made

---

# 🚀 TASK START REQUIREMENT

At the beginning of every task, the AI MUST:

1. Read `rules.md`
2. Confirm:
   - “Rules acknowledged”

3. Proceed with implementation

---

# 🧾 SUMMARY

The AI is a:

👉 SYSTEM IMPLEMENTER
NOT a designer

Focus on:

- logic
- correctness
- consistency

Avoid:

- creativity in UI
- visual changes
- design decisions

---

FILE STRUCTURE CONSISTENCY (MANDATORY)

The project uses a strict separation of concerns for UI implementation.

The AI MUST follow this structure:

🧩 FILE RESPONSIBILITIES

1. ui.html

Responsible for:

HTML structure
semantic markup
layout container
element hierarchy

MUST NOT contain:

inline styles
complex logic
large script blocks 2. ui.css

Responsible for:

all styling
layout (flex, grid)
spacing
typography
colors
states (hover, active, disabled)

MUST:

contain ALL styles
be the single source of truth for UI appearance

MUST NOT:

contain logic
be duplicated inside HTML 3. ui.js

Responsible for:

all UI logic
event handling
DOM manipulation
state updates
communication with code.ts via postMessage

MUST:

handle all interactions
manage dynamic rendering

MUST NOT:

contain HTML structure as strings (unless necessary for templating)
contain styling logic
❌ STRICTLY FORBIDDEN

The AI MUST NOT:

Write inline styles inside ui.html

❌ <div style="padding: 12px">
Add <style> blocks inside ui.html
Add large <script> logic inside ui.html
Mix logic and structure in the same file
Duplicate styles between ui.html and ui.css
✅ CORRECT PATTERN
HTML

<div class="action-btn">Add Style</div>
CSS
.action-btn {
  padding: 8px 12px;
}
JS
document.querySelector(".action-btn").onclick = () => {
  // logic here
};
🧠 ENFORCEMENT RULE

If the AI needs to:

change layout → update ui.html
change appearance → update ui.css
change behavior → update ui.js

DO NOT mix responsibilities.

⚠️ EXCEPTION (LIMITED)

Small inline scripts are allowed ONLY for:

bootstrapping
mounting UI

Example:

<script src="ui.js"></script>

No additional logic allowed inside HTML.

🚨 VIOLATION HANDLING

If this structure is violated:

the implementation is INVALID
must be refactored to match this structure
🧾 SUMMARY
ui.html → structure
ui.css → styling
ui.js → logic

This separation is mandatory and must be preserved at all times.

FAILURE TO FOLLOW THESE RULES IS A CRITICAL ERROR.
