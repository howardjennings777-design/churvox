import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Check, X, Crown, Users, Briefcase, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";

const PLANS = [
  {
    id: "solo", name: "Solo", price: 30, desc: "For independent contractors",
    icon: Briefcase,
    features: [
      { name: "Jobs & scheduling", included: true },
      { name: "Quotes & invoices", included: true },
      { name: "Time tracking", included: true },
      { name: "Up to 20 clients", included: true },
      { name: "Team management", included: false },
      { name: "SMS notifications", included: false },
      { name: "MYOB integration", included: false },
    ],
  },
  {
    id: "team", name: "Team", price: 70, desc: "For small trade teams", popular: true,
    icon: Users,
    features: [
      { name: "Everything in Solo", included: true },
      { name: "Up to 30 clients", included: true },
      { name: "Up to 5 team members", included: true },
      { name: "SMS notifications", included: true },
      { name: "Team assignment", included: true },
      { name: "MYOB integration", included: false },
    ],
  },
  {
    id: "pro", name: "Pro", price: 110, desc: "For growing businesses",
    icon: Crown,
    features: [
      { name: "Everything in Team", included: true },
      { name: "Up to 35 clients", included: true },
      { name: "MYOB integration", included: true },
      { name: "Priority support", included: true },
    ],
  },
  {
    id: "enterprise", name: "Enterprise", price: 240, desc: "For large operations",
    icon: Building2,
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Up to 50 clients", included: true },
      { name: "+$100 per extra 50-user block", included: true },
      { name: "Dedicated support", included: true },
    ],
  },
];

export default function PlansPage() {
  const { user, isEmployer, updateUser } = useAuth();
  const { get, patch, loading } = useApi();
  const [planData, setPlanData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const currentPlan = user?.plan || "solo";

  const fetchPlan = useCallback(async () => {
    const res = await get("/plan/limits");
    if (res.success) setPlanData(res.data);
  }, [get]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handlePlanChange = async () => {
    if (!confirmDialog) return;
    const res = await patch("/user/plan", { plan: confirmDialog.id });
    if (res.success) {
      updateUser({ plan: confirmDialog.id });
      toast.success(`Plan changed to ${confirmDialog.name}`);
      setConfirmDialog(null);
      fetchPlan();
    } else {
      toast.error(res.error || "Failed to change plan");
    }
  };

  const isUpgrade = (planId) => {
    const order = ["solo", "team", "pro", "enterprise"];
    return order.indexOf(planId) > order.indexOf(currentPlan);
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" data-testid="plans-page">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="plans-heading">Plans & Pricing</h1>
          <p className="text-sm text-churvox-muted max-w-md mx-auto">
            Choose the right plan for your trade business. All plans include core job management.
          </p>
        </div>

        {/* Current Plan Banner */}
        {planData && isEmployer && (
          <Card className="bg-churvox-accent/10 border-churvox-accent/30" data-testid="current-plan-banner">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-churvox-accent font-semibold">Current Plan: {PLANS.find(p => p.id === currentPlan)?.name || currentPlan}</p>
                <p className="text-xs text-churvox-muted mt-0.5">
                  {planData.usage.workers} worker{planData.usage.workers !== 1 ? "s" : ""} &middot; {planData.usage.clients} client{planData.usage.clients !== 1 ? "s" : ""}
                  {planData.extra_user_blocks > 0 && ` · ${planData.extra_user_blocks} extra user block${planData.extra_user_blocks !== 1 ? "s" : ""}`}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-churvox-accent/20 text-churvox-accent">
                ${PLANS.find(p => p.id === currentPlan)?.price || 0}/mo
              </span>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="plans-grid">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const upgrade = isUpgrade(plan.id);
            return (
              <Card key={plan.id}
                className={`relative bg-churvox-card border transition-all ${isCurrent ? "border-churvox-accent ring-1 ring-churvox-accent/30" : "border-churvox-border hover:border-churvox-accent/40"}`}
                data-testid={`plan-card-${plan.id}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-churvox-accent rounded-full text-[10px] font-bold uppercase text-white" data-testid="popular-badge">
                    Popular
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="h-9 w-9 rounded-lg bg-churvox-accent/15 flex items-center justify-center mb-2">
                    <plan.icon size={18} className="text-churvox-accent" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-xs">{plan.desc}</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    <span className="text-sm text-churvox-muted">/mo</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        {f.included ? (
                          <Check size={14} className="text-green-400 shrink-0 mt-0.5" />
                        ) : (
                          <X size={14} className="text-churvox-muted/40 shrink-0 mt-0.5" />
                        )}
                        <span className={f.included ? "text-white" : "text-churvox-muted/50"}>{f.name}</span>
                      </li>
                    ))}
                  </ul>
                  {isEmployer && (
                    <div className="pt-2">
                      {isCurrent ? (
                        <Button disabled className="w-full bg-churvox-accent/20 text-churvox-accent border-none text-xs" data-testid={`plan-current-${plan.id}`}>
                          Current Plan
                        </Button>
                      ) : (
                        <Button onClick={() => setConfirmDialog(plan)}
                          className={`w-full text-xs ${upgrade ? "bg-churvox-accent hover:bg-churvox-accent/90" : "bg-white/10 hover:bg-white/15 text-white"}`}
                          data-testid={`plan-select-${plan.id}`}>
                          {upgrade ? "Upgrade" : "Downgrade"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional User Blocks */}
        <Card className="bg-churvox-card border-churvox-border" data-testid="extra-blocks-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                <Users size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Need more team members?</h3>
                <p className="text-xs text-churvox-muted mt-1">
                  Enterprise plan includes 50 users. Add <span className="text-white font-medium">+$100/mo per additional 50-user block</span> for larger teams.
                  Contact support to add user blocks to your Enterprise plan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Non-employer notice */}
        {!isEmployer && (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-4 text-center text-churvox-muted text-sm">
              Plan management is available to business owners only.
            </CardContent>
          </Card>
        )}

        {/* Confirm Plan Change Dialog */}
        <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent className="bg-churvox-card border-churvox-border max-w-sm" data-testid="plan-change-dialog">
            <DialogHeader>
              <DialogTitle className="text-white">
                {confirmDialog && isUpgrade(confirmDialog.id) ? "Upgrade" : "Downgrade"} to {confirmDialog?.name}?
              </DialogTitle>
              <DialogDescription>
                {confirmDialog && isUpgrade(confirmDialog.id)
                  ? `Your plan will change to ${confirmDialog?.name} at $${confirmDialog?.price}/mo. New features will be available immediately.`
                  : `Your plan will change to ${confirmDialog?.name} at $${confirmDialog?.price}/mo. Some features may become unavailable.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setConfirmDialog(null)} className="border-churvox-border text-churvox-muted" data-testid="plan-change-cancel">
                Cancel
              </Button>
              <Button onClick={handlePlanChange} disabled={loading} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="plan-change-confirm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <p className="text-center text-[10px] text-churvox-muted/60">
          Billing is placeholder. No charges will be applied until a payment provider is connected.
        </p>
      </div>
    </Layout>
  );
}
