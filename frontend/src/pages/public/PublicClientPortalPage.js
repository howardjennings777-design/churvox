import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { Button } from "../../components/ui/button";

export default function PublicClientPortalPage() {
  const { token } = useParams();
  const { get, post } = useApi();
  const [portal, setPortal] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await get(`/public/client-portal/${token}`);
      if (res?.success) setPortal(res.data);
    })();
  }, [token]);

  const approve = async () => {
    await post(`/public/client-portal/${token}/approve-work`, {});
    const res = await get(`/public/client-portal/${token}`);
    if (res?.success) setPortal(res.data);
  };

  if (!portal) return <div className="p-6">Loading portal…</div>;

  return <div className="max-w-4xl mx-auto p-4 space-y-4">
    <div className="bg-slate-900 text-white rounded-2xl p-6">
      <h1 className="text-2xl font-bold">Client Portal</h1>
      <div className="text-sm opacity-90">Status: {portal.status}</div>
    </div>
    <div className="bg-white border rounded-2xl p-6"><h2 className="font-semibold">Work completed summary</h2><p>{portal.ai_summary}</p></div>
    <div className="bg-white border rounded-2xl p-6"><h2 className="font-semibold">Photo proof</h2><div className="grid grid-cols-2 gap-2">{(portal.photos||[]).map((p, i)=><img key={i} src={typeof p === 'string' ? p : p?.url} alt="Proof" className="rounded-xl"/>)}</div></div>
    <div className="bg-white border rounded-2xl p-6"><Button onClick={approve}>Approve completed work</Button></div>
  </div>;
}
