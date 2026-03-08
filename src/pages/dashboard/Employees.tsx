import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, UserX, UserCheck } from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const SUPERADMIN_MOBILE = "9502395261";

interface Employee {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  profile_photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasPermission } = useAdminAuth();

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("admin_employees").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      setEmployees((data as any[]).filter((e) => e.mobile !== SUPERADMIN_MOBILE));
    }
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const toggleActive = async (emp: Employee) => {
    await supabase.from("admin_employees").update({ is_active: !emp.is_active, updated_at: new Date().toISOString() }).eq("id", emp.id);
    fetchEmployees();
    toast({ title: emp.is_active ? "Employee deactivated" : "Employee activated" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Employee Management</h2>
        <Button onClick={() => navigate("/dashboard/employees/add")}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {emp.profile_photo_url && (
                        <img src={emp.profile_photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      )}
                      {emp.name}
                    </div>
                  </TableCell>
                  <TableCell>{emp.mobile}</TableCell>
                  <TableCell>{emp.email || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={emp.is_active ? "default" : "destructive"}>
                      {emp.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/employees/${emp.id}/edit`)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant={emp.is_active ? "destructive" : "default"} onClick={() => toggleActive(emp)}>
                        {emp.is_active ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Employees;
