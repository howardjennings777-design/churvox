from pathlib import Path
import re

server_path = Path('backend/server.py')
payroll_path = Path('frontend/src/pages/PayrollPage.js')
server = server_path.read_text(encoding='utf-8')
payroll = payroll_path.read_text(encoding='utf-8')

# ---------------- Backend: payroll rate endpoints ----------------
if '@api_router.post("/payroll/workers/{worker_id}/rate")' not in server:
    marker = '# ===================== PAYROLL API'
    if marker not in server:
        marker = '@api_router.get("/payroll/periods")'
    if marker not in server:
        raise SystemExit('Could not find payroll API marker in backend/server.py')

    backend_block = r'''

# ===================== PAYROLL WORKER PAY RATES =====================

def _safe_money(value, default=0.0):
    try:
        if value is None or value == "":
            return float(default)
        return round(float(value), 2)
    except Exception:
        return float(default)

async def _get_worker_pay_rate(worker_id: str, business_id: str = ""):
    user = None
    queries = []
    try:
        queries.append({"_id": ObjectId(str(worker_id))})
    except Exception:
        pass
    queries.append({"id": str(worker_id)})
    queries.append({"user_id": str(worker_id)})
    queries.append({"email": str(worker_id).strip().lower()})
    for q in queries:
        if business_id:
            q = {**q, "business_id": business_id}
        user = await db.users.find_one(q)
        if user:
            break
    if not user:
        user = await db.users.find_one({"$or": queries})
    if not user:
        return {"hourly_rate": 0, "pay_type": "hourly", "payroll_notes": "", "needs_rate": True}
    rate = _safe_money(user.get("hourly_rate") or user.get("pay_rate") or user.get("payroll_rate") or 0)
    return {
        "hourly_rate": rate,
        "pay_type": user.get("pay_type") or user.get("payroll_type") or "hourly",
        "payroll_notes": user.get("payroll_notes") or "",
        "needs_rate": rate <= 0,
    }

@api_router.post("/payroll/workers/{worker_id}/rate")
async def save_payroll_worker_rate(worker_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    role = str(current_user.get("role") or "").lower()
    if role not in {"owner", "employer", "admin", "manager", "payroll", "office_admin"}:
        raise HTTPException(status_code=403, detail="Not allowed")

    business_id = str(current_user.get("business_id") or "")
    hourly_rate = _safe_money((payload or {}).get("hourly_rate") or (payload or {}).get("pay_rate") or 0)
    pay_type = str((payload or {}).get("pay_type") or "hourly").strip().lower()
    if pay_type not in {"hourly", "salary", "contractor"}:
        pay_type = "hourly"
    notes = str((payload or {}).get("payroll_notes") or (payload or {}).get("notes") or "").strip()

    if hourly_rate < 0:
        raise HTTPException(status_code=400, detail="Hourly rate cannot be negative")

    queries = []
    try:
        queries.append({"_id": ObjectId(str(worker_id))})
    except Exception:
        pass
    queries.append({"id": str(worker_id)})
    queries.append({"user_id": str(worker_id)})
    queries.append({"email": str(worker_id).strip().lower()})

    target = None
    for q in queries:
        candidate = {**q}
        if business_id:
            candidate["business_id"] = business_id
        target = await db.users.find_one(candidate)
        if target:
            break
    if not target:
        target = await db.users.find_one({"$or": queries})
    if not target:
        raise HTTPException(status_code=404, detail="Worker not found")

    await db.users.update_one(
        {"_id": target["_id"]},
        {"$set": {
            "hourly_rate": hourly_rate,
            "pay_rate": hourly_rate,
            "pay_type": pay_type,
            "payroll_notes": notes,
            "payroll_rate_updated_at": datetime.now(timezone.utc),
        }}
    )
    return {"success": True, "worker_id": str(target.get("_id")), "hourly_rate": hourly_rate, "pay_type": pay_type, "payroll_notes": notes}

@api_router.get("/payroll/workers/{worker_id}/rate")
async def get_payroll_worker_rate(worker_id: str, current_user: dict = Depends(get_current_user)):
    business_id = str(current_user.get("business_id") or "")
    data = await _get_worker_pay_rate(worker_id, business_id)
    return {"success": True, **data}

# ===================== END PAYROLL WORKER PAY RATES =====================

'''
    server = server.replace(marker, backend_block + marker, 1)

# Best effort backend summary gross calc patches by replacing common gross_pay fallbacks.
server = server.replace('"gross_pay": 0,', '"gross_pay": round(float(approved_hours or 0) * float(hourly_rate or pay_rate or payroll_rate or 0) + float(adjustments_total or 0), 2),')
server = server.replace('gross_pay = 0', 'gross_pay = round(float(approved_hours or 0) * float(hourly_rate or pay_rate or payroll_rate or 0) + float(adjustments_total or 0), 2)')

# ---------------- Frontend: payroll rate UI ----------------
if 'payRateForm' not in payroll:
    payroll = payroll.replace(
        '  const [adjustmentForm, setAdjustmentForm] = useState({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });',
        '  const [adjustmentForm, setAdjustmentForm] = useState({ worker_id: "", type: "allowance", label: "", amount: "", taxable: false, notes: "" });\n  const [payRateForm, setPayRateForm] = useState({ worker_id: "", hourly_rate: "", pay_type: "hourly", payroll_notes: "" });'
    )

    payroll = payroll.replace(
        '    setWorkerDetails(res.data);\n  });',
        '    const details = res.data || {};\n    setWorkerDetails(details);\n    const worker = details.worker || details.summary || details;\n    const workerId = details.worker_id || worker.worker_id || worker.id || worker.user_id || workerId;\n    setPayRateForm({\n      worker_id: workerId,\n      hourly_rate: String(worker.hourly_rate ?? worker.pay_rate ?? worker.payroll_rate ?? details.hourly_rate ?? 0),\n      pay_type: worker.pay_type || details.pay_type || "hourly",\n      payroll_notes: worker.payroll_notes || details.payroll_notes || "",\n    });\n  });'
    )

    insert_after = '''  const saveSettings = async () => withAction("save-settings", async () => {
    const res = await post("/payroll/settings", {
      payroll_method: settings.payroll_method,
      rate_mode: settings.rate_mode,
      default_rate: Number(settings.default_rate || 0),
      default_pay_frequency: settings.default_pay_frequency,
      notes: settings.notes || DISCLAIMER,
    });
    if (!res?.success) return toast.error(res?.error || "Settings save failed");
    toast.success("Payroll settings saved");
    setShowSettings(false);
    await loadInitial();
  });
'''
    save_rate = '''

  const saveWorkerPayRate = async () => withAction(`save-rate-${payRateForm.worker_id}`, async () => {
    if (!payRateForm.worker_id) return toast.error("Select a worker first");
    const rate = Number(payRateForm.hourly_rate || 0);
    if (Number.isNaN(rate) || rate < 0) return toast.error("Enter a valid hourly rate");
    const res = await post(`/payroll/workers/${payRateForm.worker_id}/rate`, {
      hourly_rate: rate,
      pay_type: payRateForm.pay_type || "hourly",
      payroll_notes: payRateForm.payroll_notes || "",
    });
    if (!res?.success) return toast.error(res?.error || "Failed to save pay rate");
    toast.success("Worker pay rate saved");
    await loadInitial();
    if (activePeriodId) await loadPeriodData(activePeriodId);
    if (workerDetails) await openWorkerDetails(payRateForm.worker_id);
  });
'''
    if insert_after in payroll:
        payroll = payroll.replace(insert_after, insert_after + save_rate, 1)
    else:
        raise SystemExit('Could not find saveSettings block in PayrollPage.js')

    payroll = payroll.replace(
        '<p className="col-span-2">Estimated gross: {formatCurrency(w.gross_pay || 0)}</p>',
        '<p>Rate: {Number(w.hourly_rate || w.pay_rate || 0) > 0 ? formatCurrency(w.hourly_rate || w.pay_rate) + "/hr" : "Needs rate"}</p>\n                  <p className="col-span-2">Estimated gross: {formatCurrency(w.gross_pay || (Number(w.approved_hours || 0) * Number(w.hourly_rate || w.pay_rate || 0)) + Number(w.adjustments_total || 0))}</p>'
    )

    payroll = payroll.replace(
        '<p>{a.worker_name || a.worker_id} · {a.type} · {a.label} · {formatCurrency(a.amount || 0)} · {a.taxable ? "Taxable" : "Non-taxable"} · {String(a.created_at || "").slice(0, 10)}</p>',
        '<p>{a.worker_name || a.worker_id} · {a.type} · {a.label} · {formatCurrency(a.amount || 0)} · {a.taxable ? "Taxable" : "Non-taxable"} · {String(a.created_at || "").slice(0, 10)}</p>'
    )

    modal_anchor = '''<h3 className="text-lg font-semibold">Worker payroll details</h3>'''
    rate_panel = '''<h3 className="text-lg font-semibold">Worker payroll details</h3>'''
    if modal_anchor in payroll:
        payroll = payroll.replace(modal_anchor, rate_panel, 1)

    # Insert a pay-rate editor inside the worker details modal before Adjustments section.
    payroll = payroll.replace(
        '<p className="mt-2 text-sm font-semibold text-slate-900">Adjustments</p>',
        '''<div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-slate-900">Pay rate</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">Hourly rate
                      <input className="cx-input mt-1" type="number" min="0" step="0.01" value={payRateForm.hourly_rate} onChange={(e) => setPayRateForm((s) => ({ ...s, hourly_rate: e.target.value }))} />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">Pay type
                      <select className="cx-input mt-1" value={payRateForm.pay_type} onChange={(e) => setPayRateForm((s) => ({ ...s, pay_type: e.target.value }))}>
                        <option value="hourly">Hourly</option>
                        <option value="salary">Salary</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Payroll notes
                      <input className="cx-input mt-1" value={payRateForm.payroll_notes} onChange={(e) => setPayRateForm((s) => ({ ...s, payroll_notes: e.target.value }))} placeholder="Optional payroll notes" />
                    </label>
                  </div>
                  <button className="cx-button-primary mt-3" onClick={saveWorkerPayRate} disabled={actionLoading[`save-rate-${payRateForm.worker_id}`]}>
                    {actionLoading[`save-rate-${payRateForm.worker_id}`] ? "Saving..." : "Save pay rate"}
                  </button>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900">Adjustments</p>''',
        1
    )

    payroll = payroll.replace(
        'Export row preview',
        'Export row preview'
    )

server_path.write_text(server, encoding='utf-8')
payroll_path.write_text(payroll, encoding='utf-8')
print('Patched payroll worker pay rates')
