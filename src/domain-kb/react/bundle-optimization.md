---
name: react-bundle-optimization
description: Reduce JavaScript bundle size and improve Time to Interactive in React and Next.js applications. Use this when the user reports large initial bundles, slow page loads, high TTI/LCP metrics, or wants to optimize imports from heavy libraries like `lucide-react`, `@mui/material`, or `lodash`. Covers `next/dynamic` code splitting, barrel file import optimization with `optimizePackageImports`, conditional module loading, third-party script deferral, and static path analysis for build tools. Distinguishes from runtime rendering optimizations by focusing on what the browser downloads and parses before hydration.
source: original
license: MIT
last_reviewed: 2026-05-02
---

# React bundle optimization — code splitting, imports, and loading strategy

## When to apply

- Lighthouse reports large JavaScript bundles
- Initial page load takes >3 seconds on 4G
- Importing an icon library adds 1000+ modules to the build
- Heavy components (editors, charts, maps) load on every page
- Analytics and tracking scripts block rendering

## Pattern 1 — Dynamic imports for heavy components

Use `next/dynamic` to lazy-load components not needed on initial render.

**Incorrect (Monaco bundles with main chunk ~300KB):**

```tsx
import { MonacoEditor } from './monaco-editor'

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />
}
```

**Correct (Monaco loads on demand):**

```tsx
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(
  () => import('./monaco-editor').then(m => m.MonacoEditor),
  { ssr: false }
)

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />
}
```

## Pattern 2 — Avoid barrel file imports

Barrel files (`index.js` re-exporting everything) force the bundler to resolve the entire module graph. Popular libraries can have 10,000+ re-exports, adding 200-800ms per import.

**Incorrect (loads entire library):**

```tsx
import { Check, X, Menu } from 'lucide-react'  // ~1,583 modules
import { Button, TextField } from '@mui/material'  // ~2,225 modules
```

**Correct — Next.js 13.5+ (recommended):**

```js
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@mui/material']
  }
}
```

Keep standard imports — Next.js transforms them to direct imports at build time, preserving TypeScript support.

**Correct — Direct imports (non-Next.js):**

```tsx
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
```

> TypeScript warning: Some libraries don't ship `.d.ts` for deep paths. Verify type safety before using direct imports, or prefer `optimizePackageImports`.

Commonly affected libraries: `lucide-react`, `@mui/material`, `@tabler/icons-react`, `react-icons`, `@radix-ui/react-*`, `lodash`, `date-fns`, `rxjs`.

## Pattern 3 — Defer non-critical third-party libraries

Analytics, logging, and error tracking don't block user interaction. Load them after hydration.

**Incorrect (blocks initial bundle):**

```tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return <html><body>{children}<Analytics /></body></html>
}
```

**Correct (loads after hydration):**

```tsx
import dynamic from 'next/dynamic'

const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(m => m.Analytics),
  { ssr: false }
)
```

## Pattern 4 — Preload based on user intent

Start loading heavy bundles before the user clicks, reducing perceived latency.

```tsx
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    if (typeof window !== 'undefined') {
      void import('./monaco-editor')
    }
  }

  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  )
}
```

The `typeof window !== 'undefined'` check prevents bundling the preloaded module for SSR.

## Pattern 5 — Conditional module loading

Load large data modules only when a feature is activated.

```tsx
function AnimationPlayer({ enabled }: { enabled: boolean }) {
  const [frames, setFrames] = useState<Frame[] | null>(null)

  useEffect(() => {
    if (enabled && !frames && typeof window !== 'undefined') {
      import('./animation-frames.js')
        .then(mod => setFrames(mod.frames))
        .catch(() => setFrames(null))
    }
  }, [enabled, frames])

  if (!frames) return <Skeleton />
  return <Canvas frames={frames} />
}
```

## Pattern 6 — Prefer statically analyzable paths

Build tools need literal paths to tree-shake effectively. Dynamic path composition forces broad inclusion.

**Incorrect (bundler can't determine reachable files):**

```ts
const Page = await import(PAGE_MODULES[pageName])
```

**Correct (explicit map of lazy loaders):**

```ts
const PAGE_MODULES = {
  home: () => import('./pages/home'),
  settings: () => import('./pages/settings'),
} as const

const Page = await PAGE_MODULES[pageName]()
```

Same rule for file-system paths in server/build code: make each final path literal at the call site.

## Decision table — loading strategy by component type

| Component type | Strategy | API |
|---|---|---|
| Heavy editor/chart/map | Lazy load | `next/dynamic`, `React.lazy()` |
| Icon/component library | Barrel optimization | `optimizePackageImports` or direct import |
| Analytics/tracking | Defer to post-hydration | `next/dynamic` with `ssr: false` |
| Feature-gated module | Conditional load | `import()` inside `useEffect` |
| Likely next navigation | Preload on intent | `import()` on hover/focus |
| Page-level code split | Static analyzable paths | Explicit lazy-loader map |

## When NOT to code-split

- **Critical above-the-fold content:** Splitting the hero section just delays LCP.
- **Small components (<5KB gzipped):** The HTTP overhead of an extra chunk can exceed the savings.
- **Always-needed dependencies:** React core, your design system primitives, routing logic.
- **Server Components in RSC trees:** Server Components are never bundled to the client — dynamic imports there are irrelevant for bundle size.

## Common failure modes

| Mistake | Result |
|---|---|
| Dynamic import without `ssr: false` for browser-only libs | Hydration mismatch, build errors |
| `optimizePackageImports` missing from config | Barrel import penalty still applies |
| Preloading without `typeof window` guard | Module included in server bundle |
| Dynamic path in `import()` | Bundler includes all possible matches |
| Splitting too aggressively | Chunk waterfall, worse than single bundle |
