import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Bold, AArrowUp, AArrowDown } from "lucide-react";

interface PolicyItem {
  id: string;
  content: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const PrivacyPolicy = () => {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
  const [content, setContent] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchPolicies = async () => {
    const { data, error } = await supabase
      .from("privacy_policy")
      .select("*")
      .order("display_order", { ascending: true });
    if (!error && data) setPolicies(data);
    setLoading(false);
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleSave = async () => {
    if (!content.trim()) { toast({ title: "Error", description: "Content is required", variant: "destructive" }); return; }
    setSaving(true);
    if (editingPolicy) {
      const { error } = await supabase.from("privacy_policy").update({ content, display_order: displayOrder, updated_at: new Date().toISOString() }).eq("id", editingPolicy.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Updated" });
    } else {
      const { error } = await supabase.from("privacy_policy").insert({ content, display_order: displayOrder });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Added" });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditingPolicy(null);
    setContent("");
    setDisplayOrder(0);
    fetchPolicies();
  };

  const handleEdit = (policy: PolicyItem) => {
    setEditingPolicy(policy);
    setContent(policy.content);
    setDisplayOrder(policy.display_order);
    setDialogOpen(true);
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await supabase.from("privacy_policy").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
    fetchPolicies();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy point?")) return;
    await supabase.from("privacy_policy").delete().eq("id", id);
    fetchPolicies();
    toast({ title: "Deleted" });
  };

  const toggleBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) {
      toast({ title: "Select text first", description: "Highlight the text you want to bold", variant: "destructive" });
      return;
    }
    const selected = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);
    const isWrapped = before.endsWith("**") && after.startsWith("**");
    let newContent: string;
    let newStart: number;
    let newEnd: number;
    if (isWrapped) {
      newContent = before.slice(0, -2) + selected + after.slice(2);
      newStart = start - 2;
      newEnd = end - 2;
    } else {
      newContent = before + `**${selected}**` + after;
      newStart = start + 2;
      newEnd = end + 2;
    }
    setContent(newContent);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <Button onClick={() => { setEditingPolicy(null); setContent(""); setDisplayOrder(policies.length); setFontSize(14); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Add Point
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : policies.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No privacy policy points added yet.</p>
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
              {policies.map((policy, idx) => (
                <TableRow key={policy.id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="max-w-md"><p className="line-clamp-2">{policy.content}</p></TableCell>
                  <TableCell>
                    <Switch checked={policy.is_active} onCheckedChange={(v) => handleToggle(policy.id, v)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(policy)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(policy.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!max-w-full !w-full !h-full !max-h-full !rounded-none m-0 p-0 flex flex-col">
          <div className="p-6 pb-0 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingPolicy ? "Edit Point" : "Add Point"}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-auto p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Content</Label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={toggleBold} title="Bold selected text">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.max(10, fontSize - 1))}>
                    <AArrowDown className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground w-8 text-center">{fontSize}</span>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(Math.min(24, fontSize + 1))}>
                    <AArrowUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter privacy policy text. Select text and click B to bold."
                rows={12}
                style={{ fontSize: `${fontSize}px` }}
                className="min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Display Order</Label>
              <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="p-6 pt-3 flex-shrink-0 border-t">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingPolicy ? "Update" : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacyPolicy;
