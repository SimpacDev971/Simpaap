'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Mail,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

// Types
interface MonthlyStats {
  month: number;
  monthName: string;
  totalSendings: number;
  totalRecipients: number;
  totalPages: number;
  totalCost: number;
}

interface Summary {
  totalSendings: number;
  totalRecipients: number;
  totalPages: number;
  totalCost: number;
}

interface PrintOptionStats {
  colors: Record<string, number>;
  sides: Record<string, number>;
  envelopes: Record<string, number>;
  speeds: Record<string, number>;
}

interface RecentItem {
  id: string;
  numTraitement: string | null;
  createdAt: string;
  sendAt: string | null;
  status: string;
  totalPages: number;
  totalRecipients: number;
  totalCost: number | null;
  user: { id: string; name: string | null; email: string };
  tenant: { id: string; name: string; subdomain: string };
  rawData: any;
}

interface Filters {
  availableTenants: { id: string; name: string; subdomain: string }[];
  availableUsers: { id: string; name: string | null; email: string }[];
  currentYear: number;
  userRole: string;
}

interface DashboardData {
  summary: Summary;
  monthlyStats: MonthlyStats[];
  printOptionStats: PrintOptionStats;
  recentItems: RecentItem[];
  filters: Filters;
}

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
    numTraitement: string | null;
    createdAt: string;
    sendAt: string | null;
    status: string;
    totalPages: number;
    totalRecipients: number;
    totalCost: number | null;
    user: { id: string; name: string | null; email: string };
    tenant: { id: string; name: string; subdomain: string };
    productionOptions: any;
    meta: any;
  }>;
}

// Chart colors
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  // Month details dialog
  const [monthDialogOpen, setMonthDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthDetails, setMonthDetails] = useState<MonthDetails | null>(null);
  const [loadingMonthDetails, setLoadingMonthDetails] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('year', selectedYear.toString());
      if (selectedTenantId !== 'all') params.set('tenantId', selectedTenantId);
      if (selectedUserId !== 'all') params.set('userId', selectedUserId);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedTenantId, selectedUserId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fetch month details
  const fetchMonthDetails = async (month: number) => {
    setLoadingMonthDetails(true);

    try {
      const params = new URLSearchParams();
      params.set('month', month.toString());
      params.set('year', selectedYear.toString());
      if (selectedTenantId !== 'all') params.set('tenantId', selectedTenantId);
      if (selectedUserId !== 'all') params.set('userId', selectedUserId);

      const res = await fetch(`/api/dashboard/month-details?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch month details');

      const result = await res.json();
      setMonthDetails(result);
    } catch (err) {
      console.error('Error fetching month details:', err);
    } finally {
      setLoadingMonthDetails(false);
    }
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const month = data.activePayload[0].payload.month;
      setSelectedMonth(month);
      setMonthDialogOpen(true);
      fetchMonthDetails(month);
    }
  };

  // Chart configs
  const barChartConfig: ChartConfig = {
    totalSendings: {
      label: 'Envois',
      color: 'hsl(var(--chart-1))',
    },
    totalRecipients: {
      label: 'Destinataires',
      color: 'hsl(var(--chart-2))',
    },
  };

  // Transform data for pie charts
  const transformToPieData = (stats: Record<string, number>) => {
    return Object.entries(stats).map(([name, value], index) => ({
      name,
      value,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erreur</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboard}>Réessayer</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { summary, monthlyStats, printOptionStats, recentItems, filters } = data;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble de vos envois postaux</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background min-w-[100px] justify-center">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedYear}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedYear((y) => y + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Tenant selector (SUPERADMIN only) */}
          {filters.userRole === 'SUPERADMIN' && filters.availableTenants.length > 0 && (
            <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tous les tenants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les tenants</SelectItem>
                {filters.availableTenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* User selector (ADMIN/SUPERADMIN) */}
          {(filters.userRole === 'SUPERADMIN' || filters.userRole === 'ADMIN') &&
            filters.availableUsers.length > 0 && (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-[200px]">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Tous les utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {filters.availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Envois</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSendings}</div>
            <p className="text-xs text-muted-foreground">envois cette année</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinataires</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRecipients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">courriers envoyés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages imprimées</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">pages au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coût total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCost.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">affranchissement HT</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Envois mensuels</CardTitle>
            <CardDescription>
              Cliquez sur une barre pour voir le détail du mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[300px] w-full">
              <BarChart
                data={monthlyStats}
                onClick={handleBarClick}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="monthName"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const labels: Record<string, string> = {
                          totalSendings: 'Envois',
                          totalRecipients: 'Destinataires',
                        };
                        return (
                          <span>
                            {labels[name as string] || name}: <strong>{value}</strong>
                          </span>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="totalSendings"
                  fill="var(--color-totalSendings)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="totalRecipients"
                  fill="var(--color-totalRecipients)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Print Options Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Options d&apos;impression</CardTitle>
            <CardDescription>Répartition des modes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Colors Pie */}
            {Object.keys(printOptionStats.colors).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Couleur</p>
                <ChartContainer
                  config={{}}
                  className="h-[120px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={transformToPieData(printOptionStats.colors)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                    >
                      {transformToPieData(printOptionStats.colors).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {transformToPieData(printOptionStats.colors).map((item, index) => (
                    <div key={item.name} className="flex items-center gap-1 text-xs">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sides Pie */}
            {Object.keys(printOptionStats.sides).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Impression</p>
                <ChartContainer
                  config={{}}
                  className="h-[120px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={transformToPieData(printOptionStats.sides)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                    >
                      {transformToPieData(printOptionStats.sides).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {transformToPieData(printOptionStats.sides).map((item) => (
                    <div key={item.name} className="flex items-center gap-1 text-xs">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Envelope & Speed Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Envelopes */}
        {Object.keys(printOptionStats.envelopes).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Formats d&apos;enveloppe</CardTitle>
              <CardDescription>Répartition par format</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={transformToPieData(printOptionStats.envelopes)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {transformToPieData(printOptionStats.envelopes).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Speeds */}
        {Object.keys(printOptionStats.speeds).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vitesses d&apos;envoi</CardTitle>
              <CardDescription>Répartition par vitesse</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[200px] w-full">
                <PieChart>
                  <Pie
                    data={transformToPieData(printOptionStats.speeds)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {transformToPieData(printOptionStats.speeds).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Envois récents</CardTitle>
          <CardDescription>Les 20 derniers envois</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Traitement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Destinataires</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Coût</TableHead>
                {(filters.userRole === 'SUPERADMIN' || filters.userRole === 'ADMIN') && (
                  <TableHead>Utilisateur</TableHead>
                )}
                {filters.userRole === 'SUPERADMIN' && <TableHead>Tenant</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={filters.userRole === 'SUPERADMIN' ? 8 : filters.userRole === 'ADMIN' ? 7 : 6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun envoi trouvé
                  </TableCell>
                </TableRow>
              ) : (
                recentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.numTraitement || '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'sent'
                            ? 'default'
                            : item.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {item.status === 'sent'
                          ? 'Envoyé'
                          : item.status === 'pending'
                          ? 'En attente'
                          : 'Échec'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.totalRecipients}</TableCell>
                    <TableCell>{item.totalPages}</TableCell>
                    <TableCell>
                      {item.totalCost !== null ? `${item.totalCost.toFixed(2)} €` : '-'}
                    </TableCell>
                    {(filters.userRole === 'SUPERADMIN' || filters.userRole === 'ADMIN') && (
                      <TableCell>{item.user?.name || item.user?.email || '-'}</TableCell>
                    )}
                    {filters.userRole === 'SUPERADMIN' && (
                      <TableCell>{item.tenant?.name || '-'}</TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Month Details Dialog */}
      <Dialog open={monthDialogOpen} onOpenChange={setMonthDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {monthDetails?.summary.monthName || `Détails du mois ${selectedMonth}`}
            </DialogTitle>
          </DialogHeader>

          {loadingMonthDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : monthDetails ? (
            <div className="space-y-6">
              {/* Month Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Envois</p>
                  <p className="text-2xl font-bold">{monthDetails.summary.totalSendings}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Destinataires</p>
                  <p className="text-2xl font-bold">{monthDetails.summary.totalRecipients}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Pages</p>
                  <p className="text-2xl font-bold">{monthDetails.summary.totalPages}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Coût total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {monthDetails.summary.totalCost.toFixed(2)} €
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Traitement</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Dest.</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Couleur</TableHead>
                    <TableHead>Impression</TableHead>
                    <TableHead>Enveloppe</TableHead>
                    <TableHead>Vitesse</TableHead>
                    <TableHead>Coût</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthDetails.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.numTraitement || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>{item.totalRecipients}</TableCell>
                      <TableCell>{item.totalPages}</TableCell>
                      <TableCell>
                        {item.productionOptions?.print?.color?.label || '-'}
                      </TableCell>
                      <TableCell>
                        {item.productionOptions?.print?.side?.label || '-'}
                      </TableCell>
                      <TableCell>
                        {item.productionOptions?.finishing?.envelope?.taille || '-'}
                      </TableCell>
                      <TableCell>
                        {item.productionOptions?.postage?.speed?.label || '-'}
                      </TableCell>
                      <TableCell>
                        {item.totalCost !== null ? `${item.totalCost.toFixed(2)} €` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {monthDetails.items.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Aucun envoi ce mois-ci
                </p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
