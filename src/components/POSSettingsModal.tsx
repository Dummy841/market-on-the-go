import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Plus, Trash2, Check, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpiId {
  id: string;
  upi_id: string;
  label: string;
  is_default: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: string;
}

const POSSettingsModal = ({ open, onOpenChange, sellerId }: Props) => {
  const { toast } = useToast();
  const [upiIds, setUpiIds] = useState<UpiId[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [activeSection, setActiveSection] = useState<'menu' | 'payment'>('menu');

  const fetchUpiIds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('seller_upi_ids')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: true });
    setUpiIds((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open && sellerId) {
      fetchUpiIds();
      setActiveSection('menu');
    }
  }, [open, sellerId]);

  const handleAddUpi = async () => {
    if (!newUpiId.trim()) {
      toast({ variant: 'destructive', title: 'UPI ID is required' });
      return;
    }
    const isFirst = upiIds.length === 0;
    const { error } = await supabase.from('seller_upi_ids').insert({
      seller_id: sellerId,
      upi_id: newUpiId.trim(),
      label: newLabel.trim() || 'Primary',
      is_default: isFirst,
    });
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }
    toast({ title: 'UPI ID added' });
    setNewUpiId('');
    setNewLabel('');
    setShowAdd(false);
    fetchUpiIds();
  };

  const handleSetDefault = async (id: string) => {
    await supabase.from('seller_upi_ids').update({ is_default: true }).eq('id', id);
    fetchUpiIds();
    toast({ title: 'Default UPI updated' });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('seller_upi_ids').delete().eq('id', id);
    fetchUpiIds();
    toast({ title: 'UPI ID removed' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            POS Settings
          </DialogTitle>
        </DialogHeader>

        {activeSection === 'menu' && (
          <div className="space-y-2">
            <button
              className="w-full p-4 rounded-lg border border-border hover:bg-accent flex items-center gap-3 text-left transition-colors"
              onClick={() => setActiveSection('payment')}
            >
              <CreditCard className="w-6 h-6 text-primary" />
              <div>
                <div className="font-semibold">Payment Settings</div>
                <div className="text-sm text-muted-foreground">Manage UPI IDs for receiving payments</div>
              </div>
            </button>
          </div>
        )}

        {activeSection === 'payment' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveSection('menu')}>
              ← Back
            </Button>

            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your UPI IDs</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add UPI ID
              </Button>
            </div>

            {showAdd && (
              <div className="p-3 border border-border rounded-lg space-y-3">
                <div>
                  <Label className="text-xs">UPI ID *</Label>
                  <Input
                    placeholder="yourname@upi"
                    value={newUpiId}
                    onChange={e => setNewUpiId(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input
                    placeholder="e.g. Business, Personal"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddUpi} className="flex-1">Add</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewUpiId(''); setNewLabel(''); }}>Cancel</Button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : upiIds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No UPI IDs added yet</p>
                <p className="text-xs">Add a UPI ID to receive payments via QR code</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upiIds.map(upi => (
                  <div
                    key={upi.id}
                    className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                      upi.is_default ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{upi.upi_id}</div>
                      <div className="text-xs text-muted-foreground">{upi.label}</div>
                    </div>
                    {upi.is_default ? (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Default
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleSetDefault(upi.id)}>
                        Set Default
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(upi.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default POSSettingsModal;
