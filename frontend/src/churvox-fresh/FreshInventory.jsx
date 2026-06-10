import React from "react";

const INVENTORY_KEY = "churvox:fresh-inventory:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const defaults = [
  {
    id: "inv-1",
    item: "Green waste bags",
    category: "Consumables",
    stock: 18,
    reorderAt: 10,
    supplier: "Mitre 10",
    usedOn: "Garden tidy",
    status: "Good",
    note: "Used on garden tidy and cleanup jobs.",
  },
  {
    id: "inv-2",
    item: "Line trimmer cord",
    category: "Consumables",
    stock: 2,
    reorderAt: 5,
    supplier: "Bunnings",
    usedOn: "Lawn service",
    status: "Low stock",
    note: "Buy before the next full lawn run.",
  },
  {
    id: "inv-3",
    item: "Safety cones",
    category: "Safety",
    stock: 6,
    reorderAt: 4,
    supplier: "NZ Safety Blackwoods",
    usedOn: "Public access jobs",
    status: "Good",
    note: "Required for public footpath work.",
  },
];

function readInventory() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(INVENTORY_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveInventory(items) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "inventory" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

function sendInventoryToCommand(item) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `inventory-${item.id}-${Date.now()}`,
      group: "Inventory",
      title: "Inventory item needs review",
      info: `${item.item} · ${item.stock} left · reorder at ${item.reorderAt}`,
      urgency: Number(item.stock || 0) <= Number(item.reorderAt || 0) ? "Low stock" : item.status,
      found: `${item.item} has ${item.stock} left.`,
      prepared: `Suggested action: check ${item.supplier} and restock before ${item.usedOn}.`,
      why: item.note,
      owner: "Approve reorder, update stock, or open Expenses.",
      area: "Inventory",
      page: "inventory",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "inventory-command" } }));
  } catch {
    // Fresh preview keeps working without local storage.
  }
}

export default function FreshInventory({ onNavigate }) {
  const [items, setItems] = React.useState(readInventory);
  const [selectedId, setSelectedId] = React.useState(() => readInventory()[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];

  const low = items.filter((item) => Number(item.stock || 0) <= Number(item.reorderAt || 0)).length;
  const good = items.filter((item) => Number(item.stock || 0) > Number(item.reorderAt || 0)).length;
  const totalStock = items.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const suppliers = new Set(items.map((item) => item.supplier).filter(Boolean)).size;

  function updateItem(id, patch) {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, ...patch };
        const status = Number(updated.stock || 0) <= Number(updated.reorderAt || 0) ? "Low stock" : "Good";
        return { ...updated, status };
      });

      saveInventory(next);
      return next;
    });
  }

  function addItem() {
    const next = {
      id: `inv-${Date.now()}`,
      item: "New material",
      category: "Consumables",
      stock: 0,
      reorderAt: 5,
      supplier: "New supplier",
      usedOn: "New job type",
      status: "Low stock",
      note: "Add material details.",
    };

    const updated = [next, ...items];
    setItems(updated);
    setSelectedId(next.id);
    saveInventory(updated);
  }

  function resetInventory() {
    setItems(defaults);
    setSelectedId(defaults[0]?.id || "");
    saveInventory(defaults);
  }

  function sendToCommand() {
    if (!selected) return;
    sendInventoryToCommand(selected);
    onNavigate?.("command");
  }

  return (
    <section className="freshInventoryPage">
      <div className="freshInventoryHero">
        <div>
          <span>Materials / inventory</span>
          <h1>Know what needs restocking before the job starts</h1>
          <p>Track job materials, consumables, safety gear, supplier notes and low-stock warnings.</p>
        </div>

        <div className="freshInventoryStats">
          <div><b>{items.length}</b><small>items</small></div>
          <div><b>{low}</b><small>low stock</small></div>
          <div><b>{good}</b><small>good</small></div>
          <div><b>{totalStock}</b><small>on hand</small></div>
        </div>
      </div>

      <div className="freshInventoryLayout">
        <aside className="freshInventoryList">
          <header>
            <div>
              <b>Stock list</b>
              <span>{suppliers} suppliers</span>
            </div>
            <button type="button" onClick={addItem}>Add</button>
          </header>

          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={selected?.id === item.id ? "active" : ""}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.item}</b>
              <span>{item.category}</span>
              <small>{item.stock} left · {item.status}</small>
            </button>
          ))}

          <button type="button" className="freshInventoryReset" onClick={resetInventory}>
            Reset inventory
          </button>
        </aside>

        {selected && (
          <article className="freshInventoryDetail">
            <div className="freshInventoryHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.item}</h2>
                <p>{selected.category} · {selected.supplier}</p>
              </div>

              <div className="freshInventoryHeadActions">
                <button type="button" onClick={sendToCommand}>Send to Command</button>
                <button type="button" onClick={() => onNavigate?.("expenses")}>Open Expenses</button>
                <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
              </div>
            </div>

            <div className="freshInventoryCards">
              <section>
                <span>Stock</span>
                <b>{selected.stock}</b>
                <p>Reorder when stock reaches {selected.reorderAt}.</p>
              </section>

              <section>
                <span>Used on</span>
                <b>{selected.usedOn}</b>
                <p>Connect materials to real job types.</p>
              </section>

              <section>
                <span>Supplier</span>
                <b>{selected.supplier}</b>
                <p>{selected.note}</p>
              </section>
            </div>

            <div className="freshInventoryForm">
              <label>
                <span>Item</span>
                <input value={selected.item} onChange={(event) => updateItem(selected.id, { item: event.target.value })} />
              </label>

              <label>
                <span>Category</span>
                <select value={selected.category} onChange={(event) => updateItem(selected.id, { category: event.target.value })}>
                  <option>Consumables</option>
                  <option>Materials</option>
                  <option>Safety</option>
                  <option>Equipment</option>
                  <option>Cleaning</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                <span>Status</span>
                <select value={selected.status} onChange={(event) => updateItem(selected.id, { status: event.target.value })}>
                  <option>Good</option>
                  <option>Low stock</option>
                  <option>Ordered</option>
                  <option>Out of stock</option>
                  <option>Archived</option>
                </select>
              </label>

              <label>
                <span>Stock</span>
                <input type="number" value={selected.stock} onChange={(event) => updateItem(selected.id, { stock: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Reorder at</span>
                <input type="number" value={selected.reorderAt} onChange={(event) => updateItem(selected.id, { reorderAt: Number(event.target.value || 0) })} />
              </label>

              <label>
                <span>Supplier</span>
                <input value={selected.supplier} onChange={(event) => updateItem(selected.id, { supplier: event.target.value })} />
              </label>

              <label className="wide">
                <span>Used on</span>
                <input value={selected.usedOn} onChange={(event) => updateItem(selected.id, { usedOn: event.target.value })} />
              </label>

              <label className="wide">
                <span>Note</span>
                <textarea value={selected.note} onChange={(event) => updateItem(selected.id, { note: event.target.value })} />
              </label>
            </div>

            <div className="freshInventoryActions">
              <button type="button" onClick={() => updateItem(selected.id, { stock: Number(selected.stock || 0) + 1 })}>+1 stock</button>
              <button type="button" onClick={() => updateItem(selected.id, { stock: Math.max(0, Number(selected.stock || 0) - 1) })}>Use 1</button>
              <button type="button" onClick={() => updateItem(selected.id, { status: "Ordered" })}>Mark ordered</button>
              <button type="button" onClick={() => onNavigate?.("expenses")}>Create expense</button>
              <button type="button" onClick={() => onNavigate?.("services")}>Open Services</button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
