import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Activity, AlertTriangle, Clock, User, Eye, EyeOff } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  adminService,
  AdminAuditLog,
  AdminPermissionEntry,
  AdminSession,
} from '@/services/adminService';

const PAGE_OPTIONS = [10, 25, 50, 100];

const paginate = <T,>(items: T[], page: number, size: number) => {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return value;
  }
};

const safeString = (value?: string | null) => value ?? 'Inconnu';

export const AdminSecurityDashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);
  const [pageSize, setPageSize] = useState<number>(25);

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>([]);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissionEntry[]>([]);

  const [auditPage, setAuditPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [permissionsPage, setPermissionsPage] = useState(1);

  const paginatedAuditLogs = useMemo(
    () => paginate(auditLogs, auditPage, pageSize),
    [auditLogs, auditPage, pageSize],
  );
  const paginatedSessions = useMemo(
    () => paginate(adminSessions, sessionsPage, pageSize),
    [adminSessions, sessionsPage, pageSize],
  );
  const paginatedPermissions = useMemo(
    () => paginate(adminPermissions, permissionsPage, pageSize),
    [adminPermissions, permissionsPage, pageSize],
  );

  const fetchAuditLogs = async () => {
    try {
      const logs = await adminService.listAuditLogs();
      setAuditLogs(logs ?? []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({ title: 'Erreur', description: "Impossible de charger les logs d'audit", variant: 'destructive' });
      setAuditLogs([]);
    }
  };

  const fetchSessions = async () => {
    try {
      const sessions = await adminService.listAdminSessions();
      setAdminSessions(sessions ?? []);
    } catch (error) {
      console.error('Error fetching admin sessions:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les sessions admin', variant: 'destructive' });
      setAdminSessions([]);
    }
  };

  const fetchPermissions = async () => {
    try {
      const permissions = await adminService.listAdminPermissions();
      setAdminPermissions(permissions ?? []);
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les permissions admin', variant: 'destructive' });
      setAdminPermissions([]);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchAuditLogs(), fetchSessions(), fetchPermissions()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revokeSession = async (session: AdminSession) => {
    try {
      await adminService.revokeSession(session.session_token);
      toast({ title: 'Session révoquée', description: 'La session a été révoquée avec succès' });
      fetchSessions();
    } catch (error) {
      console.error('Error revoking session:', error);
      toast({ title: 'Erreur', description: 'Impossible de révoquer la session', variant: 'destructive' });
    }
  };

  const cleanupExpiredSessions = async () => {
    try {
      const result = await adminService.cleanupSessions();
      toast({
        title: 'Sessions nettoyées',
        description: `${result.deactivated} session(s) expirée(s) désactivée(s)`,
      });
      fetchSessions();
    } catch (error) {
      console.error('Error cleaning sessions:', error);
      toast({ title: 'Erreur', description: "Impossible de nettoyer les sessions", variant: 'destructive' });
    }
  };

  const maskSensitiveData = (value?: string | null) => {
    if (!value) return '—';
    if (showSensitiveInfo) return value;
    if (value.includes('@')) {
      const [username, domain] = value.split('@');
      return `${username.slice(0, 2)}***@${domain}`;
    }
    if (value.length > 10) {
      return `${value.slice(0, 4)}…${value.slice(-4)}`;
    }
    return value;
  };

  const handlePageSizeChange = (next: string) => {
    const size = Number(next);
    setPageSize(size);
    setAuditPage(1);
    setSessionsPage(1);
    setPermissionsPage(1);
  };

  const renderPagination = (currentPage: number, totalCount: number, onPageChange: (page: number) => void) => {
    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 1) return null;

    const pages: Array<number | string> = [];
    const showEllipsis = totalPages > 7;
    pages.push(1);

    if (showEllipsis && currentPage > 4) {
      pages.push('ellipsis-start');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i += 1) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (showEllipsis && currentPage < totalPages - 3) {
      pages.push('ellipsis-end');
    }

    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Affichage de {Math.min((currentPage - 1) * pageSize + 1, totalCount)} à {Math.min(currentPage * pageSize, totalCount)} sur {totalCount} entrées
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {pages.map((page, index) => (
              <PaginationItem key={`${page}-${index}`}>
                {typeof page === 'string' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink onClick={() => onPageChange(page)} isActive={currentPage === page} className="cursor-pointer">
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Chargement du tableau de bord sécurité...</p>
        </div>
      </div>
    );
  }

  const todaysActions = auditLogs.filter(
    (log) => new Date(log.created_at).toDateString() === new Date().toDateString(),
  ).length;
  const activeSessions = adminSessions.filter((s) => s.is_active).length;
  const permissionsCount = adminPermissions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Tableau de bord sécurité admin
          </h2>
          <p className="text-muted-foreground">Surveillance et gestion de la sécurité administrative</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} par page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowSensitiveInfo((prev) => !prev)}>
            {showSensitiveInfo ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showSensitiveInfo ? 'Masquer' : 'Afficher'} infos sensibles
          </Button>
          <Button onClick={cleanupExpiredSessions}>
            <Clock className="w-4 h-4 mr-2" />
            Nettoyer sessions expirées
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions actives</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">{adminSessions.length} sessions totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actions aujourd'hui</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysActions}</div>
            <p className="text-xs text-muted-foreground">Actions administratives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins suivis</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissionsCount}</div>
            <p className="text-xs text-muted-foreground">Permissions configurées</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList>
          <TabsTrigger value="audit">Logs d'audit</TabsTrigger>
          <TabsTrigger value="sessions">Sessions admin</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des actions administratives</CardTitle>
              <CardDescription>Toutes les actions effectuées par les administrateurs sont enregistrées</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAuditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                      <TableCell>{maskSensitiveData(log.admin_detail?.email)}</TableCell>
                      <TableCell>
                        <Badge variant={log.action === 'DELETE' ? 'destructive' : 'default'}>{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.target_type}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.target_id && maskSensitiveData(log.target_id)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {renderPagination(auditPage, auditLogs.length, setAuditPage)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sessions administratives actives</CardTitle>
              <CardDescription>Gestion des sessions et surveillance de l'activité</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{maskSensitiveData(session.ip_address)}</TableCell>
                      <TableCell>{formatDate(session.last_activity)}</TableCell>
                      <TableCell>{formatDate(session.expires_at)}</TableCell>
                      <TableCell>
                        <Badge variant={session.is_active ? 'default' : 'secondary'}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {session.is_active && (
                          <Button size="sm" variant="destructive" onClick={() => revokeSession(session)}>
                            Révoquer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {renderPagination(sessionsPage, adminSessions.length, setSessionsPage)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permissions administratives</CardTitle>
              <CardDescription>Contrôle d'accès granulaire pour les administrateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Rôle principal</TableHead>
                    <TableHead>Créer</TableHead>
                    <TableHead>Lire</TableHead>
                    <TableHead>Modifier</TableHead>
                    <TableHead>Supprimer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPermissions.map((permission) => (
                    <TableRow key={permission.id}>
                      <TableCell>{maskSensitiveData(permission.email)}</TableCell>
                      <TableCell>
                        <Badge variant={permission.primary_role === 'admin' ? 'default' : 'secondary'}>
                          {permission.primary_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permission.permissions.can_create ? 'default' : 'secondary'}>
                          {permission.permissions.can_create ? '✓' : '✗'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permission.permissions.can_read ? 'default' : 'secondary'}>
                          {permission.permissions.can_read ? '✓' : '✗'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permission.permissions.can_update ? 'default' : 'secondary'}>
                          {permission.permissions.can_update ? '✓' : '✗'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permission.permissions.can_delete ? 'default' : 'secondary'}>
                          {permission.permissions.can_delete ? '✓' : '✗'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {renderPagination(permissionsPage, adminPermissions.length, setPermissionsPage)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
