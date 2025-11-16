import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, User, Shield, UserCog, Trash2, Edit, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import { useToast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { adminService } from '@/services/adminService';
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
  roles: RoleAssignment[];
  primaryRole: string;
  profileId?: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  partner: 'Partner',
  user: 'Utilisateur',
  traveler: 'Utilisateur',
  editor: 'Éditeur',
};

const ROLE_FILTERS = [
  { value: 'all', label: 'Tous les rôles' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'partner', label: 'Partner' },
  { value: 'user', label: 'Utilisateur' },
];

const mapUser = (user: ApiUser): ManagedUser => ({
  id: user.id,
  publicId: user.public_id,
  email: user.email,
  firstName: user.profile?.first_name || '',
  lastName: user.profile?.last_name || '',
  createdAt: user.profile?.created_at,
  roles: (user.role_assignments_detail || []).map((assignment) => ({ id: assignment.id, role: assignment.role })),
  primaryRole: user.role,
  profileId: user.profile?.id,
});

const getDisplayName = (user: ManagedUser) => {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  if (parts.length === 0) {
    return user.email;
  }
  return parts.join(' ');
};

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const pagination = usePagination({ data: filteredUsers, pageSize: 10 });
  const currentPageData = useMemo(() => pagination.paginatedData, [pagination.paginatedData]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.listUsers();
      const mapped = (data || []).map(mapUser).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setUsers(mapped);
      setFilteredUsers(mapped);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les utilisateurs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const filtered = users.filter((user) => {
      const searchValue = searchTerm.toLowerCase();
      const matchesSearch =
        user.email.toLowerCase().includes(searchValue) ||
        getDisplayName(user).toLowerCase().includes(searchValue);
      const matchesRole =
        roleFilter === 'all' ||
        user.primaryRole === roleFilter ||
        user.roles.some((assignment) => assignment.role === roleFilter);
      return matchesSearch && matchesRole;
    });
    setFilteredUsers(filtered);
    pagination.goToPage(1);
  }, [users, searchTerm, roleFilter]);

  const handleRoleChange = async (user: ManagedUser, role: 'admin' | 'partner' | 'user', action: 'add' | 'remove') => {
    try {
      if (action === 'add') {
        await adminService.assignRole(user.id, role);
      } else {
        const assignment = user.roles.find((record) => record.role === role);
        if (!assignment) {
          toast({ title: 'Rôle introuvable', description: "Impossible de trouver l'assignation", variant: 'destructive' });
          return;
        }
        await adminService.removeRole(assignment.id);
      }
      toast({ title: 'Succès', description: 'Rôles mis à jour avec succès' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({ title: 'Erreur', description: error?.message || 'Impossible de mettre à jour le rôle', variant: 'destructive' });
    }
  };

  const updateUserInfo = async (user: ManagedUser, updates: { first_name: string; last_name: string; email: string }) => {
    if (!user.profileId) {
      toast({ title: 'Profil manquant', description: "Impossible de mettre à jour un profil inexistant", variant: 'destructive' });
      return;
    }
    try {
      setEditLoading(true);
      await adminService.updateUserProfile(user.profileId, {
        first_name: updates.first_name.trim(),
        last_name: updates.last_name.trim(),
        email: updates.email.trim(),
      });
      toast({ title: 'Succès', description: 'Informations utilisateur mises à jour avec succès' });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user info:', error);
      toast({ title: 'Erreur', description: error?.message || "Impossible de mettre à jour l'utilisateur", variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const deleteUser = async (user: ManagedUser) => {
    try {
      await adminService.deleteUser(user.id);
      toast({ title: 'Utilisateur supprimé', description: `${user.email} a été supprimé` });
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({ title: 'Erreur', description: error?.message || "Impossible de supprimer l'utilisateur", variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">
                  {users.filter(
                    (user) =>
                      user.primaryRole === 'admin' || user.roles.some((assignment) => assignment.role === 'admin'),
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Partners</p>
                <p className="text-2xl font-bold">
                  {users.filter(
                    (user) =>
                      user.primaryRole === 'partner' || user.roles.some((assignment) => assignment.role === 'partner'),
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs</p>
                <p className="text-2xl font-bold">{users.filter((user) => user.primaryRole === 'traveler' || user.primaryRole === 'user').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Gestion des utilisateurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48">
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

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôles</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPageData.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{getDisplayName(user)}</div>
                      <div className="text-xs text-muted-foreground">{user.publicId}</div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{ROLE_LABELS[user.primaryRole] || user.primaryRole}</Badge>
                        {user.roles
                          .filter((role) => role.role !== user.primaryRole)
                          .map((assignment) => (
                            <Badge key={assignment.id} variant="outline">
                              {ROLE_LABELS[assignment.role] || assignment.role}
                            </Badge>
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Dialog onOpenChange={(open) => !open && setEditingUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Modifier
                          </Button>
                        </DialogTrigger>
                        {editingUser?.id === user.id && (
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Modifier {getDisplayName(user)}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Prénom</Label>
                                <Input
                                  value={editingUser.firstName}
                                  onChange={(event) =>
                                    setEditingUser((prev) =>
                                      prev ? { ...prev, firstName: event.target.value } : prev,
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label>Nom</Label>
                                <Input
                                  value={editingUser.lastName}
                                  onChange={(event) =>
                                    setEditingUser((prev) =>
                                      prev ? { ...prev, lastName: event.target.value } : prev,
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label>Email</Label>
                                <Input
                                  value={editingUser.email}
                                  onChange={(event) =>
                                    setEditingUser((prev) =>
                                      prev ? { ...prev, email: event.target.value } : prev,
                                    )
                                  }
                                />
                              </div>
                              <Button
                                onClick={() =>
                                  editingUser &&
                                  updateUserInfo(editingUser, {
                                    first_name: editingUser.firstName,
                                    last_name: editingUser.lastName,
                                    email: editingUser.email,
                                  })
                                }
                                disabled={editLoading}
                              >
                                {editLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enregistrer
                              </Button>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Shield className="w-4 h-4 mr-1" />
                            Rôles
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Gestion des rôles</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3">
                            {['admin', 'partner', 'user'].map((role) => {
                              const hasRole =
                                user.primaryRole === role || user.roles.some((assignment) => assignment.role === role);
                              return (
                                <div key={role} className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{ROLE_LABELS[role] || role}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {hasRole ? 'Rôle attribué' : 'Rôle non attribué'}
                                    </p>
                                  </div>
                                  <Checkbox
                                    checked={hasRole}
                                    onCheckedChange={(checked) =>
                                      handleRoleChange(
                                        user,
                                        role as 'admin' | 'partner' | 'user',
                                        checked === true ? 'add' : 'remove',
                                      )
                                    }
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer {getDisplayName(user)} ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. Toutes les données associées seront supprimées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUser(user)} className="bg-destructive text-white">
                              Confirmer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={pagination.goToPreviousPage}
                    className={!pagination.canGoPrevious ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => pagination.goToPage(page)}
                      isActive={pagination.currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={pagination.goToNextPage}
                    className={!pagination.canGoNext ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
