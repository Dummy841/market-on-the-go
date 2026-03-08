import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface Subcategory {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  created_at: string;
}

interface ServiceModule {
  id: string;
  title: string;
  slug: string;
}

const Subcategories = () => {
  const { hasPermission } = useAdminAuth();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [modules, setModules] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "food_delivery",
    is_active: true,
    display_order: 0
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchModules();
    fetchSubcategories();
  }, []);

  const fetchModules = async () => {
    const defaultCategories = [
      { id: '1', title: 'FOOD DELIVERY', slug: 'food_delivery' },
      { id: '2', title: 'INSTAMART', slug: 'instamart' },
      { id: '3', title: 'DAIRY PRODUCTS', slug: 'dairy' },
      { id: '4', title: 'SERVICES', slug: 'services' }
    ];
    
    try {
      const { data, error } = await supabase
        .from("service_modules")
        .select("id, title, slug")
        .order("display_order");

      if (!error && data && data.length > 0) {
        setModules(data);
      } else {
        setModules(defaultCategories);
      }
    } catch (e) {
      setModules(defaultCategories);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("category")
        .order("display_order");

      if (error) throw error;
      setSubcategories((data || []).map(d => ({ ...d, image_url: (d as any).image_url || null })));
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch subcategories"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `subcategory-${Date.now()}.${fileExt}`;
      const filePath = `subcategory-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('seller-images')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Subcategory name is required" });
      return;
    }

    try {
      setUploading(true);
      let image_url: string | null = null;
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      const { error } = await supabase.from("subcategories").insert([{
        ...formData,
        image_url
      }]);

      if (error) throw error;

      toast({ title: "Success", description: "Subcategory created successfully" });
      setIsCreateOpen(false);
      setFormData({ name: "", category: "food_delivery", is_active: true, display_order: 0 });
      setImageFile(null);
      setImagePreview(null);
      fetchSubcategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to create subcategory" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSubcategory || !formData.name.trim()) return;

    try {
      setUploading(true);
      let image_url = editingSubcategory.image_url;
      if (imageFile) {
        const uploaded = await uploadImage(imageFile);
        if (uploaded) image_url = uploaded;
      }

      const { error } = await supabase
        .from("subcategories")
        .update({
          name: formData.name,
          category: formData.category,
          is_active: formData.is_active,
          display_order: formData.display_order,
          image_url,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingSubcategory.id);

      if (error) throw error;

      toast({ title: "Success", description: "Subcategory updated successfully" });
      setIsEditOpen(false);
      setEditingSubcategory(null);
      setImageFile(null);
      setImagePreview(null);
      fetchSubcategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update subcategory" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    try {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Subcategory deleted successfully" });
      fetchSubcategories();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete subcategory" });
    }
  };

  const openEditDialog = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setFormData({
      name: subcategory.name,
      category: subcategory.category,
      is_active: subcategory.is_active,
      display_order: subcategory.display_order
    });
    setImagePreview(subcategory.image_url);
    setImageFile(null);
    setIsEditOpen(true);
  };

  const getCategoryLabel = (slug: string) => {
    const module = modules.find(m => m.slug === slug);
    return module?.title || slug.replace(/_/g, " ").toUpperCase();
  };

  const ImageUploadField = ({ inputRef }: { inputRef: React.RefObject<HTMLInputElement> }) => (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex items-center gap-3">
        {imagePreview ? (
          <div className="relative w-16 h-16 rounded-full overflow-hidden border">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); }}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {imagePreview ? 'Change' : 'Upload'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Subcategories</h2>
          <p className="text-muted-foreground text-sm">Manage subcategories for each category</p>
        </div>

        {hasPermission("subcategories", "create") && (
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setImageFile(null); setImagePreview(null); } }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subcategory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter subcategory name"
                />
              </div>

              <ImageUploadField inputRef={fileInputRef} />

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={value => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {modules.map(module => (
                      <SelectItem key={module.id} value={module.slug}>
                        {module.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={uploading}>
                  {uploading ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : subcategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No subcategories found</TableCell>
                </TableRow>
              ) : (
                subcategories.map(subcategory => (
                  <TableRow key={subcategory.id}>
                    <TableCell>
                      {subcategory.image_url ? (
                        <img src={subcategory.image_url} alt={subcategory.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{subcategory.name}</TableCell>
                    <TableCell>{getCategoryLabel(subcategory.category)}</TableCell>
                    <TableCell>{subcategory.display_order}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${subcategory.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {subcategory.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(subcategory)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(subcategory.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) { setImageFile(null); setImagePreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter subcategory name"
              />
            </div>

            <ImageUploadField inputRef={editFileInputRef} />

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={value => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {modules.map(module => (
                    <SelectItem key={module.id} value={module.slug}>
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={uploading}>
                {uploading ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subcategories;
