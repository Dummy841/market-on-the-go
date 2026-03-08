import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Pencil, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import WholesaleProductModal from '@/components/WholesaleProductModal';
import WholesaleProductViewModal from '@/components/WholesaleProductViewModal';
import JsBarcode from 'jsbarcode';

interface WholesaleProduct {
  id: string;
  product_name: string;
  barcode: string;
  category: string | null;
  batch_number: string | null;
  purchase_price: number;
  mrp: number;
  selling_price: number;
  stock_quantity: number;
  low_stock_alert: number;
  gst_percentage: number;
  show_in_quick_add: boolean;
  is_active: boolean;
  created_at: string;
}

const WholesaleInventory = () => {
  const { hasPermission } = useAdminAuth();
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<WholesaleProduct | null>(null);
  const [viewProduct, setViewProduct] = useState<WholesaleProduct | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wholesale_products' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts((data as any) || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch products' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search);
    if (!matchesSearch) return false;
    if (stockFilter === 'out') return p.stock_quantity === 0;
    if (stockFilter === 'low') return p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_alert;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const printBarcodes = () => {
    const selected = products.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: 'No products selected', description: 'Please select products to print barcodes' });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeHtml = selected.map(product => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, product.barcode, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 5,
        });
      } catch {
        JsBarcode(canvas, product.barcode, { format: 'CODE128', width: 2, height: 60 });
      }
      const barcodeDataUrl = canvas.toDataURL('image/png');

      return `
        <div class="barcode-card">
          <div class="product-name">${product.product_name}</div>
          <img src="${barcodeDataUrl}" class="barcode-img" />
          <div class="price-row">
            <span class="mrp">MRP: ₹${product.mrp}</span>
            <span class="selling">Price: ₹${product.selling_price}</span>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Barcodes</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 10px; }
          .barcode-grid { display: flex; flex-wrap: wrap; gap: 8px; }
          .barcode-card {
            border: 1px dashed #ccc;
            padding: 8px;
            width: 220px;
            text-align: center;
            page-break-inside: avoid;
          }
          .product-name { font-weight: bold; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; }
          .barcode-img { width: 200px; height: auto; }
          .price-row { display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px; }
          .mrp { color: #888; text-decoration: line-through; }
          .selling { font-weight: bold; color: #000; }
          @media print {
            body { padding: 0; }
            .barcode-card { border: 1px dashed #999; }
          }
        </style>
      </head>
      <body>
        <div class="barcode-grid">${barcodeHtml}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold">Wholesale Inventory</h1>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={printBarcodes}>
              <Printer className="w-4 h-4 mr-2" /> Print Barcodes ({selectedIds.size})
            </Button>
          )}
          {hasPermission("wholesale_inventory", "create") && (
            <Button onClick={() => { setEditProduct(null); setShowAddModal(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Product
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'low', 'out'] as const).map(f => (
            <Button
              key={f}
              variant={stockFilter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStockFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Batch No</TableHead>
                <TableHead>MRP</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelect(product.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                    <TableCell>{product.batch_number || '-'}</TableCell>
                    <TableCell>₹{product.mrp}</TableCell>
                    <TableCell>₹{product.selling_price}</TableCell>
                    <TableCell>
                      <span className={product.stock_quantity <= product.low_stock_alert ? 'text-destructive font-bold' : ''}>
                        {product.stock_quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? 'default' : 'secondary'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setViewProduct(product)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {hasPermission("wholesale_inventory", "edit") && (
                          <Button size="icon" variant="ghost" onClick={() => { setEditProduct(product); setShowAddModal(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {showAddModal && (
        <WholesaleProductModal
          open={showAddModal}
          onClose={() => { setShowAddModal(false); setEditProduct(null); }}
          product={editProduct}
          onSaved={fetchProducts}
        />
      )}

      {viewProduct && (
        <WholesaleProductViewModal
          open={!!viewProduct}
          onClose={() => setViewProduct(null)}
          product={viewProduct}
        />
      )}
    </div>
  );
};

export default WholesaleInventory;
