import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Factory, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProductionEntry {
  id: string;
  item_name: string;
  batch_number: string;
  stock_quantity: number;
  manufacture_date: string;
  expiry_date: string | null;
  best_before: string | null;
  created_at: string;
}

const BEST_BEFORE_OPTIONS = Array.from({ length: 60 }, (_, i) => ({
  value: `${i + 1} month${i + 1 > 1 ? "s" : ""}`,
  label: `${i + 1} Month${i + 1 > 1 ? "s" : ""}`,
}));

const ProductionManagement = () => {
  const { hasPermission } = useAdminAuth();
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editEntry, setEditEntry] = useState<ProductionEntry | null>(null);
  const [itemName, setItemName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [bestBefore, setBestBefore] = useState("");
  const [dateMode, setDateMode] = useState<"expiry" | "bestbefore">("expiry");
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

  const todayStr = () => new Date().toISOString().split('T')[0];

  const openAdd = () => {
    setEditEntry(null);
    setItemName("");
    setBatchNumber("");
    setStockQuantity("");
    setManufactureDate(todayStr());
    setExpiryDate("");
    setBestBefore("");
    setDateMode("expiry");
    setOpen(true);
  };

  const openEdit = (entry: ProductionEntry) => {
    setEditEntry(entry);
    setItemName(entry.item_name);
    setBatchNumber(entry.batch_number);
    setStockQuantity(String(entry.stock_quantity));
    setManufactureDate(entry.manufacture_date || todayStr());
    setExpiryDate(entry.expiry_date || "");
    setBestBefore(entry.best_before || "");
    setDateMode(entry.best_before ? "bestbefore" : "expiry");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !batchNumber || !stockQuantity || !manufactureDate) {
      toast({ variant: "destructive", title: "Error", description: "Item name, batch number, stock quantity and manufacture date are required" });
      return;
    }

    const hasExpiry = dateMode === "expiry" && expiryDate;
    const hasBestBefore = dateMode === "bestbefore" && bestBefore;

    if (!hasExpiry && !hasBestBefore) {
      toast({ variant: "destructive", title: "Error", description: "Please provide either Expiry Date or Best Before" });
      return;
    }

    try {
      const payload: any = {
        item_name: itemName,
        batch_number: batchNumber,
        stock_quantity: Number(stockQuantity),
        manufacture_date: manufactureDate,
        expiry_date: hasExpiry ? expiryDate : null,
        best_before: hasBestBefore ? bestBefore : null,
      };

      if (editEntry) {
        const { error } = await supabase
          .from('production_entries' as any)
          .update(payload)
          .eq('id', editEntry.id);
        if (error) throw error;
        toast({ title: "Success", description: "Production entry updated" });
      } else {
        const { error } = await supabase
          .from('production_entries' as any)
          .insert(payload);
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

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : "-";

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
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editEntry ? "Edit Production Entry" : "New Production Entry"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Enter item name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input id="batchNumber" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Enter batch number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Stock Quantity</Label>
                  <Input id="stockQuantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="Enter stock quantity" min="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufactureDate">Manufacture Date</Label>
                  <Input id="manufactureDate" type="date" value={manufactureDate} onChange={(e) => setManufactureDate(e.target.value)} />
                </div>

                {/* Expiry / Best Before toggle */}
                <div className="space-y-2">
                  <Label>Expiry Info (any one required)</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant={dateMode === "expiry" ? "default" : "outline"} onClick={() => { setDateMode("expiry"); setBestBefore(""); }}>
                      Expiry Date
                    </Button>
                    <Button type="button" size="sm" variant={dateMode === "bestbefore" ? "default" : "outline"} onClick={() => { setDateMode("bestbefore"); setExpiryDate(""); }}>
                      Best Before
                    </Button>
                  </div>
                </div>

                {dateMode === "expiry" ? (
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} min={manufactureDate} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="bestBefore">Best Before</Label>
                    <Select value={bestBefore} onValueChange={setBestBefore}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {BEST_BEFORE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {editEntry ? "Update Entry" : "Add Entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Mfg Date</TableHead>
                    <TableHead>Exp / Best Before</TableHead>
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
                      <TableCell>{formatDate(entry.manufacture_date)}</TableCell>
                      <TableCell>
                        {entry.expiry_date
                          ? `Exp: ${formatDate(entry.expiry_date)}`
                          : entry.best_before
                            ? `BB: ${entry.best_before}`
                            : "-"}
                      </TableCell>
                      <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {hasPermission("production", "edit") && (
                          <Button size="icon" variant="ghost" onClick={() => openEdit(entry)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductionManagement;
