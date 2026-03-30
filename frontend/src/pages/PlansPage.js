import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Users, Briefcase, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

const plans = [
  {
    id: "solo",
    name: "Solo",
    price: "Free",
    description: "Perfect for individual contractors just starting out",
    features: [
      "Unlimited jobs",
      "Up to 25 clients",
      "Basic invoicing",
      "15% GST calculation",
      "Email support",
    ],
    icon: Briefcase,
    available: true,
    popular: false,
  },
  {
    id: "solo_plus",
    name: "Solo+",
    price: "$19",
    period: "/month",
    description: "For growing contractors who need more features",
    features: [
      "Everything in Solo",
      "Unlimited clients",
      "Recurring jobs automation",
      "Quote management",
      "Custom GST rates",
      "Priority support",
    ],
    icon: Crown,
    available: true,
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "/month",
    description: "For small teams managing multiple contractors",
    features: [
      "Everything in Solo+",
      "Up to 5 team members",
      "Team scheduling",
      "Job assignment",
      "Team performance reports",
      "Shared client database",
    ],
    icon: Users,
    available: false,
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    period: "/month",
    description: "For established businesses with advanced needs",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "Advanced analytics",
      "API access",
      "White-label invoices",
      "Dedicated account manager",
    ],
    icon: Crown,
    available: false,
    popular: false,
  },
];

export default function PlansPage() {
  const { user, updateUser, isAdmin } = useAuth();
  const { patch, loading } = useApi();

  const handleSelectPlan = async (planId) => {
    if (!plans.find((p) => p.id === planId)?.available) {
      toast.info("This plan is coming soon!");
      return;
    }

    const result = await patch("/user/plan", { plan: planId });
    if (result.success) {
      updateUser({ plan: planId });
      toast.success("Plan updated successfully!");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in" data-testid="plans-page">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white font-heading">
            Choose your plan
          </h1>
          <p className="text-muted-foreground mt-3">
            Select the plan that best fits your business needs. Upgrade or downgrade anytime.
          </p>
          {isAdmin && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary">
                Admin account: You have access to all features regardless of plan
              </p>
            </div>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = user?.plan === plan.id;
            const PlanIcon = plan.icon;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative bg-card border-border transition-all",
                  plan.popular && "border-primary",
                  !plan.available && "opacity-60"
                )}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                {!plan.available && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-secondary text-muted-foreground text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Coming Soon
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={cn(
                    "mx-auto h-12 w-12 rounded-xl flex items-center justify-center mb-3",
                    plan.popular ? "bg-primary/20" : "bg-secondary"
                  )}>
                    <PlanIcon className={cn(
                      "h-6 w-6",
                      plan.popular ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <CardTitle className="text-xl font-heading">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                  <CardDescription className="mt-2">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className={cn(
                          "h-4 w-4 flex-shrink-0",
                          plan.popular ? "text-primary" : "text-green-500"
                        )} />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full",
                      isCurrentPlan
                        ? "bg-secondary text-muted-foreground cursor-default"
                        : plan.popular
                          ? "bg-primary hover:bg-primary/90"
                          : plan.available
                            ? "bg-secondary hover:bg-secondary/80"
                            : "bg-secondary text-muted-foreground cursor-not-allowed"
                    )}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan || loading || !plan.available}
                    data-testid={`select-plan-${plan.id}`}
                  >
                    {isCurrentPlan ? "Current Plan" : plan.available ? "Select Plan" : "Coming Soon"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ or Additional Info */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-white">Need help choosing?</h3>
                <p className="text-muted-foreground mt-1">
                  Contact us for a personalized recommendation based on your business needs.
                </p>
              </div>
              <Button variant="outline" className="border-border whitespace-nowrap">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
