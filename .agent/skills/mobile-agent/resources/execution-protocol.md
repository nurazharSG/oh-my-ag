# Mobile Agent - Execution Protocol

Follow these 4 steps in order for every task.

## Step 1: Analyze
- Read the task requirements carefully
- Identify which screens, widgets, and providers are needed
- Check existing code with Serena: `get_symbols_overview("lib/features")`, `find_symbol("ScreenName")`
- Determine platform-specific requirements (iOS vs Android)
- List assumptions; ask if unclear

## Step 2: Plan
- Decide on feature structure using Clean Architecture
- Define entities (domain) and repository interfaces
- Plan state management (Riverpod providers)
- Identify navigation routes (GoRouter)
- Plan offline-first strategy if required
- Note platform differences (Material Design 3 vs iOS HIG)

## Step 3: Implement
- Create/modify files in this order:
  1. Domain: entities and repository interfaces
  2. Data: models, API clients (Dio), repository implementations
  3. Presentation: providers (Riverpod), screens, widgets
  4. Navigation: GoRouter routes
  5. Tests: unit + widget tests
- Use `resources/screen-template.dart` as reference
- Follow Clean Architecture layers strictly

## Step 4: Verify
- Run `resources/checklist.md` items
- Run `../_shared/common-checklist.md` items
- Test on both iOS and Android (or emulators)
- Verify 60fps performance (no jank)
- Check dark mode support
