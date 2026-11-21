"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { StatusModal, StatusModalVariant } from "@/src/client/components/modal/status-modal";

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
  const [modal, setModal] = useState<{
    open: boolean;
    variant: StatusModalVariant;
    title: string;
    message: string;
  }>({ open: false, variant: "info", title: "", message: "" });

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
          photoUrl,
          identificationPhotoUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create farmer");
      setShowForm(false);
      setSelectedDistrict("");
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

  const filtered = farmers.filter((farmer) => {
    const text = `${farmer.farmer_code} ${farmer.first_name} ${farmer.middle_name || ""} ${farmer.last_name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

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

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["All farmers", farmers.length, "groups"],
          ["Draft", farmers.filter((farmer) => farmer.status === "draft").length, "edit_note"],
          ["Verified", farmers.filter((farmer) => farmer.status === "verified" || farmer.status === "active").length, "verified"],
        ].map(([label, value, icon]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,.035)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
              <span className="material-symbols-outlined text-lg text-emerald-700">{icon}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{Number(value).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Registry</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{farmers.length.toLocaleString()} registered farmers</p>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 sm:w-72">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search farmers"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none"
            />
          </label>
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
