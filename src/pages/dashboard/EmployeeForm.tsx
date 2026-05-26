import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ChevronDown, ChevronRight, Camera, CheckCircle2 } from "lucide-react";
import FaceCaptureModal from "@/components/FaceCaptureModal";

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
  {
    key: "terms_conditions",
    label: "Terms & Conditions",
    permissions: [
      { key: "view", label: "View Terms" },
      { key: "create", label: "Add Term" },
      { key: "edit", label: "Edit Term" },
      { key: "delete", label: "Delete Term" },
    ],
  },
]; // end PERMISSION_GROUPS

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id;

  const [formData, setFormData] = useState({ name: "", mobile: "", email: "" });
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [permissionSearch, setPermissionSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [hasExistingFace, setHasExistingFace] = useState(false);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        const { data, error } = await supabase
          .from("admin_employees")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) {
          setFormData({ name: data.name, mobile: data.mobile, email: data.email || "" });
          setExistingPhotoUrl(data.profile_photo_url);
          setPermissions((data as any).permissions || {});
          setHasExistingFace(!!(data as any).face_descriptor);
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
    if (!isEdit && !faceDescriptor) {
      toast({ title: "Face capture required", description: "Please capture the employee's face before saving.", variant: "destructive" });
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
      if (faceDescriptor) {
        updateData.face_descriptor = faceDescriptor;
      }
      const { error } = await supabase.from("admin_employees").update(updateData).eq("id", id);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Employee updated" });
        navigate("/dashboard/employees");
      }
    } else {
      const { error } = await supabase.from("admin_employees").insert({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email || null,
        profile_photo_url: photoUrl,
        permissions: permissions as any,
        face_descriptor: faceDescriptor as any,
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
          <Label>Face Authentication {isEdit ? "(recapture to update)" : "*"}</Label>
          <div className="flex items-center gap-3 flex-wrap">
            <Button type="button" variant="outline" onClick={() => setFaceModalOpen(true)}>
              <Camera className="h-4 w-4 mr-2" />
              {faceDescriptor ? "Recapture Face" : hasExistingFace ? "Update Face" : "Capture Face"}
            </Button>
            {faceDescriptor && (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Face Captured Successfully
              </div>
            )}
            {!faceDescriptor && hasExistingFace && (
              <span className="text-xs text-muted-foreground">Face already enrolled for this employee.</span>
            )}
            {facePreview && (
              <img src={facePreview} alt="Captured face" className="h-12 w-12 rounded-full object-cover border" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">Employee will log in using face recognition only.</p>
        </div>
      </div>

      {/* Dashboard Access */}
      <div className="border rounded-lg p-5 space-y-4 bg-card">
        <h3 className="font-semibold text-lg">Dashboard Access</h3>
        <p className="text-sm text-muted-foreground">Select the sections and actions this employee can access.</p>
        <Input
          placeholder="Search sections..."
          value={permissionSearch}
          onChange={(e) => setPermissionSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="space-y-2">
          {PERMISSION_GROUPS.filter((group) =>
            group.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
            group.permissions.some((p) => p.label.toLowerCase().includes(permissionSearch.toLowerCase()))
          ).map((group) => {
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
      <FaceCaptureModal
        open={faceModalOpen}
        onClose={() => setFaceModalOpen(false)}
        onCapture={(desc, img) => {
          setFaceDescriptor(desc);
          setFacePreview(img);
          toast({ title: "Face Captured Successfully" });
        }}
        title="Enroll Employee Face"
        mode="enroll"
      />
    </div>
  );
};

export default EmployeeForm;
