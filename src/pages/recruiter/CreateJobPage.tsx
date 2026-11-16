
import { useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { JobInsert, JobRow } from "../../types/database";
import "./CreateJobPage.css";

type RecruiterContext = {
  user: User;
};

type JobForm = {
  title: string;
  company_name: string;
  location: string;
  application_deadline: string;
  work_mode: JobRow["work_mode"];
  category: string;
  employment_type: JobRow["employment_type"];
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  salary_period: "Hourly" | "Monthly" | "Yearly";
  summary: string;
  description: string;
  requirements: string;
  responsibilities: string;
};

const initialForm: JobForm = {
  title: "",
  company_name: "",
  location: "",
  application_deadline: "",
  work_mode: "On-site",
  category: "",
  employment_type: "Full-time",
  salary_min: "",
  salary_max: "",
  salary_currency: "CAD",
  salary_period: "Yearly",
  summary: "",
  description: "",
  requirements: "",
  responsibilities: "",
};

export default function CreateJobPage() {
  const { user } = useOutletContext<RecruiterContext>();
  const navigate = useNavigate();

  const [form, setForm] = useState<JobForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof JobForm>(
    field: K,
    value: JobForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function validate(): string | null {
    if (
      !form.title.trim() ||
      !form.company_name.trim() ||
      !form.location.trim() ||
      !form.category.trim() ||
      !form.summary.trim() ||
      !form.description.trim()
    ) {
      return "Please fill in all required fields.";
    }

    const minimum = form.salary_min.trim();
    const maximum = form.salary_max.trim();

    if (minimum || maximum) {
      if (!minimum || !maximum) {
        return "Enter both salary minimum and maximum.";
      }

      const min = Number(minimum);
      const max = Number(maximum);

      if (
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        min < 0 ||
        max < min
      ) {
        return "Enter a valid salary range.";
      }
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const hasSalary =
      form.salary_min.trim() !== "" &&
      form.salary_max.trim() !== "";

    const newJob: JobInsert = {
      title: form.title.trim(),
      company_name: form.company_name.trim(),
      location: form.location.trim(),
      application_deadline: form.application_deadline || null,
      work_mode: form.work_mode,
      category: form.category.trim(),
      employment_type: form.employment_type,
      salary_min: hasSalary
        ? Number(form.salary_min)
        : null,
      salary_max: hasSalary
        ? Number(form.salary_max)
        : null,
      salary_currency: hasSalary
        ? form.salary_currency
        : null,
      salary_period: hasSalary
        ? form.salary_period
        : null,
      summary: form.summary.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      responsibilities:
        form.responsibilities.trim() || null,
      recruiter_id: user.id,
      is_active: true,
    };

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("jobs")
        .insert(newJob);

      if (insertError) {
        setError(
          `Unable to publish the job. ${insertError.message}`
        );
        return;
      }

      navigate("/recruiter/jobs", { replace: true });
    } catch {
      setError(
        "Unable to connect to Supabase. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="create-job">
      <header className="create-job__heading">
        <p className="create-job__eyebrow">
          Recruiter workspace
        </p>
        <h1>Create Job</h1>
        <p>
          Provide the information job seekers need
          to understand and apply for your opportunity.
        </p>
      </header>

      <form
        className="create-job__form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <section className="create-job__section">
          <h2>Job information</h2>

          <div className="create-job__grid">
            <label>
              Job title *
              <input
                required
                maxLength={150}
                value={form.title}
                onChange={(e) =>
                  update("title", e.target.value)
                }
                placeholder="Software Developer"
              />
            </label>

            <label>
              Company name *
              <input
                required
                value={form.company_name}
                onChange={(e) =>
                  update("company_name", e.target.value)
                }
                placeholder="Your company"
              />
            </label>

            <label>
              Location *
              <input
                required
                value={form.location}
                onChange={(e) =>
                  update("location", e.target.value)
                }
                placeholder="Montreal, QC"
              />
            </label>

            <label>
              Category *
              <input
                required
                value={form.category}
                onChange={(e) =>
                  update("category", e.target.value)
                }
                placeholder="Software Development"
              />
            </label>

            <label>
              Work arrangement
              <select
                value={form.work_mode}
                onChange={(e) =>
                  update(
                    "work_mode",
                    e.target.value as JobRow["work_mode"]
                  )
                }
              >
                <option>On-site</option>
                <option>Hybrid</option>
                <option>Remote</option>
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
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
                <option>Temporary</option>
              </select>
            </label>
            <label>
              Application deadline (UTC)
              <input
                type="date"
                value={form.application_deadline}
                onChange={(event) => update("application_deadline", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="create-job__section">
          <h2>Compensation</h2>
          <p>Optional. Leave blank if salary is undisclosed.</p>

          <div className="create-job__grid">
            <label>
              Minimum salary
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary_min}
                onChange={(e) =>
                  update("salary_min", e.target.value)
                }
              />
            </label>

            <label>
              Maximum salary
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salary_max}
                onChange={(e) =>
                  update("salary_max", e.target.value)
                }
              />
            </label>

            <label>
              Currency
              <select
                value={form.salary_currency}
                onChange={(e) =>
                  update("salary_currency", e.target.value)
                }
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
                <option>Yearly</option>
                <option>Monthly</option>
                <option>Hourly</option>
              </select>
            </label>
          </div>
        </section>

        <section className="create-job__section">
          <h2>Job details</h2>

          <label>
            Short summary *
            <textarea
              required
              rows={3}
              value={form.summary}
              onChange={(e) =>
                update("summary", e.target.value)
              }
              placeholder="A short overview of the opportunity."
            />
          </label>

          <label>
            Full description *
            <textarea
              required
              rows={7}
              value={form.description}
              onChange={(e) =>
                update("description", e.target.value)
              }
              placeholder="Describe the position, team and work."
            />
          </label>

          <label>
            Responsibilities
            <textarea
              rows={5}
              value={form.responsibilities}
              onChange={(e) =>
                update("responsibilities", e.target.value)
              }
              placeholder="Describe daily responsibilities."
            />
          </label>

          <label>
            Requirements
            <textarea
              rows={5}
              value={form.requirements}
              onChange={(e) =>
                update("requirements", e.target.value)
              }
              placeholder="List required skills and qualifications."
            />
          </label>
        </section>

        {error && (
          <p
            className="auth-message auth-message--error"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="create-job__actions">
          <button
            type="button"
            className="button"
            disabled={saving}
            onClick={() => navigate("/recruiter/jobs")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="button button--primary"
            disabled={saving}
          >
            {saving ? "Publishing..." : "Publish Job"}
          </button>
        </div>
      </form>
    </main>
  );
}
