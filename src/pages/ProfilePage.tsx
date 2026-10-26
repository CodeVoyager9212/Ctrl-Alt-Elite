import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useOutletContext } from "react-router-dom";
import type { ApplicationOutletContext } from "../components/layout/ApplicationLayout";
import { supabase } from "../lib/supabase";
import "./ProfilePage.css";

type JobType = "Full-time" | "Internship" | "Contract" | "Part-time";
type AccountType = "job-seeker" | "recruiter";

type ProfileForm = {
  fullName: string;
  headline: string;
  education: string;
  experience: string;
  skills: string;
  jobType: JobType | "";
  location: string;
  accountType: AccountType;
};

const PROFILE_COLUMNS =
  "full_name, headline, education, experience, skills, preferred_job_type, preferred_location, account_type";

const JOB_TYPES: JobType[] = [
  "Full-time",
  "Internship",
  "Contract",
  "Part-time",
];

function getInitialProfile(user: User): ProfileForm {
  const metadataName = user.user_metadata.full_name;
  const metadataAccountType = user.user_metadata.account_type;

  return {
    fullName: typeof metadataName === "string" ? metadataName.trim() : "",
    headline: "",
    education: "",
    experience: "",
    skills: "",
    jobType: "",
    location: "",
    accountType:
      metadataAccountType === "recruiter" ? "recruiter" : "job-seeker",
  };
}

function ProfilePage() {
  const { user, updateAccountSummary } =
    useOutletContext<ApplicationOutletContext>();
  const [profile, setProfile] = useState<ProfileForm>(() =>
    getInitialProfile(user),
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const email = user.email ?? "";
  const accountTypeLabel =
    profile.accountType === "recruiter" ? "Recruiter" : "Job seeker";

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          setProfileError(`Unable to load your profile. ${error.message}`);
        } else if (data) {
          const loadedProfile: ProfileForm = {
            fullName: data.full_name,
            headline: data.headline,
            education: data.education,
            experience: data.experience,
            skills: data.skills,
            jobType: data.preferred_job_type,
            location: data.preferred_location,
            accountType: data.account_type,
          };
          setProfile(loadedProfile);
          updateAccountSummary(loadedProfile);
        }
      } catch {
        if (active) {
          setProfileError(
            "Unable to reach the profile service. Please try again.",
          );
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [updateAccountSummary, user.id]);

  function updateProfileField<Key extends keyof ProfileForm>(
    field: Key,
    value: ProfileForm[Key],
  ) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
    setSaveSuccess(false);
  }

  const initials = profile.fullName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const normalizedProfile: ProfileForm = {
      fullName: profile.fullName.trim(),
      headline: profile.headline.trim(),
      education: profile.education.trim(),
      experience: profile.experience.trim(),
      skills: profile.skills.trim(),
      jobType: profile.jobType,
      location: profile.location.trim(),
      accountType: profile.accountType,
    };

    setProfileError("");
    setSaveSuccess(false);

    if (!normalizedProfile.fullName) {
      setProfileError("Please enter your full name.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: normalizedProfile.fullName,
          headline: normalizedProfile.headline,
          education: normalizedProfile.education,
          experience: normalizedProfile.experience,
          skills: normalizedProfile.skills,
          preferred_job_type: normalizedProfile.jobType,
          preferred_location: normalizedProfile.location,
          account_type: normalizedProfile.accountType,
        },
        { onConflict: "id" },
      );

      if (error) {
        setProfileError(`Unable to save your profile. ${error.message}`);
        return;
      }

      setProfile(normalizedProfile);
      updateAccountSummary(normalizedProfile);
      setSaveSuccess(true);
    } catch {
      setProfileError(
        "Unable to reach the profile service. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
      <main className="profile-main">
        <header className="profile-heading">
          <p>Your details</p>
          <h1>Profile</h1>
        </header>

        {profileLoading && (
          <p className="profile-status" role="status">
            Loading your profile...
          </p>
        )}

        {profileError && (
          <p className="auth-message auth-message--error" role="alert">
            {profileError}
          </p>
        )}

        <form
          className="profile-form"
          onSubmit={handleSubmit}
          aria-busy={profileLoading || saving}
        >
          <section className="profile-card profile-card--identity">
            <div className="profile-summary">
              <span className="profile-initials">{initials || "CC"}</span>

              <div>
                <h2>{profile.fullName || "Your name"}</h2>
                <p>{email}</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                value={profile.fullName}
                onChange={(event) =>
                  updateProfileField("fullName", event.target.value)
                }
                placeholder="Enter your full name"
                disabled={profileLoading || saving}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="headline">Headline</label>
              <input
                id="headline"
                value={profile.headline}
                onChange={(event) =>
                  updateProfileField("headline", event.target.value)
                }
                placeholder="Add a professional headline"
                disabled={profileLoading || saving}
              />
            </div>

            <div className="account-type-display">
              <span>Account type</span>
              <strong>{accountTypeLabel}</strong>
            </div>
          </section>

          <div className="profile-right-column">
            <section className="profile-card">
              <h2>Education &amp; experience</h2>

              <div className="form-group">
                <label htmlFor="education">Education</label>
                <textarea
                  id="education"
                  value={profile.education}
                  onChange={(event) =>
                    updateProfileField("education", event.target.value)
                  }
                  placeholder="Add your education"
                  disabled={profileLoading || saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="experience">Work experience</label>
                <textarea
                  id="experience"
                  value={profile.experience}
                  onChange={(event) =>
                    updateProfileField("experience", event.target.value)
                  }
                  placeholder="Add your work experience"
                  disabled={profileLoading || saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="skills">Skills (separate with commas)</label>
                <input
                  id="skills"
                  value={profile.skills}
                  onChange={(event) =>
                    updateProfileField("skills", event.target.value)
                  }
                  placeholder="e.g. React, TypeScript, SQL"
                  disabled={profileLoading || saving}
                />
              </div>
            </section>

            <section className="profile-card">
              <h2>Job preferences</h2>

              <fieldset className="job-type-selector">
                <legend>Preferred job type</legend>

                <div className="job-type-options">
                  {JOB_TYPES.map((type) => (
                    <button
                      key={type}
                      className={
                        profile.jobType === type
                          ? "job-type-button job-type-button--active"
                          : "job-type-button"
                      }
                      type="button"
                      onClick={() => updateProfileField("jobType", type)}
                      disabled={profileLoading || saving}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="form-group">
                <label htmlFor="location">Preferred location</label>
                <input
                  id="location"
                  value={profile.location}
                  onChange={(event) =>
                    updateProfileField("location", event.target.value)
                  }
                  placeholder="Enter a preferred location"
                  disabled={profileLoading || saving}
                />
              </div>
            </section>

            <div className="profile-save-row">
              {saveSuccess && (
                <span className="profile-saved" role="status">
                  Profile saved!
                </span>
              )}

              <button
                className="button button--primary"
                type="submit"
                disabled={profileLoading || saving}
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>
        </form>
      </main>
  );
}

export default ProfilePage;
