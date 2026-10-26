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
};

export type JobInsert = Omit<
  JobRow,
  "id" | "created_at" | "posted_at" | "is_active"
> & {
  id?: string;
  created_at?: string;
  posted_at?: string;
  is_active?: boolean;
};

export type JobUpdate = Partial<JobInsert>;

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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
