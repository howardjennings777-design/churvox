import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { UserPlus, Trash2, Phone, Mail, Shield } from "lucide-react";
import { toast } from "sonner";

export default function TeamPage() {
  const { isEmployer } = useAuth();
  const { get, post, del, loading } = useApi();
  const [workers, setWorkers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [deleteId, setDeleteId] = useState(null);

  const fetchWorkers = useCallback(async () => {
    const res = await get("/team/workers");
    if (res.success) setWorkers(res.data);
  }, [get]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await post("/team/workers", form);
    if (res.success) {
      toast.success(`${form.name} added to your team`);
      setForm({ name: "", email: "", password: "", phone: "" });
      setShowAdd(false);
      fetchWorkers();
    } else {
      toast.error(res.error || "Failed to add worker");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await del(`/team/workers/${deleteId}`);
    if (res.success) {
      toast.success("Worker removed");
      setDeleteId(null);
      fetchWorkers();
    } else {
      toast.error(res.error || "Failed to remove worker");
    }
  };

  if (!isEmployer) {
    return (
      <Layout>
        <div className="p-6">
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-8 text-center">
              <Shield className="mx-auto mb-3 text-churvox-muted" size={40} />
              <p className="text-churvox-muted">Only employers can manage team members.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="team-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="team-heading">Team</h1>
            <p className="text-sm text-churvox-muted mt-1">{workers.length} worker{workers.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="add-worker-button">
            <UserPlus size={16} className="mr-2" /> Add Worker
          </Button>
        </div>

        {workers.length === 0 && !loading ? (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-8 text-center">
              <UserPlus className="mx-auto mb-3 text-churvox-muted" size={40} />
              <p className="text-white font-medium">No team members yet</p>
              <p className="text-churvox-muted text-sm mt-1">Add workers to assign them to jobs</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {workers.map((w) => (
              <Card key={w.id} className="bg-churvox-card border-churvox-border" data-testid={`worker-card-${w.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-churvox-accent/20 flex items-center justify-center text-churvox-accent font-bold text-sm">
                      {w.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{w.name}</p>
                      <div className="flex items-center gap-3 text-xs text-churvox-muted mt-0.5">
                        <span className="flex items-center gap-1"><Mail size={12} /> {w.email}</span>
                        {w.phone && <span className="flex items-center gap-1"><Phone size={12} /> {w.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(w.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`delete-worker-${w.id}`}>
                    <Trash2 size={16} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Worker Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="add-worker-dialog">
            <DialogHeader>
              <DialogTitle className="text-white">Add Worker</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <Label className="text-churvox-muted">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" placeholder="Full name" data-testid="worker-name-input" />
              </div>
              <div>
                <Label className="text-churvox-muted">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" placeholder="email@example.com" data-testid="worker-email-input" />
              </div>
              <div>
                <Label className="text-churvox-muted">Temporary Password</Label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="bg-churvox-bg border-churvox-border text-white" placeholder="Min 6 characters" data-testid="worker-password-input" />
              </div>
              <div>
                <Label className="text-churvox-muted">Phone (optional)</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" placeholder="0400 000 000" data-testid="worker-phone-input" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="submit-worker-button">
                  {loading ? "Adding..." : "Add Worker"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="delete-worker-dialog">
            <DialogHeader>
              <DialogTitle className="text-white">Remove Worker</DialogTitle>
            </DialogHeader>
            <p className="text-churvox-muted">Are you sure you want to remove this worker? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)} className="border-churvox-border text-churvox-muted">Cancel</Button>
              <Button onClick={handleDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-delete-worker">
                {loading ? "Removing..." : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
