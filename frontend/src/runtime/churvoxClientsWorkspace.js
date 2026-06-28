import API_BASE from "../lib/apiBase";

// CHURVOX_CLIENTS_WORKSPACE_20260628
// Makes the Clients OS page a real working client manager: add, edit, CSV import/export.

if (typeof window !== "undefined" && !window.__CHURVOX_CLIENTS_WORKSPACE__) {
  window.__CHURVOX_CLIENTS_WORKSPACE__ = true;

  const apiUrl = (endpoint) => `${API_BASE}/api${endpoint}`;
  const headers = () => {
    const token = window.localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const pick = (...values) => {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (text) return text;
    }
    return "";
  };

  const idOf = (row, fallback = "") => {
    const value = row?.id ?? row?._id ?? row?.client_id ?? row?.customer_id ?? fallback;
    return typeof value === "object" ? String(value.$oid || value.oid || value.id || value._id || fallback || "") : String(value || fallback || "");
  };

  const normalizeList = (payload) => {
    const body = payload?.data ?? payload;
    if (Array.isArray(body)) return body;
    for (const key of ["clients", "customers", "items", "records", "results", "data"]) {
      if (Array.isArray(body?.[key])) return body[key];
    }
    if (Array.isArray(body?.data?.clients)) return body.data.clients;
    return [];
  };

  const clientName = (row) => pick(row?.name, row?.client_name, row?.customer_name, row?.contact_name, row?.email, row?.phone, "Unnamed client");
  const clientPhone = (row) => pick(row?.phone, row?.mobile, row?.phone_number, row?.contact_phone);
  const clientEmail = (row) => pick(row?.email, row?.contact_email);
  const clientAddress = (row) => pick(row?.address, row?.site_address, row?.billing_address, row?.location);
  const clientNotes = (row) => pick(row?.notes, row?.note, row?.last_note, row?.service_memory, row?.description);
  const clientValue = (row) => Number(row?.total_spend || row?.lifetime_value || row?.value || row?.total || 0);

  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let cell = "";
    let quote = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"' && quote && next === '"') { cell += '"'; i += 1; continue; }
      if (ch === '"') { quote = !quote; continue; }
      if (ch === "," && !quote) { row.push(cell.trim()); cell = ""; continue; }
      if ((ch === "\n" || ch === "\r") && !quote) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell.trim()); cell = "";
        if (row.some(Boolean)) rows.push(row);
        row = [];
        continue;
      }
      cell += ch;
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    const headers = (rows.shift() || []).map((h) => h.toLowerCase().replace(/[^a-z0-9_ ]/g, "").trim().replace(/\s+/g, "_"));
    return rows.map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] || ""])));
  };

  const csvLine = (values) => values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const request = async (method, endpoint, data) => {
    const response = await fetch(apiUrl(endpoint), {
      method,
      credentials: "include",
      headers: headers(),
      body: data ? JSON.stringify(data) : undefined,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false) throw new Error(body?.detail || body?.error || body?.message || "Client save failed");
    return body;
  };

  const render = async () => {
    const isClients = (window.location.hash || "").replace("#", "") === "clients" || window.location.pathname.includes("clients");
    if (!isClients) return;
    const host = document.querySelector(".clientsPage");
    if (!host || host.dataset.realClientWorkspace === "ready") return;
    host.dataset.realClientWorkspace = "ready";
    host.replaceChildren(make("div", "cvClientLoading", "Loading clients..."));

    let clients = [];
    let selectedId = "";
    let status = "";

    const load = async () => {
      const payload = await request("GET", "/clients");
      clients = normalizeList(payload).map((row, index) => ({
        raw: row,
        id: idOf(row, `client-${index}`),
        name: clientName(row),
        phone: clientPhone(row),
        email: clientEmail(row),
        address: clientAddress(row),
        notes: clientNotes(row),
        service_memory: pick(row.service_memory, row.service_notes, row.notes, row.note),
        price_memory: pick(row.price_memory, row.default_price, row.rate, clientValue(row) ? `$${clientValue(row)}` : ""),
        jobs: Number(row.job_count || row.jobs_count || row.total_jobs || 0),
        value: clientValue(row),
      }));
      if (!selectedId && clients[0]) selectedId = clients[0].id;
    };

    const formData = (form) => Object.fromEntries(new FormData(form).entries());

    const saveClient = async (form, id) => {
      const data = formData(form);
      const payload = {
        name: data.name,
        client_name: data.name,
        customer_name: data.name,
        phone: data.phone,
        mobile: data.phone,
        email: data.email,
        address: data.address,
        site_address: data.address,
        notes: data.notes,
        service_memory: data.service_memory,
        price_memory: data.price_memory,
      };
      if (id && !id.startsWith("new")) await request("PATCH", `/clients/${encodeURIComponent(id)}`, payload);
      else await request("POST", "/clients", payload);
      status = "Client saved.";
      await load();
      renderView();
    };

    const exportCsv = () => {
      const rows = [csvLine(["name", "phone", "email", "address", "notes", "service_memory", "price_memory"]), ...clients.map((c) => csvLine([c.name, c.phone, c.email, c.address, c.notes, c.service_memory, c.price_memory]))].join("\n");
      const blob = new Blob([rows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "churvox-clients.csv";
      a.click();
      URL.revokeObjectURL(url);
    };

    const importCsv = async (file) => {
      const rows = parseCsv(await file.text()).slice(0, 500);
      for (const row of rows) {
        await request("POST", "/clients", {
          name: pick(row.name, row.client, row.customer, row.client_name),
          client_name: pick(row.client_name, row.client, row.name, row.customer),
          customer_name: pick(row.customer, row.client, row.name, row.client_name),
          phone: pick(row.phone, row.mobile),
          mobile: pick(row.mobile, row.phone),
          email: row.email || "",
          address: pick(row.address, row.site_address),
          site_address: pick(row.site_address, row.address),
          notes: pick(row.notes, row.note, row.service_memory),
        });
      }
      status = `${rows.length} clients imported.`;
      await load();
      renderView();
    };

    const renderForm = (client) => {
      const form = make("form", "cvClientForm");
      form.innerHTML = `
        <header><span>${client?.id?.startsWith("new") ? "New client" : "Client form"}</span><h2></h2><p>Edit the real client record here. Admin created from this client still goes to Command.</p></header>
        <label><span>Client name</span><input name="name" /></label>
        <label><span>Phone</span><input name="phone" /></label>
        <label><span>Email</span><input name="email" /></label>
        <label><span>Site address</span><input name="address" /></label>
        <label class="wide"><span>Notes</span><textarea name="notes"></textarea></label>
        <label class="wide"><span>Service memory</span><textarea name="service_memory"></textarea></label>
        <label><span>Price memory</span><input name="price_memory" /></label>
        <footer><button type="submit">Save client</button><button type="button" data-action="new">Add another</button></footer>
      `;
      form.querySelector("h2").textContent = client?.name || "Add client";
      ["name", "phone", "email", "address", "notes", "service_memory", "price_memory"].forEach((key) => {
        const field = form.elements[key];
        if (field) field.value = client?.[key] || "";
      });
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        try { await saveClient(form, client?.id || "new"); } catch (err) { status = err.message; renderView(); }
      });
      form.querySelector('[data-action="new"]').addEventListener("click", () => { selectedId = "new"; renderView(); });
      return form;
    };

    const renderView = () => {
      const selected = selectedId === "new" ? { id: "new", name: "Add client" } : clients.find((c) => c.id === selectedId) || clients[0];
      host.replaceChildren();
      const shell = make("section", "cvClientWorkspace");
      const left = make("aside", "cvClientSide");
      const controls = make("div", "cvClientControls");
      const addBtn = make("button", "", "Add client");
      const importLabel = make("label", "cvImport", "CSV import");
      const file = make("input"); file.type = "file"; file.accept = ".csv,text/csv";
      importLabel.appendChild(file);
      const exportBtn = make("button", "", "CSV export");
      controls.append(addBtn, importLabel, exportBtn);
      left.append(make("span", "", "Clients"), make("h1", "", "Client file"), controls);
      const list = make("div", "cvClientList");
      clients.forEach((client) => {
        const button = make("button", client.id === selected?.id ? "active" : "");
        button.innerHTML = `<b></b><span></span>`;
        button.querySelector("b").textContent = client.name;
        button.querySelector("span").textContent = `${client.jobs} jobs / ${client.value ? `$${client.value}` : "ready to edit"}`;
        button.addEventListener("click", () => { selectedId = client.id; renderView(); });
        list.appendChild(button);
      });
      if (!clients.length) list.appendChild(make("p", "cvEmpty", "No clients yet. Add one or import CSV."));
      left.appendChild(list);
      const main = make("article", "cvClientMain");
      main.appendChild(renderForm(selected));
      const history = make("aside", "cvClientHistory");
      history.innerHTML = `<h3>Client activity</h3><p><b>Jobs</b><span>${selected?.jobs || 0} linked jobs</span></p><p><b>Value</b><span>${selected?.value ? `$${selected.value}` : "No spend recorded yet"}</span></p><p><b>Admin rule</b><span>Next quote, invoice or message is prepared by Churvox and approved in Command.</span></p>`;
      if (status) history.prepend(make("strong", "cvStatus", status));
      shell.append(left, main, history);
      host.appendChild(shell);
      addBtn.addEventListener("click", () => { selectedId = "new"; renderView(); });
      exportBtn.addEventListener("click", exportCsv);
      file.addEventListener("change", async () => { if (file.files?.[0]) { try { await importCsv(file.files[0]); } catch (err) { status = err.message; renderView(); } } });
    };

    try { await load(); renderView(); } catch (err) { host.replaceChildren(make("div", "cvClientLoading", err.message || "Could not load clients.")); }
  };

  const run = () => setTimeout(render, 80);
  window.addEventListener("load", run);
  window.addEventListener("hashchange", run);
  document.addEventListener("click", run, true);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  run();
}
