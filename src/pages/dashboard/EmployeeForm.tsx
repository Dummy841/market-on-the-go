import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

const PERMISSION_GROUPS = [
  {
    key: "users",
    label: "Users",
    permissions: [
      { key: "view", label: "View Users" },
      { key: "view_profile", label: "View Profile" },
      { key: "view_orders", label: "View Orders" },
      { key: "wallet_topup", label: "Wallet Top-up" },
      { key: "export", label: "Export" },
    ],
  },
  {
    key: "sellers",
    label: "Sellers",
    permissions: [
      { key: "view", label: "View Sellers" },
      { key: "create", label: "Create Seller" },
      { key: "view_details", label: "View Details" },
      { key: "edit", label: "Edit Seller" },
      { key: "view_sales", label: "View Sales" },
      { key: "view_settlements", label: "View Settlements" },
    ],
  },
  {
    key: "employees",
    label: "Employees",
    permissions: [
      { key: "view", label: "View Employees" },
      { key: "create", label: "Create Employee" },
      { key: "edit", label: "Edit Employee" },
    ],
  },
  {
    key: "orders",
    label: "Orders",
    permissions: [
      { key: "view", label: "View Orders" },
      { key: "online", label: "Online Orders" },
      { key: "pos", label: "POS Orders" },
      { key: "update", label: "Update Orders" },
    ],
  },
  {
    key: "settlements",
    label: "Settlements",
    permissions: [
      { key: "view", label: "View Settlements" },
      { key: "update", label: "Update Settlements" },
    ],
  },
  {
    key: "refunds",
    label: "Refunds",
    permissions: [{ key: "view", label: "View Refunds" }],
  },
  {
    key: "delivery_partners",
    label: "Delivery Partners",
    permissions: [
      { key: "view", label: "View Partners" },
      { key: "create", label: "Create Partner" },
      { key: "edit", label: "Edit Partner" },
      { key: "update", label: "Update Status" },
    ],
  },
  {
    key: "banners",
    label: "Banners",
    permissions: [
      { key: "view", label: "View Banners" },
      { key: "create", label: "Create Banner" },
      { key: "edit", label: "Edit Banner" },
      { key: "delete", label: "Delete Banner" },
    ],
  },
  {
    key: "modules",
    label: "Modules",
    permissions: [
      { key: "view", label: "View Modules" },
      { key: "create", label: "Create Module" },
      { key: "edit", label: "Edit Module" },
      { key: "delete", label: "Delete Module" },
    ],
  },
  {
    key: "subcategories",
    label: "Subcategories",
    permissions: [
      { key: "view", label: "View Subcategories" },
      { key: "create", label: "Create Subcategory" },
      { key: "edit", label: "Edit Subcategory" },
      { key: "delete", label: "Delete Subcategory" },
    ],
  },
  {
    key: "support_chats",
    label: "Support Chats",
    permissions: [
      { key: "view", label: "View Chats" },
      { key: "update", label: "Reply / Update" },
    ],
  },
  {
    key: "wholesale_inventory",
    label: "Wholesale Inventory",
    permissions: [
      { key: "view", label: "View Inventory" },
      { key: "create", label: "Add Product" },
      { key: "edit", label: "Edit Product" },
    ],
  },
  {
    key: "wholesale_orders",
    label: "Wholesale Orders",
    permissions: [
      { key: "view", label: "View Orders" },
      { key: "update", label: "Update Orders" },
    ],
  },
  {
    key: "production",
    label: "Production",
    permissions: [
      { key: "view", label: "View Production" },
      { key: "create", label: "Create Entry" },
      { key: "edit", label: "Edit Entry" },
    ],
  },
];

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [formData, setFormData] = useState({ name: "", mobile: "", email: "", password: "Zippy@1234" });
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        const { data, error } = await supabase
          .from("admin_employees")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) {
          setFormData({ name: data.name, mobile: data.mobile, email: data.email || "", password: "" });
          setExistingPhotoUrl(data.profile_photo_url);
          setPermissions((data as any).permissions || {});
        }
        setLoading(false);
      })();
    }
  }, [id, isEdit]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const togglePermission = (group: string, perm: string) => {
    setPermissions((prev) => ({
      ...prev,
      [group]: { ...prev[group], [perm]: !prev[group]?.[perm] },
    }));
  };

  const toggleAllInGroup = (groupKey: string, permKeys: string[]) => {
    const allChecked = permKeys.every((k) => permissions[groupKey]?.[k]);
    setPermissions((prev) => ({
      ...prev,
      [groupKey]: Object.fromEntries(permKeys.map((k) => [k, !allChecked])),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.mobile.trim()) {
      toast({ title: "Name and mobile are required", variant: "destructive" });
      return;
    }
    if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
      toast({ title: "Invalid mobile number", variant: "destructive" });
      return;
    }
    if (!isEdit && !formData.password) {
      toast({ title: "Password is required", variant: "destructive" });
      return;
    }
    if (formData.password && !PASSWORD_REGEX.test(formData.password)) {
      toast({ title: "Weak password", description: "Must have uppercase, lowercase, number, and special character (min 8 chars)", variant: "destructive" });
      return;
    }

    setSaving(true);
    let photoUrl: string | null = existingPhotoUrl;

    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `admin-photos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("seller-profiles").upload(path, photoFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("seller-profiles").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    if (isEdit) {
      const updateData: any = {
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || null,
        profile_photo_url: photoUrl,
        permissions,
        updated_at: new Date().toISOString(),
      };
      if (formData.password) {
        const { data: hash } = await supabase.rpc("hash_password", { password: formData.password });
        updateData.password_hash = hash;
      }
      const { error } = await supabase.from("admin_employees").update(updateData).eq("id", id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Employee updated" });
        navigate("/dashboard/employees");
      }
    } else {
      const { data: hash } = await supabase.rpc("hash_password", { password: formData.password });
      const { error } = await supabase.from("admin_employees").insert({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || null,
        password_hash: hash,
        profile_photo_url: photoUrl,
        permissions: permissions as any,
      });
      if (error) {
        toast({ title: "Failed to add employee", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Employee added" });
        navigate("/dashboard/employees");
      }
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/employees")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-bold">{isEdit ? "Edit Employee" : "Add Employee"}</h2>
      </div>

      {/* Basic Info */}
      <div className="border rounded-lg p-5 space-y-4 bg-card">
        <h3 className="font-semibold text-lg">Employee Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name *</Label>
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
        </div>
        <div className="space-y-2">
          <Label>Password {isEdit ? "(leave blank to keep current)" : "*"}</Label>
          <div className="relative max-w-sm">
            <Input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEdit ? "Leave blank to keep current" : "Strong password"}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Must include uppercase, lowercase, number & special character (min 8)</p>
        </div>
      </div>

      {/* Dashboard Access */}
      <div className="border rounded-lg p-5 space-y-4 bg-card">
        <h3 className="font-semibold text-lg">Dashboard Access</h3>
        <p className="text-sm text-muted-foreground">Select the sections and actions this employee can access.</p>

        <div className="space-y-2">
          {PERMISSION_GROUPS.map((group) => {
            const permKeys = group.permissions.map((p) => p.key);
            const allChecked = permKeys.every((k) => permissions[group.key]?.[k]);
            const someChecked = permKeys.some((k) => permissions[group.key]?.[k]);
            const isExpanded = expandedGroups[group.key];

            return (
              <div key={group.key} className="border rounded-md">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleGroup(group.key)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Checkbox
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={() => toggleAllInGroup(group.key, permKeys)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium text-sm">{group.label}</span>
                </div>
                {isExpanded && (
                  <div className="px-12 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.permissions.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={!!permissions[group.key]?.[perm.key]}
                          onCheckedChange={() => togglePermission(group.key, perm.key)}
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Employee" : "Add Employee"}
        </Button>
        <Button variant="outline" onClick={() => navigate("/dashboard/employees")}>Cancel</Button>
      </div>
    </div>
  );
};

export default EmployeeForm;
