"use client";

import { FormEvent, useEffect, useState } from "react";

interface Farmer {
  id: string;
  farmer_code: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  status: string;
  district_name: string | null;
  cooperative_name: string | null;
  primary_phone: string | null;
  created_at: string;
}

export function FarmersScreen() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function loadFarmers() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/farmers");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load farmers");
      setFarmers(data.farmers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load farmers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialFarmers() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/farmers", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load farmers");
        setFarmers(data.farmers);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load farmers");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInitialFarmers();

    return () => controller.abort();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          middleName: form.get("middleName"),
          lastName: form.get("lastName"),
          gender: form.get("gender"),
          dateOfBirth: form.get("dateOfBirth"),
          phone: form.get("phone"),
          alternativePhone: form.get("alternativePhone"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create farmer");
      event.currentTarget.reset();
      setShowForm(false);
      await loadFarmers();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create farmer");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = farmers.filter((farmer) => {
    const text = `${farmer.farmer_code} ${farmer.first_name} ${farmer.middle_name || ""} ${farmer.last_name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="farmers-module">
      <div className="farmers-module__heading">
        <div>
          <p>Operations / Farmers</p>
          <h2>Farmer registry</h2>
        </div>
        <button type="button" className="farmers-add-button" onClick={() => setShowForm((open) => !open)}>
          <span className="material-symbols-outlined">person_add</span>
          Add farmer
        </button>
      </div>

      {showForm && (
        <form className="farmer-form" onSubmit={handleCreate}>
          <div className="farmer-form__grid">
            <label><span>First name</span><input name="firstName" required /></label>
            <label><span>Middle name</span><input name="middleName" /></label>
            <label><span>Last name</span><input name="lastName" required /></label>
            <label><span>Gender</span><select name="gender"><option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
            <label><span>Date of birth</span><input name="dateOfBirth" type="date" /></label>
            <label><span>Primary phone</span><input name="phone" type="tel" /></label>
            <label><span>Alternative phone</span><input name="alternativePhone" type="tel" /></label>
          </div>
          <div className="farmer-form__actions">
            <button type="button" className="farmer-form__cancel" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="farmer-form__submit" disabled={submitting}>{submitting ? "Saving..." : "Save farmer"}</button>
          </div>
        </form>
      )}

      {error && <div className="farmers-error">{error}</div>}

      <div className="farmers-table-card">
        <div className="farmers-table-card__toolbar">
          <div>
            <p>Registered farmers</p>
            <strong>{farmers.length.toLocaleString()}</strong>
          </div>
          <label className="farmers-search">
            <span className="material-symbols-outlined">search</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search farmer" />
          </label>
        </div>

        {loading ? (
          <div className="farmers-loading"><span className="material-symbols-outlined">progress_activity</span>Loading farmers...</div>
        ) : (
          <div className="farmers-table-wrap">
            <table className="farmers-table">
              <thead><tr><th>Farmer</th><th>Farmer ID</th><th>District</th><th>Cooperative</th><th>Phone</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((farmer) => (
                  <tr key={farmer.id}>
                    <td><div className="farmer-name"><span>{farmer.first_name.charAt(0)}{farmer.last_name.charAt(0)}</span><div><strong>{farmer.first_name} {farmer.middle_name ? `${farmer.middle_name} ` : ""}{farmer.last_name}</strong><small>Registered {new Date(farmer.created_at).toLocaleDateString()}</small></div></div></td>
                    <td>{farmer.farmer_code}</td>
                    <td>{farmer.district_name || "—"}</td>
                    <td>{farmer.cooperative_name || "—"}</td>
                    <td>{farmer.primary_phone || "—"}</td>
                    <td><span className={`farmer-status farmer-status--${farmer.status}`}>{farmer.status}</span></td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={6}><div className="farmers-empty">No farmers found.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
