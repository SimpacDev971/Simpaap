# Caching System Documentation

This document provides a comprehensive overview of all caching mechanisms used in the Simpaap application.

## Client-Side Caching

### 1. PrintOptionsContext

**Location**: `contexts/PrintOptionsContext.tsx`

- **Cache Type**: localStorage
- **TTL**: 2 hours
- **Cache Key**: `print_options_cache`
- **Data Cached**: Print options including:
  - Colors (Couleur)
  - Sides (Recto/Verso)
  - Envelopes (Enveloppe)
  - Speeds (Affranchissement_speed)
  - Postage rates (Affranchissement)
- **Invalidation**:
  - Manual via `invalidatePrintOptionsCache()` function
  - Automatic after TTL expires
- **Purpose**: Reduces API calls for frequently accessed print configuration data

**Implementation**:
```typescript
const CACHE_TTL = 2 * 60 * 60 * 1000; // 12 hours
const CACHE_KEY = 'print_options_cache';

function getCachedData(): CacheEntry | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  const entry: CacheEntry = JSON.parse(cached);
  const now = Date.now();

  if (now - entry.timestamp > CACHE_TTL) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
  return entry;
}
```

---

### 2. TenantApplicationsContext

**Location**: `contexts/TenantApplicationsContext.tsx`

- **Cache Type**: In-memory Map
- **TTL**: 5 minutes (300,000 ms)
- **Cache Key**: Subdomain string
- **Data Cached**: Tenant applications grouped by categories
- **Scope**: Per-subdomain cache
- **Purpose**: Caches application menu structure for each tenant

**Implementation**:
```typescript
const clientCache = new Map<string, {
  data: CachedTenantApplications;
  timestamp: number
}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cached = clientCache.get(subdomain);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  setData(cached.data);
  setIsLoading(false);
  return;
}
```

---

### 3. Middleware Tenant Cache

**Location**: `middleware.ts`

- **Cache Type**: LRU Cache (lru-cache package)
- **TTL**: 5 minutes (300,000 ms)
- **Max Entries**: 500
- **Cache Key**: Subdomain string
- **Data Cached**: Boolean (whether tenant exists)
- **Additional Feature**: Global tenant list cache refreshed every 5 minutes
- **Purpose**: Validates tenant existence at the edge without database lookups

**Implementation**:
```typescript
const tenantCache = new LRUCache<string, boolean>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
});

let allTenantsCache: Set<string> | null = null;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
```

---

### 4. NextAuth Session Cache

**Location**: `app/api/auth/[...nextauth]/route.ts`

- **Cache Type**: NextAuth internal (JWT-based)
- **Storage**: HTTP-only cookies
- **Strategy**: JWT
- **Session Max Age**: 30 days (2,592,000 seconds)
- **Important Note**: Due to internal caching, session updates require full page reloads using `window.location.href` instead of `router.push()`

**Configuration**:
```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
}
```

---

## Server-Side Caching

### LRU Cache Factory

**Location**: `lib/cache/cache.ts`

Provides pre-configured LRU caches for server-side use:

#### 1. tenantCache
- **Max Entries**: 500
- **TTL**: 5 minutes (300,000 ms)
- **Purpose**: Tenant validation and metadata

#### 2. permissionCache
- **Max Entries**: 1000
- **TTL**: 10 minutes (600,000 ms)
- **Purpose**: User permission lookups

#### 3. apiCache
- **Max Entries**: 200
- **TTL**: 2 minutes (120,000 ms)
- **Purpose**: General API response caching

#### 4. userProfileCache
- **Max Entries**: 500
- **TTL**: 15 minutes (900,000 ms)
- **Purpose**: User profile data

**Implementation**:
```typescript
import { LRUCache } from 'lru-cache';

export function createCache<K, V>(options: LRUCache.Options<K, V, unknown>) {
  return new LRUCache<K, V>(options);
}

export const tenantCache = createCache<string, boolean>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export const permissionCache = createCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 10, // 10 minutes
});

export const apiCache = createCache<string, any>({
  max: 200,
  ttl: 1000 * 60 * 2, // 2 minutes
});

export const userProfileCache = createCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 15, // 15 minutes
});
```

---

## Cache Invalidation Strategies

### Manual Invalidation

1. **Print Options**: Call `invalidatePrintOptionsCache()` when:
   - Creating/updating/deleting colors, sides, envelopes, or speeds
   - Modifying postage rates

2. **API Cache**: Use `invalidateAllPrintOptionsCache()` for server-side cache clearing

### Automatic Invalidation

All caches use timestamp-based TTL validation:
- Cache entries store creation timestamp
- On read, current time is compared to entry timestamp
- If `(now - timestamp) > TTL`, cache is invalidated and fresh data is fetched

---

## Best Practices

1. **Client-Side Caches**: Use longer TTLs (5-12 hours) for relatively static data
2. **Server-Side Caches**: Use shorter TTLs (2-15 minutes) for data that changes more frequently
3. **Session Management**: Always use `window.location.href` for navigation after login/logout to ensure session refresh
4. **Cache Keys**: Use consistent, predictable keys (subdomain, user ID, etc.)
5. **Invalidation**: Manually invalidate caches when underlying data changes via API mutations

---

## Troubleshooting

### Issue: Stale data displayed after updates
**Solution**: Ensure appropriate cache invalidation is called after mutations

### Issue: Navbar not updating after login
**Solution**: Use `window.location.href = "/"` instead of `router.push("/")` to force full page reload

### Issue: Print options not updating
**Solution**: Call `invalidatePrintOptionsCache()` after modifying any print-related configuration
