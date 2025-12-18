# Copilot Instructions for plugaishop-app

## Project Overview
**plugaishop-app** is a React Native e-commerce mobile application built with Expo and Expo Router. It targets Android, iOS, and web platforms with a tab-based navigation structure for browsing products, managing shopping carts, and user profiles.

## Architecture & Key Patterns

### File-Based Routing (Expo Router v6)
- Routes are defined by file structure in `/app` directory
- Root layout: `app/_layout.tsx` manages Stack navigation
- Tab-based navigation: `app/(tabs)/_layout.tsx` defines bottom tab bar
- Tab screens: `app/(tabs)/{index,explore,cart,profile}.tsx`
- Group folders (parentheses) organize route segments without appearing in URL
- Route precedence: most specific routes (files) override less specific (folders)

**Key files:**
- `app/_layout.tsx` - Root Stack with modal presentation
- `app/(tabs)/_layout.tsx` - Tabs configuration with IconSymbol icons
- `app/(tabs)/index.tsx` - Home screen (current layout placeholder)

### Theming & Styling
- Theme colors defined in `constants/theme.ts` with light/dark variants
- Use `useColorScheme()` hook from `hooks/use-color-scheme.ts` to detect system preference
- Apply `Colors[colorScheme]` for dynamic theme access
- All components use React Native `StyleSheet.create()` for performance
- No external CSS frameworks; inline StyleSheet objects only

**Example pattern:**
```tsx
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const colorScheme = useColorScheme() ?? "light";
const containerBg = Colors[colorScheme].background;
```

### Component Structure
- **UI Components** (`components/ui/`) - Reusable, presentational components
  - `icon-symbol.tsx` - Icon wrapper using Ionicons from `@expo/vector-icons`
- **Custom Hooks** (`hooks/`) - Device-specific logic
  - `use-color-scheme.ts` - Platform-aware theming
  - `use-color-scheme.web.ts` - Web-specific implementation (extension pattern)
- **Shared Components** (`components/`) - Business logic components
  - `themed-text.tsx`, `themed-view.tsx` - Pre-themed wrappers
  - `parallax-scroll-view.tsx` - Scroll animation components

**Key library:** Use `@react-navigation/bottom-tabs` for Tabs component (imported via Expo Router)

### Data Structure & Constants
- Mock data in `constants/products.ts` with TypeScript Product type
- Products have: `id`, `name`, `price`, `category`, `image` (URL strings)
- Arrays: `featuredProducts`, `newProducts`
- Example: Home screen currently renders static placeholder grid

**When adding features:** Query these constants or replace with API calls maintaining the Product type

### Cross-Platform Considerations
- TypeScript strict mode enabled
- Path alias `@/*` maps to workspace root (use `@/constants/theme` not relative imports)
- Web: `expo start --web` outputs static files to `/web`
- Android/iOS: Standard Expo development build workflow
- Platform-specific hooks use `.web.ts` extension pattern (see `use-color-scheme.web.ts`)

## Development Workflows

### Build & Runtime Commands
```bash
npm start              # Start Expo dev server
npm run android        # Open Android emulator/device
npm run ios            # Open iOS simulator/device
npm run web            # Start web dev server
npm run lint           # Run ESLint (Expo flat config)
npm run reset-project  # Clear app/ and create blank state
```

### Debugging & Testing
- No test framework configured; manual testing via Expo Go or emulators
- ESLint uses `eslint-config-expo` flat config format
- Type checking: TypeScript with strict mode
- Use `expo lint` to validate code style

### Dependency Management
- **Core:** React 19.1.0, React Native 0.81.5, Expo 54.0.25
- **Routing:** expo-router 6.0.15
- **Navigation:** @react-navigation (bottom-tabs, native, elements)
- **UI:** @expo/vector-icons (Ionicons), react-native-reanimated, react-native-worklets
- **Dev:** TypeScript 5.9.2, ESLint 9.25.0

**Pattern:** All Expo dependencies use consistent naming (`expo-*`). Check `package.json` before assuming availability.

## Code Conventions & Guidelines

### Naming & Structure
- Portuguese labels in UI (category names, button titles, section headings)
- English code comments and TypeScript type definitions
- Component files: PascalCase (`IconSymbol.tsx`)
- Hook files: kebab-case (`use-color-scheme.ts`)
- Path imports: Always use `@/` alias for absolute imports

### TypeScript Usage
- Define types in source files (e.g., `Product` type in `products.ts`)
- Export types alongside data
- Strict null/undefined checking enforced
- Avoid `any` types; use proper typing for Icon names (`IconSymbolName`)

### Component Patterns
1. **Functional Components Only** - No class components
2. **Hooks at Top Level** - Call hooks directly, not conditionally
3. **StyleSheet Memoization** - Define `const styles = StyleSheet.create()` outside component
4. **Default Props** - Use destructuring with defaults: `size = 24` in function parameters
5. **Container vs Presentational** - UI components receive data via props, no state management logic

**Example - Bad:** Inline styles, imperative rendering, mixing concerns
**Example - Good:** See `components/ui/icon-symbol.tsx` and `app/(tabs)/_layout.tsx`

### React Native API Usage
- `ScrollView` for vertical lists (home screen uses this)
- `View` for containers (never `<div>`)
- `Text` for text content (never inline strings in Views)
- `Image` for images with explicit size constraints
- `TextInput` for user input with `placeholderTextColor` for dark mode support
- `StyleSheet.create()` for all styling (performance)
- `FlatList`/`SectionList` for performance when list data grows beyond mock data

## Integration Points & Future Expansion

### Adding New Screens
1. Create file in `app/(tabs)/new-screen.tsx`
2. Add Tabs.Screen in `app/(tabs)/_layout.tsx` with title and iconName
3. Import icon from `IconSymbol` (verify Ionicon name exists)
4. Follow styling pattern from existing screens (theme-aware with Colors)

### Connecting to APIs
- Replace `constants/products.ts` data with API calls
- Maintain Product type structure for consistency
- Use React hooks (useState, useEffect) for data fetching in screens
- Consider Context API or external state library if cart/user data shared across screens

### Adding Global State Management
- Currently no Redux/Zustand; evaluated against complexity
- If needed: Install state library, configure at root in `app/_layout.tsx`
- Inject provider wrapping Stack component

## Type Safety & Linting
- Run `npm run lint` before commits
- Fix ESLint violations: mostly import ordering, unused variables
- TypeScript errors block development build (strict mode)
- Use consistent quote style (double quotes enforced by ESLint config)

## Mobile-Specific Considerations
- Safe area handled by `react-native-safe-area-context` (auto-injected by Expo)
- Haptic feedback available: `expo-haptics` (imported but unused currently)
- No camera/sensors in current scope
- Images from URLs use `Image` component with resizeMode
- Test on both Android and iOS as rendering can differ
