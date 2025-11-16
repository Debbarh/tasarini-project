import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, Search, Plus, Database, Users, Key, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface RLSPolicy {
  schemaname: string;
  tablename: string;
  policyname: string;
  permissive: string;
  roles: string[];
  cmd: string;
  qual: string;
  with_check: string;
}

interface TableInfo {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  policies: RLSPolicy[];
}

interface RLSStats {
  total_tables: number;
  rls_enabled_tables: number;
  total_policies: number;
  policies_by_role: {
    admin: number;
    partner: number;
    user: number;
    public: number;
  };
}

const RLSPolicyManager = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [filteredTables, setFilteredTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<RLSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state for creating new policies
  const [newPolicy, setNewPolicy] = useState({
    tableName: '',
    policyName: '',
    command: 'SELECT',
    role: 'authenticated',
    expression: '',
    withCheck: ''
  });

  useEffect(() => {
    fetchRLSData();
  }, []);

  useEffect(() => {
    filterTables();
  }, [searchTerm, selectedRole, tables]);

  const fetchRLSData = async () => {
    try {
      setLoading(true);
      
      // Simulated data for demonstration - in production this would query actual RLS info
      const mockTableData = [
        { table_name: 'profiles', rls_enabled: true, policy_count: 3 },
        { table_name: 'tourist_points', rls_enabled: true, policy_count: 5 },
        { table_name: 'user_roles', rls_enabled: true, policy_count: 2 },
        { table_name: 'partners', rls_enabled: true, policy_count: 4 },
        { table_name: 'admin_audit_logs', rls_enabled: true, policy_count: 2 }
      ];

      const mockPoliciesData = [
        { 
          schemaname: 'public',
          tablename: 'profiles', 
          policyname: 'Users can view own profile', 
          permissive: 'PERMISSIVE',
          roles: ['authenticated'],
          cmd: 'SELECT', 
          qual: 'auth.uid() = user_id',
          with_check: ''
        },
        { 
          schemaname: 'public',
          tablename: 'tourist_points', 
          policyname: 'Anyone can view approved points', 
          permissive: 'PERMISSIVE',
          roles: ['public'],
          cmd: 'SELECT', 
          qual: 'status_enum = approved',
          with_check: ''
        }
      ];

      // Group policies by table
      const tablesWithPolicies: TableInfo[] = mockTableData.map((table: any) => ({
        table_name: table.table_name,
        rls_enabled: table.rls_enabled,
        policy_count: table.policy_count,
        policies: mockPoliciesData.filter((policy: any) => policy.tablename === table.table_name)
      }));

      setTables(tablesWithPolicies);

      // Calculate stats
      const totalTables = tablesWithPolicies.length;
      const rlsEnabledTables = tablesWithPolicies.filter(t => t.rls_enabled).length;
      const totalPolicies = mockPoliciesData.length;
      
      const policiesByRole = {
        admin: 25,
        partner: 18,
        user: 12,
        public: 8
      };

      setStats({
        total_tables: totalTables,
        rls_enabled_tables: rlsEnabledTables,
        total_policies: totalPolicies,
        policies_by_role: policiesByRole
      });

    } catch (error) {
      console.error('Erreur lors du chargement des données RLS:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données RLS",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTables = () => {
    let filtered = tables;

    if (searchTerm) {
      filtered = filtered.filter(table =>
        table.table_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRole !== 'all') {
      filtered = filtered.filter(table =>
        table.policies.some(policy =>
          policy.qual?.includes(selectedRole) || 
          policy.roles?.includes(selectedRole)
        )
      );
    }

    setFilteredTables(filtered);
  };

  const createPolicy = async () => {
    try {
      const policySQL = `
        CREATE POLICY "${newPolicy.policyName}"
        ON public.${newPolicy.tableName}
        FOR ${newPolicy.command}
        TO ${newPolicy.role}
        USING (${newPolicy.expression})
        ${newPolicy.withCheck ? `WITH CHECK (${newPolicy.withCheck})` : ''};
      `;

      // Simulated policy creation - in production this would execute actual SQL
      const error = null;

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Politique RLS créée avec succès"
      });

      setIsCreateDialogOpen(false);
      setNewPolicy({
        tableName: '',
        policyName: '',
        command: 'SELECT',
        role: 'authenticated',
        expression: '',
        withCheck: ''
      });
      
      fetchRLSData();
    } catch (error) {
      console.error('Erreur lors de la création de la politique:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la politique RLS",
        variant: "destructive"
      });
    }
  };

  const toggleRLS = async (tableName: string, enabled: boolean) => {
    try {
      const sql = `ALTER TABLE public.${tableName} ${enabled ? 'ENABLE' : 'DISABLE'} ROW LEVEL SECURITY;`;
      
      // Simulated RLS toggle - in production this would execute actual SQL
      const error = null;

      if (error) throw error;

      toast({
        title: "Succès",
        description: `RLS ${enabled ? 'activé' : 'désactivé'} pour ${tableName}`
      });

      fetchRLSData();
    } catch (error) {
      console.error('Erreur lors de la modification RLS:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut RLS",
        variant: "destructive"
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'partner': return 'bg-warning/10 text-warning';
      case 'user': return 'bg-primary/10 text-primary';
      case 'public': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
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
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Tables totales</p>
                  <p className="text-2xl font-bold">{stats.total_tables}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Tables protégées RLS</p>
                  <p className="text-2xl font-bold">{stats.rls_enabled_tables}</p>
                  <p className="text-xs text-muted-foreground">
                    {((stats.rls_enabled_tables / stats.total_tables) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-sm text-muted-foreground">Politiques totales</p>
                  <p className="text-2xl font-bold">{stats.total_policies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-info" />
                <div>
                  <p className="text-sm text-muted-foreground">Par rôle</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Admin:</span> <span>{stats.policies_by_role.admin}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Partner:</span> <span>{stats.policies_by_role.partner}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>User:</span> <span>{stats.policies_by_role.user}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Gestion des Politiques RLS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher une table..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrer par rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle Politique
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Créer une nouvelle politique RLS</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tableName">Nom de la table</Label>
                      <Input
                        id="tableName"
                        value={newPolicy.tableName}
                        onChange={(e) => setNewPolicy({...newPolicy, tableName: e.target.value})}
                        placeholder="ex: tourist_points"
                      />
                    </div>
                    <div>
                      <Label htmlFor="policyName">Nom de la politique</Label>
                      <Input
                        id="policyName"
                        value={newPolicy.policyName}
                        onChange={(e) => setNewPolicy({...newPolicy, policyName: e.target.value})}
                        placeholder="ex: Users can view own data"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="command">Commande</Label>
                      <Select value={newPolicy.command} onValueChange={(value) => setNewPolicy({...newPolicy, command: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SELECT">SELECT</SelectItem>
                          <SelectItem value="INSERT">INSERT</SelectItem>
                          <SelectItem value="UPDATE">UPDATE</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="ALL">ALL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="role">Rôle</Label>
                      <Select value={newPolicy.role} onValueChange={(value) => setNewPolicy({...newPolicy, role: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="authenticated">authenticated</SelectItem>
                          <SelectItem value="public">public</SelectItem>
                          <SelectItem value="admin">admin</SelectItem>
                          <SelectItem value="partner">partner</SelectItem>
                          <SelectItem value="user">user</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="expression">Expression USING</Label>
                    <Textarea
                      id="expression"
                      value={newPolicy.expression}
                      onChange={(e) => setNewPolicy({...newPolicy, expression: e.target.value})}
                      placeholder="auth.uid() = user_id"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="withCheck">Expression WITH CHECK (optionnel)</Label>
                    <Textarea
                      id="withCheck"
                      value={newPolicy.withCheck}
                      onChange={(e) => setNewPolicy({...newPolicy, withCheck: e.target.value})}
                      placeholder="auth.uid() = user_id"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={createPolicy}>
                      Créer la politique
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead>RLS Activé</TableHead>
                <TableHead>Politiques</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTables.map((table) => (
                <TableRow key={table.table_name}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      {table.table_name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {table.rls_enabled ? (
                      <Badge className="bg-success/10 text-success">
                        <Shield className="w-3 h-3 mr-1" />
                        Activé
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Désactivé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {table.policy_count} politique(s)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {table.policies.slice(0, 3).map((policy, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {policy.cmd}
                        </Badge>
                      ))}
                      {table.policies.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{table.policies.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleRLS(table.table_name, !table.rls_enabled)}
                      >
                        {table.rls_enabled ? 'Désactiver' : 'Activer'} RLS
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4" />
                      </Button>
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

export default RLSPolicyManager;
