import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { ApplicationOutletContext } from "../components/layout/ApplicationLayout";
import { supabase } from "../lib/supabase";
import type { ResumeRow } from "../types/database";
import "./ProfilePage.css";
import "./ResumePage.css";

const BUCKET = "resumes";
const MAX_SIZE_MB = 5;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The "bouncer": only PDF / Word files under 5 MB get in.
function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const okExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!okExt || (file.type && !ALLOWED_TYPES.includes(file.type))) {
    return "Only PDF, DOC or DOCX files are allowed.";
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum size is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}

function labelFromFileName(fileName: string) {
  return fileName.replace(/\.(pdf|docx?)$/i, "");
}

function ResumePage() {
  const { user } = useOutletContext<ApplicationOutletContext>();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load this user's résumés from the database (primary first, then oldest first).
  const fetchResumes = useCallback(
    () =>
      supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true }),
    [user.id],
  );

  async function loadResumes() {
    const { data, error: loadError } = await fetchResumes();
    if (loadError) setError(`Unable to load your résumés. ${loadError.message}`);
    else setResumes(data ?? []);
  }

  useEffect(() => {
    let active = true;

    async function initialLoad() {
      const { data, error: loadError } = await fetchResumes();
      if (!active) return;
      if (loadError) setError(`Unable to load your résumés. ${loadError.message}`);
      else setResumes(data ?? []);
      setLoading(false);
    }

    void initialLoad();
    return () => {
      active = false;
    };
  }, [fetchResumes]);

  function showMessage(text: string) {
    setError("");
    setMessage(text);
  }

  function showError(text: string) {
    setMessage("");
    setError(text);
  }

  // Upload: validate -> save file in Storage -> save a row in the resumes table.
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || busy) return;
    const file = files[0];
    if (inputRef.current) inputRef.current.value = "";

    const problem = validateFile(file);
    if (problem) {
      showError(problem);
      return;
    }

    setBusy(true);
    const safeName = file.name.replace(/[^\w.-]+/g, "_");
    const filePath = `${user.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, { contentType: file.type || undefined });

    if (uploadError) {
      setBusy(false);
      showError(`Upload failed. ${uploadError.message}`);
      return;
    }

    const { error: insertError } = await supabase.from("resumes").insert({
      user_id: user.id,
      label: labelFromFileName(file.name),
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      is_primary: resumes.length === 0, // first résumé becomes primary
    });

    if (insertError) {
      // Don't leave an orphan file in Storage if the row failed.
      await supabase.storage.from(BUCKET).remove([filePath]);
      setBusy(false);
      showError(`Could not save the résumé. ${insertError.message}`);
      return;
    }

    await loadResumes();
    setBusy(false);
    showMessage(`"${file.name}" uploaded.`);
  }

  // View / Download: files are private, so we ask Supabase for a link that expires in 60 s.
  async function openResume(resume: ResumeRow, download: boolean) {
    const { data, error: urlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(resume.file_path, 60, download ? { download: resume.file_name } : undefined);

    if (urlError || !data) {
      showError(`Could not open the file. ${urlError?.message ?? ""}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function saveLabel(resume: ResumeRow) {
    const label = editLabel.trim();
    setEditingId(null);
    if (!label || label === resume.label) return;

    const { error: updateError } = await supabase
      .from("resumes")
      .update({ label })
      .eq("id", resume.id);

    if (updateError) {
      showError(`Could not rename. ${updateError.message}`);
      return;
    }
    await loadResumes();
    showMessage("Résumé renamed.");
  }

  // Only one primary per user: unset the old one first, then set the new one.
  async function setPrimary(resume: ResumeRow) {
    setBusy(true);
    const { error: clearError } = await supabase
      .from("resumes")
      .update({ is_primary: false })
      .eq("user_id", user.id)
      .eq("is_primary", true);

    const { error: primaryError } = clearError
      ? { error: clearError }
      : await supabase.from("resumes").update({ is_primary: true }).eq("id", resume.id);

    await loadResumes();
    setBusy(false);
    if (primaryError) showError(`Could not set primary. ${primaryError.message}`);
    else showMessage(`"${resume.label}" is now your primary résumé.`);
  }

  async function handleDelete(resume: ResumeRow) {
    setBusy(true);
    const { error: deleteError } = await supabase
      .from("resumes")
      .delete()
      .eq("id", resume.id);

    if (deleteError) {
      setBusy(false);
      showError(`Could not delete. ${deleteError.message}`);
      return;
    }

    await supabase.storage.from(BUCKET).remove([resume.file_path]);

    // If the primary was deleted, the next résumé takes over.
    const remaining = resumes.filter((r) => r.id !== resume.id);
    if (resume.is_primary && remaining.length > 0) {
      await supabase
        .from("resumes")
        .update({ is_primary: true })
        .eq("id", remaining[0].id);
    }

    await loadResumes();
    setBusy(false);
    showMessage(`"${resume.file_name}" deleted.`);
  }

  return (
      <main className="profile-main">
        <header className="profile-heading">
          <p>Manage your files</p>
          <h1>My Résumés</h1>
        </header>

        <section
          className={`resume-dropzone ${dragging ? "resume-dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void handleFiles(e.dataTransfer.files);
          }}
        >
          <p className="resume-dropzone__title">Drag &amp; drop your résumé here</p>
          <p className="resume-dropzone__hint">PDF, DOC or DOCX · max {MAX_SIZE_MB} MB</p>
          <button
            className="button button--primary"
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Working..." : "Choose file"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </section>

        {error && (
          <p className="resume-alert resume-alert--error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="resume-alert" role="status">
            {message}
          </p>
        )}

        <section className="profile-card resume-list-card">
          <h2>Uploaded résumés ({resumes.length})</h2>

          {loading ? (
            <p className="resume-empty">Loading your résumés...</p>
          ) : resumes.length === 0 ? (
            <p className="resume-empty">
              No résumés yet. Upload one to use it when applying for jobs.
            </p>
          ) : (
            <ul className="resume-list">
              {resumes.map((resume) => (
                <li className="resume-item" key={resume.id}>
                  <div className="resume-item__icon">
                    {resume.file_name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC"}
                  </div>

                  <div className="resume-item__info">
                    {editingId === resume.id ? (
                      <input
                        className="resume-item__rename"
                        aria-label="Résumé name"
                        value={editLabel}
                        autoFocus
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => void saveLabel(resume)}
                        onKeyDown={(e) => e.key === "Enter" && void saveLabel(resume)}
                      />
                    ) : (
                      <strong>
                        {resume.label || resume.file_name}
                        {resume.is_primary && <span className="resume-badge">Primary</span>}
                      </strong>
                    )}
                    <span>
                      {resume.file_name} · {formatSize(resume.file_size)} · uploaded{" "}
                      {new Date(resume.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="resume-item__actions">
                    <button type="button" onClick={() => void openResume(resume, false)}>
                      View
                    </button>
                    <button type="button" onClick={() => void openResume(resume, true)}>
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(resume.id);
                        setEditLabel(resume.label);
                      }}
                    >
                      Rename
                    </button>
                    {!resume.is_primary && (
                      <button type="button" disabled={busy} onClick={() => void setPrimary(resume)}>
                        Set primary
                      </button>
                    )}
                    <button
                      type="button"
                      className="resume-delete"
                      disabled={busy}
                      onClick={() => void handleDelete(resume)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
  );
}

export default ResumePage;
