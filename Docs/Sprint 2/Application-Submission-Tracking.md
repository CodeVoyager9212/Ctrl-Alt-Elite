# Feature 3 – Job Application Submission and Tracking
**Group 2:** Alfred, Anas, Omar

Requirement (Sprint 2, feature 3):
- Allow job seekers to apply for a job posting.
- Track application status (Applied, Under Review, Interview, Offered, Rejected).
- Provide confirmation of successful application submission.

Pages: `/jobs/:jobId/apply` (apply), `/applications/:id/confirmation` (confirmation), `/applications` (My Applications).
Database: `supabase/migrations/202610250001_create_applications.sql` (`jobs` if it doesn't exist yet, `applications`, security rules).
Builds on Sprint 1: applications use the résumés from the `resumes` table (My Résumés page).

Each story and acceptance test below is created as its own GitHub Issue.
Labels: `user story` or `acceptance test`, plus `sprint 2` and `feature: applications`. Each acceptance test links to its story (`Relates to #<story>`).

---

## User Story A – Submit a job application
**As a** job seeker, **I want to** apply to a job posting with one of my uploaded résumés and an optional cover letter **so that** recruiters can review my application.

**Tasks**
- [ ] Create the `applications` table with security rules (migration)
- [ ] Apply page: job details, résumé picker (primary résumé pre-selected), cover letter (max 2000 characters)
- [ ] Save the application in Supabase; block applying twice to the same job
- [ ] Ask the user to upload a résumé first if they have none
- [ ] Only job seeker accounts can apply
- [ ] Route `/jobs/:jobId/apply` (login required)

### AT-A1 – Apply with one of my résumés
- **Given** I am logged in as a job seeker with at least one résumé
- **When** I open a job, choose a résumé and click **Submit application**
- **Then** the application is saved with status **Applied** and the résumé I chose

### AT-A2 – Cannot apply twice to the same job
- **Given** I already applied to a job
- **When** I open that job's apply page again
- **Then** I see "You already applied" and no second application is created

### AT-A3 – Must have a résumé to apply
- **Given** I have no uploaded résumé
- **When** I open a job's apply page
- **Then** I see "Upload a résumé first" with a link to My Résumés, and no submit button

### AT-A4 – Recruiters cannot apply
- **Given** I am logged in with a recruiter account
- **When** I open a job's apply page
- **Then** I see "Only job seeker accounts can apply to jobs" and no submit button

---

## User Story B – Track application status
**As a** job seeker, **I want to** see each of my applications and its current status (Applied, Under Review, Interview, Offered, Rejected) **so that** I know where each one stands.

**Tasks**
- [ ] My Applications page with status badge and progress tracker
- [ ] Filter by status with counts
- [ ] Show how long the application has been in its current status (Sprint 1 team story #5)
- [ ] Only recruiters can change the status, and only for their own job postings (used by feature 4)

### AT-B1 – See my applications and their status
- **Given** I applied to 2 jobs
- **When** I open **My Applications**
- **Then** I see both, each with its status badge, progress tracker, apply date and résumé used

### AT-B2 – Status updates show up
- **Given** a recruiter moved my application to **Interview** 3 days ago
- **When** I open **My Applications**
- **Then** the badge says Interview, the tracker is on Interview and it says "Interview for 3 days"

### AT-B3 – Filter by status
- **Given** I have applications in different statuses
- **When** I click the **Interview** filter
- **Then** only Interview applications are listed and each filter shows the right count

### AT-B4 – Only see my own applications
- **Given** another job seeker has applications
- **When** I open **My Applications**
- **Then** I see none of theirs (enforced by the database rules)

---

## User Story C – Confirmation of successful submission
**As a** job seeker, **I want to** get a clear confirmation after I apply **so that** I know my application was received.

**Tasks**
- [ ] Confirmation page `/applications/:id/confirmation`
- [ ] Show job, reference number, date, résumé sent and status
- [ ] Buttons to View my applications / Apply to another job

### AT-C1 – Confirmation after submitting
- **Given** I submit an application
- **When** it is saved
- **Then** I land on a confirmation page showing the job title, a reference number, today's date, the résumé sent and status Applied

### AT-C2 – Failed submission shows an error, not a confirmation
- **Given** the application cannot be saved (for example, the account is not allowed to apply)
- **When** I click **Submit application**
- **Then** I stay on the apply page with an error message and no confirmation is shown

---

## Notes for the other groups
- **Group 1 (job listing):** link the job details page to `/jobs/<job id>/apply`. If you already created a `jobs` table, it needs the columns `title`, `company`, `location`, `category`, `job_type`, `description`, `posted_by`.
- **Feature 4 (recruiter dashboard):** recruiters can already read and update the `status` of applications to jobs where `posted_by` is their id. To open an applicant's résumé file, a storage rule for recruiters will still be needed.
