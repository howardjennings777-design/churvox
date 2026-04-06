import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { MessageSquare, CreditCard, AlertTriangle, Send, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "../lib/utils";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { UpgradePrompt } from "../components/UpgradePrompt";

const PACKS = [
  { id: "100", credits: 100, price: 10 },
  { id: "500", credits: 500, price: 45 },
  { id: "1000", credits: 1000, price: 80 },
];

const MSG_TYPES = [
  { value: "customer_reminder", label: "Customer Reminder" },
  { value: "on_the_way", label: "On the Way" },
  { value: "invoice_reminder", label: "Invoice Reminder" },
];

export default function SMSPage() {
  const { isEmployer } = useAuth();
  const { get, post, loading } = useApi();
  const { isFeatureEnabled } = usePlanLimits();
  const [balance, setBalance] = useState(0);
  const [lowCredit, setLowCredit] = useState(false);
  const [history, setHistory] = useState([]);
  const [showSend, setShowSend] = useState(false);
  const [showBuy, setShowBuy] = useState(false);
  const [sendForm, setSendForm] = useState({ recipient_phone: "", message_type: "customer_reminder", job_id: "", invoice_id: "" });
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const fetchData = useCallback(async () => {
    const [balRes, histRes] = await Promise.all([get("/sms/balance"), get("/sms/history")]);
    if (balRes.success) { setBalance(balRes.data.balance); setLowCredit(balRes.data.low_credit); }
    if (histRes.success) setHistory(histRes.data);
  }, [get]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openSendDialog = async () => {
    const [jRes, iRes] = await Promise.all([get("/jobs"), get("/invoices")]);
    if (jRes.success) setJobs(jRes.data);
    if (iRes.success) setInvoices(iRes.data);
    setShowSend(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const payload = { ...sendForm, phone: sendForm.phone || sendForm.phone_number || sendForm.client_phone || job?.client_phone || client?.phone || client?.phone_number || "" };
    if (!payload.job_id) delete payload.job_id;
    if (!payload.invoice_id) delete payload.invoice_id;
    const res = await post("/sms/send-fixed", payload);
    if (res.success) {
      toast.success("SMS sent");
      setShowSend(false);
      setSendForm({ recipient_phone: "", message_type: "customer_reminder", job_id: "", invoice_id: "" });
      fetchData();
    } else toast.error(res.error || "Failed to send SMS");
  };

  const handleBuy = async (packId) => {
    const res = await post("/sms/buy-credits", { pack: packId });
    if (res.success) {
      toast.success(res.data.message);
      setBalance(res.data.balance);
      setLowCredit(res.data.balance < 20);
      setShowBuy(false);
    } else toast.error(res.error || "Failed to buy credits");
  };

  if (!isFeatureEnabled("sms")) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <UpgradePrompt feature="sms" message="SMS notifications require a Team plan or higher." />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="sms-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="sms-heading">SMS</h1>
            <p className="text-sm text-churvox-muted mt-1">Send reminders and messages to clients</p>
          </div>
          {isEmployer && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBuy(true)} className="border-churvox-border text-churvox-muted hover:text-white" data-testid="buy-credits-button">
                <CreditCard size={14} className="mr-2" /> Buy Credits
              </Button>
              <Button onClick={openSendDialog} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="send-sms-button">
                <Send size={14} className="mr-2" /> Send SMS
              </Button>
            </div>
          )}
        </div>

        {/* Balance Card */}
        <Card className={`border ${lowCredit ? "bg-yellow-900/20 border-yellow-500/30" : "bg-churvox-card border-churvox-border"}`} data-testid="sms-balance-card">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${lowCredit ? "bg-yellow-500/20 text-yellow-400" : "bg-churvox-accent/20 text-churvox-accent"}`}>
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white" data-testid="sms-balance-value">{balance}</p>
                <p className="text-sm text-churvox-muted">SMS credits remaining</p>
              </div>
            </div>
            {lowCredit && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm" data-testid="low-credit-warning">
                <AlertTriangle size={16} /> Low credits
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Packs */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Credit Packs</h2>
          <div className="grid grid-cols-3 gap-3" data-testid="credit-packs">
            {PACKS.map((pack) => (
              <Card key={pack.id} className="bg-churvox-card border-churvox-border hover:border-churvox-accent/50 transition-all cursor-pointer" data-testid={`pack-${pack.id}`}>
                <CardContent className="p-4 text-center" onClick={() => handleBuy(pack.id)}>
                  <p className="text-2xl font-bold text-white">{pack.credits}</p>
                  <p className="text-xs text-churvox-muted">credits</p>
                  <p className="text-lg font-semibold text-churvox-accent mt-2">{formatCurrency(pack.price)}</p>
                  <Button size="sm" className="mt-3 w-full bg-churvox-accent/20 text-churvox-accent hover:bg-churvox-accent/30 text-xs" disabled={loading}>
                    Buy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-[10px] text-churvox-muted mt-2 text-center">Payment processing is a placeholder — no real charge.</p>
        </div>

        {/* History */}
        <div data-testid="sms-history">
          <h2 className="text-base font-semibold text-white mb-3">Recent Messages ({history.length})</h2>
          {history.length === 0 ? (
            <Card className="bg-churvox-card border-churvox-border">
              <CardContent className="p-6 text-center">
                <Send size={24} className="mx-auto mb-2 text-churvox-muted/40" />
                <p className="text-churvox-muted text-sm mb-1">No messages sent yet</p>
                <p className="text-xs text-churvox-muted/60">Send customer reminders, on-the-way alerts, or invoice reminders. You can also send from job and invoice detail pages.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map((sms) => (
                <Card key={sms.id} className="bg-churvox-card border-churvox-border" data-testid={`sms-log-${sms.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-churvox-accent/20 text-churvox-accent">
                            {sms.message_type?.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            sms.provider === "mock" ? "bg-yellow-500/20 text-yellow-400" :
                            sms.status === "COUNTRY_NOT_ENABLED" ? "bg-orange-500/20 text-orange-400" :
                            sms.status?.toLowerCase().includes("fail") ? "bg-red-500/20 text-red-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            {sms.provider === "mock" ? "mock" : sms.status || "sent"}
                          </span>
                        </div>
                        <p className="text-sm text-white truncate">{sms.message}</p>
                        <p className="text-xs text-churvox-muted mt-1 flex items-center gap-2">
                          <Phone size={11} /> {sms.recipient_phone}
                          <Clock size={11} /> {formatDate(sms.created_at)}
                          {sms.sent_by_name && <><span className="text-churvox-accent/70">by {sms.sent_by_name}</span></>}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Send SMS Dialog */}
        <Dialog open={showSend} onOpenChange={setShowSend}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="send-sms-dialog">
            <DialogHeader><DialogTitle className="text-white">Send SMS</DialogTitle></DialogHeader>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <Label className="text-churvox-muted">Recipient Phone</Label>
                <Input value={sendForm.recipient_phone} onChange={(e) => setSendForm({ ...sendForm, recipient_phone: e.target.value })} required placeholder="0400 000 000" className="bg-churvox-bg border-churvox-border text-white" data-testid="sms-phone-input" />
              </div>
              <div>
                <Label className="text-churvox-muted">Message Type</Label>
                <Select value={sendForm.message_type} onValueChange={(v) => setSendForm({ ...sendForm, message_type: v })}>
                  <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="sms-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-churvox-card border-churvox-border">
                    {MSG_TYPES.map((t) => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(sendForm.message_type === "customer_reminder" || sendForm.message_type === "on_the_way") && jobs.length > 0 && (
                <div>
                  <Label className="text-churvox-muted">Link to Job (optional)</Label>
                  <Select value={sendForm.job_id} onValueChange={(v) => setSendForm({ ...sendForm, job_id: v })}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="sms-job-select"><SelectValue placeholder="Select job" /></SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border">
                      {jobs.slice(0, 20).map((j) => <SelectItem key={j.id} value={j.id} className="text-white">{j.title} - {j.customer_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {sendForm.message_type === "invoice_reminder" && invoices.length > 0 && (
                <div>
                  <Label className="text-churvox-muted">Link to Invoice (optional)</Label>
                  <Select value={sendForm.invoice_id} onValueChange={(v) => setSendForm({ ...sendForm, invoice_id: v })}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="sms-invoice-select"><SelectValue placeholder="Select invoice" /></SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border">
                      {invoices.slice(0, 20).map((i) => <SelectItem key={i.id} value={i.id} className="text-white">{i.invoice_number} - {i.customer_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <p className="text-[10px] text-churvox-muted">SMS delivery is currently mocked. 2 credits per message.</p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowSend(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
                <Button type="submit" disabled={loading || balance < 1} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="confirm-send-sms">
                  {loading ? "Sending..." : "Send"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Buy Credits Dialog */}
        <Dialog open={showBuy} onOpenChange={setShowBuy}>
          <DialogContent className="bg-churvox-card border-churvox-border" data-testid="buy-credits-dialog">
            <DialogHeader><DialogTitle className="text-white">Buy SMS Credits</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {PACKS.map((pack) => (
                <button key={pack.id} onClick={() => handleBuy(pack.id)} disabled={loading} data-testid={`buy-pack-${pack.id}`}
                  className="w-full flex items-center justify-between p-4 bg-churvox-bg border border-churvox-border rounded-xl hover:border-churvox-accent/50 transition-all">
                  <div>
                    <p className="text-white font-semibold">{pack.credits} credits</p>
                    <p className="text-xs text-churvox-muted">${(pack.price / pack.credits * 100).toFixed(0)}c per SMS</p>
                  </div>
                  <span className="text-lg font-bold text-churvox-accent">{formatCurrency(pack.price)}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-churvox-muted text-center">Payment processing is a placeholder.</p>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
