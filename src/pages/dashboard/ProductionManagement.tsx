import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Factory, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProductionEntry {
  id: string;
  item_name: string;
  batch_number: string;
  stock_quantity: number;
  created_at: string;
}

const ProductionManagement = () => {
  const { hasPermission } = useAdminAuth();
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<ProductionEntry | null>(null);
  const [itemName, setItemName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('production_entries' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries((data as any) || []);
    } catch (error) {
      console.error('Error fetching production entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditEntry(null);
    setItemName("");
    setBatchNumber("");
    setStockQuantity("");
    setOpen(true);
  };

  const openEdit = (entry: ProductionEntry) => {
    setEditEntry(entry);
    setItemName(entry.item_name);
    setBatchNumber(entry.batch_number);
    setStockQuantity(String(entry.stock_quantity));
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !batchNumber || !stockQuantity) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required" });
      return;
    }

    try {
      if (editEntry) {
        const { error } = await supabase
          .from('production_entries' as any)
          .update({
            item_name: itemName,
            batch_number: batchNumber,
            stock_quantity: Number(stockQuantity),
          } as any)
          .eq('id', editEntry.id);
        if (error) throw error;
        toast({ title: "Success", description: "Production entry updated" });
      } else {
        const { error } = await supabase
          .from('production_entries' as any)
          .insert({
            item_name: itemName,
            batch_number: batchNumber,
            stock_quantity: Number(stockQuantity),
          } as any);
        if (error) throw error;
        toast({ title: "Success", description: "Production entry added" });
      }

      setOpen(false);
      setEditEntry(null);
      fetchEntries();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Production Management</h2>
          <p className="text-muted-foreground text-sm">Manage production entries and batches</p>
        </div>
        {hasPermission("production", "create") && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditEntry(null); }}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                New Entry
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editEntry ? "Edit Production Entry" : "New Production Entry"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input
                  id="batchNumber"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Enter batch number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Enter stock quantity"
                  min="0"
                />
              </div>
              <Button type="submit" className="w-full">
                {editEntry ? "Update Entry" : "Add Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Factory className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No production entries yet.</p>
              <p className="text-sm">Click "New Entry" to add one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Stock Quantity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.item_name}</TableCell>
                    <TableCell>{entry.batch_number}</TableCell>
                    <TableCell>{entry.stock_quantity}</TableCell>
                    <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(entry)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionManagement;
