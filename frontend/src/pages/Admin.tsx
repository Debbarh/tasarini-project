import { Helmet } from "react-helmet-async";
import { Suspense, lazy } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDebugPanel } from "@/components/debug/AdminDebugPanel";
import { Users, MapPin, Building2, Settings, Plane, BarChart3, Compass, Shield } from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { AdminPerformanceMonitor } from "@/components/admin/AdminPerformanceMonitor";

// Lazy load admin components for better performance
const ComprehensivePartnerManagement = lazy(() => import("@/components/admin/ComprehensivePartnerManagement"));
const PartnerManagement = lazy(() => import("@/components/admin/PartnerManagement"));
const TouristPointsApproval = lazy(() => import("@/components/admin/TouristPointsApproval"));
const UserManagement = lazy(() => import("@/components/admin/UserManagement"));
const TouristPointsManagement = lazy(() => import("@/components/admin/TouristPointsManagement"));
const SystemSettings = lazy(() => import("@/components/admin/SystemSettings"));
const TripPlannerSettings = lazy(() => import("@/components/admin/TripPlannerSettings"));
const TravelAnalytics = lazy(() => import("@/components/admin/TravelAnalytics").then(module => ({ default: module.TravelAnalytics })));
const BeInspiredManagement = lazy(() => import("@/components/admin/BeInspiredManagement").then(module => ({ default: module.BeInspiredManagement })));
const AdminSecurityDashboard = lazy(() => import("@/components/admin/AdminSecurityDashboard").then(module => ({ default: module.AdminSecurityDashboard })));
const RLSSecurityDashboard = lazy(() => import("@/components/admin/RLSSecurityDashboard"));

// Loading component for suspense fallbacks
const TabLoader = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

// Real-time dashboard stats component
const DashboardStats = () => {
  const { data: stats, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('❌ Dashboard stats error:', error);
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="text-destructive text-sm">
            Erreur lors du chargement des statistiques: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Partenaires</p>
              <p className="text-2xl font-bold">{stats.partners.total_partners}</p>
              <p className="text-xs text-muted-foreground">
                {stats.partners.pending_partners} en attente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Utilisateurs</p>
              <p className="text-2xl font-bold">{stats.users.total_users}</p>
              <p className="text-xs text-muted-foreground">
                {stats.users.recent_registrations} récents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Points d'intérêt</p>
              <p className="text-2xl font-bold">{stats.pois.total_pois}</p>
              <p className="text-xs text-muted-foreground">
                {stats.pois.pending_pois} en attente
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Réservations</p>
              <p className="text-2xl font-bold">{stats.bookings.total_bookings}</p>
              <p className="text-xs text-muted-foreground">
                {stats.bookings.recent_bookings} récentes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Admin = () => {
  return (
    <>
      <AdminDebugPanel />
      <main className="container mx-auto px-4 py-8">
        <Helmet>
          <title>Administration | Voyage AI</title>
          <meta name="description" content="Interface d'administration pour gérer la plateforme" />
        </Helmet>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard Administrateur Optimisé</h1>
        <p className="text-muted-foreground">
          Gérez la plateforme avec des performances améliorées et du cache intelligent
        </p>
      </div>

      <DashboardStats />

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Sécurité
          </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Partenaires
            </TabsTrigger>
            <TabsTrigger value="partner-points" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Approbation POI
            </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Points d'intérêt
          </TabsTrigger>
          <TabsTrigger value="trip-planner" className="flex items-center gap-2">
            <Plane className="w-4 h-4" />
            Plan Your Trip
          </TabsTrigger>
          <TabsTrigger value="be-inspired" className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Be Inspired
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Système
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security">
          <Suspense fallback={<TabLoader />}>
            <RLSSecurityDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="partners">
          <Suspense fallback={<TabLoader />}>
            <ComprehensivePartnerManagement />
          </Suspense>
        </TabsContent>
          
        <TabsContent value="partner-points">
          <Suspense fallback={<TabLoader />}>
            <TouristPointsApproval />
          </Suspense>
        </TabsContent>

        <TabsContent value="users">
          <Suspense fallback={<TabLoader />}>
            <UserManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="points">
          <Suspense fallback={<TabLoader />}>
            <TouristPointsManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="trip-planner">
          <Suspense fallback={<TabLoader />}>
            <TripPlannerSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="be-inspired">
          <Suspense fallback={<TabLoader />}>
            <BeInspiredManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="analytics">
          <Suspense fallback={<TabLoader />}>
            <TravelAnalytics />
          </Suspense>
        </TabsContent>

        <TabsContent value="settings">
          <Suspense fallback={<TabLoader />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemSettings />
              <AdminPerformanceMonitor />
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
    </>
  );
};

export default Admin;