
export type ProfileRow = {
  id: string;
  full_name: string;
  account_type: "job-seeker" | "recruiter";
  headline: string;
  education: string;
  experience: string;
  skills: string;
  preferred_job_type:
    | ""
    | "Full-time"
    | "Internship"
    | "Contract"
    | "Part-time";
  preferred_location: string;
  recruiter_position: string | null;
  contact_phone: string | null;
  company_name: string | null;
  company_location: string | null;
  company_website: string | null;
  company_description: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileInsert = {
  id: string;
  full_name?: string;
  account_type?: ProfileRow["account_type"];
  headline?: string;
  education?: string;
  experience?: string;
  skills?: string;
  preferred_job_type?: ProfileRow["preferred_job_type"];
  preferred_location?: string;
  recruiter_position?: string | null;
  contact_phone?: string | null;
  company_name?: string | null;
  company_location?: string | null;
  company_website?: string | null;
  company_description?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ProfileUpdate = Partial<ProfileInsert>;

export type ResumeRow = {
  id: string;
  user_id: string;
  label: string;
  file_name: string;
  file_path: string;
  file_size: number;
  is_primary: boolean;
  created_at: string;
};

type ResumeInsert = {
  id?: string;
  user_id: string;
  label?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  is_primary?: boolean;
  created_at?: string;
};

type ResumeUpdate = Partial<ResumeInsert>;

export type JobRow = {
  id: string;
  title: string;
  company_name: string;
  location: string;
  work_mode: "Remote" | "Hybrid" | "On-site";
  category: string;
  employment_type:
    | "Full-time"
    | "Part-time"
    | "Contract"
    | "Internship"
    | "Temporary";
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: "Hourly" | "Monthly" | "Yearly" | null;
  summary: string;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  recruiter_id: string | null;
  posted_at: string;
  is_active: boolean;
  created_at: string;
  // Optional date (YYYY-MM-DD) used for deadline reminders.
  application_deadline: string | null;
};

export type JobInsert = Omit<
  JobRow,
  "id" | "created_at" | "posted_at" | "is_active" | "application_deadline"
> & {
  id?: string;
  created_at?: string;
  posted_at?: string;
  is_active?: boolean;
  application_deadline?: string | null;
};

export type JobUpdate = Partial<JobInsert>;

// ============================================================
// APPLICATIONS
// Matches the existing public.applications table in Supabase.
// ============================================================

export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Interview"
  | "Offered"
  | "Rejected";

export type ApplicationRow = {
  id: string;
  applicant_id: string;
  job_id: string;
  resume_id: string;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  status_changed_at: string;
  interview_at: string | null;
};

// Job seekers submit applications using their own user ID,
// a job ID, and one of their uploaded resumes.
// The database automatically generates the remaining values.
export type ApplicationInsert = {
  id?: string;
  applicant_id: string;
  job_id: string;
  resume_id: string;
  status?: "Applied";
  applied_at?: string;
  updated_at?: string;
  status_changed_at?: string;
};

// Recruiters are only allowed to change application status
// and the interview time.
// Ownership restrictions are enforced through Supabase RLS.
export type ApplicationUpdate = {
  status?: ApplicationStatus;
  interview_at?: string | null;
};

// ============================================================
// APPLICATION DRAFTS (saved incomplete applications)
// ============================================================

export type ApplicationDraftRow = {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string | null;
  saved_at: string;
};

export type ApplicationDraftInsert = {
  id?: string;
  user_id: string;
  job_id: string;
  resume_id: string;
  saved_at?: string;
};

// ============================================================
// NOTIFICATIONS
// Created by database triggers. Users can only mark them as read.
// ============================================================

export type NotificationType =
  // Job seekers
  | "status_update"
  | "interview_reminder"
  | "deadline_reminder"
  | "incomplete_application"
  | "job_recommendation"
  | "new_job"
  // Recruiters
  | "new_application";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  job_id: string | null;
  application_id: string | null;
  is_read: boolean;
  reminder_key: string | null;
  created_at: string;
};

export type NotificationUpdate = {
  is_read?: boolean;
};

// ============================================================
// SUPABASE DATABASE TYPES
// ============================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      resumes: {
        Row: ResumeRow;
        Insert: ResumeInsert;
        Update: ResumeUpdate;
        Relationships: [];
      };
      jobs: {
        Row: JobRow;
        Insert: JobInsert;
        Update: JobUpdate;
        Relationships: [];
      };
      applications: {
        Row: ApplicationRow;
        Insert: ApplicationInsert;
        Update: ApplicationUpdate;
        Relationships: [];
      };
      application_drafts: {
        Row: ApplicationDraftRow;
        Insert: ApplicationDraftInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Record<string, never>;
        Update: NotificationUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_due_reminders: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
  };
};
