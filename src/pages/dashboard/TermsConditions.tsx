import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface TermItem {
  id: string;
  content: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const TermsConditions = () => {
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<TermItem | null>(null);
  const [content, setContent] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchTerms = async () => {
    const { data, error } = await supabase
      .from("terms_conditions")
      .select("*")
      .order("display_order", { ascending: true });
    if (!error && data) setTerms(data);
    setLoading(false);
  };

  useEffect(() => { fetchTerms(); }, []);

  const handleSave = async () => {
    if (!content.trim()) { toast({ title: "Error", description: "Content is required", variant: "destructive" }); return; }
    setSaving(true);
    if (editingTerm) {
      const { error } = await supabase.from("terms_conditions").update({ content, display_order: displayOrder, updated_at: new Date().toISOString() }).eq("id", editingTerm.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("terms_conditions").insert({ content, display_order: displayOrder });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Added" });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingTerm(null);
    setContent("");
    setDisplayOrder(0);
    fetchTerms();
  };

  const handleEdit = (term: TermItem) => {
    setEditingTerm(term);
    setContent(term.content);
    setDisplayOrder(term.display_order);
    setDialogOpen(true);
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase.from("terms_conditions").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
    fetchTerms();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this term?")) return;
    await supabase.from("terms_conditions").delete().eq("id", id);
    fetchTerms();
    toast({ title: "Deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Terms & Conditions</h1>
        <Button onClick={() => { setEditingTerm(null); setContent(""); setDisplayOrder(terms.length); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Term
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : terms.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No terms added yet.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Content</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term, idx) => (
                <TableRow key={term.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="max-w-md"><p className="line-clamp-2">{term.content}</p></TableCell>
                  <TableCell>
                    <Switch checked={term.is_active} onCheckedChange={(v) => handleToggle(term.id, v)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(term)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(term.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerm ? "Edit Term" : "Add Term"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter term/condition text" rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTerm ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TermsConditions;
