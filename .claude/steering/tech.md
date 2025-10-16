# Technical Stack & Guidelines

## Core Technology Stack

### Frontend Framework
- **Next.js 15.5.5** (App Router)
  - React 19.1.0
  - Server and client components architecture
  - File-based routing in `src/app/`
  - Turbopack for development builds

### UI Framework & Styling
- **Tailwind CSS 4.0** with PostCSS
- **Radix UI** component primitives for accessible UI components
  - Dialog, Dropdown Menu, Select, Switch, Tabs, Toast, etc.
  - Full accessibility (ARIA) support built-in
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional class composition

### UI Component Library (shadcn/ui pattern)
- Custom component library in `src/components/ui/`
- Reusable, accessible components built on Radix UI primitives
- Consistent design system with defined color palette and spacing

### Icons
- **Lucide React** - Modern, consistent icon library

### Additional Libraries
- **date-fns** - Date manipulation and formatting
- **embla-carousel-react** - Carousel/slider functionality
- **react-day-picker** - Calendar and date picker components
- **recharts** - Charts and data visualization
- **sonner** - Toast notifications
- **vaul** - Drawer component
- **cmdk** - Command menu/palette
- **input-otp** - OTP input handling

## TypeScript Configuration

### Compiler Settings
- Target: ES2017
- Strict mode enabled
- Module: ESNext with bundler resolution
- Path aliases: `@/*` maps to `./src/*`
- JSX: preserve (handled by Next.js)

### Type Safety
- Strict type checking enabled
- No implicit any
- Component props must be typed
- Use TypeScript interfaces for all data structures

## Project Structure

```
zencourt-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   └── components/            # React components
│       ├── ui/                # Reusable UI primitives (shadcn/ui)
│       ├── figma/             # Figma import components
│       ├── Sidebar.tsx        # Navigation sidebar
│       ├── ProjectsView.tsx   # Projects dashboard
│       ├── VideoEditor.tsx    # Video editing interface
│       ├── SocialMediaView.tsx
│       └── SettingsView.tsx
├── .claude/                   # Claude Code configuration
│   └── steering/              # Project steering documents
├── public/                    # Static assets
└── [config files]
```

## Development Guidelines

### Component Architecture
- Use **client components** (`"use client"`) for interactive features
- Prefer functional components with TypeScript
- Extract reusable UI into `src/components/ui/`
- Keep business logic separate from presentation
- Use composition over inheritance

### State Management
- **useState** for local component state
- Props drilling for simple parent-child communication
- Consider React Context for deeply nested state (not yet implemented)
- No global state library currently in use (Redux/Zustand not installed despite types)

### Styling Conventions
- Mobile-first responsive design approach
- Breakpoints: `sm:`, `lg:` (mobile → tablet → desktop)
- Use Tailwind utility classes primarily
- Component variants via `class-variance-authority`
- Consistent spacing scale from Tailwind config
- Design system colors:
  - Primary background: gradient from `#e8ddd3` via white to `#d4c4b0`
  - Grain texture overlay for visual depth
  - Black for primary actions/active states
  - White for cards and surfaces

### Accessibility
- Use Radix UI primitives for built-in ARIA support
- Semantic HTML elements
- Keyboard navigation support
- Screen reader considerations
- Focus management in modals and dialogs

### Code Style
- ESLint with Next.js config for linting
- Prefer explicit return types on functions
- Use descriptive variable and function names
- Keep components small and focused
- Extract magic numbers/strings to constants

## Build & Development

### Scripts
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Production build with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Performance Considerations
- Use Next.js Image component for optimized images
- Implement code splitting via dynamic imports when needed
- Lazy load heavy components
- Minimize client-side JavaScript
- Leverage server components where possible

## API Integration Strategy
- No backend API currently integrated
- Future: REST or GraphQL API for:
  - Photo upload and storage
  - AI image analysis
  - Video generation queue
  - Project persistence
  - User authentication

## Testing Strategy
- No testing framework currently configured
- Recommended: Jest + React Testing Library for unit tests
- Recommended: Playwright or Cypress for E2E tests

## Version Control
- Git repository initialized
- Main branch: `main`
- Clean working tree approach
- Conventional commits recommended

## Future Technical Considerations
- Authentication system (NextAuth.js or similar)
- Database integration (Prisma + PostgreSQL/Supabase)
- File storage (AWS S3, Cloudflare R2, or Vercel Blob)
- AI integration (OpenAI Vision API, custom ML models)
- Video processing pipeline
- Real-time updates (WebSockets or Server-Sent Events)
- Analytics integration
