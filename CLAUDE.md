@AGENTS.md

## Claude Code

- Use plan mode for any new feature or non-trivial change before writing code — propose the approach, wait for review, then implement.
- Plan mode is a session/tool-level setting (`Shift+Tab`, `/plan`, or `--permission-mode plan` at launch — check the status bar for current state), not something this file can enable or disable. This line states a *preference* for when to use it, not a control switch.
- When a task includes a verification step (tests, lint, build), run it and fix failures before considering the task done — don't just report what should pass.