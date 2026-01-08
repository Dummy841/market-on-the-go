import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { CheckCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Settlement {
  id: string;
  seller_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
  seller_name?: string;
  status: "pending" | "settled";
}

const Settlements = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "settled">("pending");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [pendingCount, setPendingCount] = useState(0);
  const [settledCount, setSettledCount] = useState(0);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettlements();
  }, [filter, dateFilter]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      // Fetch all withdrawal transactions
      let query = supabase
        .from("seller_wallet_transactions")
        .select("*")
        .eq("type", "withdrawal")
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

      // Fetch seller names
      const sellerIds = [...new Set(data?.map((t) => t.seller_id) || [])];
      const { data: sellers } = await supabase
        .from("sellers")
        .select("id, seller_name")
        .in("id", sellerIds);

      const sellerMap = new Map(sellers?.map((s) => [s.id, s.seller_name]));

      // Process settlements with status
      const processedSettlements: Settlement[] = (data || []).map((t) => ({
        ...t,
        seller_name: sellerMap.get(t.seller_id) || "Unknown",
        status: t.description.includes("Pending") ? "pending" : "settled",
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

  const handleMarkAsSettled = async (settlement: Settlement) => {
    setProcessingId(settlement.id);
    try {
      // Update the description to mark as settled
      const newDescription = settlement.description.replace("Pending", "Settled");
      
      const { error } = await supabase
        .from("seller_wallet_transactions")
        .update({ description: newDescription })
        .eq("id", settlement.id);

      if (error) throw error;

      toast.success("Settlement marked as completed");
      fetchSettlements();
    } catch (error) {
      console.error("Error updating settlement:", error);
      toast.error("Failed to update settlement");
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Math.abs(amount));
  };

  return (
    <div className="space-y-6">
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
          <CardTitle className="flex items-center gap-2">
            {filter === "pending" ? (
              <Clock className="h-5 w-5 text-orange-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {filter === "pending" ? "Pending Withdrawals" : "Settled Withdrawals"}
          </CardTitle>
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
                  <TableHead>Seller</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {filter === "pending" && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <TableRow key={settlement.id}>
                    <TableCell className="font-medium">
                      {settlement.seller_name}
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
                    <TableCell className="text-muted-foreground">
                      {format(new Date(settlement.created_at), "dd MMM yyyy, hh:mm a")}
                    </TableCell>
                    {filter === "pending" && (
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsSettled(settlement)}
                          disabled={processingId === settlement.id}
                        >
                          {processingId === settlement.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Mark Settled"
                          )}
                        </Button>
                      </TableCell>
                    )}
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
