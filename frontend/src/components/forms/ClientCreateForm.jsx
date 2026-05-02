import React, { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ClientCreateForm({ onSuccess, onCancel, submitLabel = "Create client" }) {
  const { post, loading } = useApi();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await post("/clients", formData);
    if (result?.success) onSuccess?.(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-full flex flex-col"><div className="space-y-4 pb-28">
      <div><Label htmlFor="name">Name *</Label><Input id="name" name="name" value={formData.name} onChange={handleChange} required /></div>
      <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} /></div>
      <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" value={formData.phone} onChange={handleChange} /></div>
      <div><Label htmlFor="address">Address</Label><Input id="address" name="address" value={formData.address} onChange={handleChange} /></div>
      <div><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} /></div>
      <div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3"><button type="button" className="px-button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="px-button-primary" disabled={loading}>{loading ? "Saving..." : submitLabel}</button></div>
    </div></form>
  );
}
