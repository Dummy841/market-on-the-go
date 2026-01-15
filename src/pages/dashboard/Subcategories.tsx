import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subcategory {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

interface ServiceModule {
  id: string;
  title: string;
  slug: string;
}

const Subcategories = () => {
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
  const { toast } = useToast();

  useEffect(() => {
    fetchModules();
    fetchSubcategories();
  }, []);

  const fetchModules = async () => {
    // Hardcode all 4 categories to ensure they're always available
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
      setSubcategories(data || []);
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

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subcategory name is required"
      });
      return;
    }

    try {
      const { error } = await supabase.from("subcategories").insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory created successfully"
      });

      setIsCreateOpen(false);
      setFormData({ name: "", category: "food_delivery", is_active: true, display_order: 0 });
      fetchSubcategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create subcategory"
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingSubcategory || !formData.name.trim()) return;

    try {
      const { error } = await supabase
        .from("subcategories")
        .update({
          name: formData.name,
          category: formData.category,
          is_active: formData.is_active,
          display_order: formData.display_order,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingSubcategory.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory updated successfully"
      });

      setIsEditOpen(false);
      setEditingSubcategory(null);
      fetchSubcategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update subcategory"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;

    try {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subcategory deleted successfully"
      });

      fetchSubcategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete subcategory"
      });
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
    setIsEditOpen(true);
  };

  const getCategoryLabel = (slug: string) => {
    const module = modules.find(m => m.slug === slug);
    return module?.title || slug.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Subcategories</h2>
          <p className="text-muted-foreground text-sm">Manage subcategories for each category</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create</Button>
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
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : subcategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No subcategories found
                  </TableCell>
                </TableRow>
              ) : (
                subcategories.map(subcategory => (
                  <TableRow key={subcategory.id}>
                    <TableCell className="font-medium">{subcategory.name}</TableCell>
                    <TableCell>{getCategoryLabel(subcategory.category)}</TableCell>
                    <TableCell>{subcategory.display_order}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          subcategory.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {subcategory.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(subcategory)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(subcategory.id)}
                        >
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
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subcategories;