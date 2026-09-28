import { useState } from "react";
import { Link } from "react-router-dom";
import "./ProfilePage.css";

type JobType = "Full-time" | "Internship" | "Contract" | "Part-time";

function ProfilePage() {
  const [fullName, setFullName] = useState("Maya Okonkwo");
  const [headline, setHeadline] = useState(
    "Final-year computer science student",
  );
  const [education, setEducation] = useState(
    "BSc Computer Science, University of Toronto (2022–2026)",
  );
  const [experience, setExperience] = useState(
    "Summer intern, Larkspur Labs — built internal dashboards in React",
  );
  const [skills, setSkills] = useState("React, TypeScript, SQL, Figma");
  const [jobType, setJobType] = useState<JobType>("Full-time");
  const [location, setLocation] = useState("Remote, Toronto");
  const [saved, setSaved] = useState(false);

  const initials = fullName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);

    console.log({
      fullName,
      headline,
      education,
      experience,
      skills,
      jobType,
      location,
    });
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <Link className="navbar__brand sidebar-brand" to="/">
          <span className="navbar__logo">CC</span>
          <span>CareerConnect</span>
        </Link>

        <input
          className="sidebar-search"
          type="search"
          placeholder="⌕  Search jobs"
          aria-label="Search jobs"
        />

        <nav className="sidebar-navigation">
          <a href="#">▦ <span>Dashboard</span></a>
          <a href="#">⌕ <span>Find Jobs</span></a>
          <a href="#">▤ <span>My Applications</span></a>
          <a href="#">♡ <span>Saved Jobs</span></a>
          <Link to="/resumes">▤ <span>My Résumés</span></Link>

          <Link className="sidebar-navigation__active" to="/profile">
            ◉ <span>Profile</span>
          </Link>

          <a href="#">◷ <span>Notifications</span></a>
        </nav>

        <div className="sidebar-user">
          <span className="profile-initials profile-initials--small">
            {initials}
          </span>

          <div>
            <strong>you@example.com</strong>
            <span>Job seeker</span>
          </div>
        </div>

        <button className="sidebar-signout" type="button">
          Sign out
        </button>
      </aside>

      <main className="profile-main">
        <header className="profile-heading">
          <p>Your details</p>
          <h1>Profile</h1>
        </header>

        <form className="profile-form" onSubmit={handleSubmit}>
          <section className="profile-card profile-card--identity">
            <div className="profile-summary">
              <span className="profile-initials">{initials || "CC"}</span>

              <div>
                <h2>{fullName || "Your name"}</h2>
                <p>you@example.com</p>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="headline">Headline</label>
              <input
                id="headline"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
              />
            </div>

            <div className="account-type-display">
              <span>Account type</span>
              <strong>Job seeker</strong>
            </div>
          </section>

          <div className="profile-right-column">
            <section className="profile-card">
              <h2>Education &amp; experience</h2>

              <div className="form-group">
                <label htmlFor="education">Education</label>
                <textarea
                  id="education"
                  value={education}
                  onChange={(event) => setEducation(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="experience">Work experience</label>
                <textarea
                  id="experience"
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="skills">Skills (separate with commas)</label>
                <input
                  id="skills"
                  value={skills}
                  onChange={(event) => setSkills(event.target.value)}
                />
              </div>
            </section>

            <section className="profile-card">
              <h2>Job preferences</h2>

              <fieldset className="job-type-selector">
                <legend>Preferred job type</legend>

                <div className="job-type-options">
                  {(
                    [
                      "Full-time",
                      "Internship",
                      "Contract",
                      "Part-time",
                    ] as JobType[]
                  ).map((type) => (
                    <button
                      key={type}
                      className={
                        jobType === type
                          ? "job-type-button job-type-button--active"
                          : "job-type-button"
                      }
                      type="button"
                      onClick={() => setJobType(type)}
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
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>
            </section>

            <div className="profile-save-row">
              {saved && <span className="profile-saved">Profile saved!</span>}

              <button className="button button--primary" type="submit">
                Save profile
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ProfilePage;