"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatusModal, StatusModalVariant } from "@/src/client/components/modal/status-modal";

const OpenStreetMap = dynamic(
  () => import("@/src/client/components/map/openstreet-map").then((module) => module.OpenStreetMap),
  { ssr: false, loading: () => <div className="gocofa-map-loading h-[320px]">Loading map...</div> },
);

interface FarmerOption {
  id: string;
  farmer_code: string;
  first_name: string;
  last_name: string;
}

interface Farm {
  id: string;
  farm_code: string;
  farm_name: string | null;
  declared_area: number | null;
  calculated_area: number | null;
  status: string;
  first_name: string;
  last_name: string;
  farmer_code: string;
}

export function FarmsGISScreen() {
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [coordinates, setCoordinates] = useState<Array<{ latitude: number; longitude: number; accuracy?: number }>>([]);
  const [locationStatus, setLocationStatus] = useState("");
  const [modal, setModal] = useState<{ open: boolean; variant: StatusModalVariant; title: string; message: string }>({ open: false, variant: "info", title: "", message: "" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitialData() {
      try {
        const [farmerResponse, farmResponse] = await Promise.all([
          fetch("/api/farms/farmer-options", { signal: controller.signal }),
          fetch("/api/farms", { signal: controller.signal }),
        ]);
        const farmerData = await farmerResponse.json();
        const farmData = await farmResponse.json();
        if (!farmerResponse.ok) throw new Error(farmerData.error || "Unable to load farmers");
        if (!farmResponse.ok) throw new Error(farmData.error || "Unable to load farms");
        if (!controller.signal.aborted) {
          setFarmers(farmerData.farmers || []);
          setFarms(farmData.farms || []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setModal({ open: true, variant: "error", title: "Unable to load data", message: error instanceof Error ? error.message : "Farms & GIS data is unavailable." });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInitialData();
    return () => controller.abort();
  }, []);

  function capturePoint() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by this browser.");
      return;
    }

    setLocationStatus("Capturing boundary point...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates((points) => [...points, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }]);
        setLocationStatus(`${coordinates.length + 1} boundary point(s) captured.`);
      },
      () => setLocationStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 },
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: form.get("farmerId"),
          farmName: form.get("farmName"),
          declaredArea: form.get("declaredArea"),
          allocatedCocoaArea: form.get("allocatedCocoaArea"),
          ownershipType: form.get("ownershipType"),
          farmAge: form.get("farmAge"),
          cropType: form.get("cropType"),
          variety: form.get("variety"),
          productionEstimate: form.get("productionEstimate"),
          points: coordinates,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create farm");

      setShowForm(false);
      setCoordinates([]);
      setLocationStatus("");
      setModal({ open: true, variant: "success", title: "Farm registered", message: `${data.farm.farm_code} was saved with its captured boundary.` });
    } catch (error) {
      setModal({ open: true, variant: "error", title: "Farm not saved", message: error instanceof Error ? error.message : "Unable to create farm." });
    } finally {
      setSubmitting(false);
    }
  }

  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Operations / Farms & GIS</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Farm registry & boundaries</h2>
          <p className="mt-1 text-sm text-slate-500">Register farms and capture GPS boundary points.</p>
        </div>
        <button type="button" onClick={() => setShowForm((open) => !open)} className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,120,87,.18)]">
          {showForm ? "Close form" : "Register farm"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Farmer<select name="farmerId" required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none"><option value="">Select farmer</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.farmer_code} · {farmer.first_name} {farmer.last_name}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Farm name<input name="farmName" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Declared area (ha)<input name="declaredArea" type="number" step="0.01" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Allocated cocoa area (ha)<input name="allocatedCocoaArea" type="number" step="0.01" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Ownership<select name="ownershipType" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none"><option value="owned">Owned</option><option value="leased">Leased</option><option value="family">Family land</option><option value="shared">Shared</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Farm age (years)<input name="farmAge" type="number" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Crop type<input name="cropType" defaultValue="cocoa" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Variety<input name="variety" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Production estimate<input name="productionEstimate" type="number" step="0.01" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none" /></label>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3">
              <div><p className="text-sm font-bold text-slate-800">Farm boundary</p><p className="mt-1 text-xs text-slate-500">{locationStatus || `${coordinates.length} boundary point(s) captured`}</p></div>
              <button type="button" onClick={capturePoint} className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">Capture point</button>
            </div>
            <OpenStreetMap latitude={lastPoint?.latitude} longitude={lastPoint?.longitude} accuracy={lastPoint?.accuracy} points={coordinates} height="320px" />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setCoordinates([]); }} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting || coordinates.length < 3} className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Saving..." : "Save farm"}</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
        <div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Farm registry</p><p className="mt-1 text-sm font-bold text-slate-800">{farms.length.toLocaleString()} registered farms</p></div>
        {loading ? <div className="grid min-h-56 place-items-center text-sm text-slate-400">Loading farms...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-slate-400"><tr><th className="px-5 py-3">Farm</th><th className="px-5 py-3">Farmer</th><th className="px-5 py-3">Declared area</th><th className="px-5 py-3">GPS area</th><th className="px-5 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {farms.map((farm) => <tr key={farm.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{farm.farm_name || farm.farm_code}</p><p className="text-xs text-slate-400">{farm.farm_code}</p></td><td className="px-5 py-4 text-sm text-slate-600">{farm.first_name} {farm.last_name}</td><td className="px-5 py-4 text-sm text-slate-600">{farm.declared_area ?? "—"} ha</td><td className="px-5 py-4 text-sm text-slate-600">{farm.calculated_area ?? "—"} ha</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{farm.status}</span></td></tr>)}
                {!farms.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No farms registered</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <StatusModal open={modal.open} variant={modal.variant} title={modal.title} message={modal.message} actionLabel="Continue" onClose={() => setModal((prev) => ({ ...prev, open: false }))} />
    </motion.div>
  );
}
