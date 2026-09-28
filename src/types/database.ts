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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
