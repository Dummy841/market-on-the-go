import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import WholesaleProductModal from '@/components/WholesaleProductModal';
import WholesaleProductViewModal from '@/components/WholesaleProductViewModal';

interface WholesaleProduct {
  id: string;
  product_name: string;
  barcode: string;
  category: string | null;
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

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
}

const WholesaleInventory = () => {
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProduct, setEditProduct] = useState<WholesaleProduct | null>(null);
  const [viewProduct, setViewProduct] = useState<WholesaleProduct | null>(null);
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

  const filtered = products.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold">Wholesale Inventory</h1>
        <Button onClick={() => { setEditProduct(null); setShowAddModal(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.product_name}</TableCell>
                    <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
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
                        <Button size="icon" variant="ghost" onClick={() => { setEditProduct(product); setShowAddModal(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
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
