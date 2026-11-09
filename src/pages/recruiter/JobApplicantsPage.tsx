
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Link,
  useOutletContext,
  useParams,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";
import {
  ALL_STATUSES,
  formatDate,
  formatDateTime,
  statusSlug,
  toDateTimeLocalValue,
} from "../../lib/applications";

import type {
  ApplicationRow,
  ApplicationStatus,
  JobRow,
  ProfileRow,
  ResumeRow,
} from "../../types/database";

import "./JobApplicantsPage.css";

type RecruiterContext = {
  user: User;
};

type ApplicantRecord = {
  application: ApplicationRow;
  profile: ProfileRow | null;
  resume: ResumeRow | null;
};

type Filter = "All" | ApplicationStatus;

export default function JobApplicantsPage() {
  const { user } = useOutletContext<RecruiterContext>();
  const { jobId } = useParams<{ jobId: string }>();

  const [job, setJob] = useState<JobRow | null>(null);
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openingResumeId, setOpeningResumeId] =
  useState<string | null>(null);


  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setSelectedId(null);
      setJob(null);
      setApplicants([]);

      if (!jobId) {
        setError("No job was selected.");
        setLoading(false);
        return;
      }

      // Verify job ownership.
      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("recruiter_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (jobError || !jobData) {
        setError(
          jobError?.message ??
            "Job not found or you do not have access."
        );
        setLoading(false);
        return;
      }

      setJob(jobData);

      // Load all applications for this job.
      const { data: applications, error: appError } =
        await supabase
          .from("applications")
          .select("*")
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false });

      if (!active) return;

      if (appError) {
        setError(`Unable to load applicants. ${appError.message}`);
        setLoading(false);
        return;
      }

      const applicationRows = applications ?? [];

      if (applicationRows.length === 0) {
        setLoading(false);
        return;
      }

      const applicantIds = [
        ...new Set(applicationRows.map((a) => a.applicant_id)),
      ];

      const resumeIds = [
        ...new Set(applicationRows.map((a) => a.resume_id)),
      ];

      // Retrieve only the profiles and resumes used
      // in applications to this job.
      const [profileResult, resumeResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .in("id", applicantIds),

        supabase
          .from("resumes")
          .select("*")
          .in("id", resumeIds),
      ]);

      if (!active) return;

      if (profileResult.error || resumeResult.error) {
        setError(
          profileResult.error?.message ??
          resumeResult.error?.message ??
          "Unable to load applicant details."
        );
        setLoading(false);
        return;
      }

      const profiles = profileResult.data ?? [];
      const resumes = resumeResult.data ?? [];

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const resumeMap = new Map(
        resumes.map((resume) => [resume.id, resume])
      );

      const records: ApplicantRecord[] = applicationRows.map(
        (application) => ({
          application,
          profile: profileMap.get(application.applicant_id) ?? null,
          resume: resumeMap.get(application.resume_id) ?? null,
        })
      );

      setApplicants(records);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, [jobId, user.id]);

  const displayedApplicants = useMemo(
    () =>
      filter === "All"
        ? applicants
        : applicants.filter(
            (record) => record.application.status === filter
          ),
    [applicants, filter]
  );

  const selected = displayedApplicants.find(
    (record) => record.application.id === selectedId
  ) ?? null;

  function countFor(value: Filter) {
    return value === "All"
      ? applicants.length
      : applicants.filter(
          (record) => record.application.status === value
        ).length;
  }

  async function updateStatus(
    applicationId: string,
    status: ApplicationStatus
  ) {
    const existing = applicants.find(
      (record) => record.application.id === applicationId
    );

    if (!existing || existing.application.status === status) {
      return;
    }

    if (savingId !== null) return;

    setSavingId(applicationId);
    setError("");

    try {
      const { data, error: updateError } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", applicationId)
        .eq("job_id", jobId!)
        .select("*")
        .single();

      if (updateError) {
        setError(
          `Unable to update application. ${updateError.message}`
        );
        return;
      }

      setApplicants((previous) =>
        previous.map((record) =>
          record.application.id === applicationId
            ? { ...record, application: data }
            : record
        )
      );
    } catch {
      setError("Unable to connect to Supabase.");
    } finally {
      setSavingId(null);
    }
  }

  // Save the interview date and time (status must be Interview).
  // The database notifies the applicant.
  async function updateInterviewTime(
    applicationId: string,
    interviewAt: string
  ) {
    if (savingId !== null) return;

    setSavingId(applicationId);
    setError("");

    try {
      const { data, error: updateError } = await supabase
        .from("applications")
        .update({ interview_at: interviewAt })
        .eq("id", applicationId)
        .eq("job_id", jobId!)
        .select("*")
        .single();

      if (updateError) {
        setError(
          `Unable to save interview time. ${updateError.message}`
        );
        return;
      }

      setApplicants((previous) =>
        previous.map((record) =>
          record.application.id === applicationId
            ? { ...record, application: data }
            : record
        )
      );
    } catch {
      setError("Unable to connect to Supabase.");
    } finally {
      setSavingId(null);
    }
  }

  
async function handleViewResume(resume: ResumeRow | null) {
  if (!resume || openingResumeId) return;

  // Open the tab immediately, before asynchronous work.
  // This helps prevent popup blockers.
  const newTab = window.open("", "_blank");

  if (!newTab) {
    setError(
      "Your browser blocked the new tab. Please allow popups for CareerConnect."
    );
    return;
  }

  setOpeningResumeId(resume.id);
  setError("");

  try {
    const { data, error: storageError } =
      await supabase.storage
        .from("resumes")
        .createSignedUrl(resume.file_path, 60);

    if (storageError || !data?.signedUrl) {
      throw new Error(
        storageError?.message ??
        "Unable to access the submitted résumé."
      );
    }

    // Navigate the tab to the temporary authorized URL.
    newTab.location.replace(data.signedUrl);
  } catch (error) {
    newTab.close();

    setError(
      error instanceof Error
        ? `Unable to open résumé. ${error.message}`
        : "Unable to open résumé."
    );
  } finally {
    setOpeningResumeId(null);
  }
}


  return (
    <main className="recruiter-applicants">
      <div className="recruiter-applicants__container">
        <header className="recruiter-applicants__header">
          <Link to="/recruiter/jobs" className="recruiter-applicants__back">
            ← My Job Postings
          </Link>

          <p className="recruiter-applicants__eyebrow">
            Manage candidates
          </p>

          <h1>Applicants</h1>

          {job && (
            <p>
              {job.title} · {job.company_name}
            </p>
          )}
        </header>

        {error && (
          <p className="auth-message auth-message--error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p role="status">Loading applicants...</p>
        ) : !job ? (
          <p>This job is unavailable.</p>
        ) : (
          <div className="recruiter-applicants__layout">
            <section className="recruiter-applicants__list">
              <div className="recruiter-applicants__filters">
                {(["All", ...ALL_STATUSES] as Filter[]).map(
                  (value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={filter === value}
                      className={
                        filter === value ? "is-active" : ""
                      }
                      onClick={() => {
                        setFilter(value);
                        setSelectedId(null);
                      }}
                    >
                      {value} ({countFor(value)})
                    </button>
                  )
                )}
              </div>

              {displayedApplicants.length === 0 ? (
                <div className="recruiter-applicants__empty">
                  <h2>No applicants found</h2>
                  <p>
                    {applicants.length === 0
                      ? "No one has applied to this job yet."
                      : "No applicants match this status."}
                  </p>
                </div>
              ) : (
                <div className="recruiter-applicants__cards">
                  {displayedApplicants.map((record) => {
                    const app = record.application;

                    return (
                      <button
                        type="button"
                        key={app.id}
                        className={
                          selectedId === app.id
                            ? "recruiter-applicants__card is-selected"
                            : "recruiter-applicants__card"
                        }
                        onClick={() => setSelectedId(app.id)}
                      >
                        <strong>
                          {record.profile?.full_name ??
                            "Applicant details unavailable"}
                        </strong>

                        <span>
                          {record.profile?.headline ||
                            "No professional headline"}
                        </span>

                        <span>Applied {formatDate(app.applied_at)}</span>

                        <span
                          className={`status-badge status-badge--${statusSlug(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="recruiter-applicants__details">
              {!selected ? (
                <div className="recruiter-applicants__placeholder">
                  <h2>Select an applicant</h2>
                  <p>
                    Choose someone from the list to review
                    their profile, submitted résumé, and status.
                  </p>
                </div>
              ) : (
                <div className="recruiter-applicants__profile">
                  <div className="recruiter-applicants__profile-header">
                    <div>
                      <p className="recruiter-applicants__eyebrow">
                        Applicant profile
                      </p>

                      <h2>
                        {selected.profile?.full_name ??
                          "Profile unavailable"}
                      </h2>

                      <p>
                        {selected.profile?.headline ||
                          "No headline provided"}
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label="Close applicant details"
                      onClick={() => setSelectedId(null)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="recruiter-applicants__profile-body">
                    <ProfileField
                      label="Education"
                      value={selected.profile?.education}
                    />

                    <ProfileField
                      label="Experience"
                      value={selected.profile?.experience}
                    />

                    <ProfileField
                      label="Skills"
                      value={selected.profile?.skills}
                    />

                    <ProfileField
                      label="Preferred job type"
                      value={selected.profile?.preferred_job_type}
                    />

                    <ProfileField
                      label="Preferred location"
                      value={selected.profile?.preferred_location}
                    />


                    <section className="recruiter-applicants__section">
                    <h3>Submitted résumé</h3>

                    <p>
                        {selected.resume?.file_name ??
                        "Résumé unavailable"}
                    </p>

                    {selected.resume && (
                        <button
                        type="button"
                        className="button button--primary"
                        style={{ marginTop: "14px" }}
                        disabled={openingResumeId !== null}
                        onClick={() =>
                            void handleViewResume(selected.resume)
                        }
                        >
                        {openingResumeId === selected.resume.id
                            ? "Opening..."
                            : "View Résumé"}
                        </button>
                    )}

                    <p className="recruiter-applicants__note">
                        Opens the submitted file in a new tab.
                    </p>
                    </section>


                    <section className="recruiter-applicants__section">
                      <h3>Application status</h3>

                      <select
                        aria-label="Application status"
                        value={selected.application.status}
                        disabled={savingId !== null}
                        onChange={(event) =>
                          void updateStatus(
                            selected.application.id,
                            event.target.value as ApplicationStatus
                          )
                        }
                      >
                        {ALL_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>

                      <p className="recruiter-applicants__note">
                        {savingId === selected.application.id
                          ? "Saving status..."
                          : `Last changed ${formatDate(
                              selected.application.status_changed_at
                            )}`}
                      </p>
                    </section>

                    {selected.application.status === "Interview" && (
                      <InterviewTimeField
                        key={selected.application.id}
                        interviewAt={selected.application.interview_at}
                        saving={savingId !== null}
                        onSave={(value) =>
                          void updateInterviewTime(
                            selected.application.id,
                            value
                          )
                        }
                      />
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

// Recruiter picks the interview date and time. The applicant gets an
// "Interview scheduled" notification and a reminder 24 hours before.
function InterviewTimeField({
  interviewAt,
  saving,
  onSave,
}: {
  interviewAt: string | null;
  saving: boolean;
  onSave: (interviewAt: string) => void;
}) {
  const savedValue = interviewAt
    ? toDateTimeLocalValue(new Date(interviewAt))
    : "";

  const [value, setValue] = useState(savedValue);
  const [message, setMessage] = useState("");

  function handleSave() {
    const date = new Date(value);

    if (!value || Number.isNaN(date.getTime())) {
      setMessage("Choose a date and time.");
      return;
    }

    if (date <= new Date()) {
      setMessage("The interview must be in the future.");
      return;
    }

    setMessage("");
    onSave(date.toISOString());
  }

  return (
    <section className="recruiter-applicants__section">
      <h3>Interview date and time</h3>

      <input
        type="datetime-local"
        aria-label="Interview date and time"
        value={value}
        min={toDateTimeLocalValue(new Date())}
        disabled={saving}
        onChange={(event) => {
          setValue(event.target.value);
          setMessage("");
        }}
      />

      <button
        type="button"
        className="button button--primary"
        style={{ marginTop: "14px" }}
        disabled={saving || !value || value === savedValue}
        onClick={handleSave}
      >
        Save interview time
      </button>

      <p
        className="recruiter-applicants__note"
        role={message ? "alert" : undefined}
      >
        {message ||
          (interviewAt
            ? `Scheduled for ${formatDateTime(interviewAt)}.`
            : "The applicant will be notified and reminded 24 hours before.")}
      </p>
    </section>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <section className="recruiter-applicants__section">
      <h3>{label}</h3>
      <p>{value?.trim() || "Not provided"}</p>
    </section>
  );
}
