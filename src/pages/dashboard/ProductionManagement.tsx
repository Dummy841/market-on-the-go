import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Factory } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductionEntry {
  id: string;
  itemName: string;
  batchNumber: string;
  stockQuantity: number;
  createdAt: string;
}

const ProductionManagement = () => {
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !batchNumber || !stockQuantity) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required" });
      return;
    }

    const newEntry: ProductionEntry = {
      id: crypto.randomUUID(),
      itemName,
      batchNumber,
      stockQuantity: Number(stockQuantity),
      createdAt: new Date().toISOString(),
    };

    setEntries(prev => [newEntry, ...prev]);
    setItemName("");
    setBatchNumber("");
    setStockQuantity("");
    setOpen(false);
    toast({ title: "Success", description: "Production entry added successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Production Management</h2>
          <p className="text-muted-foreground text-sm">Manage production entries and batches</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Production Entry</DialogTitle>
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
              <Button type="submit" className="w-full">Add Entry</Button>
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
          {entries.length === 0 ? (
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.itemName}</TableCell>
                    <TableCell>{entry.batchNumber}</TableCell>
                    <TableCell>{entry.stockQuantity}</TableCell>
                    <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
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
