import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./ProfilePage.css";
import "./ResumePage.css";

type Resume = {
  id: string;
  label: string;
  fileName: string;
  size: number;
  uploadedAt: Date;
  url: string;
  storagePath?: string; // set when the file is also saved in Supabase Storage
};

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_SIZE_MB = 5;
const BUCKET = "resumes";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

// Tries to save the file in Supabase Storage.
// Loaded lazily so the page still works (local only) if Supabase isn't configured.
async function uploadToSupabase(file: File): Promise<string | null> {
  try {
    const { supabase } = await import("../lib/supabase");
    const { data: userData } = await supabase.auth.getUser();
    const folder = userData.user?.id ?? "demo";
    const path = `${folder}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) return null;
    return path;
  } catch {
    return null;
  }
}

async function removeFromSupabase(path: string) {
  try {
    const { supabase } = await import("../lib/supabase");
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    /* ignore — local copy is removed anyway */
  }
}

function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setMessage("");

    const file = files[0];
    const problem = validateFile(file);
    if (problem) {
      setError(problem);
      return;
    }

    setUploading(true);
    const storagePath = await uploadToSupabase(file);
    setUploading(false);

    const resume: Resume = {
      id: crypto.randomUUID(),
      label: file.name.replace(/\.(pdf|docx?|DOCX?|PDF)$/, ""),
      fileName: file.name,
      size: file.size,
      uploadedAt: new Date(),
      url: URL.createObjectURL(file),
      storagePath: storagePath ?? undefined,
    };

    setResumes((current) => [resume, ...current]);
    if (!primaryId) setPrimaryId(resume.id);
    setMessage(
      storagePath
        ? `"${file.name}" uploaded and saved to your account.`
        : `"${file.name}" uploaded.`,
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDelete(resume: Resume) {
    setResumes((current) => current.filter((r) => r.id !== resume.id));
    URL.revokeObjectURL(resume.url);
    if (resume.storagePath) removeFromSupabase(resume.storagePath);
    if (primaryId === resume.id) {
      const next = resumes.find((r) => r.id !== resume.id);
      setPrimaryId(next ? next.id : null);
    }
    setMessage(`"${resume.fileName}" deleted.`);
  }

  function saveLabel(id: string) {
    const label = editLabel.trim();
    if (label) {
      setResumes((current) =>
        current.map((r) => (r.id === id ? { ...r, label } : r)),
      );
    }
    setEditingId(null);
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link className="navbar__brand sidebar-brand" to="/">
          <span className="navbar__logo">CC</span>
          <span>CareerConnect</span>
        </Link>

        <nav className="sidebar-navigation">
          <a href="#">▦ <span>Dashboard</span></a>
          <a href="#">⌕ <span>Find Jobs</span></a>
          <a href="#">▤ <span>My Applications</span></a>
          <a href="#">♡ <span>Saved Jobs</span></a>
          <Link className="sidebar-navigation__active" to="/resumes">
            ▤ <span>My Résumés</span>
          </Link>
          <Link to="/profile">◉ <span>Profile</span></Link>
          <a href="#">◷ <span>Notifications</span></a>
        </nav>
      </aside>

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
            handleFiles(e.dataTransfer.files);
          }}
        >
          <p className="resume-dropzone__title">
            Drag &amp; drop your résumé here
          </p>
          <p className="resume-dropzone__hint">
            PDF, DOC or DOCX · max {MAX_SIZE_MB} MB
          </p>
          <button
            className="button button--primary"
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading..." : "Choose file"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </section>

        {error && <p className="resume-alert resume-alert--error">{error}</p>}
        {message && <p className="resume-alert">{message}</p>}

        <section className="profile-card resume-list-card">
          <h2>Uploaded résumés ({resumes.length})</h2>

          {resumes.length === 0 ? (
            <p className="resume-empty">
              No résumés yet. Upload one to use it when applying for jobs.
            </p>
          ) : (
            <ul className="resume-list">
              {resumes.map((resume) => (
                <li className="resume-item" key={resume.id}>
                  <div className="resume-item__icon">
                    {resume.fileName.toLowerCase().endsWith(".pdf") ? "PDF" : "DOC"}
                  </div>

                  <div className="resume-item__info">
                    {editingId === resume.id ? (
                      <input
                        className="resume-item__rename"
                        value={editLabel}
                        autoFocus
                        onChange={(e) => setEditLabel(e.target.value)}
                        onBlur={() => saveLabel(resume.id)}
                        onKeyDown={(e) => e.key === "Enter" && saveLabel(resume.id)}
                      />
                    ) : (
                      <strong>
                        {resume.label}
                        {primaryId === resume.id && (
                          <span className="resume-badge">Primary</span>
                        )}
                      </strong>
                    )}
                    <span>
                      {resume.fileName} · {formatSize(resume.size)} · uploaded{" "}
                      {resume.uploadedAt.toLocaleDateString()}
                    </span>
                  </div>

                  <div className="resume-item__actions">
                    <a href={resume.url} target="_blank" rel="noreferrer">
                      View
                    </a>
                    <a href={resume.url} download={resume.fileName}>
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(resume.id);
                        setEditLabel(resume.label);
                      }}
                    >
                      Rename
                    </button>
                    {primaryId !== resume.id && (
                      <button type="button" onClick={() => setPrimaryId(resume.id)}>
                        Set primary
                      </button>
                    )}
                    <button
                      type="button"
                      className="resume-delete"
                      onClick={() => handleDelete(resume)}
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
    </div>
  );
}

export default ResumePage;
