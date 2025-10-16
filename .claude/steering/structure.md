# Project Structure & Architecture

## Application Architecture

### Architecture Pattern
Zencourt follows a **component-based architecture** using Next.js App Router with a single-page application (SPA) experience through client-side tab navigation.

### Navigation Structure
```
App Root (page.tsx)
├── Sidebar (Navigation)
│   ├── Desktop: Fixed left sidebar
│   └── Mobile: Bottom navigation + top header
└── Content Area (Tab-based views)
    ├── Projects View (default)
    ├── Video Editor View
    ├── Social Media View
    └── Settings View
```

## Directory Organization

### `/src/app/` - Next.js App Router
Application entry point and routing configuration.

**Key Files:**
- `layout.tsx` - Root layout with metadata, font loading
- `page.tsx` - Home page with tab state management and view routing

**Responsibilities:**
- Application shell and layout
- Global state management (currently: activeTab)
- Conditional view rendering
- Background styling and theming

### `/src/components/` - React Components
All React components, organized by type.

#### Feature Components (Root level)
- `Sidebar.tsx` - Navigation component (desktop + mobile variants)
- `ProjectsView.tsx` - Project dashboard and grid
- `VideoEditor.tsx` - Video editing interface
- `SocialMediaView.tsx` - Social media management
- `SettingsView.tsx` - Application settings

#### `/src/components/ui/` - UI Primitives
Reusable, low-level UI components following the shadcn/ui pattern.

**Component Categories:**
- **Layout:** `card`, `separator`, `sidebar`, `table`, `tabs`, `aspect-ratio`, `resizable`, `scroll-area`
- **Forms:** `button`, `input`, `textarea`, `checkbox`, `radio-group`, `select`, `switch`, `slider`, `calendar`, `form`, `label`, `input-otp`
- **Overlays:** `dialog`, `alert-dialog`, `sheet`, `drawer`, `popover`, `tooltip`, `hover-card`, `command`, `context-menu`, `dropdown-menu`, `menubar`, `navigation-menu`
- **Feedback:** `alert`, `toast`/`sonner`, `progress`, `skeleton`, `badge`
- **Content:** `accordion`, `carousel`, `collapsible`, `toggle`, `toggle-group`, `breadcrumb`, `pagination`
- **Data:** `chart`

**UI Component Principles:**
- Built on Radix UI primitives
- Exported as individual modules
- Composable and customizable
- Type-safe with TypeScript
- Accessible by default

#### `/src/components/figma/` - Figma Imports
Components imported or generated from Figma designs.
- `ImageWithFallback.tsx` - Image component with error handling

### `/public/` - Static Assets
Static files served directly (images, fonts, icons, etc.)

### `/.claude/` - Claude Code Configuration
- `/steering/` - Project steering documents (this folder)
- `/specs/` - Feature specifications (requirements, design, tasks)

## Component Architecture Patterns

### View Components
Large, page-level components that represent entire application sections.

**Structure:**
```tsx
export function ViewName() {
  const [localState, setLocalState] = useState();

  // Data/logic

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* View content */}
    </div>
  );
}
```

**Characteristics:**
- Client components (`"use client"`)
- Manage local state
- Compose multiple UI components
- Responsive padding and layout
- Self-contained functionality

### UI Primitive Components
Small, reusable components with clear, single responsibilities.

**Structure:**
```tsx
interface ComponentProps {
  // Typed props
}

export function Component({ ...props }: ComponentProps) {
  return (
    <RadixPrimitive>
      {/* Implementation */}
    </RadixPrimitive>
  );
}
```

**Characteristics:**
- Minimal logic
- Highly composable
- Variant support via CVA
- Forward refs when needed
- Accessibility built-in

## Data Flow Patterns

### Current Implementation
```
User Interaction
    ↓
Component State (useState)
    ↓
Re-render
    ↓
UI Update
```

### Props Flow
```
page.tsx (Root)
    ↓ (activeTab, setActiveTab)
Sidebar
    ↓ (user clicks)
setActiveTab()
    ↓
page.tsx re-renders
    ↓
Conditional view rendering
```

### Future State Management
For complex features requiring state persistence:
```
User Action
    ↓
Component Event
    ↓
API Call (upload, generate, etc.)
    ↓
Server Processing
    ↓
State Update
    ↓
UI Re-render
```

## Styling Architecture

### Design System Tokens
- **Colors:** Defined via Tailwind CSS configuration
  - Beige/cream gradient theme: `#e8ddd3`, `#d4c4b0`
  - Semantic colors: `foreground`, `background`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`
- **Spacing:** Tailwind default scale (4px base unit)
- **Typography:** System font stack
- **Breakpoints:**
  - `sm`: 640px (tablet)
  - `lg`: 1024px (desktop)
  - Mobile-first: default (< 640px)

### Responsive Strategy
1. **Mobile First:** Base styles target mobile
2. **Progressive Enhancement:** `sm:` and `lg:` for larger screens
3. **Layout Shifts:**
   - Mobile: Bottom navigation + top header
   - Desktop: Left sidebar navigation
4. **Component Adaptation:**
   - Grid columns: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
   - Padding: `p-4 sm:p-6 lg:p-8`
   - Font sizes: `text-2xl sm:text-3xl`
   - Element visibility: `hidden lg:flex`

## Feature Module Pattern

For complex features (like image upload with AI sorting):

```
Feature Specification (.claude/specs/feature-name/)
    ├── requirements.md
    ├── design.md
    └── tasks.md

Implementation (src/components/)
    ├── FeatureContainer.tsx (main orchestrator)
    ├── FeatureSubComponentA.tsx
    ├── FeatureSubComponentB.tsx
    └── hooks/
        ├── useFeatureLogic.ts
        └── useFeatureAPI.ts
```

## File Naming Conventions

- **Components:** PascalCase (`ProjectsView.tsx`, `Button.tsx`)
- **Hooks:** camelCase with `use` prefix (`useUpload.ts`)
- **Utils:** camelCase (`formatDate.ts`, `apiClient.ts`)
- **Types:** PascalCase (`UserProfile.ts`, `ProjectTypes.ts`)
- **Constants:** SCREAMING_SNAKE_CASE or camelCase (`API_ENDPOINTS.ts`, `config.ts`)

## Import Alias Pattern

```tsx
// Absolute imports using @ alias
import { Component } from "@/components/ComponentName"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { type User } from "@/types/user"

// Relative imports for local files
import { LocalHelper } from "./helpers"
```

## Code Organization Best Practices

1. **Separation of Concerns:** UI components separate from business logic
2. **Single Responsibility:** Each component/file has one clear purpose
3. **DRY Principle:** Extract reusable logic to hooks or utilities
4. **Explicit Dependencies:** Clear imports, no implicit globals
5. **Type Safety:** Interface/type definitions for all data structures
6. **Composition:** Build complex UIs from simple, composable pieces

## Testing Structure (Future)

```
src/
├── components/
│   ├── ComponentName.tsx
│   └── __tests__/
│       ├── ComponentName.test.tsx
│       └── ComponentName.integration.test.tsx
├── hooks/
│   ├── useHookName.ts
│   └── __tests__/
│       └── useHookName.test.ts
└── lib/
    ├── utility.ts
    └── __tests__/
        └── utility.test.ts
```

## Performance Optimization Patterns

1. **Code Splitting:** Dynamic imports for heavy components
2. **Image Optimization:** Next.js Image component
3. **Memoization:** React.memo for expensive renders
4. **Lazy Loading:** Defer non-critical component loading
5. **Server Components:** Use server components for static content (future)

## Integration Points (Planned)

```
Frontend (Current)
    ↓ HTTP/WebSocket
Backend API (Future)
    ↓
Services Layer
    ├── Image Upload Service
    ├── AI Analysis Service (Room Detection)
    ├── Video Generation Service
    ├── Project Management Service
    └── User Authentication Service
    ↓
Data Layer
    ├── Database (Project metadata)
    ├── File Storage (Images, videos)
    └── Cache Layer (Redis)
```
