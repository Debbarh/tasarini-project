import { useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Shield, Crown, User, Plus, Minus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { adminService, AdminPermissionRule } from '@/services/adminService';
import { ApiUser } from '@/services/authService';

interface RoleAssignment {
  id: number;
  role: string;
}

interface ManagedUser {
  id: number;
  publicId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
  primaryRole: string;
  roleAssignments: RoleAssignment[];
  roleNames: string[];
}

interface RoleStats {
  totalUsers: number;
  adminCount: number;
  partnerCount: number;
  userCount: number;
}

const PERMISSION_TYPES = [
  { value: 'user_management', label: 'Gestion utilisateurs' },
  { value: 'partner_management', label: 'Gestion partenaires' },
  { value: 'poi_management', label: 'Gestion POI' },
  { value: 'system_administration', label: 'Administration système' },
  { value: 'analytics_access', label: 'Accès analytics' },
  { value: 'content_moderation', label: 'Modération contenu' },
];

const ROLE_FILTERS = [
  { value: 'all', label: 'Tous les rôles' },
  { value: 'admin', label: 'Admin' },
  { value: 'partner', label: 'Partner' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'traveler', label: 'Voyageur' },
];

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'admin':
      return <Crown className="w-4 h-4" />;
    case 'partner':
      return <Shield className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-destructive/10 text-destructive';
    case 'partner':
      return 'bg-warning/10 text-warning';
    case 'user':
    case 'traveler':
      return 'bg-primary/10 text-primary';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const mapUser = (user: ApiUser): ManagedUser => {
  const assignments: RoleAssignment[] = (user.role_assignments_detail || []).map((assignment) => ({
    id: assignment.id,
    role: assignment.role,
  }));
  const roleNames = Array.from(new Set([user.role, ...assignments.map((assignment) => assignment.role)]));

  return {
    id: user.id,
    publicId: user.public_id,
    email: user.email,
    firstName: user.profile?.first_name || '',
    lastName: user.profile?.last_name || '',
    createdAt: user.profile?.created_at,
    primaryRole: user.role,
    roleAssignments: assignments,
    roleNames,
  };
};

const RoleManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [stats, setStats] = useState<RoleStats>({ totalUsers: 0, adminCount: 0, partnerCount: 0, userCount: 0 });
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [permissionRules, setPermissionRules] = useState<AdminPermissionRule[]>([]);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await adminService.listUsers();
        const mapped = (data || []).map(mapUser).sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        setUsers(mapped);
        setStats({
          totalUsers: mapped.length,
          adminCount: mapped.filter((user) => user.roleNames.includes('admin')).length,
          partnerCount: mapped.filter((user) => user.roleNames.includes('partner')).length,
          userCount: mapped.filter((user) => user.roleNames.some((role) => role === 'user' || role === 'traveler')).length,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        toast({ title: 'Erreur', description: 'Impossible de charger les utilisateurs', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [toast]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        user.email.toLowerCase().includes(search) ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(search) ||
        user.publicId.toLowerCase().includes(search);
      const matchesRole = roleFilter === 'all' || user.roleNames.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const refreshUsers = async () => {
    try {
      const data = await adminService.listUsers();
      const mapped = (data || []).map(mapUser);
      setUsers(mapped);
      setStats({
        totalUsers: mapped.length,
        adminCount: mapped.filter((user) => user.roleNames.includes('admin')).length,
        partnerCount: mapped.filter((user) => user.roleNames.includes('partner')).length,
        userCount: mapped.filter((user) => user.roleNames.some((role) => role === 'user' || role === 'traveler')).length,
      });
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des utilisateurs:', error);
    }
  };

  const handleAddRole = async (user: ManagedUser, role: 'admin' | 'partner' | 'user') => {
    try {
      await adminService.assignRole(user.id, role);
      toast({ title: 'Succès', description: `Rôle ${role} ajouté avec succès` });
      refreshUsers();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du rôle:', error);
      toast({ title: 'Erreur', description: 'Impossible d\'ajouter le rôle', variant: 'destructive' });
    }
  };

  const handleRemoveRole = async (user: ManagedUser, role: string) => {
    const assignment = user.roleAssignments.find((record) => record.role === role);
    if (!assignment) {
      toast({ title: 'Rôle introuvable', description: 'Impossible de supprimer le rôle', variant: 'destructive' });
      return;
    }
    try {
      await adminService.removeRole(assignment.id);
      toast({ title: 'Succès', description: `Rôle ${role} retiré avec succès` });
      refreshUsers();
    } catch (error) {
      console.error('Erreur lors de la suppression du rôle:', error);
      toast({ title: 'Erreur', description: 'Impossible de retirer le rôle', variant: 'destructive' });
    }
  };

  const loadPermissions = async (user: ManagedUser) => {
    try {
      const data = await adminService.listPermissionRules(user.id);
      setPermissionRules(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      setPermissionRules([]);
    }
  };

  const updatePermission = async (
    permissionType: string,
    field: 'can_create' | 'can_read' | 'can_update' | 'can_delete',
    value: boolean,
  ) => {
    if (!selectedUser) return;
    const existing = permissionRules.find((rule) => rule.permission_type === permissionType);
    try {
      let updatedRule: AdminPermissionRule;
      if (existing) {
        updatedRule = await adminService.updatePermissionRule(existing.id, { [field]: value });
        setPermissionRules((rules) => rules.map((rule) => (rule.id === updatedRule.id ? updatedRule : rule)));
      } else {
        const payload = {
          admin: selectedUser.id,
          permission_type: permissionType,
          can_create: field === 'can_create' ? value : false,
          can_read: field === 'can_read' ? value : true,
          can_update: field === 'can_update' ? value : false,
          can_delete: field === 'can_delete' ? value : false,
        };
        updatedRule = await adminService.createPermissionRule(payload);
        setPermissionRules((rules) => [...rules, updatedRule]);
      }
      toast({ title: 'Succès', description: 'Permission mise à jour' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la permission:', error);
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la permission', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs totaux</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Administrateurs</p>
                <p className="text-2xl font-bold">{stats.adminCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Partenaires</p>
                <p className="text-2xl font-bold">{stats.partnerCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{stats.userCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestion des Rôles Utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par email, nom ou ID..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôles actuels</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName || ''}
                      </p>
                      <p className="text-xs text-muted-foreground">ID: {user.publicId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roleNames.map((role) => (
                        <Badge key={role} className={getRoleBadgeClass(role)}>
                          {getRoleIcon(role)}
                          <span className="ml-1 capitalize">{role}</span>
                        </Badge>
                      ))}
                      {user.roleNames.length === 0 && <Badge variant="outline">Aucun rôle</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog
                        open={roleDialogOpen && selectedUser?.id === user.id}
                        onOpenChange={(open) => {
                          setRoleDialogOpen(open);
                          if (open) {
                            setSelectedUser(user);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Gérer les rôles — {user.firstName || user.email}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Rôles disponibles</Label>
                              {['admin', 'partner', 'user'].map((role) => {
                                const hasRole = user.roleNames.includes(role);
                                return (
                                  <div key={role} className="flex items-center justify-between p-2 border rounded">
                                    <div className="flex items-center gap-2">
                                      {getRoleIcon(role)}
                                      <span className="capitalize">{role}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      {hasRole ? (
                                        <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(user, role)}>
                                          <Minus className="w-4 h-4" />
                                        </Button>
                                      ) : (
                                        <Button size="sm" variant="default" onClick={() => handleAddRole(user, role as 'admin' | 'partner' | 'user')}>
                                          <Plus className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {user.roleNames.includes('admin') && (
                        <Dialog
                          open={permissionDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setPermissionDialogOpen(open);
                            if (open) {
                              setSelectedUser(user);
                              loadPermissions(user);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Shield className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Permissions Admin — {user.firstName || user.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Type de permission</TableHead>
                                    <TableHead>Créer</TableHead>
                                    <TableHead>Lire</TableHead>
                                    <TableHead>Modifier</TableHead>
                                    <TableHead>Supprimer</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {PERMISSION_TYPES.map((permission) => {
                                    const rule = permissionRules.find((r) => r.permission_type === permission.value);
                                    return (
                                      <TableRow key={permission.value}>
                                        <TableCell className="font-medium">{permission.label}</TableCell>
                                        {(['can_create', 'can_read', 'can_update', 'can_delete'] as const).map((field) => (
                                          <TableCell key={field}>
                                            <Checkbox
                                              checked={rule ? rule[field] : field === 'can_read'}
                                              onCheckedChange={(checked) =>
                                                updatePermission(permission.value, field, checked === true)
                                              }
                                            />
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;
