# Milestones

## 2025-12-18 - Global Print Options & Tenant Parameters

### Summary
Converted print options from per-tenant to global (like applications). Added a unified "Paramètres" modal for tenant configuration.

### Database Changes (Prisma Schema)

**Global Print Option Tables** (removed `tenantId`):
- `print_color` - Print colors (e.g., color, black_white)
- `print_side` - Print sides (e.g., recto, recto_verso)
- `envelope_type` - Envelope types with optional description
- `postage_type` - Postage types (e.g., stamp, machine)
- `postage_speed` - Postage speeds (e.g., priority, economic)

**New Join Tables** (tenant-option assignments):
- `tenant_print_color` - Links tenants to print colors
- `tenant_print_side` - Links tenants to print sides
- `tenant_envelope_type` - Links tenants to envelope types
- `tenant_postage_type` - Links tenants to postage types
- `tenant_postage_speed` - Links tenants to postage speeds

### API Changes

**Updated Routes** (`/api/print-options/*`):
- GET without `tenantId` - Returns all global options
- GET with `?tenantId=xxx` - Returns options assigned to tenant
- POST/PUT/DELETE - SUPERADMIN only, manages global options

**New Route** (`/api/tenant/[id]/print-options`):
- GET - Returns all print options assigned to a tenant
- PUT - Updates tenant's print option assignments (colorIds, sideIds, etc.)

**Updated Route** (`/api/print-options`):
- Now queries via join tables to get tenant's assigned options

### Component Changes

**SimpaapCrud** (`components/admin/simpaap/SimpaapCrud.tsx`):
- Removed tenant selector (options are now global)
- Manages global print options for SUPERADMIN

**PrintOptionsCrud** (`components/admin/simpaap/shared/PrintOptionsCrud.tsx`):
- Removed `tenantId` prop (fetches global options)

**PrintOptionForm** (`components/admin/simpaap/shared/PrintOptionForm.tsx`):
- Removed `tenantId` from form submission

**TenantParams** (`components/tenants/TenantParams.tsx`) - NEW:
- Modal with left panel categories and right panel checkboxes
- Categories: Applications, Colors, Sides, Envelopes, Postage Types, Postage Speeds
- Allows assigning global options to tenants

**TenantsCrud** (`components/admin/TenantsCrud.tsx`):
- Replaced "Applications" button with "Paramètres" button
- Opens TenantParams modal for tenant configuration

### Files Modified
- `prisma/schema.prisma`
- `app/api/print-options/route.ts`
- `app/api/print-options/colors/route.ts`
- `app/api/print-options/colors/[id]/route.ts`
- `app/api/print-options/sides/route.ts`
- `app/api/print-options/sides/[id]/route.ts`
- `app/api/print-options/envelopes/route.ts`
- `app/api/print-options/envelopes/[id]/route.ts`
- `app/api/print-options/postage-types/route.ts`
- `app/api/print-options/postage-types/[id]/route.ts`
- `app/api/print-options/postage-speeds/route.ts`
- `app/api/print-options/postage-speeds/[id]/route.ts`
- `components/admin/simpaap/SimpaapCrud.tsx`
- `components/admin/simpaap/shared/PrintOptionsCrud.tsx`
- `components/admin/simpaap/shared/PrintOptionForm.tsx`
- `components/admin/TenantsCrud.tsx`

### Files Created
- `app/api/tenant/[id]/print-options/route.ts`
- `components/tenants/TenantParams.tsx`

### To Apply Changes
```bash
pnpm prisma db push --accept-data-loss
pnpm prisma generate
```

### Notes
- No retroactivation: New print options must be manually activated for each tenant
- Cache invalidation handled automatically when options are modified
- usePrintOptions hook works without changes (API contract unchanged)
