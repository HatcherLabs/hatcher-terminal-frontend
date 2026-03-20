# CLAUDE.md

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Git Discipline

### Commit Rules
- Commit after every meaningful change — never batch unrelated changes
- Commit messages follow Conventional Commits:
  - `feat: add user authentication flow`
  - `fix: resolve null pointer in data parser`
  - `refactor: extract validation into utility module`
  - `docs: update API documentation`
  - `style: fix inconsistent spacing`
  - `chore: update dependencies`
  - `test: add integration tests for auth`
- Keep commits atomic — one logical change per commit
- Never commit secrets, .env files, private keys, or API keys
- Always review `git diff` before committing

### Branch Strategy
- `main` — stable, deployable code only
- `dev` — active development
- Feature branches from `dev`: `feat/feature-name`, `fix/bug-name`, `refactor/what`
- Merge flow: feature branch → `dev` → `main` (when stable)

### Push Rules
- Push after every commit, or at minimum after every completed task
- Before push: code builds, runs, no obvious errors
- After push: verify with `git log --oneline -5`

### Commit Workflow
```bash
# After every meaningful change:
git add -A
git commit -m "type: concise description"
git push origin <current-branch>
```

### End of Session
- Always commit and push ALL work before ending
- Leave a summary in `tasks/todo.md` of what was done and what's next
- Never leave uncommitted changes

---

## README Maintenance

### Keep README.md Current
Update README.md immediately when any of these change:
- Setup instructions (new dependencies, env vars, services)
- Available commands/scripts
- Project structure (new directories, reorganization)
- Features (new feature completed)
- API endpoints (new routes)
- Environment variables (new vars required)

README reflects the CURRENT state — not a wishlist.

### README Structure
```markdown
# Project Name

Brief description.

## Quick Start
Steps to get running locally.

## Tech Stack
Technologies used.

## Project Structure
Key directories and files.

## Features
What's implemented and working. WIP marked separately.

## Environment Variables
All required vars with descriptions.

## Scripts
Available commands.

## API Endpoints
Routes, methods, params, descriptions.

## Development
Contributing, branch strategy, conventions.

## License
```

### When to Update
- New dependency → Quick Start + Tech Stack
- New env var → Environment Variables
- New API route → API Endpoints
- Feature completed → Features
- Structure changed → Project Structure
- New script → Scripts

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Minimal code impact.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Touch only what's necessary. Don't introduce bugs.
- **No Hallucinating**: If unsure about an API or library — look it up, don't guess.
- **Read Before Build**: Read relevant docs and existing code before writing anything new.
- **No Dead Code**: Remove unused imports, commented-out blocks, orphaned files.
- **Consistent Style**: Follow existing project conventions. Don't introduce new patterns silently.
- **Error Handling**: Never swallow errors. Log, surface, or handle them properly.
- **Types Over Any**: In TypeScript projects, define proper types. Avoid `any`.
