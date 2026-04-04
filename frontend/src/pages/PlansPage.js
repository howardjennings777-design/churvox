import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

function PlansPage() {
  const apiClient = useApi();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState('solo');
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState('');

  useEffect(() => {
    loadPlans();
  }, []);

  const fallbackPlans = [
    {
      key: 'solo',
      name: 'Solo',
      price: '$30',
      description: 'For solo operators',
      features: ['Up to 20 clients', 'Core jobs and invoicing', 'Basic scheduling']
    },
    {
      key: 'team',
      name: 'Team',
      price: '$70',
      description: 'For growing teams',
      features: ['Up to 30 clients', 'Team access', 'Better workflow tools']
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$110',
      description: 'For serious operators',
      features: ['Up to 35 clients', 'Advanced workflow', 'More control']
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      price: '$240',
      description: 'For larger businesses',
      features: ['Large team support', 'MYOB features', 'Priority tools']
    }
  ];

  const loadPlans = async () => {
    try {
      const [plansRes, meRes] = await Promise.allSettled([
        api.get('/plan/all'),
        api.get('/auth/me')
      ]);

      if (plansRes.status === 'fulfilled' && Array.isArray(plansRes.value.data) && plansRes.value.data.length > 0) {
        setPlans(
          plansRes.value.data.map((p) => ({
            key: (p.key || p.plan_type || p.name || '').toString().toLowerCase(),
            name: p.name || p.plan_name || 'Plan',
            price: p.price_display || p.price || '',
            description: p.description || '',
            features: Array.isArray(p.features) ? p.features : []
          }))
        );
      } else {
        setPlans(fallbackPlans);
      }

      if (meRes.status === 'fulfilled') {
        setCurrentPlan(
          (meRes.value.data?.plan_type || meRes.value.data?.plan || 'solo').toString().toLowerCase()
        );
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

      const res = await apiClient.post('/stripe/create-checkout-session', {
        plan_type: planKey
      });

      const url = res?.data?.checkout_url || res?.data?.url;

      if (url) {
        window.location.href = url;
        return;
      }

      alert('Could not open payment page');
    } catch (err) {
      console.error('Upgrade error:', err);
      alert(err?.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setBusyPlan('');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-white">
        Loading plans...
      </div>
    );
  }

  return (
    <div className="p-6 text-white min-h-screen bg-slate-950">
      <h1 className="text-3xl font-bold mb-2">Plans</h1>
      <p className="text-slate-300 mb-6">Choose the plan that fits your business.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan;

          return (
            <div
              key={plan.key}
              className={`rounded-2xl border p-5 shadow-lg ${
                isCurrent ? 'border-blue-500 bg-slate-900' : 'border-slate-800 bg-slate-900/70'
              }`}
            >
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                <div className="text-3xl font-bold mt-2">{plan.price}</div>
                {plan.description ? (
                  <p className="text-slate-300 mt-2">{plan.description}</p>
                ) : null}
              </div>

              <div className="mb-6">
                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                  <ul className="space-y-2 text-slate-200">
                    {plan.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400">No features listed</p>
                )}
              </div>

              <button
                onClick={() => handleUpgrade(plan.key)}
                disabled={isCurrent || busyPlan === plan.key}
                className={`w-full rounded-xl px-4 py-3 font-semibold ${
                  isCurrent
                    ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isCurrent ? 'Current Plan' : busyPlan === plan.key ? 'Opening...' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlansPage;
