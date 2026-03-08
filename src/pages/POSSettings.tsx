import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Plus, Trash2, Check, Camera, Usb, ChevronRight } from 'lucide-react';
import SellerHamburgerMenu from '@/components/SellerHamburgerMenu';
import { useSellerAuth } from '@/contexts/SellerAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpiId {
  id: string;
  upi_id: string;
  label: string;
  is_default: boolean;
}

const POSSettings = () => {
  const { seller, loading } = useSellerAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upiIds, setUpiIds] = useState<UpiId[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [activeSection, setActiveSection] = useState<'menu' | 'payment' | 'scanner'>('menu');
  const [scannerPreference, setScannerPreference] = useState<'camera' | 'external'>(() => {
    return (localStorage.getItem('pos_scanner_pref') as 'camera' | 'external') || 'camera';
  });

  useEffect(() => {
    if (!loading && !seller) navigate('/seller-login');
  }, [seller, loading, navigate]);

  const fetchUpiIds = async () => {
    if (!seller) return;
    setLoadingData(true);
    const { data } = await supabase
      .from('seller_upi_ids')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: true });
    setUpiIds((data as any[]) || []);
    setLoadingData(false);
  };

  useEffect(() => {
    if (seller) fetchUpiIds();
  }, [seller]);

  const handleAddUpi = async () => {
    if (!seller || !newUpiId.trim()) {
      toast({ variant: 'destructive', title: 'UPI ID is required' });
      return;
    }
    const isFirst = upiIds.length === 0;
    const { error } = await supabase.from('seller_upi_ids').insert({
      seller_id: seller.id,
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

  const handleScannerPref = (pref: 'camera' | 'external') => {
    setScannerPreference(pref);
    localStorage.setItem('pos_scanner_pref', pref);
    toast({ title: `Default scanner set to ${pref === 'camera' ? 'Camera' : 'External'}` });
  };

  if (loading || !seller) return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-3">
        <div className="flex items-center gap-3">
          <SellerHamburgerMenu />
          <h1 className="text-lg font-bold flex-1">POS Settings</h1>
        </div>
      </header>

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {activeSection === 'menu' && (
          <div className="space-y-3">
            <button
              className="w-full p-4 rounded-lg border border-border hover:bg-accent flex items-center gap-3 text-left transition-colors"
              onClick={() => setActiveSection('payment')}
            >
              <CreditCard className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <div className="font-semibold">Payment Settings</div>
                <div className="text-sm text-muted-foreground">Manage UPI IDs for receiving payments</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              className="w-full p-4 rounded-lg border border-border hover:bg-accent flex items-center gap-3 text-left transition-colors"
              onClick={() => setActiveSection('scanner')}
            >
              <Camera className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <div className="font-semibold">Barcode Scanner</div>
                <div className="text-sm text-muted-foreground">Choose camera or external scanner</div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        )}

        {activeSection === 'payment' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveSection('menu')}>
              ← Back
            </Button>

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Your UPI IDs</h3>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add UPI ID
              </Button>
            </div>

            {showAdd && (
              <div className="p-4 border border-border rounded-lg space-y-3 bg-card">
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

            {loadingData ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : upiIds.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No UPI IDs added yet</p>
                <p className="text-xs">Add a UPI ID to receive payments via QR code</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upiIds.map(upi => (
                  <div
                    key={upi.id}
                    className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                      upi.is_default ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{upi.upi_id}</div>
                      <div className="text-xs text-muted-foreground">{upi.label}</div>
                    </div>
                    {upi.is_default ? (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" /> Default
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleSetDefault(upi.id)}>
                        Set Default
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(upi.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'scanner' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveSection('menu')}>
              ← Back
            </Button>

            <h3 className="font-semibold text-lg">Barcode Scanner</h3>
            <p className="text-sm text-muted-foreground">Choose your default scanning method for POS</p>

            <div className="space-y-3">
              <button
                className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 text-left transition-colors ${
                  scannerPreference === 'camera' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
                onClick={() => handleScannerPref('camera')}
              >
                <Camera className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">Camera Scanner</div>
                  <div className="text-sm text-muted-foreground">Use your device camera to scan barcodes</div>
                </div>
                {scannerPreference === 'camera' && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>

              <button
                className={`w-full p-4 rounded-lg border-2 flex items-center gap-4 text-left transition-colors ${
                  scannerPreference === 'external' ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}
                onClick={() => handleScannerPref('external')}
              >
                <Usb className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <div className="font-semibold">External Scanner</div>
                  <div className="text-sm text-muted-foreground">Connect USB or Bluetooth barcode scanner</div>
                </div>
                {scannerPreference === 'external' && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2 mt-4">
              <p className="font-medium text-foreground">Tips:</p>
              <p>• <strong>Camera:</strong> Point your device camera at the barcode. Works on mobile and desktop.</p>
              <p>• <strong>External:</strong> Plug in a USB scanner or pair a Bluetooth scanner. Barcodes are read as keyboard input.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default POSSettings;
