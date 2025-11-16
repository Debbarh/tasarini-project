import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/integrations/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

export const AdminDebugPanel = () => {
  const { user, userRoles, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshDebugInfo = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      
      // Direct query to check roles via API
      const rolesData = await apiClient.get<any[]>('accounts/user-roles/', { user: user.id });
      const permissionsData = await apiClient.get<any[]>('admin/permission-rules/', { admin: user.id });


      setDebugInfo({
        userId: user.id,
        email: user.email,
        contextRoles: userRoles,
        directRolesQuery: { data: rolesData },
        adminPermissions: { data: permissionsData },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('🔍 Debug: Error fetching debug info:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && isVisible) {
      refreshDebugInfo();
    }
  }, [user, isVisible]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2"
      >
        {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        Debug Admin
      </Button>

      {isVisible && (
        <Card className="w-80 max-h-96 overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Admin Debug Info
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshDebugInfo}
                disabled={refreshing}
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>
              <strong>User ID:</strong> {user.id}
            </div>
            <div>
              <strong>Email:</strong> {user.email}
            </div>
            <div>
              <strong>Context Roles:</strong>
              <div className="flex gap-1 mt-1">
                {userRoles.length > 0 ? (
                  userRoles.map(role => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {role}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="destructive" className="text-xs">No roles</Badge>
                )}
              </div>
            </div>
            
            {debugInfo && (
              <>
                <div>
                  <strong>Direct DB Query:</strong>
                  {debugInfo.directRolesQuery?.error ? (
                    <Badge variant="destructive" className="text-xs ml-1">
                      Error: {debugInfo.directRolesQuery.error.message}
                    </Badge>
                  ) : (
                    <div className="flex gap-1 mt-1">
                      {debugInfo.directRolesQuery?.data?.map((r: any, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {r.role}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <strong>Admin Permissions:</strong>
                  {debugInfo.adminPermissions?.error ? (
                    <Badge variant="destructive" className="text-xs ml-1">
                      Error: {debugInfo.adminPermissions.error.message}
                    </Badge>
                  ) : debugInfo.adminPermissions?.data?.length > 0 ? (
                    <Badge variant="default" className="text-xs ml-1">
                      {debugInfo.adminPermissions.data.length} permissions
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs ml-1">
                      No permissions
                    </Badge>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
