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
  X,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import {
  PremiumPage,
  PremiumButton,
  PremiumBadge,
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
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
};

const proofId = (item) => item?.id || item?._id || item?.proof_pack_id || item?.job_id;
const jobId = (item) => item?.job_id || item?.jobId || item?.job?.id || item?.id || item?._id;
const proofStatus = (item) => String(item?.status || "draft").toLowerCase();
const jobTitle = (item) => safeText(item?.job_title || item?.title || item?.job?.title || item?.summary, "Completed job");
const clientName = (item) => safeText(item?.client_name || item?.customer_name || item?.job?.client_name || item?.job?.customer_name, "Client not listed");
const workerNote = (item) => safeText(item?.worker_note || item?.worker_notes || item?.note || item?.summary, "No worker note recorded");

const photoCount = (item) => {
  if (Array.isArray(item?.photos)) return item.photos.length;
  if (Array.isArray(item?.photo_urls)) return item.photo_urls.length;
  return Number(item?.photo_count || item?.photos_count || 0);
};

const statusLabel = (item, type) => {
  if (type === "job" || item?.completed_without_pack || item?.needs_proof_pack) return "Missing proof";
  const status = proofStatus(item);
  if (["approved", "ready", "ready_for_invoice"].includes(status)) return "Invoice ready";
  if (["draft", "pending", "review", "ready_for_owner_review"].includes(status)) return "Needs review";
  return status.replaceAll("_", " ");
};

const badgeTone = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("invoice") || s.includes("approved") || s.includes("ready")) return "teal";
  if (s.includes("missing") || s.includes("need")) return "amber";
  if (s.includes("reject") || s.includes("fail")) return "red";
  return "slate";
};

function ProofDetailModal({ item, onClose, onApprove, onPrepare, approvingId, preparingId }) {
  if (!item) return null;

  const id = proofId(item);
  const jid = jobId(item);
  const isJobWithoutPack = Boolean(item.completed_without_pack || item.needs_proof_pack || !item.status);
  const photos = safeArray(item.photos || item.photo_urls);
  const label = statusLabel(item, isJobWithoutPack ? "job" : "pack");

  return (
    <div className="proof-v5-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Job proof details">
      <section className="proof-v5-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <div className="proof-v5-modal-badges">
              <PremiumBadge tone={badgeTone(label)}>{label}</PremiumBadge>
              <PremiumBadge tone="slate" icon={<Camera className="h-3 w-3" />}>
                {photoCount(item)} photo{photoCount(item) === 1 ? "" : "s"}
              </PremiumBadge>
            </div>
            <h2>{jobTitle(item)}</h2>
            <p>{clientName(item)} · Completed {safeDate(item.completed_at || item.completed_date || item.job?.completed_at)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close proof details"><X size={20} /></button>
        </header>

        <div className="proof-v5-modal-body">
          <article>
            <p>Proof summary</p>
            <dl>
              <div><dt>Job</dt><dd>{jobTitle(item)}</dd></div>
              <div><dt>Client</dt><dd>{clientName(item)}</dd></div>
              <div><dt>Worker note</dt><dd>{workerNote(item)}</dd></div>
              <div><dt>Invoice status</dt><dd>{isJobWithoutPack ? "Proof pack needed before invoicing" : label === "Invoice ready" ? "Ready to support invoice" : "Review proof before invoicing"}</dd></div>
            </dl>
          </article>

          <article className="proof-v5-modal-flow">
            <p>Proof-to-paid flow</p>
            <div><span>1</span><b>Worker completed job</b></div>
            <div><span>2</span><b>Proof pack reviewed</b></div>
            <div><span>3</span><b>Invoice prepared after approval</b></div>
          </article>

          {photos.length > 0 && (
            <article>
              <p>Photos</p>
              <div className="proof-v5-photos">
                {photos.slice(0, 6).map((src, index) => {
                  const url = typeof src === "string" ? src : src?.url;
                  return url ? <img key={`${url}-${index}`} src={url} alt={`Proof ${index + 1}`} /> : null;
                })}
              </div>
            </article>
          )}
        </div>

        <footer>
          <PremiumButton variant="secondary" onClick={onClose}>Close</PremiumButton>
          {isJobWithoutPack && jid && (
            <PremiumButton onClick={() => onPrepare(jid)} disabled={Boolean(preparingId)}>
              {preparingId ? "Preparing…" : "Prepare proof pack"}
            </PremiumButton>
          )}
          {!isJobWithoutPack && id && (
            <PremiumButton onClick={() => onApprove(id)} disabled={Boolean(approvingId)}>
              {approvingId ? "Approving…" : "Approve proof"}
            </PremiumButton>
          )}
        </footer>
      </section>
    </div>
  );
}

function ProofCard({ item, type, onOpen, onPrimary, busy }) {
  const label = statusLabel(item, type);
  return (
    <div className={`proof-v5-card proof-v5-card--${type}`}>
      <button type="button" onClick={onOpen}>
        <div className="proof-v5-card-top">
          <PremiumBadge tone={badgeTone(label)}>{label}</PremiumBadge>
          <span><Camera size={13} />{photoCount(item)}</span>
        </div>
        <h3>{jobTitle(item)}</h3>
        <p>{clientName(item)}</p>
        <small>Completed {safeDate(item.completed_at || item.completed_date || item.job?.completed_at)}</small>
        <em>{workerNote(item)}</em>
      </button>
      <div>
        <PremiumButton size="sm" variant="secondary" onClick={onOpen}>Review</PremiumButton>
        <PremiumButton size="sm" onClick={onPrimary} disabled={busy}>
          {busy ? "Working…" : type === "job" ? "Prepare pack" : "Approve"}
        </PremiumButton>
      </div>
    </div>
  );
}

function Lane({ eyebrow, title, copy, icon, children, emptyTitle, emptyCopy }) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <article className="proof-v5-lane">
      <header>
        <span>{icon}</span>
        <div><p>{eyebrow}</p><h2>{title}</h2><small>{copy}</small></div>
      </header>
      <div className="proof-v5-lane-body">
        {hasChildren ? children : <div className="proof-v5-empty"><b>{emptyTitle}</b><span>{emptyCopy}</span></div>}
      </div>
    </article>
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

  useEffect(() => { load(); }, [load]);

  const prepare = async (jid) => {
    if (!jid) { toast.error("Job is missing"); return; }
    setPreparingId(String(jid));
    const res = await post(`/proof-packs/prepare-for-job/${jid}`, {});
    if (res?.success) toast.success("Proof pack prepared");
    else toast.error(res?.error || "Could not prepare proof pack");
    setPreparingId("");
    setActiveItem(null);
    await load();
  };

  const approve = async (id) => {
    if (!id) { toast.error("Proof pack is missing"); return; }
    setApprovingId(String(id));
    const res = await post(`/proof-packs/${id}/approve`, {});
    if (res?.success) toast.success("Proof approved");
    else toast.error(res?.error || "Could not approve proof");
    setApprovingId("");
    setActiveItem(null);
    await load();
  };

  const reviewPacks = useMemo(() => safeArray(packs).filter((p) => ["draft", "ready_for_owner_review", "pending", "review"].includes(proofStatus(p))), [packs]);
  const approvedPacks = useMemo(() => safeArray(packs).filter((p) => ["approved", "ready_for_invoice", "ready"].includes(proofStatus(p))), [packs]);
  const totalWork = jobsWithoutPack.length + reviewPacks.length + approvedPacks.length;

  return (
    <Layout>
      <PremiumPage>
        <div className="proof-v5">
          <section className="proof-v5-hero">
            <article className="proof-v5-hero-card">
              <p><ShieldCheck size={13} /> Job proofs</p>
              <h1>{totalWork ? `${totalWork} proof item${totalWork === 1 ? "" : "s"}` : "Proof pipeline clear"}</h1>
              <span>Review completed work before it becomes an invoice. Photos, notes and proof packs stay here until they are ready for billing.</span>
              <div>
                <button onClick={load}><RefreshCw size={15} /> Refresh queue</button>
                <button className="secondary" onClick={() => window.location.assign("/invoices")}><ReceiptText size={15} /> Open invoices</button>
              </div>
            </article>
          </section>

          <section className="proof-v5-stats">
            <button><AlertTriangle size={16} /><span>Missing proof</span><b>{jobsWithoutPack.length}</b></button>
            <button><ClipboardCheck size={16} /><span>Needs review</span><b>{reviewPacks.length}</b></button>
            <button><ReceiptText size={16} /><span>Invoice ready</span><b>{approvedPacks.length}</b></button>
            <button><FileText size={16} /><span>Total packs</span><b>{packs.length}</b></button>
          </section>

          {loading ? <PremiumLoadingState title="Loading job proofs…" /> : null}

          {!loading && totalWork === 0 ? (
            <PremiumEmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="Everything is clear"
              subtitle="Completed jobs that need proof review will appear here automatically."
            />
          ) : null}

          {!loading && totalWork > 0 && (
            <section className="proof-v5-board">
              <Lane
                eyebrow="Step 1"
                title="Missing proof"
                copy="Completed jobs that need a proof pack."
                icon={<BriefcaseBusiness size={18} />}
                emptyTitle="No missing proof"
                emptyCopy="Every completed job has a proof pack."
              >
                {jobsWithoutPack.map((item) => (
                  <ProofCard
                    key={`job-${proofId(item) || jobId(item)}`}
                    item={item}
                    type="job"
                    busy={preparingId === String(jobId(item))}
                    onOpen={() => setActiveItem({ ...item, completed_without_pack: true })}
                    onPrimary={() => prepare(jobId(item))}
                  />
                ))}
              </Lane>

              <Lane
                eyebrow="Step 2"
                title="Needs review"
                copy="Owner checks notes, photos and proof."
                icon={<ClipboardCheck size={18} />}
                emptyTitle="Nothing to review"
                emptyCopy="No proof packs need owner review."
              >
                {reviewPacks.map((item) => (
                  <ProofCard
                    key={`pack-review-${proofId(item)}`}
                    item={item}
                    type="pack"
                    busy={approvingId === String(proofId(item))}
                    onOpen={() => setActiveItem(item)}
                    onPrimary={() => approve(proofId(item))}
                  />
                ))}
              </Lane>

              <Lane
                eyebrow="Step 3"
                title="Invoice ready"
                copy="Approved packs ready for invoice handoff."
                icon={<Send size={18} />}
                emptyTitle="No invoice-ready proofs"
                emptyCopy="Approved proof packs will land here."
              >
                {approvedPacks.map((item) => (
                  <ProofCard
                    key={`pack-approved-${proofId(item)}`}
                    item={item}
                    type="ready"
                    busy={approvingId === String(proofId(item))}
                    onOpen={() => setActiveItem(item)}
                    onPrimary={() => approve(proofId(item))}
                  />
                ))}
              </Lane>
            </section>
          )}

          <section className="proof-v5-flow-note">
            <FileCheck2 size={18} />
            <div>
              <b>Proof-to-Paid workflow</b>
              <span>Worker finishes job <ArrowRight size={13} /> owner reviews proof <ArrowRight size={13} /> invoice is prepared from approved work.</span>
            </div>
          </section>

          <ProofDetailModal
            item={activeItem}
            onClose={() => setActiveItem(null)}
            onApprove={approve}
            onPrepare={prepare}
            approvingId={approvingId}
            preparingId={preparingId}
          />
        </div>
      </PremiumPage>
    </Layout>
  );
}
