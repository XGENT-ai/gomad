---
name: react-server-performance
description: Optimize RSC, Server Actions, and Route Handlers in Next.js App Router.
license: MIT
last_reviewed: 2026-05-02
---

# React server performance — RSC, Server Actions, and route optimization

## When to apply

- Next.js App Router page or API route has slow TTFB
- Same DB query runs multiple times within one request
- Server Actions lack authentication checks
- RSC payloads are unexpectedly large
- Static assets (fonts, logos, config) are re-read on every request
- Analytics/logging blocks the response

## Pattern 1 — Parallelize with component composition

React Server Components execute sequentially within a parent. Split data-fetching components into siblings so they run in parallel.

**Incorrect (Sidebar waits for Page's fetch):**

```tsx
export default async function Page() {
  const header = await fetchHeader()  // Blocks everything below
  return (
    <div>
      <div>{header}</div>
      <Sidebar />  {/* Sidebar's fetch can't start until above finishes */}
    </div>
  )
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}
```

**Correct (both fetch simultaneously):**

```tsx
async function Header() {
  const data = await fetchHeader()
  return <div>{data}</div>
}

async function Sidebar() {
  const items = await fetchSidebarItems()
  return <nav>{items.map(renderItem)}</nav>
}

export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  )
}
```

## Pattern 2 — Prevent waterfall chains in API routes and Server Actions

Start independent operations immediately, even if you don't await them yet.

**Incorrect (config waits for auth, data waits for both):**

```typescript
export async function GET(request: Request) {
  const session = await auth()
  const config = await fetchConfig()
  const data = await fetchData(session.user.id)
  return Response.json({ data, config })
}
```

**Correct (auth and config start immediately):**

```typescript
export async function GET(request: Request) {
  const sessionPromise = auth()
  const configPromise = fetchConfig()
  const session = await sessionPromise
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id)
  ])
  return Response.json({ data, config })
}
```

## Pattern 3 — Deduplicate per-request with React.cache()

Wrap DB queries, auth checks, and heavy computations in `React.cache()` so multiple components calling the same function within one request share the result.

```typescript
import { cache } from 'react'

export const getCurrentUser = cache(async () => {
  const session = await auth()
  if (!session?.user?.id) return null
  return db.user.findUnique({ where: { id: session.user.id } })
})
```

**Critical: use primitive arguments.** `React.cache()` uses `Object.is` for key comparison. Inline objects create new references every call.

**Incorrect (always cache miss):**

```typescript
const getUser = cache(async (params: { uid: number }) => {
  return db.user.findUnique({ where: { id: params.uid } })
})
getUser({ uid: 1 })
getUser({ uid: 1 })  // Miss — new object reference
```

**Correct (cache hit):**

```typescript
const getUser = cache(async (uid: number) => {
  return db.user.findUnique({ where: { id: uid } })
})
getUser(1)
getUser(1)  // Hit — primitive equality
```

Next.js automatically deduplicates `fetch()` calls by URL. Use `React.cache()` for everything else: DB queries, file system ops, auth checks, heavy computations.

## Pattern 4 — Cross-request LRU caching

`React.cache()` only works within one request. For data shared across sequential requests, use an LRU cache.

```typescript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, any>({
  max: 1000,
  ttl: 5 * 60 * 1000  // 5 minutes
})

export async function getUser(id: string) {
  const cached = cache.get(id)
  if (cached) return cached
  const user = await db.user.findUnique({ where: { id } })
  cache.set(id, user)
  return user
}
```

With Vercel Fluid Compute, LRU caching is especially effective because concurrent requests share the same function instance. In traditional serverless, each invocation is isolated — use Redis for cross-process caching.

## Pattern 5 — Hoist static I/O to module level

Module-level code runs once when the module is first imported, not on every request. Hoist static asset loading (fonts, logos, config files) to eliminate redundant reads.

**Incorrect (reads font on every request):**

```typescript
export async function GET(request: Request) {
  const fontData = await fetch(
    new URL('./fonts/Inter.ttf', import.meta.url)
  ).then(r => r.arrayBuffer())
  // ...use fontData
}
```

**Correct (loads once at module init):**

```typescript
const fontData = fetch(
  new URL('./fonts/Inter.ttf', import.meta.url)
).then(r => r.arrayBuffer())

export async function GET(request: Request) {
  const font = await fontData  // Awaits already-started promise
  // ...use font
}
```

**Do NOT hoist:** per-request data, files that change at runtime, large files that would bloat memory, or sensitive data.

## Pattern 6 — Minimize serialization at RSC boundaries

The RSC/client boundary serializes all props into the HTML response. Only pass fields the client actually uses.

**Incorrect (serializes 50 fields, uses 1):**

```tsx
async function Page() {
  const user = await fetchUser()  // 50 fields
  return <Profile user={user} />
}

'use client'
function Profile({ user }: { user: User }) {
  return <div>{user.name}</div>  // Uses 1 field
}
```

**Correct (serializes only what's needed):**

```tsx
async function Page() {
  const user = await fetchUser()
  return <Profile name={user.name} />
}

'use client'
function Profile({ name }: { name: string }) {
  return <div>{name}</div>
}
```

RSC deduplicates by object reference, not value. Transformations like `.toSorted()`, `.filter()`, `.map()` create new references and duplicate serialization. Do transformations in the client component instead.

## Pattern 7 — Avoid shared module state for request data

Server renders can run concurrently in the same process. Mutable module-level variables leak across requests.

**Incorrect (race condition, data leak):**

```tsx
let currentUser: User | null = null

export default async function Page() {
  currentUser = await auth()
  return <Dashboard />
}

async function Dashboard() {
  return <div>{currentUser?.name}</div>  // May be another request's user
}
```

**Correct (pass through props):**

```tsx
export default async function Page() {
  const user = await auth()
  return <Dashboard user={user} />
}

function Dashboard({ user }: { user: User | null }) {
  return <div>{user?.name}</div>
}
```

## Pattern 8 — Use after() for non-blocking side effects

Schedule logging, analytics, and cache invalidation to run after the response is sent.

**Incorrect (blocks response):**

```tsx
export async function POST(request: Request) {
  await updateDatabase(request)
  await logUserAction({ ua: request.headers.get('user-agent') })
  return Response.json({ status: 'success' })
}
```

**Correct (response sent immediately):**

```tsx
import { after } from 'next/server'

export async function POST(request: Request) {
  await updateDatabase(request)
  after(async () => {
    const ua = (await headers()).get('user-agent') || 'unknown'
    logUserAction({ ua })
  })
  return Response.json({ status: 'success' })
}
```

`after()` runs even if the response fails or redirects. Use it for analytics, audit logging, notifications, cache invalidation.

## Pattern 9 — Authenticate every Server Action

Server Actions are public endpoints. Always verify auth **inside** the action — do not rely on middleware or page-level checks.

**Incorrect:**

```typescript
'use server'
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } })  // Anyone can call this
}
```

**Correct:**

```typescript
'use server'
export async function deleteUser(userId: string) {
  const session = await verifySession()
  if (!session) throw unauthorized('Must be logged in')
  if (session.user.role !== 'admin' && session.user.id !== userId) {
    throw unauthorized('Cannot delete other users')
  }
  await db.user.delete({ where: { id: userId } })
}
```

Validate input with Zod or similar before auth checks.

## Decision table — server pattern selector

| Symptom | Pattern | Key API |
|---|---|---|
| Sequential RSC data fetching | Component composition | Split into sibling async components |
| Sequential awaits in API route | Promise hoisting | Start promises, await later |
| Duplicate DB queries per request | React.cache() | `cache(async () => ...)` |
| Same data needed across requests | LRU cache | `lru-cache` with TTL |
| Fonts/config re-read per request | Hoist to module | Top-level `const` or `fetch()` |
| Large RSC payload | Minimize props | Pass only client-needed fields |
| Race conditions in concurrent renders | No shared module state | Props down the tree |
| Logging blocks response | after() | `after(() => log())` |
| Unauthorized mutations | In-action auth | `verifySession()` inside action |

## When NOT to apply these patterns

- **Pages Router (not App Router):** `React.cache()`, RSC boundaries, and `after()` are App Router features. Pages Router uses `getServerSideProps` / `getStaticProps`.
- **Simple static sites:** If the page has no server data, these optimizations are irrelevant.
- **Edge runtime limitations:** Some patterns (file system reads, certain LRU cache implementations) don't work on Vercel Edge Runtime.

## Common failure modes

| Mistake | Result |
|---|---|
| Inline objects as `React.cache()` args | Zero cache hits, query runs N times |
| Hoisting per-request data to module | Cross-request data leaks, security bugs |
| `after()` for critical operations | User sees success before operation completes |
| Serializing derived arrays to client | Duplicate payload (`.toSorted()` creates new refs) |
| Auth only in middleware | Server Actions bypass middleware, unauthorized access |
| `fetch()` dedup assumed for DB queries | `React.cache()` needed for Prisma/Drizzle calls |
