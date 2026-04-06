import React from "react";
import {
  Users,
  Building2,
  Activity,
  DollarSign,
  UserPlus,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Briefcase,
  TrendingUp,
} from "lucide-react";

const stats = [
  { title: "Total Users", value: "1,284", change: "+42 this week", icon: <Users size={20} /> },
  { title: "Total Businesses", value: "312", change: "+11 this week", icon: <Building2 size={20} /> },
  { title: "Active Today", value: "427", change: "+9.4%", icon: <Activity size={20} /> },
  { title: "MRR", value: "$8,420", change: "+$630 this month", icon: <DollarSign size={20} /> },
  { title: "Trial Users", value: "186", change: "42 ending soon", icon: <UserPlus size={20} /> },
  { title: "Paid Users", value: "241", change: "77% conversion", icon: <CreditCard size={20} /> },
];

const topBusinesses = [
  { name: "GreenCut Lawn Care", plan: "Pro", jobs: 84, revenue: "$2,140" },
  { name: "Rapid Property Services", plan: "Team", jobs: 63, revenue: "$1,620" },
  { name: "Apex Garden Works", plan: "Solo", jobs: 47, revenue: "$980" },
  { name: "Blue Trim Solutions", plan: "Pro", jobs: 44, revenue: "$1,410" },
];

const problemAccounts = [
  { name: "Fresh Edge Mowing", issue: "Payment failed", status: "Urgent" },
  { name: "Topline Exterior", issue: "Trial expired", status: "Follow up" },
  { name: "Prime Cuts NZ", issue: "Setup incomplete", status: "Check" },
  { name: "Eco Yard Team", issue: "No recent activity", status: "Watch" },
];

const recentActivity = [
  "12 new users signed up today",
  "4 businesses upgraded to paid plans",
  "2 failed subscription renewals detected",
  "97 jobs created across the platform today",
  "41 invoices sent in the last 24 hours",
];

export default function PlatformOwnerDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Full app overview for Churvox owner/admin
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-medium">
              View Users
            </button>
            <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition font-medium border border-slate-700">
              View Businesses
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-slate-400 text-sm">{stat.title}</div>
                <div className="text-blue-400">{stat.icon}</div>
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-2">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <TrendingUp size={18} />
                  <span className="font-medium">New Signups</span>
                </div>
                <div className="text-2xl font-bold">42</div>
                <div className="text-sm text-slate-500 mt-1">This week</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <BarChart3 size={18} />
                  <span className="font-medium">Conversion Rate</span>
                </div>
                <div className="text-2xl font-bold">77%</div>
                <div className="text-sm text-slate-500 mt-1">Trial to paid</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-300 mb-2">
                  <Briefcase size={18} />
                  <span className="font-medium">Jobs Today</span>
                </div>
                <div className="text-2xl font-bold">97</div>
                <div className="text-sm text-slate-500 mt-1">Across all businesses</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Top Active Businesses</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-800">
                      <th className="py-3 pr-4">Business</th>
                      <th className="py-3 pr-4">Plan</th>
                      <th className="py-3 pr-4">Jobs</th>
                      <th className="py-3 pr-4">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topBusinesses.map((business) => (
                      <tr
                        key={business.name}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium">{business.name}</td>
                        <td className="py-3 pr-4 text-slate-300">{business.plan}</td>
                        <td className="py-3 pr-4 text-slate-300">{business.jobs}</td>
                        <td className="py-3 pr-4 text-slate-300">{business.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Recent Platform Activity</h2>
              <div className="space-y-3">
                {recentActivity.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl bg-slate-800/60 border border-slate-800 px-4 py-3 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Problem Accounts</h2>
              <div className="space-y-3">
                {problemAccounts.map((account) => (
                  <div
                    key={account.name}
                    className="rounded-xl border border-slate-800 bg-slate-800/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-sm text-slate-400 mt-1">{account.issue}</div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/20">
                        {account.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="text-amber-400" size={18} />
                <h2 className="text-xl font-semibold">Platform Alerts</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  2 failed payments need checking
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  5 trials ending in the next 3 days
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                  3 businesses have incomplete setup
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-3">
                <button className="rounded-xl bg-blue-600 hover:bg-blue-500 transition px-4 py-3 text-left font-medium">
                  View All Users
                </button>
                <button className="rounded-xl bg-slate-800 hover:bg-slate-700 transition px-4 py-3 text-left font-medium border border-slate-700">
                  View All Businesses
                </button>
                <button className="rounded-xl bg-slate-800 hover:bg-slate-700 transition px-4 py-3 text-left font-medium border border-slate-700">
                  Check Failed Payments
                </button>
                <button className="rounded-xl bg-slate-800 hover:bg-slate-700 transition px-4 py-3 text-left font-medium border border-slate-700">
                  Review Trials Ending Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
