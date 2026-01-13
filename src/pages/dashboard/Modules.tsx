import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

interface ServiceModule {
  id: string;
  title: string;
  subtitle: string | null;
  badge: string | null;
  image_url: string | null;
  slug: string;
  display_order: number;
  is_active: boolean;
}

const Modules = () => {
  const [modules, setModules] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ServiceModule | null>(null);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge: '',
    image_url: '',
    slug: '',
    is_active: true
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('service_modules')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch modules",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `module-${Date.now()}.${fileExt}`;
      const filePath = `module-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('seller-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('seller-profiles')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({
        title: "Image uploaded",
        description: "Module image uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload image",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title is required",
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Slug is required",
      });
      return;
    }

    try {
      if (editingModule) {
        const { error } = await supabase
          .from('service_modules')
          .update({
            title: formData.title,
            subtitle: formData.subtitle || null,
            badge: formData.badge || null,
            image_url: formData.image_url || null,
            slug: formData.slug,
            is_active: formData.is_active
          })
          .eq('id', editingModule.id);

        if (error) throw error;
        toast({
          title: "Module updated",
          description: "Module has been updated successfully!",
        });
      } else {
        const maxOrder = modules.length > 0 ? Math.max(...modules.map(m => m.display_order)) : 0;
        const { error } = await supabase
          .from('service_modules')
          .insert([{
            title: formData.title,
            subtitle: formData.subtitle || null,
            badge: formData.badge || null,
            image_url: formData.image_url || null,
            slug: formData.slug,
            display_order: maxOrder + 1,
            is_active: formData.is_active
          }]);

        if (error) throw error;
        toast({
          title: "Module created",
          description: "New module has been created successfully!",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      fetchModules();
    } catch (error: any) {
      console.error('Error saving module:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save module",
      });
    }
  };

  const handleEdit = (module: ServiceModule) => {
    setEditingModule(module);
    setFormData({
      title: module.title,
      subtitle: module.subtitle || '',
      badge: module.badge || '',
      image_url: module.image_url || '',
      slug: module.slug,
      is_active: module.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    try {
      const { error } = await supabase
        .from('service_modules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Module deleted",
        description: "Module has been deleted successfully!",
      });
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete module",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      badge: '',
      image_url: '',
      slug: '',
      is_active: true
    });
    setEditingModule(null);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = async () => {
    if (draggedIndex === null || dragOverIndex.current === null) return;
    if (draggedIndex === dragOverIndex.current) {
      setDraggedIndex(null);
      return;
    }

    const newModules = [...modules];
    const draggedItem = newModules[draggedIndex];
    newModules.splice(draggedIndex, 1);
    newModules.splice(dragOverIndex.current, 0, draggedItem);

    setModules(newModules);
    setDraggedIndex(null);

    try {
      const updates = newModules.map((module, index) => ({
        id: module.id,
        display_order: index + 1
      }));

      for (const update of updates) {
        await supabase
          .from('service_modules')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      toast({
        title: "Order updated",
        description: "Module display order has been updated!",
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update display order",
      });
      fetchModules();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Service Modules</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingModule ? 'Edit Module' : 'Create New Module'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., FOOD DELIVERY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g., YESVEMBER: LIVE NOW"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="badge">Badge/Offer Text</Label>
                <Input
                  id="badge"
                  value={formData.badge}
                  onChange={(e) => setFormData(prev => ({ ...prev, badge: e.target.value }))}
                  placeholder="e.g., GET 65% OFF"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug * (unique identifier)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="e.g., food_delivery"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Module Image (optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" className="w-16 h-16 object-cover rounded" />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingModule ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subtitle</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module, index) => (
                <TableRow 
                  key={module.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  className={draggedIndex === index ? 'opacity-50' : ''}
                >
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    {module.image_url ? (
                      <img src={module.image_url} alt={module.title} className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
                        No img
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{module.title}</TableCell>
                  <TableCell>{module.subtitle || '-'}</TableCell>
                  <TableCell>{module.badge || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{module.slug}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${module.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {module.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(module)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(module.id)}>
                        <Trash2 className="h-4 w-4" />
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

export default Modules;
