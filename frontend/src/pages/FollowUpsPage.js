import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { Button } from "../components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { safeArray, safeText } from "../utils/safeRender";

function idOf(item) {
  return String(item?.id || item?._id || "");
}

function dueText(value) {
  if (!value) return "No due date";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "No due date";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diff = Math.round((startDue - startToday) / 86400000);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff}d`;
}

function isOverdue(value) {
  if (!value) return false;
  const due = new Date(value);
  return !Number.isNaN(due.getTime()) && due < new Date();
}

function dateInputValue(value) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function TaskCard({ task, onComplete, onDelete, busy }) {
  const taskId = idOf(task);
  const overdue = isOverdue(task.due_at);
  const completed = ["completed", "done", "closed"].includes(String(task.status || "").toLowerCase());
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${overdue && !completed ? "border-amber-200 ring-1 ring-amber-100" : "border-slate-200"}`} data-testid={`follow-up-card-${taskId}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-slate-950">{safeText(task.title, "Follow-up")}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${completed ? "bg-emerald-50 text-emerald-700" : overdue ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
              {completed ? "completed" : overdue ? "overdue" : "open"}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">{safeText(task.description, "No details added")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!completed && (
            <button type="button" onClick={() => onComplete(taskId)} disabled={busy === taskId} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60" title="Complete follow-up">
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => onDelete(taskId)} disabled={busy === taskId} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60" title="Delete follow-up">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <span className={`inline-flex items-center gap-1 ${overdue && !completed ? "text-amber-700" : ""}`}><Clock className="h-3.5 w-3.5" />{dueText(task.due_at)}</span>
        <span className="rounded-full bg-slate-100 px-2 py-1 uppercase tracking-wide">{safeText(task.priority, "normal")}</span>
        {task.related_type ? <span className="rounded-full bg-slate-100 px-2 py-1 uppercase tracking-wide">{task.related_type}</span> : null}
        {task.source ? <span className="rounded-full bg-slate-100 px-2 py-1 uppercase tracking-wide">{task.source}</span> : null}
      </div>
    </div>
  );
}

export default function FollowUpsPage() {
  const { get, post, del } = useApi();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ title: "", description: "", due_at: "", priority: "normal" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await get(`/follow-up-tasks?status=${filter}`);
    if (res?.success) setTasks(safeArray(res.data));
    else toast.error(safeText(res?.error, "Could not load follow-ups"));
    setLoading(false);
  }, [get, filter]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const open = tasks.filter((task) => !["completed", "done", "closed"].includes(String(task.status || "").toLowerCase()));
    const overdue = open.filter((task) => isOverdue(task.due_at));
    const completed = tasks.filter((task) => ["completed", "done", "closed"].includes(String(task.status || "").toLowerCase()));
    return { open: open.length, overdue: overdue.length, completed: completed.length, total: tasks.length };
  }, [tasks]);

  const createTask = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Add a follow-up title");
      return;
    }
    setBusy("new");
    const res = await post("/follow-up-tasks", {
      title: form.title.trim(),
      description: form.description.trim(),
      due_at: form.due_at ? `${form.due_at}T09:00:00` : undefined,
      priority: form.priority,
      source: "manual",
    });
    if (res?.success) {
      toast.success("Follow-up created");
      setForm({ title: "", description: "", due_at: "", priority: "normal" });
      await load();
    } else {
      toast.error(safeText(res?.error, "Could not create follow-up"));
    }
    setBusy("");
  };

  const completeTask = async (taskId) => {
    setBusy(taskId);
    const res = await post(`/follow-up-tasks/${taskId}/complete`);
    if (res?.success) {
      toast.success("Follow-up completed");
      await load();
    } else {
      toast.error(safeText(res?.error, "Could not complete follow-up"));
    }
    setBusy("");
  };

  const deleteTask = async (taskId) => {
    const confirmed = window.confirm("Delete this follow-up?");
    if (!confirmed) return;
    setBusy(taskId);
    const res = await del(`/follow-up-tasks/${taskId}`);
    if (res?.success) {
      toast.success("Follow-up deleted");
      await load();
    } else {
      toast.error(safeText(res?.error, "Could not delete follow-up"));
    }
    setBusy("");
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6" data-testid="follow-ups-page">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Customer follow-up centre</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Follow-ups</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">Track overdue invoices, customer callbacks, quote follow-ups and automation-created tasks in one place.</p>
            </div>
            <Button onClick={load} className="rounded-full bg-blue-600 font-black text-white hover:bg-blue-700"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Open</p><p className="mt-2 text-2xl font-black text-slate-950">{stats.open}</p></div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Overdue</p><p className="mt-2 text-2xl font-black text-amber-900">{stats.overdue}</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Completed</p><p className="mt-2 text-2xl font-black text-emerald-900">{stats.completed}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Total shown</p><p className="mt-2 text-2xl font-black text-slate-950">{stats.total}</p></div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <form onSubmit={createTask} className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="create-follow-up-form">
            <div className="flex items-center gap-2 text-base font-black text-slate-950"><Plus className="h-5 w-5 text-blue-600" /> Add follow-up</div>
            <div className="mt-4 space-y-3">
              <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="e.g. Call customer about overdue invoice" className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300" data-testid="follow-up-title-input" />
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Notes..." rows={4} className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300" />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={dateInputValue(form.due_at)} onChange={(e) => setForm((prev) => ({ ...prev, due_at: e.target.value }))} className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300" />
                <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))} className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-300">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <Button type="submit" disabled={busy === "new"} className="h-11 w-full rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700">{busy === "new" ? "Creating..." : "Create follow-up"}</Button>
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white/60 p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Task list</h2>
                <p className="text-sm font-semibold text-slate-500">Automation and manual follow-ups.</p>
              </div>
              <div className="flex rounded-full border border-slate-200 bg-white p-1 text-sm font-black">
                {["open", "completed", "all"].map((item) => (
                  <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 capitalize ${filter === item ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{item}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Loading follow-ups...</div> : null}
              {!loading && tasks.map((task) => <TaskCard key={idOf(task)} task={task} onComplete={completeTask} onDelete={deleteTask} busy={busy} />)}
              {!loading && !tasks.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-bold text-slate-700">No follow-ups here yet.</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Manual tasks and automation-created follow-ups will appear here.</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
