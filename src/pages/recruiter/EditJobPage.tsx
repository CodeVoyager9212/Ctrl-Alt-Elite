
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { toDateTimeLocalValue } from "../../lib/applications";
import type { JobRow, JobUpdate } from "../../types/database";
import "./CreateJobPage.css";
import "./EditJobPage.css";

type RecruiterContext = { user: User };

type JobForm = {
  title: string;
  company_name: string;
  location: string;
  category: string;
  work_mode: JobRow["work_mode"];
  employment_type: JobRow["employment_type"];
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  salary_period: "Hourly" | "Monthly" | "Yearly";
  summary: string;
  description: string;
  requirements: string;
  responsibilities: string;
  application_deadline: string;
};

function toForm(job: JobRow): JobForm {
  return {
    title: job.title,
    company_name: job.company_name,
    location: job.location,
    category: job.category,
    work_mode: job.work_mode,
    employment_type: job.employment_type,
    salary_min: job.salary_min?.toString() ?? "",
    salary_max: job.salary_max?.toString() ?? "",
    salary_currency: job.salary_currency ?? "CAD",
    salary_period: job.salary_period ?? "Yearly",
    summary: job.summary,
    description: job.description,
    requirements: job.requirements ?? "",
    responsibilities: job.responsibilities ?? "",
    application_deadline: job.application_deadline ?? "",
  };
}

export default function EditJobPage() {
  const { user } = useOutletContext<RecruiterContext>();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobRow | null>(null);
  const [form, setForm] = useState<JobForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setJob(null);
      setForm(null);

      if (!jobId) {
        setError("No job was selected.");
        setLoading(false);
        return;
      }

      const { data, error: loadError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("recruiter_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (loadError || !data) {
        setError(
          loadError?.message ??
          "Job not found or you do not have permission to edit it."
        );
      } else {
        setJob(data);
        setForm(toForm(data));
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [jobId, user.id]);

  function update<K extends keyof JobForm>(
    field: K,
    value: JobForm[K]
  ) {
    setForm((previous) =>
      previous ? { ...previous, [field]: value } : previous
    );
    setSuccess("");
  }

  function validate(values: JobForm): string | null {
    if (
      !values.title.trim() ||
      !values.company_name.trim() ||
      !values.location.trim() ||
      !values.category.trim() ||
      !values.summary.trim() ||
      !values.description.trim()
    ) {
      return "Please complete all required fields.";
    }

    const minText = values.salary_min.trim();
    const maxText = values.salary_max.trim();

    if (minText || maxText) {
      if (!minText || !maxText) {
        return "Enter both minimum and maximum salary.";
      }

      const min = Number(minText);
      const max = Number(maxText);

      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min < 0 ||
        max < min
      ) {
        return "Enter a valid salary range.";
      }
    }

    // A new deadline cannot be in the past.
    const today = toDateTimeLocalValue(new Date()).slice(0, 10);

    if (
      values.application_deadline &&
      values.application_deadline !== (job?.application_deadline ?? "") &&
      values.application_deadline < today
    ) {
      return "The application deadline cannot be in the past.";
    }

    return null;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job || !form || saving || changingStatus) return;

    setError("");
    setSuccess("");

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const hasSalary = form.salary_min.trim() !== "";

    const changes: JobUpdate = {
      title: form.title.trim(),
      company_name: form.company_name.trim(),
      location: form.location.trim(),
      category: form.category.trim(),
      work_mode: form.work_mode,
      employment_type: form.employment_type,
      salary_min: hasSalary ? Number(form.salary_min) : null,
      salary_max: hasSalary ? Number(form.salary_max) : null,
      salary_currency: hasSalary ? form.salary_currency : null,
      salary_period: hasSalary ? form.salary_period : null,
      summary: form.summary.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      responsibilities: form.responsibilities.trim() || null,
      application_deadline: form.application_deadline || null,
    };

    setSaving(true);

    try {
      const { data, error: saveError } = await supabase
        .from("jobs")
        .update(changes)
        .eq("id", job.id)
        .eq("recruiter_id", user.id)
        .select("*")
        .single();

      if (saveError) throw saveError;

      setJob(data);
      setForm(toForm(data));
      setSuccess("Job posting updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update job."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    if (!job || saving || changingStatus) return;

    const nextActive = !job.is_active;
    const action = nextActive ? "reopen" : "close";

    if (
      !window.confirm(
        `Are you sure you want to ${action} "${job.title}"? ${
          nextActive
            ? "Job seekers will be able to apply again."
            : "New applications will no longer be accepted."
        } Existing applications will remain saved.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setChangingStatus(true);

    try {
      const { data, error: updateError } = await supabase
        .from("jobs")
        .update({ is_active: nextActive })
        .eq("id", job.id)
        .eq("recruiter_id", user.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setJob(data);
      setSuccess(
        nextActive
          ? "Job reopened successfully."
          : "Job closed successfully. Existing applications remain saved."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change job status."
      );
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) {
    return (
      <main className="create-job">
        <p role="status">Loading job posting...</p>
      </main>
    );
  }

  if (!job || !form) {
    return (
      <main className="create-job">
        <Link to="/recruiter/jobs">← My Job Postings</Link>
        <p role="alert">{error || "Job unavailable."}</p>
      </main>
    );
  }

  const busy = saving || changingStatus;

  return (
    <main className="create-job">
      <Link className="edit-job__back" to="/recruiter/jobs">
        ← My Job Postings
      </Link>

      <header className="create-job__heading">
        <p className="create-job__eyebrow">Recruiter workspace</p>
        <h1>Edit Job Posting</h1>
        <p>
          Update your opening or change whether it accepts
          new applications.
        </p>
      </header>

      <div className="edit-job__status">
        <div>
          <strong>Job status</strong>
          <p>
            {job.is_active
              ? "Active — job seekers can apply."
              : "Closed — no new applications are accepted."}
          </p>
        </div>

        <span className={
          job.is_active
            ? "edit-job__badge edit-job__badge--active"
            : "edit-job__badge"
        }>
          {job.is_active ? "Active" : "Closed"}
        </span>

        <button
          type="button"
          className="edit-job__toggle"
          onClick={() => void toggleActive()}
          disabled={busy}
        >
          {changingStatus
            ? "Updating..."
            : job.is_active ? "Close Job" : "Reopen Job"}
        </button>
      </div>

      {error && (
        <p className="auth-message auth-message--error" role="alert">
          {error}
        </p>
      )}

      {success && (
        <p className="edit-job__success" role="status">{success}</p>
      )}

      <form className="create-job__form" onSubmit={(e) => void handleSave(e)}>
        <section className="create-job__section">
          <h2>Job information</h2>

          <div className="create-job__grid">
            <label>
              Job title *
              <input
                required
                maxLength={150}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>

            <label>
              Company name *
              <input
                required
                value={form.company_name}
                onChange={(e) => update("company_name", e.target.value)}
              />
            </label>

            <label>
              Location *
              <input
                required
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </label>

            <label>
              Category *
              <input
                required
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              />
            </label>

            <label>
              Work arrangement
              <select
                value={form.work_mode}
                onChange={(e) =>
                  update("work_mode", e.target.value as JobRow["work_mode"])
                }
              >
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Remote">Remote</option>
              </select>
            </label>

            <label>
              Employment type
              <select
                value={form.employment_type}
                onChange={(e) =>
                  update(
                    "employment_type",
                    e.target.value as JobRow["employment_type"]
                  )
                }
              >
                {[
                  "Full-time",
                  "Part-time",
                  "Contract",
                  "Internship",
                  "Temporary",
                ].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label>
              Application deadline
              <input
                type="date"
                value={form.application_deadline}
                onChange={(e) =>
                  update("application_deadline", e.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section className="create-job__section">
          <h2>Compensation</h2>
          <p>Optional — leave both salary amounts empty to hide the range.</p>

          <div className="create-job__grid">
            <label>
              Minimum salary
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary_min}
                onChange={(e) => update("salary_min", e.target.value)}
              />
            </label>

            <label>
              Maximum salary
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary_max}
                onChange={(e) => update("salary_max", e.target.value)}
              />
            </label>

            <label>
              Currency
              <select
                value={form.salary_currency}
                onChange={(e) => update("salary_currency", e.target.value)}
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>

            <label>
              Salary period
              <select
                value={form.salary_period}
                onChange={(e) =>
                  update(
                    "salary_period",
                    e.target.value as JobForm["salary_period"]
                  )
                }
              >
                <option value="Yearly">Yearly</option>
                <option value="Monthly">Monthly</option>
                <option value="Hourly">Hourly</option>
              </select>
            </label>
          </div>
        </section>

        <section className="create-job__section">
          <h2>Job details</h2>

          {([
            ["summary", "Short summary *", 3],
            ["description", "Full description *", 7],
            ["responsibilities", "Responsibilities", 5],
            ["requirements", "Requirements", 5],
          ] as const).map(([field, label, rows]) => (
            <label key={field}>
              {label}
              <textarea
                required={field === "summary" || field === "description"}
                rows={rows}
                value={form[field]}
                onChange={(e) => update(field, e.target.value)}
              />
            </label>
          ))}
        </section>

        <div className="create-job__actions">
          <button
            type="button"
            className="button"
            disabled={busy}
            onClick={() => navigate("/recruiter/jobs")}
          >
            Back to Job Postings
          </button>

          <button
            type="submit"
            className="button button--primary"
            disabled={busy}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
