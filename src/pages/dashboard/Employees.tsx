import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, UserX, UserCheck, Eye, EyeOff } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  profile_photo_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ name: "", mobile: "", email: "", password: "", role: "employee" });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    const { data, error } = await supabase.from("admin_employees" as any).select("*").order("created_at", { ascending: false });
    if (!error && data) setEmployees(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchEmployees(); }, []);

  const openAddForm = () => {
    setEditingEmployee(null);
    setFormData({ name: "", mobile: "", email: "", password: "", role: "employee" });
    setPhotoFile(null);
    setShowForm(true);
  };

  const openEditForm = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({ name: emp.name, mobile: emp.mobile, email: emp.email || "", password: "", role: emp.role });
    setPhotoFile(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.mobile.trim()) {
      toast({ title: "Name and mobile are required", variant: "destructive" }); return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      toast({ title: "Invalid mobile number", variant: "destructive" }); return;
    }
    if (!editingEmployee && !formData.password) {
      toast({ title: "Password is required", variant: "destructive" }); return;
    }
    if (formData.password && !PASSWORD_REGEX.test(formData.password)) {
      toast({ title: "Weak password", description: "Must have uppercase, lowercase, number, and special character (min 8 chars)", variant: "destructive" }); return;
    }

    setSaving(true);
    let photoUrl: string | null = editingEmployee?.profile_photo_url || null;

    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `admin-photos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("seller-profiles").upload(path, photoFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("seller-profiles").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    if (editingEmployee) {
      const updateData: any = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || null,
        role: formData.role,
        profile_photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      };
      if (formData.password) {
        const { data: hash } = await supabase.rpc("hash_password", { password: formData.password });
        updateData.password_hash = hash;
      }
      const { error } = await supabase.from("admin_employees" as any).update(updateData).eq("id", editingEmployee.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Employee updated" }); }
    } else {
      const { data: hash } = await supabase.rpc("hash_password", { password: formData.password });
      const { error } = await supabase.from("admin_employees" as any).insert({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || null,
        password_hash: hash,
        role: formData.role,
        profile_photo_url: photoUrl,
      });
      if (error) { toast({ title: "Failed to add employee", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Employee added" }); }
    }

    setSaving(false);
    setShowForm(false);
    fetchEmployees();
  };

  const toggleActive = async (emp: Employee) => {
    await supabase.from("admin_employees" as any).update({ is_active: !emp.is_active, updated_at: new Date().toISOString() }).eq("id", emp.id);
    fetchEmployees();
    toast({ title: emp.is_active ? "Employee deactivated" : "Employee activated" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Employee Management</h2>
        <Button onClick={openAddForm}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>
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
                <TableHead>Role</TableHead>
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
                  <TableCell><Badge variant="outline" className="capitalize">{emp.role}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={emp.is_active ? "default" : "destructive"}>
                      {emp.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(emp)}>
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
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No employees found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Mobile *</Label>
              <Input value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit mobile" maxLength={10} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email (optional)" />
            </div>
            <div className="space-y-2">
              <Label>Profile Photo</Label>
              <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Password {editingEmployee ? "(leave blank to keep current)" : "*"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingEmployee ? "Leave blank to keep current" : "Strong password"}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, number & special character (min 8)</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editingEmployee ? "Update Employee" : "Add Employee"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
