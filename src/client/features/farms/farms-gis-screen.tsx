"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StatusModal, StatusModalVariant } from "@/src/client/components/modal/status-modal";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileSpreadsheet, Search, Upload } from "lucide-react";
import { exportRowsToExcel, exportRowsToPdf, parseExcelFile } from "@/src/client/lib/export-utils";

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
  allocated_cocoa_area: number | null;
  created_at: string;
}

interface FarmPhotoUpload {
  file: File;
  previewUrl: string;
  caption: string;
  category: "land_overview" | "production_area" | "cocoa_trees" | "harvest" | "other";
}

export function FarmsGISScreen() {
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [declaredPoints, setDeclaredPoints] = useState<Array<{ latitude: number; longitude: number; accuracy?: number }>>([]);
  const [allocatedPoints, setAllocatedPoints] = useState<Array<{ latitude: number; longitude: number; accuracy?: number }>>([]);
  const [gpsPoint, setGpsPoint] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [captureMode, setCaptureMode] = useState<"declared" | "allocated" | "gps">("declared");
  const [locationStatus, setLocationStatus] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [importing, setImporting] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; variant: StatusModalVariant; title: string; message: string }>({ open: false, variant: "info", title: "", message: "" });
  const [landPhotos, setLandPhotos] = useState<FarmPhotoUpload[]>([]);

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
        const newPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        if (captureMode === "declared") {
          setDeclaredPoints((points) => [...points, newPoint]);
          setLocationStatus(`${declaredPoints.length + 1} declared point(s) captured.`);
        } else if (captureMode === "allocated") {
          setAllocatedPoints((points) => [...points, newPoint]);
          setLocationStatus(`${allocatedPoints.length + 1} allocated point(s) captured.`);
        } else {
          setGpsPoint(newPoint);
          setLocationStatus("GPS point captured.");
        }
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
      const uploadedPhotos = [];
      for (let index = 0; index < landPhotos.length; index++) {
        setLocationStatus(`Uploading land photo ${index + 1} of ${landPhotos.length}...`);
        const farmFolder = String(form.get("farmName") || "unassigned").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        uploadedPhotos.push(await uploadLandPhoto(landPhotos[index], farmFolder));
      }
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
          declaredPoints,
          allocatedPoints,
          gpsPoint,
          photos: uploadedPhotos,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create farm");

      setShowForm(false);
      setDeclaredPoints([]);
      setAllocatedPoints([]);
      setGpsPoint(null);
      setLocationStatus("");
      setLandPhotos([]);
      await reloadFarms();
      setModal({ open: true, variant: "success", title: "Farm registered", message: `${data.farm.farm_code} was saved with its captured boundary.` });
      setFarms((prev) => [...prev, data.farm]);
    } catch (error) {
      setModal({ open: true, variant: "error", title: "Farm not saved", message: error instanceof Error ? error.message : "Unable to create farm." });
    } finally {
      setSubmitting(false);
    }
  }

  async function reloadFarms() {
    const response = await fetch("/api/farms");
    const data = await response.json();
    if (response.ok) setFarms(data.farms || []);
  }

  const filteredFarms = farms
    .filter((farm) => {
      const text = `${farm.farm_code} ${farm.farm_name || ""} ${farm.first_name} ${farm.last_name}`.toLowerCase();
      return text.includes(search.toLowerCase()) && (statusFilter === "all" || farm.status === statusFilter);
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.farm_name || a.farm_code).localeCompare(b.farm_name || b.farm_code);
      if (sortBy === "area") return Number(b.declared_area || b.calculated_area || 0) - Number(a.declared_area || a.calculated_area || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const declaredArea = farms.reduce((total, farm) => total + Number(farm.declared_area || farm.calculated_area || 0), 0);
  const gpsArea = farms.reduce((total, farm) => total + Number(farm.calculated_area || 0), 0);
  const cocoaArea = farms.reduce((total, farm) => total + Number(farm.allocated_cocoa_area || 0), 0);
  const areaChart = [
    { name: "Declared", area: Number(declaredArea.toFixed(2)) },
    { name: "GPS", area: Number(gpsArea.toFixed(2)) },
    { name: "Cocoa", area: Number(cocoaArea.toFixed(2)) },
  ];

  const exportColumns = [
    { header: "Farm Code", key: "farm_code" },
    { header: "Farm Name", key: "farm_name" },
    { header: "Farmer", key: "first_name" },
    { header: "Farmer ID", key: "farmer_code" },
    { header: "Declared Area (ha)", key: "declared_area" },
    { header: "GPS Area (ha)", key: "calculated_area" },
    { header: "Allocated Cocoa (ha)", key: "allocated_cocoa_area" },
    { header: "Status", key: "status" },
  ];

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseExcelFile(file);
      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const farmerCode = String(row["Farmer ID"] || row.farmer_code || "").trim();
        const farmer = farmers.find((option) => option.farmer_code === farmerCode);
        if (!farmer) { skipped++; continue; }
        const response = await fetch("/api/farms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            farmerId: farmer.id,
            farmName: row["Farm Name"] || row.farm_name,
            declaredArea: row["Declared Area (ha)"] || row.declared_area,
            allocatedCocoaArea: row["Allocated Cocoa (ha)"] || row.allocated_cocoa_area,
            cropType: "cocoa",
            declaredPoints: [], allocatedPoints: [], gpsPoint: undefined,
          }),
        });
        if (response.ok) imported++; else skipped++;
      }
      await reloadFarms();
      setModal({ open: true, variant: imported ? "success" : "warning", title: "Excel import complete", message: `${imported} farm(s) imported; ${skipped} skipped.` });
    } catch (importError) {
      setModal({ open: true, variant: "error", title: "Import failed", message: importError instanceof Error ? importError.message : "Unable to import Excel file." });
    } finally {
      setImporting(false);
    }
  }

  function addLandPhotos(files: FileList | null) {
    if (!files) return;
    const additions = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, 20 - landPhotos.length))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        category: "land_overview" as const,
      }));
    setLandPhotos((current) => [...current, ...additions]);
  }

  function removeLandPhoto(index: number) {
    setLandPhotos((current) => {
      URL.revokeObjectURL(current[index]?.previewUrl);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  function updateLandPhoto(index: number, field: "caption" | "category", value: string) {
    setLandPhotos((current) => current.map((photo, photoIndex) => photoIndex === index
      ? { ...photo, [field]: field === "category" ? value as FarmPhotoUpload["category"] : value }
      : photo));
  }

  async function uploadLandPhoto(photo: FarmPhotoUpload, farmCode: string) {
    const signatureResponse = await fetch("/api/media/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: `gocofa/farms/${farmCode}/land` }),
    });
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signature.error || "Unable to prepare land photo upload");

    const uploadData = new FormData();
    uploadData.append("file", photo.file);
    uploadData.append("timestamp", String(signature.timestamp));
    uploadData.append("folder", `gocofa/farms/${farmCode}/land`);
    uploadData.append("api_key", signature.apiKey);
    uploadData.append("signature", signature.signature);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: "POST",
      body: uploadData,
    });
    const uploaded = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploaded.error?.message || "Unable to upload land photo");

    return {
      photoUrl: uploaded.secure_url as string,
      publicId: uploaded.public_id as string,
      caption: photo.caption,
      category: photo.category,
      fileName: photo.file.name,
      mimeType: photo.file.type,
      fileSize: photo.file.size,
    };
  }

  const lastDeclaredPoint = declaredPoints[declaredPoints.length - 1];
  const lastAllocatedPoint = allocatedPoints[allocatedPoints.length - 1];

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
            <div className="flex flex-col gap-3 border-b border-emerald-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Farm map & boundaries</p>
                <p className="mt-1 text-xs text-slate-500">{locationStatus || "Capture declared land, cocoa allocation, and exact field location."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["declared", "allocated", "gps"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCaptureMode(mode)}
                    className={`h-9 rounded-xl px-3 text-xs font-bold ${captureMode === mode ? "bg-emerald-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
                  >
                    {mode === "declared" ? "Declared land" : mode === "allocated" ? "Cocoa area" : "Exact GPS"}
                  </button>
                ))}
                <button type="button" onClick={capturePoint} className="h-9 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">Capture point</button>
              </div>
            </div>

            <OpenStreetMap
              latitude={gpsPoint?.latitude || lastDeclaredPoint?.latitude || lastAllocatedPoint?.latitude}
              longitude={gpsPoint?.longitude || lastDeclaredPoint?.longitude || lastAllocatedPoint?.longitude}
              accuracy={gpsPoint?.accuracy || lastDeclaredPoint?.accuracy || lastAllocatedPoint?.accuracy}
              points={captureMode === "declared" ? declaredPoints : captureMode === "allocated" ? allocatedPoints : gpsPoint ? [gpsPoint] : []}
              height="320px"
            />

            <div className="grid gap-3 border-t border-emerald-100 p-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-xs text-slate-400">Declared polygon</p><strong className="text-sm text-slate-800">{declaredPoints.length} points</strong></div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-xs text-slate-400">Cocoa polygon</p><strong className="text-sm text-slate-800">{allocatedPoints.length} points</strong></div>
              <div className="rounded-xl bg-slate-50 px-3 py-2.5"><p className="text-xs text-slate-400">Exact GPS</p><strong className="text-sm text-slate-800">{gpsPoint ? `${gpsPoint.latitude.toFixed(6)}, ${gpsPoint.longitude.toFixed(6)}` : "Not captured"}</strong></div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">Land & production photos</p>
                <p className="mt-1 text-xs text-slate-500">Upload multiple photos showing the farmer&apos;s land and production area. Maximum 20 photos.</p>
              </div>
              <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-xs font-bold text-emerald-700">
                Choose photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addLandPhotos(event.target.files)} />
              </label>
            </div>

            {landPhotos.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {landPhotos.map((photo, index) => (
                  <div key={`${photo.file.name}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="relative h-36 bg-slate-100">
                      <Image src={photo.previewUrl} alt={photo.caption || `Land photo ${index + 1}`} fill unoptimized className="object-cover" />
                      <button type="button" onClick={() => removeLandPhoto(index)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-sm font-bold text-slate-700 shadow" aria-label="Remove photo">×</button>
                    </div>
                    <div className="grid gap-2 p-3">
                      <select value={photo.category} onChange={(event) => updateLandPhoto(index, "category", event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs text-slate-700">
                        <option value="land_overview">Land overview</option>
                        <option value="production_area">Production area</option>
                        <option value="cocoa_trees">Cocoa trees</option>
                        <option value="harvest">Harvest</option>
                        <option value="other">Other</option>
                      </select>
                      <input value={photo.caption} onChange={(event) => updateLandPhoto(index, "caption", event.target.value)} placeholder="Photo caption" className="h-9 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setDeclaredPoints([]); setAllocatedPoints([]); setGpsPoint(null); }} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button>
            <button type="submit" disabled={submitting || declaredPoints.length < 3 || allocatedPoints.length < 3 || !gpsPoint} className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Saving..." : "Save farm"}</button>
          </div>
        </form>
      )}

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 xl:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Area analytics</p>
          <p className="mt-1 text-sm font-bold text-slate-800">Declared vs GPS vs cocoa area (ha)</p>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f0fdf4" }} />
                <Bar dataKey="area" fill="#08783a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {[
            ['Total farms', farms.length, 'landscape'],
            ['Declared area', `${declaredArea.toFixed(2)} ha`, 'polyline'],
            ['GPS area', `${gpsArea.toFixed(2)} ha`, 'my_location'],
            ['Cocoa area', `${cocoaArea.toFixed(2)} ha`, 'eco']
          ].map(([label, value, icon]) => (
            <motion.div key={String(label)} initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl border border-slate-200/80 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
                <span className="material-symbols-outlined text-lg text-emerald-700">{icon}</span>
              </div>
              <p className="mt-3 text-xl font-bold text-slate-900">{value}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <section className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-3">
        <label className="grid min-w-48 flex-1 gap-1 text-[11px] font-bold uppercase text-slate-400">Search
          <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Farm or farmer"
              className="min-w-0 flex-1 bg-transparent text-sm normal-case text-slate-700 outline-none"
            />
          </span>
        </label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="verified">Verified</option>
            <option value="active">Active</option>
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">Sort
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700"
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="area">Area</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => exportRowsToExcel(filteredFarms as unknown as Record<string, unknown>[], exportColumns, "gocofa-farms-gis")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"
        >
          <FileSpreadsheet className="h-4 w-4" />Excel
        </button>
        <button
          type="button"
          onClick={() => exportRowsToPdf(filteredFarms as unknown as Record<string, unknown>[], exportColumns, "gocofa-farms-gis-report", "Farms & GIS Registry Report")}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"
        >
          <Download className="h-4 w-4" />PDF
        </button>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white">
          <Upload className="h-4 w-4" />{importing ? "Importing..." : "Import Excel"}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void handleImport(event.target.files?.[0])} />
        </label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
        <div className="border-b border-slate-100 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Farm registry</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{farms.length.toLocaleString()} registered farms</p>
        </div>
        {loading ? (
          <div className="grid min-h-56 place-items-center text-sm text-slate-400">Loading farms...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-5 py-3">Farm</th>
                  <th className="px-5 py-3">Farmer</th>
                  <th className="px-5 py-3">Declared area</th>
                  <th className="px-5 py-3">GPS area</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFarms.map((farm) => (
                  <tr key={farm.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">{farm.farm_name || farm.farm_code}</p>
                      <p className="text-xs text-slate-400">{farm.farm_code}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{farm.first_name} {farm.last_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{farm.declared_area ?? "—"} ha</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{farm.calculated_area ?? "—"} ha</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{farm.status}</span>
                    </td>
                  </tr>
                ))}
                {!farms.length && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No farms registered</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <StatusModal open={modal.open} variant={modal.variant} title={modal.title} message={modal.message} actionLabel="Continue" onClose={() => setModal((prev) => ({ ...prev, open: false }))} />
    </motion.div>
  );
}
