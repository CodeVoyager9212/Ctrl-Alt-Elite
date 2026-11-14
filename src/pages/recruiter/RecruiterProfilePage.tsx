import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { ProfileRow } from "../../types/database";
import "./RecruiterProfilePage.css";

type RecruiterContext = { user: User };

type RecruiterForm = {
  full_name: string;
  recruiter_position: string;
  contact_phone: string;
  company_name: string;
  company_location: string;
  company_website: string;
  company_description: string;
};

const emptyForm: RecruiterForm = {
  full_name: "",
  recruiter_position: "",
  contact_phone: "",
  company_name: "",
  company_location: "",
  company_website: "",
  company_description: "",
};

function formFromProfile(row: ProfileRow): RecruiterForm {
  return {
    full_name: row.full_name,
    recruiter_position: row.recruiter_position ?? "",
    contact_phone: row.contact_phone ?? "",
    company_name: row.company_name ?? "",
    company_location: row.company_location ?? "",
    company_website: row.company_website ?? "",
    company_description: row.company_description ?? "",
  };
}

function normalize(form: RecruiterForm): RecruiterForm {
  return {
    full_name: form.full_name.trim(),
    recruiter_position: form.recruiter_position.trim(),
    contact_phone: form.contact_phone.trim(),
    company_name: form.company_name.trim(),
    company_location: form.company_location.trim(),
    company_website: form.company_website.trim(),
    company_description: form.company_description.trim(),
  };
}

export default function RecruiterProfilePage() {
  const { user } = useOutletContext<RecruiterContext>();
  const [form, setForm] = useState<RecruiterForm>(emptyForm);
  const [original, setOriginal] = useState<RecruiterForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");
      const { data, error: loadError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .eq("account_type", "recruiter")
        .maybeSingle();
      if (!active) return;
      if (loadError || !data) {
        setError(loadError?.message ?? "Recruiter profile not found or unavailable.");
        setOriginal(null);
      } else {
        const loaded = formFromProfile(data);
        setForm(loaded);
        setOriginal(loaded);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [user.id]);

  function update<K extends keyof RecruiterForm>(field: K, value: RecruiterForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
  }

  const dirty = original !== null && JSON.stringify(form) !== JSON.stringify(original);
  const initials = form.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CC";

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || !original) return;
    const values = normalize(form);
    setError("");
    setSuccess("");
    if (!values.full_name) {
      setError("Full name is required.");
      return;
    }
    if (values.company_website) {
      try {
        const url = new URL(values.company_website);
        if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid protocol");
      } catch {
        setError("Enter a complete website URL starting with https:// or http://.");
        return;
      }
    }

    setSaving(true);
    try {
      const { data, error: saveError } = await supabase
        .from("profiles")
        .update({
          full_name: values.full_name,
          recruiter_position: values.recruiter_position || null,
          contact_phone: values.contact_phone || null,
          company_name: values.company_name || null,
          company_location: values.company_location || null,
          company_website: values.company_website || null,
          company_description: values.company_description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .eq("account_type", "recruiter")
        .select("*")
        .maybeSingle();
      if (saveError) throw saveError;
      if (!data) throw new Error("No recruiter profile was updated.");
      const saved = formFromProfile(data);
      setForm(saved);
      setOriginal(saved);
      setSuccess("Profile saved successfully.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="recruiter-profile">
      <header className="recruiter-profile__heading">
        <p className="recruiter-profile__eyebrow">Recruiter workspace</p>
        <h1>Profile</h1>
        <p>Manage your professional and company information.</p>
      </header>

      {loading && <p role="status">Loading your profile...</p>}
      {error && <p className="recruiter-profile__error" role="alert">{error}</p>}

      {!loading && original && (
        <form className="recruiter-profile__form" onSubmit={(event) => void handleSave(event)}>
          <section className="recruiter-profile__card">
            <div className="recruiter-profile__identity">
              <span className="recruiter-profile__avatar" aria-hidden="true">{initials}</span>
              <div>
                <h2>{form.full_name || "Your name"}</h2>
                <p>{user.email ?? "Email unavailable"}</p>
                <span className="recruiter-profile__tag">Recruiter account</span>
              </div>
            </div>
          </section>

          <section className="recruiter-profile__card">
            <h2>Personal information</h2>
            <div className="recruiter-profile__grid">
              <label>
                Full name *
                <input required maxLength={160} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} disabled={saving} />
              </label>
              <label>
                Position / job title
                <input maxLength={160} placeholder="e.g. Talent Acquisition Specialist" value={form.recruiter_position} onChange={(e) => update("recruiter_position", e.target.value)} disabled={saving} />
              </label>
              <label>
                Account email
                <input type="email" readOnly value={user.email ?? ""} title="Change your email through account settings." />
                <small>Managed through your account authentication.</small>
              </label>
              <label>
                Contact phone
                <input type="tel" maxLength={40} placeholder="e.g. +1 514 555 0123" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} disabled={saving} />
              </label>
            </div>
          </section>

          <section className="recruiter-profile__card">
            <h2>Company information</h2>
            <div className="recruiter-profile__grid">
              <label>
                Company name
                <input maxLength={180} placeholder="Your organization" value={form.company_name} onChange={(e) => update("company_name", e.target.value)} disabled={saving} />
              </label>
              <label>
                Company location
                <input maxLength={220} placeholder="e.g. Montreal, QC" value={form.company_location} onChange={(e) => update("company_location", e.target.value)} disabled={saving} />
              </label>
              <label className="recruiter-profile__full">
                Company website
                <input type="url" placeholder="https://example.com" value={form.company_website} onChange={(e) => update("company_website", e.target.value)} disabled={saving} />
              </label>
              <label className="recruiter-profile__full">
                Company description
                <textarea rows={6} placeholder="Describe your organization and what it does." value={form.company_description} onChange={(e) => update("company_description", e.target.value)} disabled={saving} />
              </label>
            </div>
          </section>

          <div className="recruiter-profile__actions">
            <span aria-live="polite">{success}</span>
            <button type="submit" className="button button--primary" disabled={saving || !dirty}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
