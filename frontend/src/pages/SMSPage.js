import React from "react";
import Layout from "../components/Layout";
import { MessageSquare, Clock3 } from "lucide-react";

export default function SMSPage() {
  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto" data-testid="sms-page-coming-soon">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-blue-50 text-blue-600 mb-4">
            <MessageSquare size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">SMS reminders coming soon</h1>
          <p className="mt-3 text-slate-600">
            SMS reminders are coming soon. Email reminders and in-app notifications are available now.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
            <Clock3 size={14} />
            We disabled SMS actions until provider billing and message history are production-ready.
          </p>
        </div>
      </div>
    </Layout>
  );
}
