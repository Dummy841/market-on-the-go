import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Role {
  id: string;
  role_name: string;
  description: string | null;
  permissions: string[];
  is_active: boolean;
  created_at: string;
}

const Roles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ role_name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("admin_roles" as any)
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setRoles(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const openAddForm = () => {
    setEditingRole(null);
    setFormData({ role_name: "", description: "" });
    setShowForm(true);
  };

  const openEditForm = (role: Role) => {
    setEditingRole(role);
    setFormData({ role_name: role.role_name, description: role.description || "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.role_name.trim()) {
      toast({ title: "Role name is required", variant: "destructive" });
      return;
    }

    setSaving(true);

    if (editingRole) {
      const { error } = await supabase
        .from("admin_roles" as any)
        .update({
          role_name: formData.role_name.toLowerCase().trim(),
          description: formData.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingRole.id);
      if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
      else toast({ title: "Role updated" });
    } else {
      const { error } = await supabase
        .from("admin_roles" as any)
        .insert({
          role_name: formData.role_name.toLowerCase().trim(),
          description: formData.description || null,
        });
      if (error) toast({ title: "Failed to create role", description: error.message, variant: "destructive" });
      else toast({ title: "Role created" });
    }

    setSaving(false);
    setShowForm(false);
    fetchRoles();
  };

  const deleteRole = async (role: Role) => {
    if (!confirm(`Delete role "${role.role_name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("admin_roles" as any).delete().eq("id", role.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Role deleted" }); fetchRoles(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Roles</h2>
        <Button onClick={openAddForm}><Plus className="h-4 w-4 mr-2" /> Create Role</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium capitalize">{role.role_name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={role.is_active ? "default" : "destructive"}>
                      {role.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(role)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteRole(role)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {roles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No roles found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name *</Label>
              <Input
                value={formData.role_name}
                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                placeholder="e.g. supervisor"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What can this role do?"
                rows={3}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editingRole ? "Update Role" : "Create Role"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;
