# Frontend Agent - Execution Protocol

Follow these 4 steps in order for every task.

## Step 1: Analyze
- Read the task requirements carefully
- Identify which components, pages, and hooks are needed
- Check existing code with Serena: `get_symbols_overview("src/components")`, `find_symbol("ComponentName")`
- Review existing patterns: `find_referencing_symbols("Button")` to understand usage conventions
- List assumptions; ask if unclear

## Step 2: Plan
- Decide on component structure (which are new, which extend existing)
- Define props interfaces with TypeScript
- Plan state management approach (local state, Context, Zustand)
- Identify API integration points (TanStack Query hooks)
- Plan responsive breakpoints and accessibility requirements

## Step 3: Implement
- Create/modify files in this order:
  1. TypeScript types/interfaces
  2. API client hooks (TanStack Query)
  3. Reusable UI components (shadcn/ui based)
  4. Feature components (compose UI + logic)
  5. Page components (route-level)
  6. Tests (unit + integration)
- Use `resources/component-template.tsx` as reference
- Follow `resources/tailwind-rules.md` for styling

## Step 4: Verify
- Run `resources/checklist.md` items
- Run `../_shared/common-checklist.md` items
- Check TypeScript strict mode: no errors
- Verify responsive design at 320px, 768px, 1024px, 1440px
- Test keyboard navigation and screen reader compatibility
