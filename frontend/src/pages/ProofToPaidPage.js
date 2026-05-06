import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import {
  PremiumPage,
  PremiumHero,
  PremiumCard,
  PremiumStatCard,
  PremiumButton,
  PremiumBadge,
  PremiumAIBox,
  PremiumEmptyState,
  PremiumLoadingState,
} from "../components/premium";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const safeDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10) || "—";
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const proofId = (item) => item?.id || item?._id || item?.proof_pack_id || item?.job_id;
const jobId = (item) => item?.job_id || item?.jobId || item?.job?.id || item?.id || item?._id;
const proofStatus = (item) => String(item?.status || "draft").toLowerCase();

const jobTitle = (item) =>
  safeText(item?.job_title || item?.title || item?.job?.title || item?.summary, "Completed job");

const clientName = (item) =>
  safeText(
    item?.client_name || item?.customer_name || item?.job?.client_name || item?.job?.customer_name,
    "Client not listed"
  );

const photoCount = (item) => {
  if (Array.isArray(item?.photos)) return item.photos.length;
  if (Array.isArray(item?.photo_urls)) return item.photo_urls.length;
  return Number(item?.photo_count || item?.photos_count || 0);
};

function badgeTone(status) {
  const s = String(status || "").toLowerCase();
  if (["approved", "ready", "ready_for_invoice", "completed"].some((x) => s.includes(x))) return "teal";
  if (["failed", "rejected", "blocked"].some((x) => s.includes(x))) return "red";
  if (["review", "draft", "pending", "needs"].some((x) => s.includes(x))) return "amber";
  return "slate";
}

function ProofDetailModal({ item, onClose, onApprove, onPrepare, approvingId, preparingId }) {
  if (!item) return null;

  const id = proofId(item);
  const jid = jobId(item);
  const status = proofStatus(item);
  const isJobWithoutPack = !item.status || item.needs_proof_pack || item.completed_without_pack;
  const photos = safeArray(item.photos || item.photo_urls);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Proof detail"
    >
      <div className="h-[92vh] w-full overflow-hidden rounded-t-3xl border border-[#d8e3f3] bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-3xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#d8e3f3] bg-[#f7faff] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PremiumBadge tone={isJobWithoutPack ? "amber" : badgeTone(status)}>
                {isJobWithoutPack ? "Needs proof pack" : status.replaceAll("_", " ")}
              </PremiumBadge>
              <PremiumBadge tone="slate" icon={<Camera className="h-3 w-3" />}>
                {photoCount(item)} photo{photoCount(item) === 1 ? "" : "s"}
              </PremiumBadge>
            </div>
            <h2 className="mt-2 text-xl font-bold text-[#0d1b34]">{jobTitle(item)}</h2>
            <p className="mt-1 text-sm text-[#5b6c87]">
              {clientName(item)} · Completed{" "}
              {safeDate(item.completed_at || item.completed_date || item.job?.completed_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[#5b6c87] hover:bg-white hover:text-[#0d1b34]"
            aria-label="Close proof detail"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-160px)] space-y-4 overflow-y-auto px-4 py-4 sm:max-h-[65vh] sm:px-6">
          <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4">
            <h3 className="text-sm font-bold text-[#0d1b34]">Proof summary</h3>
            <div className="mt-3 grid gap-2 text-sm text-[#1a2c4d] sm:grid-cols-2">
              <p><span className="font-semibold">Job:</span> {jobTitle(item)}</p>
              <p><span className="font-semibold">Client:</span> {clientName(item)}</p>
              <p>
                <span className="font-semibold">Worker note:</span>{" "}
                {safeText(item.worker_note || item.worker_notes || item.note || item.summary, "No worker note recorded")}
              </p>
              <p>
                <span className="font-semibold">Invoice readiness:</span>{" "}
                {safeText(
                  item.invoice_status ||
                    item.invoice_readiness ||
                    (status.includes("approved") ? "Ready for draft invoice" : "Review proof first")
                )}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#d8e3f3] bg-[#f7faff] p-4">
            <h3 className="text-sm font-bold text-[#0d1b34]">AI Proof Assistant</h3>
            <div className="mt-2 space-y-1 text-sm text-[#1a2c4d]">
              <p>AI checked this completed job and prepared a proof review summary.</p>
              <p>
                {photoCount(item) > 0
                  ? "Photos are available for owner review."
                  : "No photos were found for this proof pack yet."}
              </p>
              <p>
                {status.includes("approved")
                  ? "This proof pack is ready to support invoicing."
                  : "Review and approve the proof before billing."}
              </p>
            </div>
          </section>

          {photos.length > 0 ? (
            <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4">
              <h3 className="text-sm font-bold text-[#0d1b34]">Photos</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.slice(0, 6).map((src, index) => {
                  const url = typeof src === "string" ? src : src?.url;
                  return url ? (
                    <img
                      key={`${url}-${index}`}
                      src={url}
                      alt={`Proof ${index + 1}`}
                      className="h-28 w-full rounded-xl border border-[#d8e3f3] object-cover"
                    />
                  ) : null;
                })}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#d8e3f3] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <PremiumButton variant="secondary" onClick={onClose}>Close</PremiumButton>
          {isJobWithoutPack && jid ? (
            <PremiumButton onClick={() => onPrepare(jid)} disabled={Boolean(preparingId)}>
              {preparingId ? "Preparing…" : "Prepare proof pack"}
            </PremiumButton>
          ) : null}
          {!isJobWithoutPack && id ? (
            <PremiumButton onClick={() => onApprove(id)} disabled={Boolean(approvingId)}>
              {approvingId ? "Approving…" : "Approve proof"}
            </PremiumButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProofToPaidPage() {
  const { get, post } = useApi();
  const [packs, setPacks] = useState([]);
  const [jobsWithoutPack, setJobsWithoutPack] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [preparingId, setPreparingId] = useState("");
  const [approvingId, setApprovingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await get("/proof-packs");
    if (res?.success) {
      setPacks(safeArray(res.data || res.proof_packs));
      setJobsWithoutPack(safeArray(res.completed_jobs_without_pack || res.jobs_without_pack));
    } else {
      setPacks([]);
      setJobsWithoutPack([]);
    }
    setLoading(false);
  }, [get]);

  useEffect(() => {
    load();
  }, [load]);

  const prepare = async (jid) => {
    if (!jid) {
      toast.error("Job is missing");
      return;
    }

    setPreparingId(String(jid));
    const res = await post(`/proof-packs/prepare-for-job/${jid}`, {});
    if (res?.success) toast.success("Proof pack prepared");
    else toast.error(res?.error || "Could not prepare proof pack");

    setPreparingId("");
    setActiveItem(null);
    await load();
  };

  const approve = async (id) => {
    if (!id) {
      toast.error("Proof pack is missing");
      return;
    }

    setApprovingId(String(id));
    const res = await post(`/proof-packs/${id}/approve`, {});
    if (res?.success) toast.success("Proof pack approved");
    else toast.error(res?.error || "Could not approve proof pack");

    setApprovingId("");
    setActiveItem(null);
    await load();
  };

  const reviewPacks = useMemo(
    () =>
      safeArray(packs).filter((p) =>
        ["draft", "ready_for_owner_review", "pending", "review"].includes(proofStatus(p))
      ),
    [packs]
  );

  const approvedPacks = useMemo(
    () =>
      safeArray(packs).filter((p) =>
        ["approved", "ready_for_invoice", "ready"].includes(proofStatus(p))
      ),
    [packs]
  );

  const aiSuggestions = useMemo(() => {
    const out = [];

    if (jobsWithoutPack.length) {
      out.push({
        icon: <BriefcaseBusiness className="h-4 w-4" />,
        title: `${jobsWithoutPack.length} completed job${jobsWithoutPack.length === 1 ? "" : "s"} need proof packs`,
        description: "AI checked completed work and prepared proof-to-paid actions.",
      });
    }

    if (reviewPacks.length) {
      out.push({
        icon: <ClipboardCheck className="h-4 w-4" />,
        title: `${reviewPacks.length} proof pack${reviewPacks.length === 1 ? "" : "s"} need owner review`,
        description: "Review proof before invoicing so the customer update is accurate.",
      });
    }

    if (approvedPacks.length) {
      out.push({
        icon: <ReceiptText className="h-4 w-4" />,
        title: `${approvedPacks.length} proof pack${approvedPacks.length === 1 ? "" : "s"} invoice-ready`,
        description: "Approved proof can support draft invoices and customer updates.",
      });
    }

    if (!out.length) {
      out.push({
        icon: <Sparkles className="h-4 w-4" />,
        title: "Proof pipeline is clear",
        description: "AI checked proof packs and found no urgent review work.",
      });
    }

    return out;
  }, [jobsWithoutPack.length, reviewPacks.length, approvedPacks.length]);

  const renderCard = (item, type) => {
    const status = type === "job" ? "needs proof pack" : proofStatus(item).replaceAll("_", " ");
    const actionLabel = type === "job" ? "Prepare proof pack" : "Approve proof";
    const primaryAction = type === "job" ? () => prepare(jobId(item)) : () => approve(proofId(item));
    const busy = type === "job" ? preparingId === String(jobId(item)) : approvingId === String(proofId(item));

    return (
      <div
        key={`${type}-${proofId(item) || jobId(item)}`}
        className="rounded-2xl border border-[#d8e3f3] bg-white p-4 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
      >
        <button
          type="button"
          onClick={() => setActiveItem({ ...item, completed_without_pack: type === "job" })}
          className="block w-full text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <PremiumBadge tone={type === "job" ? "amber" : badgeTone(status)}>{status}</PremiumBadge>
            <PremiumBadge tone="slate" icon={<Camera className="h-3 w-3" />}>
              {photoCount(item)} photos
            </PremiumBadge>
          </div>

          <h3 className="mt-3 text-base font-bold text-[#0d1b34]">{jobTitle(item)}</h3>
          <p className="mt-1 text-sm text-[#5b6c87]">{clientName(item)}</p>
          <p className="mt-2 text-xs text-[#7d8ba3]">
            Completed {safeDate(item.completed_at || item.completed_date || item.job?.completed_at)}
          </p>
          <p className="mt-2 line-clamp-2 text-sm text-[#1a2c4d]">
            {safeText(item.worker_note || item.worker_notes || item.note || item.summary, "Open to review proof details and next billing step.")}
          </p>
        </button>

        <div className="mt-3 flex flex-wrap gap-2">
          <PremiumButton size="sm" variant="secondary" onClick={() => setActiveItem({ ...item, completed_without_pack: type === "job" })}>
            Review
          </PremiumButton>
          <PremiumButton size="sm" onClick={primaryAction} disabled={busy}>
            {busy ? "Working…" : actionLabel}
          </PremiumButton>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <PremiumPage>
        <PremiumHero
          icon={<FileCheck2 className="h-7 w-7" />}
          eyebrow={<><ShieldCheck className="h-3 w-3" /> Proof-to-Paid</>}
          title="Proof-to-Paid"
          subtitle="Turn completed jobs into reviewed proof packs, clean customer updates and invoice-ready work."
          actions={
            <PremiumButton variant="secondary" onClick={load} iconLeft={<Sparkles className="h-4 w-4" />}>
              Refresh proof queue
            </PremiumButton>
          }
        />

        <PremiumAIBox
          title="AI Proof Assistant"
          subtitle="AI checked completed jobs and prepared proof-to-paid actions for owner review."
          chip="Proof review"
          suggestions={aiSuggestions}
        />

        <div className="px-grid px-grid--4">
          <PremiumStatCard label="Need proof" value={jobsWithoutPack.length} icon={<BriefcaseBusiness className="h-4 w-4" />} tone="amber" />
          <PremiumStatCard label="Owner review" value={reviewPacks.length} icon={<ClipboardCheck className="h-4 w-4" />} tone="sky" />
          <PremiumStatCard label="Invoice ready" value={approvedPacks.length} icon={<ReceiptText className="h-4 w-4" />} tone="teal" />
          <PremiumStatCard label="Total packs" value={packs.length} icon={<FileText className="h-4 w-4" />} />
        </div>

        {loading ? <PremiumLoadingState title="Loading proof pipeline…" /> : null}

        {!loading && !jobsWithoutPack.length && !reviewPacks.length && !approvedPacks.length ? (
          <PremiumEmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title="Proof pipeline is clear"
            subtitle="Completed jobs that need proof review will appear here automatically."
          />
        ) : null}

        {!loading && jobsWithoutPack.length ? (
          <PremiumCard title="Completed jobs needing proof" subtitle="Prepare a proof pack before billing." icon={<BriefcaseBusiness className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {jobsWithoutPack.map((item) => renderCard(item, "job"))}
            </div>
          </PremiumCard>
        ) : null}

        {!loading && reviewPacks.length ? (
          <PremiumCard title="Ready for owner review" subtitle="Check notes, photos and invoice readiness." icon={<ClipboardCheck className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviewPacks.map((item) => renderCard(item, "pack"))}
            </div>
          </PremiumCard>
        ) : null}

        {!loading && approvedPacks.length ? (
          <PremiumCard title="Approved and invoice-ready" subtitle="Proof packs ready to support billing and customer updates." icon={<ReceiptText className="h-4 w-4" />}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {approvedPacks.map((item) => renderCard(item, "pack"))}
            </div>
          </PremiumCard>
        ) : null}

        <ProofDetailModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onApprove={approve}
          onPrepare={prepare}
          approvingId={approvingId}
          preparingId={preparingId}
        />
      </PremiumPage>
    </Layout>
  );
}
