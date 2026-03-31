import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, Briefcase, Receipt, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { TRADE_TYPES } from "@/lib/utils";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { patch, get, post, loading } = useApi();
  const [gstRate, setGstRate] = useState(user?.gst_rate?.toString() || "15");
  const [tradeType, setTradeType] = useState(user?.trade_type || "other");
  const [myobKey, setMyobKey] = useState("");
  const [myobFileId, setMyobFileId] = useState("");
  const [myobFileName, setMyobFileName] = useState("");
  const [myobConnected, setMyobConnected] = useState(false);
  const [myobLoading, setMyobLoading] = useState(true);

  React.useEffect(() => {
    (async () => {
      const res = await get("/myob/settings");
      if (res.success) {
        setMyobConnected(res.data.connected);
        setMyobFileId(res.data.company_file_id || "");
        setMyobFileName(res.data.company_file_name || "");
      }
      setMyobLoading(false);
    })();
  }, [get]);

  const handleUpdateGST = async (e) => {
    e.preventDefault();
    const rate = Number(gstRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Please enter a valid GST rate between 0 and 100");
      return;
    }

    const result = await patch("/user/gst", { gst_rate: rate });
    if (result.success) {
      updateUser({ gst_rate: rate });
      toast.success("GST rate updated");
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdateTrade = async (value) => {
    setTradeType(value);
    const result = await patch("/user/trade", { trade_type: value });
    if (result.success) {
      updateUser({ trade_type: value });
      toast.success("Trade type updated");
    } else {
      toast.error(result.error);
    }
  };

  const handleSaveMyob = async (e) => {
    e.preventDefault();
    if (!myobKey) { toast.error("Please enter your MYOB API key"); return; }
    const payload = { api_key: myobKey };
    if (myobFileId) payload.company_file_id = myobFileId;
    if (myobFileName) payload.company_file_name = myobFileName;
    const res = await post("/myob/settings", payload);
    if (res.success) {
      toast.success("MYOB settings saved");
      setMyobConnected(true);
      setMyobKey("");
    } else toast.error(res.error || "Failed to save MYOB settings");
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-white font-heading">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and business settings</p>
        </div>

        {/* Account Info */}
        <Card className="card-surface">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">Account Information</CardTitle>
                <CardDescription>Your account details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Name</Label>
                <p className="text-white mt-1">{user?.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Email</Label>
                <p className="text-white mt-1">{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Business Name</Label>
                <p className="text-white mt-1">{user?.business_name || "Not set"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Plan</Label>
                <p className="text-white capitalize mt-1">{user?.plan}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade Type */}
        <Card className="card-surface">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">Trade Type</CardTitle>
                <CardDescription>Select your primary trade or service type</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="trade_type">Your Trade</Label>
              <Select value={tradeType} onValueChange={handleUpdateTrade}>
                <SelectTrigger className="bg-secondary border-border max-w-sm" data-testid="trade-type-select">
                  <SelectValue placeholder="Select your trade" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {TRADE_TYPES.map((trade) => (
                    <SelectItem key={trade.value} value={trade.value}>
                      {trade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                This helps customize your job types and experience.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* GST Settings */}
        <Card className="card-surface">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">Tax Settings</CardTitle>
                <CardDescription>Configure your GST/tax rate for invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateGST} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gst_rate">Default GST Rate (%)</Label>
                <div className="flex gap-3">
                  <Input
                    id="gst_rate"
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.5"
                    className="bg-secondary border-border max-w-[120px]"
                    data-testid="gst-rate-input"
                  />
                  <Button 
                    type="submit" 
                    className="bg-primary hover:bg-primary/90"
                    disabled={loading}
                    data-testid="save-gst-button"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This rate will be applied to new invoices by default. NZ standard is 15%.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* MYOB Integration */}
        <Card className="card-surface" data-testid="myob-settings-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-heading">MYOB Integration</CardTitle>
                <CardDescription>Sync invoices and payments with MYOB</CardDescription>
              </div>
              {myobConnected && (
                <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-green-500/20 text-green-400" data-testid="myob-connected-badge">
                  Connected
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {myobLoading ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <form onSubmit={handleSaveMyob} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="myob_key">MYOB API Key</Label>
                  <Input
                    id="myob_key"
                    type="password"
                    value={myobKey}
                    onChange={(e) => setMyobKey(e.target.value)}
                    placeholder={myobConnected ? "••••••••" : "Enter MYOB API key"}
                    className="bg-secondary border-border max-w-sm"
                    data-testid="myob-api-key-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="myob_file">Company File Name (optional)</Label>
                  <Input
                    id="myob_file"
                    value={myobFileName}
                    onChange={(e) => setMyobFileName(e.target.value)}
                    placeholder="e.g. My Business Pty Ltd"
                    className="bg-secondary border-border max-w-sm"
                    data-testid="myob-company-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="myob_file_id">Company File ID (optional)</Label>
                  <Input
                    id="myob_file_id"
                    value={myobFileId}
                    onChange={(e) => setMyobFileId(e.target.value)}
                    placeholder="e.g. cf-12345"
                    className="bg-secondary border-border max-w-sm"
                    data-testid="myob-file-id-input"
                  />
                </div>
                <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading} data-testid="save-myob-button">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : myobConnected ? "Update Connection" : "Connect MYOB"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  MYOB sync is currently a placeholder. Once connected, invoices can be synced from the invoice detail page.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
