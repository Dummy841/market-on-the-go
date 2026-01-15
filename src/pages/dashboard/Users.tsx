import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileModal } from "@/components/UserProfileModal";
import { UserOrdersModal } from "@/components/UserOrdersModal";
import { formatDistanceToNow } from "date-fns";
import { Eye, FileText, Users as UsersIcon, UserCheck, UserPlus, Crown } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  mobile: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  hasZippyPass?: boolean;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState("");

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch active Zippy Pass subscriptions
      const now = new Date().toISOString();
      const { data: zippyPassUsers } = await supabase
        .from('zippy_pass_subscriptions')
        .select('user_id')
        .eq('is_active', true)
        .gte('end_date', now);

      const zippyPassUserIds = new Set((zippyPassUsers || []).map(sub => sub.user_id));

      // Mark users with active Zippy Pass
      const usersWithPass = (data || []).map(user => ({
        ...user,
        hasZippyPass: zippyPassUserIds.has(user.id)
      }));

      setUsers(usersWithPass);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewProfile = (user: User) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const handleViewOrders = (user: User) => {
    setSelectedUserId(user.id);
    setSelectedUserName(user.name);
    setShowOrdersModal(true);
  };

  const totalUsers = users.length;
  const verifiedUsers = users.filter(user => user.is_verified).length;
  const newUsersThisMonth = users.filter(user => {
    const userDate = new Date(user.created_at);
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return userDate >= firstDayOfMonth;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-foreground">Users Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-foreground">Users Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {newUsersThisMonth} new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((verifiedUsers / totalUsers) * 100) || 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{newUsersThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {user.hasZippyPass && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border border-white">
                            <Crown className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{user.name}</span>
                        {user.hasZippyPass && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                            Zippy Pass
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.mobile}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_verified ? "default" : "secondary"}>
                      {user.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewProfile(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Profile
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewOrders(user)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        View Orders
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UserProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedUser}
      />

      <UserOrdersModal 
        isOpen={showOrdersModal}
        onClose={() => setShowOrdersModal(false)}
        userId={selectedUserId}
        userName={selectedUserName}
      />
    </div>
  );
};

export default Users;