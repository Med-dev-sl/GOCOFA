"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, UserCheck, X } from "lucide-react";
import { StatusModal, StatusModalVariant } from "@/src/client/components/modal/status-modal";

const OpenStreetMap = dynamic(
  () => import("@/src/client/components/map/openstreet-map").then((module) => module.OpenStreetMap),
  { ssr: false, loading: () => <div className="gocofa-map-loading h-[260px]">Loading map...</div> },
);

interface Officer { id: string; employee_code: string; status: string; user_id: string; full_name: string; username: string }
interface FarmerOption { id: string; farmer_code: string; first_name: string; middle_name?: string; last_name: string }
interface FarmOption { id: string; farm_code: string; farm_name: string | null; farmer_id: string; first_name: string; last_name: string }
interface Visit {
  id: string; officer_name: string; employee_code: string; farmer_code: string | null;
  farmer_first_name: string | null; farmer_last_name: string | null; farm_code: string | null;
  farm_name: string | null; visit_type: string; purpose: string | null; visit_date: string;
  location: string | null; notes: string | null; status: string; photo_count: number;
  document_count: number; pending_followups: number;
}

export function FieldOperationsScreen() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [farmers, setFarmers] = useState<FarmerOption[]>([]);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; username: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [visitTypeFilter, setVisitTypeFilter] = useState("all");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [photos, setPhotos] = useState<Array<{ file: File; previewUrl: string; caption: string }>>([]);
  const [documents, setDocuments] = useState<Array<{ file: File; title: string; documentType: string }>>([]);
  const [observations, setObservations] = useState<Array<{ observation: string; recommendation: string; severity: string }>>([]);
  const [followups, setFollowups] = useState<Array<{ actionRequired: string; assignedTo: string; dueDate: string }>>([]);
  const [selectedFarmer, setSelectedFarmer] = useState("");
  const [modal, setModal] = useState<{ open: boolean; variant: StatusModalVariant; title: string; message: string }>({ open: false, variant: "info", title: "", message: "" });

  async function loadData() {
    setLoading(true);
    try {
      const [visitResponse, optionResponse] = await Promise.all([
        fetch("/api/field-operations"),
        fetch("/api/field-operations?options=true"),
      ]);
      const visitData = await visitResponse.json();
      const optionData = await optionResponse.json();
      if (!visitResponse.ok) throw new Error(visitData.error || "Unable to load field visits");
      if (!optionResponse.ok) throw new Error(optionData.error || "Unable to load field operation options");
      setVisits(visitData.visits || []);
      setOfficers(optionData.officers || []);
      setFarmers(optionData.farmers || []);
      setFarms(optionData.farms || []);
      setUsers(optionData.users || []);
    } catch (error) {
      setModal({ open: true, variant: "error", title: "Unable to load data", message: error instanceof Error ? error.message : "Field Operations data is unavailable." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  function captureLocation() {
    if (!navigator.geolocation) { setLocationStatus("Geolocation is not supported by this browser."); return; }
    setLocationStatus("Capturing field location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy });
        setLocationStatus("Field location captured successfully.");
      },
      () => setLocationStatus("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 },
    );
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotos((current) => [...current, ...Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, Math.max(0, 20 - current.length)).map((file) => ({ file, previewUrl: URL.createObjectURL(file), caption: "" }))]);
  }

  function addDocuments(files: FileList | null) {
    if (!files) return;
    setDocuments((current) => [...current, ...Array.from(files).slice(0, Math.max(0, 10 - current.length)).map((file) => ({ file, title: file.name, documentType: "supporting_document" }))]);
  }

  async function uploadFile(file: File, folder: string, title: string) {
    const signatureResponse = await fetch("/api/media/upload-signature", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder }) });
    const signature = await signatureResponse.json();
    if (!signatureResponse.ok) throw new Error(signature.error || `Unable to prepare ${title} upload`);

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("timestamp", String(signature.timestamp));
    uploadData.append("folder", folder);
    uploadData.append("api_key", signature.apiKey);
    uploadData.append("signature", signature.signature);
    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/auto/upload`, { method: "POST", body: uploadData });
    const uploaded = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploaded.error?.message || `Unable to upload ${title}`);
    return { url: uploaded.secure_url as string, publicId: uploaded.public_id as string };
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const uploadedPhotos = [];
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        const uploaded = await uploadFile(photo.file, "gocofa/field-visits/photos", "field visit photo");
        uploadedPhotos.push({ photoUrl: uploaded.url, publicId: uploaded.publicId, caption: photo.caption, category: "field_visit", fileName: photo.file.name, mimeType: photo.file.type, fileSize: photo.file.size });
      }

      const uploadedDocuments = [];
      for (let index = 0; index < documents.length; index++) {
        const document = documents[index];
        const uploaded = await uploadFile(document.file, "gocofa/field-visits/documents", "field visit document");
        uploadedDocuments.push({ documentUrl: uploaded.url, publicId: uploaded.publicId, title: document.title, documentType: document.documentType, fileName: document.file.name, mimeType: document.file.type, fileSize: document.file.size });
      }

      const response = await fetch("/api/field-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldOfficerId: form.get("fieldOfficerId") || undefined,
          farmerId: form.get("farmerId") || undefined,
          farmId: form.get("farmId") || undefined,
          visitType: form.get("visitType"),
          purpose: form.get("purpose"),
          visitDate: form.get("visitDate") || new Date().toISOString(),
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          locationAccuracy: coordinates?.accuracy,
          location: form.get("location"),
          notes: form.get("notes"),
          status: form.get("status"),
          observations,
          photos: uploadedPhotos,
          documents: uploadedDocuments,
          followups,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create field visit");

      setShowForm(false);
      setCoordinates(null);
      setLocationStatus("");
      setPhotos([]);
      setDocuments([]);
      setObservations([]);
      setFollowups([]);
      setSelectedFarmer("");
      await loadData();
      setModal({ open: true, variant: "success", title: "Field visit recorded", message: "The visit, evidence, observations, and follow-up actions were saved." });
    } catch (error) {
      setModal({ open: true, variant: "error", title: "Visit not saved", message: error instanceof Error ? error.message : "Unable to save the field visit." });
    } finally {
      setSubmitting(false);
    }
  }

  const filteredVisits = visits.filter((visit) => {
    const text = `${visit.officer_name} ${visit.employee_code} ${visit.farmer_code || ""} ${visit.farmer_first_name || ""} ${visit.farmer_last_name || ""} ${visit.farm_name || ""} ${visit.visit_type}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (visitTypeFilter === "all" || visit.visit_type === visitTypeFilter);
  });

  const availableFarms = farms.filter((farm) => !selectedFarmer || farm.farmer_id === selectedFarmer);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Operations / Field Operations</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Field visits & accountability</h2>
          <p className="mt-1 text-sm text-slate-500">Record officer visits, observations, evidence, and follow-up actions.</p>
        </div>
        <button type="button" onClick={() => setShowForm((open) => !open)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(4,120,87,.18)]">
          {showForm ? <X className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}{showForm ? "Close form" : "Record field visit"}
        </button>
      </div>

      {showForm && (
        <motion.form onSubmit={handleCreate} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.04)]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Field officer<select name="fieldOfficerId" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Use current signed-in officer</option>{officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.employee_code} · {officer.full_name}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Farmer<select name="farmerId" value={selectedFarmer} onChange={(event) => setSelectedFarmer(event.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select existing farmer</option>{farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.farmer_code} · {farmer.first_name} {farmer.middle_name ? `${farmer.middle_name} ` : ""}{farmer.last_name}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Farm<select name="farmId" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">No specific farm / general visit</option>{availableFarms.map((farm) => <option key={farm.id} value={farm.id}>{farm.farm_code} · {farm.farm_name || "Unnamed farm"}</option>)}</select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Visit type<select name="visitType" required className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Select type</option><option value="registration">Farmer registration</option><option value="farm_verification">Farm verification</option><option value="production_assessment">Production assessment</option><option value="training">Training</option><option value="certification_inspection">Certification inspection</option><option value="follow_up">Follow-up visit</option><option value="monitoring">General monitoring</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Visit date & time<input name="visitDate" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Visit status<select name="status" className="h-11 rounded-xl border border-slate-200 px-3 text-sm"><option value="completed">Completed</option><option value="scheduled">Scheduled</option><option value="cancelled">Cancelled</option></select></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">Purpose<input name="purpose" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Location description<input name="location" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" /></label>
            <label className="grid gap-1.5 text-xs font-semibold text-slate-600 sm:col-span-3">Visit notes<textarea name="notes" rows={3} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>
          </div>

          <div className="overflow-hidden rounded-2xl border border-emerald-100">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-4 py-3"><div><p className="text-sm font-bold text-slate-800">Officer GPS position</p><p className="mt-1 text-xs text-slate-500">{locationStatus || (coordinates ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)} · ±${coordinates.accuracy.toFixed(0)}m` : "Capture the officer's location at the visit.")}</p></div><button type="button" onClick={captureLocation} className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">Capture GPS</button></div>
            <OpenStreetMap latitude={coordinates?.latitude} longitude={coordinates?.longitude} accuracy={coordinates?.accuracy} height="260px" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Observations</p><button type="button" onClick={() => setObservations((items) => [...items, { observation: "", recommendation: "", severity: "normal" }])} className="text-xs font-bold text-emerald-700">+ Add observation</button></div>{observations.map((item, index) => <div key={index} className="mt-3 grid gap-2"><textarea value={item.observation} onChange={(event) => setObservations((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, observation: event.target.value } : row))} placeholder="Observation" className="min-h-16 rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={item.recommendation} onChange={(event) => setObservations((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, recommendation: event.target.value } : row))} placeholder="Recommended action" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><select value={item.severity} onChange={(event) => setObservations((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, severity: event.target.value } : row))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="normal">Normal</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>)}</div>
            <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Follow-up actions</p><button type="button" onClick={() => setFollowups((items) => [...items, { actionRequired: "", assignedTo: "", dueDate: "" }])} className="text-xs font-bold text-emerald-700">+ Add follow-up</button></div>{followups.map((item, index) => <div key={index} className="mt-3 grid gap-2"><input value={item.actionRequired} onChange={(event) => setFollowups((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, actionRequired: event.target.value } : row))} placeholder="Action required" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><select value={item.assignedTo} onChange={(event) => setFollowups((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, assignedTo: event.target.value } : row))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Assign later</option>{users.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}</select><input value={item.dueDate} onChange={(event) => setFollowups((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, dueDate: event.target.value } : row))} type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /></div>)}</div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Visit photos</p><label className="cursor-pointer text-xs font-bold text-emerald-700">Choose photos<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addPhotos(event.target.files)} /></label></div>{photos.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2">{photos.map((photo, index) => <div key={`${photo.file.name}-${index}`} className="overflow-hidden rounded-xl border border-slate-200"><div className="relative h-28"><Image src={photo.previewUrl} alt="Field visit evidence" fill unoptimized className="object-cover" /></div><input value={photo.caption} onChange={(event) => setPhotos((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, caption: event.target.value } : row))} placeholder="Photo caption" className="h-9 w-full border-t border-slate-200 px-2 text-xs" /></div>)}</div>}</div>
            <div className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Supporting documents</p><label className="cursor-pointer text-xs font-bold text-emerald-700">Choose documents<input type="file" multiple className="hidden" onChange={(event) => addDocuments(event.target.files)} /></label></div>{documents.map((document, index) => <div key={`${document.file.name}-${index}`} className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px]"><input value={document.title} onChange={(event) => setDocuments((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /><select value={document.documentType} onChange={(event) => setDocuments((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, documentType: event.target.value } : row))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="supporting_document">Supporting document</option><option value="inspection_report">Inspection report</option><option value="training_record">Training record</option><option value="certificate">Certificate</option></select></div>)}</div>
          </div>

          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={submitting} className="h-10 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Saving visit..." : "Save field visit"}</button></div>
        </motion.form>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {[['Total visits', visits.length], ['Completed', visits.filter((visit) => visit.status === 'completed').length], ['Photos', visits.reduce((total, visit) => total + Number(visit.photo_count || 0), 0)], ['Pending follow-ups', visits.reduce((total, visit) => total + Number(visit.pending_followups || 0), 0)]].map(([label, value]) => <motion.div key={String(label)} initial={{ scale: .96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></motion.div>)}
      </div>

      <section className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white p-3">
        <label className="grid min-w-48 flex-1 gap-1 text-[11px] font-bold uppercase text-slate-400">Search<span className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Officer, farmer, farm or visit type" className="min-w-0 flex-1 bg-transparent text-sm normal-case text-slate-700 outline-none" /></span></label>
        <label className="grid gap-1 text-[11px] font-bold uppercase text-slate-400">Visit type<select value={visitTypeFilter} onChange={(event) => setVisitTypeFilter(event.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm normal-case text-slate-700"><option value="all">All types</option><option value="registration">Registration</option><option value="farm_verification">Farm verification</option><option value="production_assessment">Production assessment</option><option value="training">Training</option><option value="certification_inspection">Certification inspection</option><option value="follow_up">Follow-up</option><option value="monitoring">Monitoring</option></select></label>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Visit registry</p><p className="mt-1 text-sm font-bold text-slate-800">{filteredVisits.length.toLocaleString()} recorded visits</p></div>{loading ? <div className="grid min-h-56 place-items-center text-sm text-slate-400">Loading field visits...</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50/80 text-xs uppercase tracking-[0.08em] text-slate-400"><tr><th className="px-5 py-3">Visit</th><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Farmer / Farm</th><th className="px-5 py-3">Location</th><th className="px-5 py-3">Evidence</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filteredVisits.map((visit) => <tr key={visit.id}><td className="px-5 py-4"><p className="text-sm font-semibold capitalize text-slate-800">{visit.visit_type.replaceAll("_", " ")}</p><p className="text-xs text-slate-400">{new Date(visit.visit_date).toLocaleString()}</p></td><td className="px-5 py-4"><p className="text-sm font-semibold text-slate-700">{visit.officer_name}</p><p className="text-xs text-slate-400">{visit.employee_code}</p></td><td className="px-5 py-4 text-sm text-slate-600"><p>{visit.farmer_first_name ? `${visit.farmer_first_name} ${visit.farmer_last_name}` : "—"}</p><p className="text-xs text-slate-400">{visit.farm_name || visit.farm_code || "No specific farm"}</p></td><td className="px-5 py-4 text-sm text-slate-500">{visit.location || "GPS captured"}</td><td className="px-5 py-4 text-sm text-slate-500">{visit.photo_count} photos · {visit.document_count} docs{visit.pending_followups > 0 ? ` · ${visit.pending_followups} pending` : ""}</td><td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold capitalize text-emerald-700">{visit.status}</span></td></tr>)}{!filteredVisits.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">No field visits found</td></tr>}</tbody></table></div>}</section>

      <StatusModal open={modal.open} variant={modal.variant} title={modal.title} message={modal.message} actionLabel="Continue" onClose={() => setModal((prev) => ({ ...prev, open: false }))} />
    </motion.div>
  );
}
