import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import PageState from "../components/ui/PageState";

function PlansPage() {
  const apiClient = useApi();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState('solo');
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState('');

  const fallbackPlans = [
    {
      key: 'solo',
      name: 'Solo',
      price: '$30',
      description: 'Perfect for owner-operators getting started.',
      clients: 'Up to 20 clients',
      trial: '14-day free trial',
      popular: false,
      features: [
        'Jobs and scheduling',
        'Quotes and invoices',
        'Time tracking',
        'Mobile-friendly workflow'
      ]
    },
    {
      key: 'team',
      name: 'Team',
      price: '$70',
      description: 'For growing teams that need staff access.',
      clients: 'Up to 30 clients',
      trial: '14-day free trial',
      popular: true,
      features: [
        'Everything in Solo',
        'Team access',
        'Job assignment tools',
        'Better workflow visibility'
      ]
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$110',
      description: 'For serious operators who want more control.',
      clients: 'Up to 35 clients',
      trial: '14-day free trial',
      popular: false,
      features: [
        'Everything in Team',
        'Advanced workflow',
        'More control',
        'Extra operational tools'
      ]
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: '$240
Need more staff? Add 50 extra users for $100',
      description: 'For larger businesses needing stronger systems.',
      clients: '50 users included',
      trial: '14-day free trial',
      popular: false,
      features: [
        'Everything in Pro',
        '50 users included',
        'MYOB features',
        'Priority support'
      ]
    }
  ];

  useEffect(() => {
    loadPlans();
  }, []);

  const safeGet = async (url) => {
    return await apiClient.get(url);
  };

  const safePost = async (url, body) => {
    return await apiClient.post(url, body);
  };

  const getData = (res) => {
    if (!res) return null;
    if (res.data !== undefined) return res.data;
    return res;
  };

  const loadPlans = async () => {
    try {
      const [plansRes, meRes] = await Promise.allSettled([
        safeGet('/plan/all'),
        safeGet('/auth/me')
      ]);

      if (
        plansRes.status === 'fulfilled' &&
        Array.isArray(getData(plansRes.value)) &&
        getData(plansRes.value).length > 0
      ) {
        const apiPlans = getData(plansRes.value);

        const mergedPlans = fallbackPlans.map((fallback) => {
          const match = apiPlans.find((p) => {
            const key = (p.key || p.plan_type || p.name || '').toString().toLowerCase();
            return key === fallback.key;
          });

          if (!match) return fallback;

          return {
            ...fallback,
            key: (match.key || match.plan_type || fallback.key).toString().toLowerCase(),
            name: match.name || match.plan_name || fallback.name,
            price: match.price_display || match.price || fallback.price,
            description: match.description || fallback.description,
            features: Array.isArray(match.features) && match.features.length > 0 ? match.features : fallback.features
          };
        });

        setPlans(mergedPlans);
      } else {
        setPlans(fallbackPlans);
      }

      if (meRes.status === 'fulfilled') {
        const me = getData(meRes.value) || {};
        setCurrentPlan((me.plan_type || me.plan || 'solo').toString().toLowerCase());
      } else {
        setCurrentPlan('solo');
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
      setPlans(fallbackPlans);
      setCurrentPlan('solo');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planKey) => {
    if (!planKey || planKey === currentPlan) return;

    try {
      setBusyPlan(planKey);

      const res = await safePost('/stripe/create-checkout-session', {
        plan_type: planKey
      });

      const data = getData(res) || {};
      const url = data.checkout_url || data.url;

      if (url) {
        window.location.href = url;
        return;
      }

      alert('Could not open payment page');
    } catch (err) {
      console.error('Upgrade error:', err);
      alert(
        err?.response?.data?.detail ||
        err?.data?.detail ||
        err?.message ||
        'Failed to start checkout'
      );
    } finally {
      setBusyPlan('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-lg">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-sm text-blue-300 mb-4">
            Simple pricing for tradies
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
            Pick the plan that fits your business
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
            Start with a 14-day free trial, then move onto the plan that suits your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.key === currentPlan;
            const isBusy = busyPlan === plan.key;

            return (
              <div
                key={plan.key}
                className={`relative rounded-3xl border p-6 shadow-xl transition-all ${
                  isCurrent
                    ? 'border-blue-500 bg-slate-900 ring-2 ring-blue-500/30'
                    : plan.popular
                    ? 'border-blue-500 bg-slate-900/95'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                {plan.popular && !isCurrent ? (
                  <div className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    Most Popular
                  </div>
                ) : null}

                {isCurrent ? (
                  <div className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                    Your Current Plan
                  </div>
                ) : null}

                <div className="mb-5">
                  <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-slate-400 mb-1">/month</span>
                  </div>
                  <div className="inline-flex rounded-full bg-blue-500/15 border border-blue-400/30 px-3 py-1 text-sm text-blue-300 mb-3">
                    {plan.trial}
                  </div>
                  <p className="text-slate-300">{plan.description}</p>
                </div>

                <div className="rounded-2xl bg-slate-800/60 border border-slate-700 px-4 py-3 mb-5">
                  <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                    Client allowance
                  </div>
                  <div className="text-sm font-medium text-white">{plan.clients}</div>
                </div>

                <div className="mb-6">
                  <div className="text-sm font-semibold text-slate-200 mb-3">
                    What’s included
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-slate-200">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400 shrink-0"></span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={isCurrent || isBusy}
                  className={`w-full rounded-2xl px-4 py-3.5 font-semibold transition-all ${
                    isCurrent
                      ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : isBusy ? 'Opening Checkout...' : 'Start 14-Day Free Trial'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PlansPage;
