import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";

export default function ProofToPaidPage() {
  const { get, post } = useApi();
  const [packs, setPacks] = useState([]);
  const [jobsWithoutPack, setJobsWithoutPack] = useState([]);

  const load = async () => {
    const res = await get("/proof-packs");
    if (res?.success) {
      setPacks(res.data || []);
      setJobsWithoutPack(res.completed_jobs_without_pack || []);
    }
  };

  useEffect(() => { load(); }, []);

  const prepare = async (jobId) => { await post(`/proof-packs/prepare-for-job/${jobId}`); await load(); };
  const approve = async (id) => { await post(`/proof-packs/${id}/approve`, {}); await load(); };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h1 className="text-2xl font-bold">Proof-to-Paid</h1>
          <p className="text-slate-600">AI-prepared proof packs that turn completed jobs into approved, paid work.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3">Needs owner review</h2>
          <div className="space-y-2">
            {packs.filter((p) => ["draft", "ready_for_owner_review"].includes(p.status)).map((p) => (
              <div key={p.id || p._id} className="border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">Job {p.job_id}</div>
                  <div className="text-xs text-slate-500">Status: {p.status}</div>
                </div>
                <Button onClick={() => approve(p.id || p._id)}>Approve</Button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="font-semibold mb-3">Completed jobs without proof pack</h2>
          <div className="space-y-2">
            {jobsWithoutPack.map((j) => (
              <div key={j.id || j._id} className="border rounded-xl p-3 flex items-center justify-between">
                <div>{j.title || "Completed job"}</div>
                <Button variant="outline" onClick={() => prepare(j.id || j._id)}>Prepare proof pack</Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
