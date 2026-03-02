import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Printer, Trash2, MoreVertical, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import EditItemModal from './EditItemModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import JsBarcode from 'jsbarcode';

interface Item {
  id: string;
  item_name: string;
  item_photo_url?: string;
  seller_price: number;
  franchise_price: number;
  is_active?: boolean;
  item_info?: string | null;
  created_at: string;
  subcategory_id?: string | null;
  barcode?: string | null;
  purchase_price?: number;
  mrp?: number;
  stock_quantity?: number;
  low_stock_alert?: number;
  gst_percentage?: number;
  show_in_quick_add?: boolean;
}

type StockFilter = 'all' | 'in' | 'low' | 'out';

const MyMenu = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const { toast } = useToast();
  const { seller } = useSellerAuth();

  useEffect(() => {
    if (seller) {
      fetchItems();
      fetchCategories();
    }
  }, [seller]);

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('subcategories').select('id, name').eq('is_active', true).order('name');
      setCategories(data || []);
    } catch (e) { console.error(e); }
  };

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('seller_id', seller?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch items" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: Item) => {
    try {
      const { error } = await supabase.from('items').delete().eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "Deleted", description: `${item.item_name} has been deleted` });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete item" });
    } finally {
      setDeleteItem(null);
    }
  };

  const handlePrintBarcode = (item: Item) => {
    if (!item.barcode) {
      toast({ variant: "destructive", title: "No Barcode", description: "This item has no barcode" });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const canvas = document.createElement('canvas');
    try {
      JsBarcode(canvas, item.barcode, { format: 'CODE128', width: 2, height: 60, displayValue: true, fontSize: 14 });
    } catch { return; }

    printWindow.document.write(`
      <html><head><title>Barcode - ${item.item_name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0}
      .label{text-align:center;padding:10px}.name{font-weight:bold;font-size:14px;margin-bottom:4px}
      .prices{font-size:12px;color:#666;margin-bottom:8px}
      @media print{button{display:none}}</style></head><body>
      <div class="label">
        <div class="name">${item.item_name}</div>
        <div class="prices">MRP: ₹${item.mrp || 0} | Selling: ₹${item.seller_price}</div>
        <img src="${canvas.toDataURL()}" />
      </div>
      <button onclick="window.print()" style="margin-top:20px;padding:8px 24px;cursor:pointer">Print</button>
      </body></html>
    `);
    printWindow.document.close();
  };

  const getStockStatus = (item: Item) => {
    const qty = item.stock_quantity ?? 0;
    const alert = item.low_stock_alert ?? 5;
    if (qty <= 0) return 'out';
    if (qty <= alert) return 'low';
    return 'in';
  };

  const filtered = items.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || item.item_name.toLowerCase().includes(q) || (item.barcode || '').toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'all' || item.subcategory_id === categoryFilter;
    const matchesStock = stockFilter === 'all' || getStockStatus(item) === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const stats = {
    total: items.length,
    categories: new Set(items.map(i => i.subcategory_id).filter(Boolean)).size,
    low: items.filter(i => getStockStatus(i) === 'low').length,
    out: items.filter(i => getStockStatus(i) === 'out').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><div className="text-lg">Loading menu...</div></div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-muted-foreground">No items added yet</h3>
        <p className="text-sm text-muted-foreground mt-2">Add your first item to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Products</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold">{stats.categories}</p>
        </div>
        <div className="border rounded-lg p-3 border-yellow-300">
          <p className="text-xs text-muted-foreground">Low Stock</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.low}</p>
        </div>
        <div className="border rounded-lg p-3 border-red-300">
          <p className="text-xs text-muted-foreground">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{stats.out}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or barcode..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          {(['all', 'in', 'low', 'out'] as StockFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${stockFilter === f ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              {f === 'in' ? 'In' : f === 'low' ? 'Low' : f === 'out' ? 'Out' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-md border">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Products</h3>
          <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} products</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Purchase</TableHead>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">Selling</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.barcode || '—'}</p>
                        {item.show_in_quick_add && (
                          <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0">Quick Add</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">₹{(item.purchase_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{(item.mrp ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">₹{item.seller_price}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{item.stock_quantity ?? 0}</span>
                        <Badge
                          variant={status === 'in' ? 'default' : 'secondary'}
                          className={`text-[10px] px-1.5 py-0 ${
                            status === 'in' ? 'bg-green-600 hover:bg-green-700' :
                            status === 'low' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                            'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                        >
                          {status === 'in' ? 'In Stock' : status === 'low' ? 'Low' : 'Out'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.gst_percentage ?? 0}%</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card">
                          <DropdownMenuItem onClick={() => { setEditingItem(item); setShowEditModal(true); }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintBarcode(item)}>
                            <Printer className="mr-2 h-4 w-4" /> Print Barcode
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteItem(item)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <EditItemModal open={showEditModal} onOpenChange={setShowEditModal} item={editingItem} onSuccess={fetchItems} />

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteItem?.item_name}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteItem && handleDelete(deleteItem)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyMenu;
