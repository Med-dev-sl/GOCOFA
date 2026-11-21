"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Download, FileSpreadsheet, Search, Upload, UserPlus, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { StatusModal, StatusModalVariant } from "@/src/client/components/modal/status-modal";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { exportRowsToExcel, exportRowsToPdf, parseExcelFile } from "@/src/client/lib/export-utils";

const OpenStreetMap = dynamic(
  () => import("@/src/client/components/map/openstreet-map").then((module) => module.OpenStreetMap),
  { ssr: false, loading: () => <div className="gocofa-map-loading h-[280px]">Loading map...</div> },
);

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
  photo_url: string | null;
  created_at: string;
}

export function FarmersScreen() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [districtOptions, setDistrictOptions] = useState<Array<{ id: string; name: string; chiefdoms: Array<{ id: string; name: string }> }>>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [cooperatives, setCooperatives] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [selectedCooperative, setSelectedCooperative] = useState("");
  const [newCooperativeName, setNewCooperativeName] = useState("");
  const [creatingCooperative, setCreatingCooperative] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    variant: StatusModalVariant;
    title: string;
    message: string;
  }>({ open: false, variant: "info", title: "", message: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [importing, setImporting] = useState(false);

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
      try {
        const locationResponse = await fetch("/api/locations/eastern-province", { signal: controller.signal });
        const locationData = await locationResponse.json();
        if (locationResponse.ok) setDistrictOptions(locationData.districts || []);

        const response = await fetch("/api/farmers", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load farmers");
        setFarmers(data.farmers);

        const cooperativeResponse = await fetch("/api/cooperatives", { signal: controller.signal });
        const cooperativeData = await cooperativeResponse.json();
        if (cooperativeResponse.ok) setCooperatives(cooperativeData.cooperatives || []);
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
      const passportPhoto = form.get("passportPhoto") as File | null;
      const identificationPhoto = form.get("identificationPhoto") as File | null;
      const photoUrl = await uploadToCloudinary(passportPhoto?.size ? passportPhoto : null, "gocofa/farmers/passport");
      const identificationPhotoUrl = await uploadToCloudinary(identificationPhoto?.size ? identificationPhoto : null, "gocofa/farmers/identifications");

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
          nationality: form.get("nationality"),
          maritalStatus: form.get("maritalStatus"),
          educationLevel: form.get("educationLevel"),
          occupation: form.get("occupation"),
          householdSize: form.get("householdSize"),
          village: form.get("village"),
          alternativeAddress: form.get("alternativeAddress"),
          identificationType: form.get("identificationType"),
          identificationNumber: form.get("identificationNumber"),
          registrationSource: "field_officer",
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          locationAccuracy: coordinates?.accuracy,
          districtId: form.get("districtId") || undefined,
          chiefdomId: form.get("chiefdomId") || undefined,
          cooperativeId: selectedCooperative || undefined,
          photoUrl,
          identificationPhotoUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create farmer");
      setShowForm(false);
      setSelectedDistrict("");
      setSelectedCooperative("");
      setNewCooperativeName("");
      setCoordinates(null);
      setLocationStatus("");
      setModal({
        open: true,
        variant: "success",
        title: "Farmer registered",
        message: data.farmer?.farmer_code
          ? `Farmer ${data.farmer.farmer_code} was saved successfully.`
          : "The farmer record was saved successfully.",
      });
      await loadFarmers();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Unable to create farmer";
      setError(message);
      setModal({ open: true, variant: "error", title: "Farmer not saved", message });
    } finally {
      setSubmitting(false);
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by this browser.");
      return;
    }

    setLocationStatus("Capturing location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationStatus("Location captured successfully.");
      },
      () => setLocationStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function uploadToCloudinary(file: File | null, folder: string) {
    if (!file) return null;

    const signatureResponse = await fetch("/api/media/upload-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signature.error || "Unable to prepare photo upload");

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("timestamp", String(signature.timestamp));
    uploadData.append("folder", folder);
    uploadData.append("api_key", signature.apiKey);
    uploadData.append("signature", signature.signature);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: "POST",
      body: uploadData,
    });
    const uploaded = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploaded.error?.message || "Unable to upload photo");

    return uploaded.secure_url as string;
  }

  const filtered = farmers
    .filter((farmer) => {
      const text = `${farmer.farmer_code} ${farmer.first_name} ${farmer.middle_name || ""} ${farmer.last_name}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || farmer.status === statusFilter;
      const registrationDate = new Date(farmer.created_at).getTime();
      const matchesFrom = !dateFrom || registrationDate >= new Date(`${dateFrom}T00:00:00`).getTime();
      const matchesTo = !dateTo || registrationDate <= new Date(`${dateTo}T23:59:59`).getTime();
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    })
    .sort((a, b) => {
      if (sortBy === "name") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      if (sortBy === "code") return a.farmer_code.localeCompare(b.farmer_code);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const statusChart = ["draft", "pending", "verified", "active"].map((status) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    farmers: farmers.filter((farmer) => farmer.status === status || (status === "active" && farmer.status === "verified")).length,
  }));

  const exportColumns = [
    { header: "Farmer ID", key: "farmer_code" },
    { header: "First Name", key: "first_name" },
    { header: "Middle Name", key: "middle_name" },
    { header: "Last Name", key: "last_name" },
    { header: "District", key: "district_name" },
    { header: "Cooperative", key: "cooperative_name" },
    { header: "Phone", key: "primary_phone" },
    { header: "Status", key: "status" },
    { header: "Registered", key: "created_at" },
  ];

  async function handleImport(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const rows = await parseExcelFile(file);
      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        const firstName = String(row["First Name"] || row.firstName || row["first_name"] || "").trim();
        const lastName = String(row["Last Name"] || row.lastName || row["last_name"] || "").trim();
        if (!firstName || !lastName) { skipped++; continue; }
        const response = await fetch("/api/farmers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName,
            middleName: row["Middle Name"] || row.middleName || null,
            lastName,
            phone: row.Phone || row.phone || null,
            identificationType: row["Identification Type"] || row.identificationType || "national_id",
            identificationNumber: row["Identification Number"] || row.identificationNumber || null,
            registrationSource: "excel_import",
          }),
        });
        if (response.ok) imported++; else skipped++;
      }
      await loadFarmers();
      setModal({ open: true, variant: imported ? "success" : "warning", title: "Excel import complete", message: `${imported} farmer(s) imported; ${skipped} skipped.` });
    } catch (importError) {
      setModal({ open: true, variant: "error", title: "Import failed", message: importError instanceof Error ? importError.message : "Unable to import Excel file." });
    } finally {
      setImporting(false);
    }
  }

  async function createCooperative() {
    const name = newCooperativeName.trim();
    if (!name) return;
    setCreatingCooperative(true);
    try {
      const response = await fetch("/api/cooperatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, districtId: selectedDistrict || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create cooperative");
      setCooperatives((current) => data.existing
        ? current
        : [...current, data.cooperative].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCooperative(data.cooperative.id);
      setNewCooperativeName("");
      setModal({ open: true, variant: data.existing ? "info" : "success", title: data.existing ? "Cooperative found" : "Cooperative added", message: data.existing ? `${data.cooperative.name} was already available and was selected.` : `${data.cooperative.name} was added and selected.` });
    } catch (createError) {
      setModal({ open: true, variant: "error", title: "Cooperative not saved", message: createError instanceof Error ? createError.message : "Unable to save cooperative" });
    } finally {
      setCreatingCooperative(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Operations / Farmers</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Farmer registry</h2>
          <p className="mt-1 text-sm text-slate-500">Manage farmer profiles, contacts, and registration records.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,120,87,.18)] transition hover:bg-emerald-800"
        >
          {showForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showForm ? "Close form" : "Add farmer"}
        </button>
      </div>

      {showForm && (
        <motion.form
          onSubmit={handleCreate}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              First name
              <input name="firstName" required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Middle name
              <input name="middleName" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Last name
              <input name="lastName" required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Gender
              <select name="gender" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Date of birth
              <input name="dateOfBirth" type="date" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Primary phone
              <input name="phone" type="tel" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Alternative phone
              <input name="alternativePhone" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Nationality
              <input name="nationality" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Marital status
              <select name="maritalStatus" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select marital status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Education level
              <select name="educationLevel" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select education level</option>
                <option value="none">No formal education</option>
                <option value="primary">Primary</option>
                <option value="junior_secondary">Junior secondary</option>
                <option value="senior_secondary">Senior secondary</option>
                <option value="vocational">Vocational</option>
                <option value="tertiary">Tertiary</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Occupation
              <select name="occupation" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select occupation</option>
                <option value="farmer">Farmer</option>
                <option value="cooperative_member">Cooperative member</option>
                <option value="trader">Trader</option>
                <option value="driver">Driver</option>
                <option value="artisan">Artisan</option>
                <option value="student">Student</option>
                <option value="public_servant">Public servant</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Household size
              <input name="householdSize" type="number" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              District
              <select name="districtId" value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select district</option>
                {districtOptions.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Chiefdom
              <select name="chiefdomId" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select chiefdom</option>
                {districtOptions.find((district) => district.id === selectedDistrict)?.chiefdoms.map((chiefdom) => <option key={chiefdom.id} value={chiefdom.id}>{chiefdom.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">
              Cooperative
              <select value={selectedCooperative} onChange={(event) => setSelectedCooperative(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">No cooperative / select cooperative</option>
                {cooperatives.map((cooperative) => <option key={cooperative.id} value={cooperative.id}>{cooperative.name}{cooperative.code ? ` · ${cooperative.code}` : ""}</option>)}
              </select>
              <span className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input value={newCooperativeName} onChange={(event) => setNewCooperativeName(event.target.value)} placeholder="Cooperative name not in the list" className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600" />
                <button type="button" disabled={creatingCooperative || !newCooperativeName.trim()} onClick={() => void createCooperative()} className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 disabled:opacity-50">
                  {creatingCooperative ? "Adding..." : "Add cooperative"}
                </button>
              </span>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Village
              <input name="village" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Alternative address
              <input name="alternativeAddress" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              Identification type
              <select name="identificationType" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600">
                <option value="">Select identification</option>
                <option value="national_id">National ID</option>
                <option value="voters_id">Voters ID</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
              National ID number
              <input name="identificationNumber" required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50" />
            </label>
          </div>
          <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              Farmer passport photo
              <input
                name="passportPhoto"
                type="file"
                accept="image/*"
                className="block w-full rounded-xl border border-slate-200 bg-white text-sm file:mr-3 file:border-0 file:bg-emerald-50 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-emerald-700"
              />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-slate-600">
              National ID photo
              <input
                name="identificationPhoto"
                type="file"
                accept="image/*"
                required
                className="block w-full rounded-xl border border-slate-200 bg-white text-sm file:mr-3 file:border-0 file:bg-emerald-50 file:px-3 file:py-2.5 file:text-xs file:font-bold file:text-emerald-700"
              />
            </label>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Field location</p>
                <p className="mt-1 text-xs text-slate-500">{locationStatus || (coordinates ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)} · ±${coordinates.accuracy.toFixed(0)}m` : "Capture the farmer's current GPS position.")}</p>
              </div>
              <button type="button" onClick={captureLocation} className="h-10 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">Capture GPS</button>
            </div>
            <OpenStreetMap
              latitude={coordinates?.latitude}
              longitude={coordinates?.longitude}
              accuracy={coordinates?.accuracy}
              height="280px"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? "Saving..." : "Save farmer"}
            </button>
          </div>
        </motion.form>
      )}

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid gap-3 xl:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.035)]">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Registration analytics</p><p className="mt-1 text-sm font-bold text-slate-800">Farmers by status</p></div>
            <BarChart3 className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={statusChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid stroke="#eef2f0" vertical={false} /><XAxis dataKey="status" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f0fdf4" }} /><Bar dataKey="farmers" fill="#08783a" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {[
            ["All farmers", farmers.length, "groups"],
            ["Draft", farmers.filter((farmer) => farmer.status === "draft").length, "edit_note"],
            ["Verified", farmers.filter((farmer) => farmer.status === "verified" || farmer.status === "active").length, "verified"],
          ].map(([label, value, icon]) => (
            <motion.div key={String(label)} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.035)]">
              <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p><span className="material-symbols-outlined text-lg text-emerald-700">{icon}</span></div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{Number(value).toLocaleString()}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <section className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_30px_rgba(15,23,42,.03)]">
        <label className="grid min-w-48 flex-1 gap-1 text-[11px] font-bold uppercase text-slate-400">Search
          <span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or farmer ID" className="min-w-0 flex-1 bg-transparent text-sm normal-case text-slate-700 outline-none" /></span>
        </label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700"><option value="all">All statuses</option><option value="draft">Draft</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="active">Active</option></select></label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">From<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700" /></label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">To<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700" /></label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">Sort<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700"><option value="newest">Newest</option><option value="name">Name</option><option value="code">Farmer ID</option></select></label>
        <button type="button" onClick={() => exportRowsToExcel(filtered as unknown as Record<string, unknown>[], exportColumns, "gocofa-farmers")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700"><FileSpreadsheet className="h-4 w-4" />Excel</button>
        <button type="button" onClick={() => exportRowsToPdf(filtered as unknown as Record<string, unknown>[], exportColumns, "gocofa-farmer-registry", "Farmer Registry Report")} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"><Download className="h-4 w-4" />PDF</button>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white"><Upload className="h-4 w-4" />{importing ? "Importing..." : "Import Excel"}<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void handleImport(event.target.files?.[0])} /></label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Registry</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{farmers.length.toLocaleString()} registered farmers</p>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-56 place-items-center text-sm text-slate-400">Loading farmers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-5 py-3">Farmer</th>
                  <th className="px-5 py-3">Farmer ID</th>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Cooperative</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((farmer) => (
                  <tr key={farmer.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {farmer.photo_url ? (
                          <Image
                            src={farmer.photo_url}
                            alt={`${farmer.first_name} ${farmer.last_name}`}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-emerald-50"
                          />
                        ) : (
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                            {farmer.first_name.charAt(0)}{farmer.last_name.charAt(0)}
                          </span>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {farmer.first_name} {farmer.middle_name ? `${farmer.middle_name} ` : ""}
                            {farmer.last_name}
                          </p>
                          <p className="text-xs text-slate-400">Registered {new Date(farmer.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-600">{farmer.farmer_code}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{farmer.district_name || "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{farmer.cooperative_name || "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{farmer.primary_phone || "—"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{farmer.status}</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No farmers found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <StatusModal
        open={modal.open}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        actionLabel="Continue"
        onClose={() => setModal((prev) => ({ ...prev, open: false }))}
      />
    </motion.div>
  );
}
