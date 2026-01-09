import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CheckCircle, Clock, Loader2, Upload, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Settlement {
  id: string;
  seller_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  seller_name?: string;
  seller_display_id?: string;
  status: "pending" | "settled";
  receipt_url?: string | null;
}

const Settlements = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "settled">("pending");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [pendingCount, setPendingCount] = useState(0);
  const [settledCount, setSettledCount] = useState(0);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settlingAll, setSettlingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettlements();
  }, [filter, dateFilter]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [filter]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      // Fetch all withdrawal transactions
      let query = supabase
        .from("seller_wallet_transactions")
        .select("*")
        .eq("type", "debit")
        .order("created_at", { ascending: false });

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte("created_at", startOfDay.toISOString())
          .lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch seller names and seller_id
      const sellerIds = [...new Set(data?.map((t) => t.seller_id) || [])];
      const { data: sellers } = await supabase
        .from("sellers")
        .select("id, seller_name, seller_id")
        .in("id", sellerIds);

      const sellerMap = new Map(sellers?.map((s) => [s.id, { name: s.seller_name, displayId: s.seller_id }]));

      // Process settlements with status based on description
      const processedSettlements: Settlement[] = (data || []).map((t: any) => ({
        ...t,
        seller_name: sellerMap.get(t.seller_id)?.name || "Unknown",
        seller_display_id: sellerMap.get(t.seller_id)?.displayId || "-",
        status: t.description.includes("Pending") ? "pending" : "settled",
        receipt_url: t.receipt_url || null,
      }));

      // Count pending and settled
      const pending = processedSettlements.filter((s) => s.status === "pending");
      const settled = processedSettlements.filter((s) => s.status === "settled");
      
      setPendingCount(pending.length);
      setSettledCount(settled.length);

      // Filter by status
      const filteredSettlements = processedSettlements.filter(
        (s) => s.status === filter
      );
      setSettlements(filteredSettlements);
    } catch (error) {
      console.error("Error fetching settlements:", error);
      toast.error("Failed to fetch settlements");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(settlements.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleSettleAll = async () => {
    if (selectedIds.length === 0) return;
    
    setSettlingAll(true);
    try {
      // Update all selected settlements to "Settled" status
      for (const id of selectedIds) {
        const settlement = settlements.find(s => s.id === id);
        if (settlement) {
          const newDescription = settlement.description.replace("Pending", "Settled");
          await supabase
            .from("seller_wallet_transactions")
            .update({ description: newDescription })
            .eq("id", id);
        }
      }
      
      toast.success(`${selectedIds.length} settlement(s) marked as settled`);
      setSelectedIds([]);
      fetchSettlements();
    } catch (error) {
      console.error("Error settling all:", error);
      toast.error("Failed to settle selected items");
    } finally {
      setSettlingAll(false);
    }
  };

  const handleUploadReceipt = (settlement: Settlement) => {
    setSelectedSettlementId(settlement.id);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSettlementId) return;

    setUploadingId(selectedSettlementId);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedSettlementId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('settlement-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('settlement-receipts')
        .getPublicUrl(fileName);

      // Update receipt_url
      const { error } = await supabase
        .from("seller_wallet_transactions")
        .update({ receipt_url: publicUrl })
        .eq("id", selectedSettlementId);

      if (error) throw error;

      toast.success("Receipt uploaded successfully");
      fetchSettlements();
    } catch (error) {
      console.error("Error uploading receipt:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setUploadingId(null);
      setSelectedSettlementId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Math.abs(amount));
  };

  const allSelected = settlements.length > 0 && selectedIds.length === settlements.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < settlements.length;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,.pdf"
        onChange={handleFileUpload}
      />
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Seller Settlements</h2>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="w-48"
          placeholder="Filter by date"
        />
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 gap-4 max-w-md">
        <Card 
          className={`cursor-pointer transition-all ${
            filter === "pending" 
              ? "ring-2 ring-primary border-primary" 
              : "hover:shadow-md"
          }`}
          onClick={() => setFilter("pending")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-foreground">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            filter === "settled" 
              ? "ring-2 ring-primary border-primary" 
              : "hover:shadow-md"
          }`}
          onClick={() => setFilter("settled")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Settled</p>
              <p className="text-xl font-bold text-foreground">{settledCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {filter === "pending" ? (
                <Clock className="h-5 w-5 text-orange-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {filter === "pending" ? "Pending Withdrawals" : "Settled Withdrawals"}
            </CardTitle>
            {filter === "pending" && selectedIds.length > 0 && (
              <Button 
                onClick={handleSettleAll} 
                disabled={settlingAll}
                size="sm"
              >
                {settlingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Settle All ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No {filter} settlements found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {filter === "pending" && (
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  <TableHead>Seller ID</TableHead>
                  <TableHead>Seller Name</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{filter === "pending" ? "Action" : "Receipt"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    {filter === "pending" && (
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(settlement.id)}
                          onCheckedChange={(checked) => handleSelectOne(settlement.id, !!checked)}
                          aria-label={`Select ${settlement.seller_name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">
                      {settlement.seller_display_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {settlement.seller_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(settlement.created_at), "dd MMM yyyy, hh:mm a")}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {formatCurrency(settlement.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={settlement.status === "pending" ? "secondary" : "default"}
                        className={
                          settlement.status === "pending"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }
                      >
                        {settlement.status === "pending" ? "Pending" : "Settled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {filter === "pending" ? (
                        <span className="text-xs text-muted-foreground">
                          Use "Settle All" button
                        </span>
                      ) : (
                        settlement.receipt_url ? (
                          <a 
                            href={settlement.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {settlement.receipt_url.includes('.pdf') ? (
                              <FileText className="h-4 w-4" />
                            ) : (
                              <ImageIcon className="h-4 w-4" />
                            )}
                            View
                          </a>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUploadReceipt(settlement)}
                            disabled={uploadingId === settlement.id}
                          >
                            {uploadingId === settlement.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1" />
                            )}
                            Upload
                          </Button>
                        )
                      )}
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

export default Settlements;