# Accessibility drill: notes

Three components built from scratch in React and TypeScript, following the W3C ARIA Authoring Practices Guide (APG), with no component libraries. The demo is at `/playground`, which isn't linked from the site nav and is marked `noindex`.

| Component | APG pattern | File |
|---|---|---|
| Disclosure | [Disclosure (Show/Hide)](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | [components/Disclosure.tsx](components/Disclosure.tsx) |
| Tabs | [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), automatic activation | [components/Tabs.tsx](components/Tabs.tsx) |
| Modal | [Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | [components/Modal.tsx](components/Modal.tsx) |

The demo uses Klaro's own content: a "Down payment is 0%" warning, an agreement split into Terms, Evidence checklist and Client message, and a "Start a new agreement?" confirmation. [components/DiscardDraftDemo.tsx](components/DiscardDraftDemo.tsx) holds the modal's open state, so [the page](../app/playground/page.tsx) can stay a server component and export its metadata.

## How it was checked

- **Keyboard navigation:** a manual checklist for each component (Tab, Shift+Tab, Enter, Space, Escape, the arrow keys, Home and End). Everything passed.
- **Automated browser run:** headless Edge with real key presses, reading the browser's accessibility tree (the role, name and state a screen reader gets), at desktop and 375px widths.
- **Types:** `tsc --noEmit` is clean. There's no `any` and no `as unknown as`.

## Gaps compared with shadcn

The comparison is against shadcn's `dialog` and `tabs` (`npx shadcn@latest add dialog tabs`, shadcn 4.21.0). Both files are thin styling wrappers around Radix, so the references below point into Radix's source in `node_modules`. Line numbers are for the versions listed.

### 1. Tabs take over keyboard shortcuts that use modifier keys

The Tabs component built from scratch treats **Alt+Left/Right arrow** and **Ctrl+Home/End** as tab navigation and cancels the event ([components/Tabs.tsx:46-70](components/Tabs.tsx#L46-L70)). In the browser test, Alt+Right arrow switched to the next tab, and `defaultPrevented` was `true` for all four combinations. Alt+Left arrow is the browser's Back shortcut, and Ctrl+Home normally scrolls to the top of the page.

Radix stops before handling any arrow, Home or End key pressed with Alt, Ctrl, Meta or Shift, so the browser keeps those shortcuts.
`@radix-ui/react-roving-focus@1.1.19`, `dist/index.mjs:184`

### 2. The open modal silences live regions

The Modal component built from scratch puts `inert` on every other child of `<body>` ([components/Modal.tsx:143-149](components/Modal.tsx#L143-L149)), and that includes live regions. In the browser test, Next's `next-route-announcer` was made inert while the dialog was open, and so was the demo's own `role="status"` message, since it sits inside `<main>`. Anything announced while the dialog is open, such as a toast, goes unheard.

Radix hides the background with `hideOthers`, which deliberately skips `[aria-live]` elements.
`aria-hidden@1.2.6`, `dist/es2015/index.js:131-133`, called from `@radix-ui/react-dialog@1.1.23`, `dist/index.mjs:143-146`

### 3. Escape has no idea of stacked layers

The Modal component built from scratch listens for Escape on `document` and always closes the dialog ([components/Modal.tsx:90-94, 166](components/Modal.tsx#L90-L94)). If a dropdown or popover inside the dialog were open, one Escape would close both, unless that child stopped the event first.

Radix keeps a stack of dismissable layers and only lets the topmost one respond to Escape, listening in the capture phase.
`@radix-ui/react-dismissable-layer@1.1.19`, `dist/index.mjs:90-107`

### 4. Scroll lock is desktop-only

The Modal component built from scratch sets `overflow: hidden` on `<body>` and pads by the scrollbar's width ([components/Modal.tsx:153-159](components/Modal.tsx#L153-L159)). That stopped mouse-wheel scrolling in the browser test, but nothing handles touch, and it wasn't tested on a phone. Restoring is also per instance, so two dialogs open at once could restore the wrong styles if they close out of order.

Radix uses `react-remove-scroll`, which:
- blocks `wheel`, `touchmove` and `touchstart` at the document level, while still letting the dialog's own content scroll and allowing pinch-zoom (`react-remove-scroll@2.7.2`, `dist/es2015/SideEffect.js:139-141`; `@radix-ui/react-dialog@1.1.23`, `dist/index.mjs:116`)
- keeps a counter, so stacked locks unwind correctly (`react-remove-scroll-bar@2.3.8`, `dist/es2015/component.js:23-35`)

### 5. Tabs are missing several options

The Tabs component built from scratch only supports horizontal tabs, left-to-right text, automatic activation, and an uncontrolled starting tab (`defaultIndex`). Radix's Tabs also support:
- disabled tabs that the arrow keys skip (`@radix-ui/react-tabs@1.1.21`, `dist/index.mjs:97, 108, 118-119`; roving-focus `:186`)
- vertical orientation using Up and Down (roving-focus `:221-222`)
- right-to-left languages, where the arrow directions flip (roving-focus `:214-216`)
- manual activation as an option (react-tabs `:33, 130-137`)
- a selected tab the parent controls (`value` / `onValueChange`, react-tabs `:37-42`)

### Smaller gaps

- **Trigger state:** the demo's "Start a new agreement" button doesn't say it opens a dialog, or whether it's open. Radix's `DialogTrigger` sets `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls` (react-dialog `:76-79`). APG doesn't require these.
- **Scrolling when focus moves:** the Modal component built from scratch calls plain `.focus()` when returning focus ([components/Modal.tsx:177](components/Modal.tsx#L177)), so an off-screen trigger scrolls into view. Radix focuses with `preventScroll: true` (`@radix-ui/react-focus-scope@1.1.16`, `dist/index.mjs:190`). With a trigger that was on screen, the browser test showed no scroll change.
- **Removed focus:** if the focused element inside the dialog built from scratch is removed, focus drops to `<body>` until the next Tab, though Escape still works. Radix refocuses the dialog straight away using a MutationObserver (focus-scope `:54-59`).
- **Exit animation:** the Modal component built from scratch unmounts immediately. Radix keeps the dialog mounted until its closing animation finishes (react-dialog `:134`).

## Where the components built from scratch differ on purpose

- **`aria-modal="true"`:** the Modal component built from scratch sets it ([components/Modal.tsx:201](components/Modal.tsx#L201)), as APG specifies. Radix never sets it; it relies on `aria-hidden` on the background instead.
- **`inert` instead of `aria-hidden` + `pointer-events: none`:** a single attribute blocks focus, clicks and screen readers. The trade-off is gap 2.
- **The backdrop doesn't close the dialog.** Radix closes on any outside click, apart from right-clicks (react-dialog `:158-163`; dismissable-layer `:54-58`). For a destructive "discard your draft?" prompt, a stray click shouldn't dismiss it.
- **Focus returns even without a trigger.** The Modal component built from scratch falls back to whatever had focus when the dialog opened. Radix's modal only refocuses its own `DialogTrigger` (react-dialog `:154-157`), and its `preventDefault()` skips Radix's general fallback (focus-scope `:99`). So, judging from the source rather than a test, a Radix dialog opened without a `DialogTrigger` doesn't return focus anywhere.
- **Tab panels stay mounted.** The Tabs component built from scratch hides inactive panels instead of removing them ([components/Tabs.tsx:118](components/Tabs.tsx#L118)), so their content keeps its state and `aria-controls` always points at an element that exists. Radix renders a panel's content only while it's selected (react-tabs `:179`).

## Known limits

- **The modal uses `role="dialog"`, not `alertdialog`.** APG notes that its Alert Dialog pattern "is often employed" for confirming a step that's hard to undo, which describes this modal. The brief asked for `role="dialog"`, so the drill follows the brief.
- **The Disclosure isn't compared with shadcn.** Only `dialog` and `tabs` were added. shadcn's equivalent of a disclosure is `collapsible` (`npx shadcn@latest add collapsible`), which wasn't added.