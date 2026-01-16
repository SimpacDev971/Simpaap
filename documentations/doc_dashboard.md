# Dashboard Documentation

## Overview

The dashboard page (`app/[subdomain]/home/page.tsx`) provides a comprehensive view of postal sending statistics for the Simpaap application. It displays charts, summary cards, and detailed tables based on user roles.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Data Flow](#data-flow)
3. [API Endpoints](#api-endpoints)
4. [Monthly Statistics Calculation](#monthly-statistics-calculation)
5. [Role-Based Access Control](#role-based-access-control)
6. [Components Breakdown](#components-breakdown)
7. [Chart Configuration](#chart-configuration)
8. [Filters System](#filters-system)
9. [Month Details Dialog](#month-details-dialog)
10. [Maintenance Guide](#maintenance-guide)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                       │
│  app/[subdomain]/home/page.tsx                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Summary     │  │ Bar Chart   │  │ Pie Charts  │  │ Recent      │    │
│  │ Cards       │  │ (Monthly)   │  │ (Options)   │  │ Table       │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                      │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐    │
│  │ /api/dashboard          │    │ /api/dashboard/month-details    │    │
│  │ Main statistics         │    │ Detailed monthly breakdown      │    │
│  └─────────────────────────┘    └─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ print_item table                                                 │   │
│  │ - id, numTraitement, createdAt, status                          │   │
│  │ - totalPages, totalRecipients, totalCost                        │   │
│  │ - rawData (JSON with productionOptions)                         │   │
│  │ - tenantId, userId (relations)                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Initial Load

```typescript
// page.tsx - On component mount
useEffect(() => {
  fetchDashboard();
}, [fetchDashboard]);
```

### 2. Fetch Dashboard Data

```typescript
const fetchDashboard = useCallback(async () => {
  const params = new URLSearchParams();
  params.set('year', selectedYear.toString());
  if (selectedTenantId !== 'all') params.set('tenantId', selectedTenantId);
  if (selectedUserId !== 'all') params.set('userId', selectedUserId);

  const res = await fetch(`/api/dashboard?${params.toString()}`);
  const result = await res.json();
  setData(result);
}, [selectedYear, selectedTenantId, selectedUserId]);
```

### 3. API Response Structure

```typescript
interface DashboardData {
  summary: {
    totalSendings: number;      // Total print_item count
    totalRecipients: number;    // Sum of all recipients
    totalPages: number;         // Sum of all pages
    totalCost: number;          // Sum of all costs
  };
  monthlyStats: MonthlyStats[]; // Array of 12 months
  printOptionStats: {
    colors: Record<string, number>;    // e.g., { "Couleur": 5, "N&B": 10 }
    sides: Record<string, number>;     // e.g., { "Recto": 8, "Recto-verso": 7 }
    envelopes: Record<string, number>; // e.g., { "C5": 10, "DL": 5 }
    speeds: Record<string, number>;    // e.g., { "Prioritaire": 12 }
  };
  recentItems: RecentItem[];    // Last 20 items
  filters: {
    availableTenants: Tenant[]; // For SUPERADMIN
    availableUsers: User[];     // For ADMIN/SUPERADMIN
    currentYear: number;
    userRole: string;
  };
}
```

---

## API Endpoints

### GET /api/dashboard

**File:** `app/api/dashboard/route.ts`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | number | Year to filter (default: current year) |
| `tenantId` | string | Filter by tenant (SUPERADMIN only) |
| `userId` | string | Filter by user (ADMIN/SUPERADMIN) |

**Response:** Full dashboard data with summary, monthly stats, and filters.

### GET /api/dashboard/month-details

**File:** `app/api/dashboard/month-details/route.ts`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `month` | number | Month number (1-12) |
| `year` | number | Year |
| `tenantId` | string | Filter by tenant (SUPERADMIN only) |
| `userId` | string | Filter by user (ADMIN/SUPERADMIN) |

**Response:** Detailed items for the specified month with full production options.

---

## Monthly Statistics Calculation

### How totalSendings is Calculated

The API loops through all `print_item` records and groups them by month:

```typescript
// app/api/dashboard/route.ts

// Step 1: Initialize 12 months with zeros
const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  monthName: new Date(year, i, 1).toLocaleDateString('fr-FR', { month: 'short' }),
  totalSendings: 0,
  totalRecipients: 0,
  totalPages: 0,
  totalCost: 0,
}));

// Step 2: Loop through print_items and aggregate
printItems.forEach((item) => {
  const month = new Date(item.createdAt).getMonth(); // Returns 0-11

  // Each print_item counts as 1 sending
  monthlyStats[month].totalSendings += 1;

  // Sum the numeric fields
  monthlyStats[month].totalRecipients += item.totalRecipients || 0;
  monthlyStats[month].totalPages += item.totalPages || 0;
  monthlyStats[month].totalCost += Number(item.totalCost) || 0;
});
```

### Visual Example

```
Database Records:
┌────────────┬─────────────────┬────────────────┬────────────┐
│     id     │   createdAt     │ totalRecipients│ totalPages │
├────────────┼─────────────────┼────────────────┼────────────┤
│   item1    │ 2025-01-15      │      25        │     50     │
│   item2    │ 2025-01-20      │      30        │     60     │
│   item3    │ 2025-01-25      │      10        │     20     │
│   item4    │ 2025-02-10      │      15        │     30     │
│   item5    │ 2025-02-15      │      20        │     40     │
└────────────┴─────────────────┴────────────────┴────────────┘

Result (monthlyStats):
┌───────┬───────────────┬──────────────────┬────────────┐
│ Month │ totalSendings │ totalRecipients  │ totalPages │
├───────┼───────────────┼──────────────────┼────────────┤
│ Jan   │      3        │       65         │    130     │
│ Feb   │      2        │       35         │     70     │
│ Mar   │      0        │        0         │      0     │
│ ...   │     ...       │      ...         │    ...     │
└───────┴───────────────┴──────────────────┴────────────┘
```

### Key Points

| Metric | Calculation | Description |
|--------|-------------|-------------|
| `totalSendings` | `+= 1` per record | Number of print jobs submitted |
| `totalRecipients` | `+= item.totalRecipients` | Total letters/envelopes sent |
| `totalPages` | `+= item.totalPages` | Total pages printed |
| `totalCost` | `+= item.totalCost` | Total postage cost |

---

## Role-Based Access Control

### Access Matrix

| Role | See Own Data | See Tenant Users | See All Tenants | Filter by Tenant | Filter by User |
|------|--------------|------------------|-----------------|------------------|----------------|
| MEMBER | Yes | No | No | No | No |
| ADMIN | Yes | Yes | No | No | Yes |
| SUPERADMIN | Yes | Yes | Yes | Yes | Yes |

### Implementation in API

```typescript
// app/api/dashboard/route.ts

let whereClause: any = {
  createdAt: {
    gte: new Date(`${year}-01-01`),
    lt: new Date(`${year + 1}-01-01`),
  },
};

if (userRole === 'SUPERADMIN') {
  // Can see everything, optional filters
  if (filterTenantId) whereClause.tenantId = filterTenantId;
  if (filterUserId) whereClause.userId = filterUserId;
} else if (userRole === 'ADMIN') {
  // Restricted to own tenant
  whereClause.tenantId = userTenant.id;
  if (filterUserId) whereClause.userId = filterUserId;
} else {
  // MEMBER: Only own data
  whereClause.tenantId = userTenant.id;
  whereClause.userId = session.user.id;
}
```

### UI Filter Visibility

```typescript
// page.tsx

{/* Tenant selector - SUPERADMIN only */}
{filters.userRole === 'SUPERADMIN' && filters.availableTenants.length > 0 && (
  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
    ...
  </Select>
)}

{/* User selector - ADMIN/SUPERADMIN */}
{(filters.userRole === 'SUPERADMIN' || filters.userRole === 'ADMIN') &&
  filters.availableUsers.length > 0 && (
    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
      ...
    </Select>
  )}
```

---

## Components Breakdown

### 1. Summary Cards (Lines 326-370)

Four cards displaying totals:
- Total Envois (sendings count)
- Destinataires (recipients)
- Pages imprimées (pages)
- Coût total (cost)

```typescript
<Card>
  <CardHeader>
    <CardTitle>Total Envois</CardTitle>
    <Mail className="h-4 w-4" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{summary.totalSendings}</div>
  </CardContent>
</Card>
```

### 2. Monthly Bar Chart (Lines 374-428)

Recharts BarChart with two bars per month:
- Blue: totalSendings
- Green: totalRecipients

```typescript
<ChartContainer config={barChartConfig}>
  <BarChart data={monthlyStats} onClick={handleBarClick}>
    <Bar dataKey="totalSendings" fill="var(--color-totalSendings)" />
    <Bar dataKey="totalRecipients" fill="var(--color-totalRecipients)" />
  </BarChart>
</ChartContainer>
```

### 3. Pie Charts (Lines 430-580)

Distribution charts for:
- Colors (Couleur vs N&B)
- Sides (Recto vs Recto-verso)
- Envelopes (C5, DL, etc.)
- Speeds (Prioritaire, Ecopli, etc.)

### 4. Recent Items Table (Lines 583-664)

Displays last 20 sendings with:
- N° Traitement
- Date
- Status (badge)
- Recipients, Pages, Cost
- User (ADMIN/SUPERADMIN)
- Tenant (SUPERADMIN)

---

## Chart Configuration

### Bar Chart Config

```typescript
const barChartConfig: ChartConfig = {
  totalSendings: {
    label: 'Envois',
    color: 'hsl(var(--chart-1))',  // Blue
  },
  totalRecipients: {
    label: 'Destinataires',
    color: 'hsl(var(--chart-2))',  // Green
  },
};
```

### Pie Chart Colors

```typescript
const PIE_COLORS = [
  '#3b82f6',  // Blue
  '#10b981',  // Green
  '#f59e0b',  // Amber
  '#ef4444',  // Red
  '#8b5cf6',  // Purple
  '#06b6d4',  // Cyan
];
```

### Transform Data for Pie Charts

```typescript
const transformToPieData = (stats: Record<string, number>) => {
  return Object.entries(stats).map(([name, value], index) => ({
    name,
    value,
    fill: PIE_COLORS[index % PIE_COLORS.length],
  }));
};
```

---

## Filters System

### State Management

```typescript
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
const [selectedUserId, setSelectedUserId] = useState<string>('all');
```

### Year Navigation

```typescript
<Button onClick={() => setSelectedYear((y) => y - 1)}>
  <ChevronLeft />
</Button>
<span>{selectedYear}</span>
<Button
  onClick={() => setSelectedYear((y) => y + 1)}
  disabled={selectedYear >= new Date().getFullYear()}
>
  <ChevronRight />
</Button>
```

### Filter Reset on Tenant Change

When SUPERADMIN changes tenant, user filter should reset:

```typescript
// Add this if needed
useEffect(() => {
  setSelectedUserId('all');
}, [selectedTenantId]);
```

---

## Month Details Dialog

### Opening the Dialog

```typescript
const handleBarClick = (data: any) => {
  if (data && data.activePayload && data.activePayload[0]) {
    const month = data.activePayload[0].payload.month;
    setSelectedMonth(month);
    setMonthDialogOpen(true);
    fetchMonthDetails(month);
  }
};
```

### Dialog Content

Shows detailed breakdown of all sendings for the selected month:
- Summary cards (4 totals)
- Table with production options:
  - N° Traitement
  - Date
  - Recipients, Pages
  - Color, Side, Envelope, Speed
  - Cost

### Data Structure (Month Details)

```typescript
interface MonthDetails {
  summary: {
    month: number;
    year: number;
    monthName: string;
    totalSendings: number;
    totalRecipients: number;
    totalPages: number;
    totalCost: number;
  };
  items: Array<{
    id: string;
    numTraitement: string;
    createdAt: string;
    totalPages: number;
    totalRecipients: number;
    totalCost: number;
    productionOptions: {
      print: { color: {...}, side: {...} };
      finishing: { envelope: {...} };
      postage: { speed: {...}, rate: {...} };
    };
  }>;
}
```

---

## Maintenance Guide

### Adding a New Metric

1. **Update API** (`app/api/dashboard/route.ts`):
```typescript
monthlyStats[month].newMetric += item.newField || 0;
```

2. **Update Types** (page.tsx):
```typescript
interface MonthlyStats {
  // ...existing fields
  newMetric: number;
}
```

3. **Add to Chart or Cards** (page.tsx):
```typescript
<Bar dataKey="newMetric" fill="var(--color-newMetric)" />
```

### Adding a New Filter

1. **Add State**:
```typescript
const [newFilter, setNewFilter] = useState<string>('all');
```

2. **Add to fetchDashboard**:
```typescript
if (newFilter !== 'all') params.set('newFilter', newFilter);
```

3. **Add to useCallback dependencies**:
```typescript
}, [selectedYear, selectedTenantId, selectedUserId, newFilter]);
```

4. **Update API** to handle the new filter parameter.

### Common Issues

| Issue | Solution |
|-------|----------|
| Chart not updating | Check useCallback dependencies |
| Wrong month displayed | `getMonth()` returns 0-11, not 1-12 |
| Filters not working | Verify API whereClause logic |
| BigInt serialization error | Convert with `.toString()` before JSON response |

### Dependencies

```json
{
  "recharts": "^2.x",
  "@radix-ui/react-dialog": "^1.x",
  "lucide-react": "^0.x"
}
```

### Related Files

| File | Description |
|------|-------------|
| `app/[subdomain]/home/page.tsx` | Dashboard page component |
| `app/api/dashboard/route.ts` | Main dashboard API |
| `app/api/dashboard/month-details/route.ts` | Month details API |
| `components/ui/chart.tsx` | Shadcn chart wrapper |
| `prisma/schema.prisma` | Database schema (print_item model) |

---

## Quick Reference

### Data Flow Summary

```
User Action → State Change → useEffect → fetchDashboard() → API Call
    ↓
API Query (with filters) → Prisma → Database
    ↓
Aggregate Data → Return JSON → setData() → Re-render Charts
```

### Monthly Aggregation Formula

```
For each month M (0-11):
  totalSendings[M] = COUNT(print_items WHERE month(createdAt) = M)
  totalRecipients[M] = SUM(print_items.totalRecipients WHERE month(createdAt) = M)
  totalPages[M] = SUM(print_items.totalPages WHERE month(createdAt) = M)
  totalCost[M] = SUM(print_items.totalCost WHERE month(createdAt) = M)
```
