# Feature 3 – Job Application Submission and Tracking
**Group 2:** Alfred, Anas, Omar

Requirement (Sprint 2, feature 3):
- Allow job seekers to apply for a job posting.
- Track application status (Applied, Under Review, Interview, Offered, Rejected).
- Provide confirmation of successful application submission.

How it works:
- **Find Jobs → job details → Easy Apply:** the user picks one of the résumés they already uploaded on **My Résumés** (Sprint 1, primary résumé selected by default) and applies in one click. The application is saved in Supabase.
- **Confirmation:** the details panel right away shows "Application sent!" with the résumé sent, date, reference number and status. Jobs already applied to show "You applied to this job" with the current status.
- **My Applications** (`/applications`, replaces the placeholder): only the jobs the user applied to, with status, progress tracker and filters.

Code: `src/components/jobs/EasyApply.tsx` (+ `.css`), `src/pages/ApplicationsPage.tsx` (+ `.css`), `src/lib/applications.ts`.
Database: `supabase/migrations/202610250001_create_applications.sql` creates `applications` and its security rules. It uses the existing `profiles`, `resumes` and `jobs` tables.

Each story and acceptance test below is created as its own GitHub Issue.
Labels: `user story` or `acceptance test`, plus `sprint 2` and `feature: applications`. Each acceptance test links to its story (`Relates to #<story>`).

---

## User Story A – Apply to a job (Easy Apply)
**As a** job seeker, **I want to** apply to a job in one click with a résumé I already uploaded **so that** recruiters can review my application.

**Tasks**
- [ ] Create the `applications` table with security rules (migration)
- [ ] Easy Apply box in the Find Jobs details panel with a résumé picker (primary résumé selected)
- [ ] Save the application in Supabase; block applying twice to the same job
- [ ] Ask the user to upload a résumé first if they have none
- [ ] Only job seeker accounts can apply, and only to active jobs

### AT-A1 – Easy Apply with my résumé
- **Given** I am logged in as a job seeker with at least one résumé
- **When** I open a job on Find Jobs and click **Easy Apply**
- **Then** the application is saved with status **Applied** and the résumé shown in the picker

### AT-A2 – Cannot apply twice to the same job
- **Given** I already applied to a job
- **When** I open that job on Find Jobs
- **Then** I see "You applied to this job" with its status, and there is no Easy Apply button

### AT-A3 – Must have a résumé to apply
- **Given** I have no uploaded résumé
- **When** I open a job on Find Jobs
- **Then** I see "Upload a résumé first to apply" with a link to My Résumés, and no Easy Apply button

### AT-A4 – Recruiters cannot apply
- **Given** I am logged in with a recruiter account
- **When** I open a job on Find Jobs
- **Then** I see "Recruiter accounts can't apply to jobs" and no Easy Apply button

---

## User Story B – Track application status
**As a** job seeker, **I want to** see the jobs I applied to and the current status of each (Applied, Under Review, Interview, Offered, Rejected) **so that** I know where each one stands.

**Tasks**
- [ ] My Applications page with status badge and progress tracker
- [ ] Filter by status with counts
- [ ] Show how long the application has been in its current status (Sprint 1 team story #5)
- [ ] Only recruiters can change the status, and only for their own job postings (used by feature 4)

### AT-B1 – See my applications and their status
- **Given** I applied to 2 jobs
- **When** I open **My Applications**
- **Then** I see only those 2 jobs, each with its company, status badge, progress tracker, apply date and résumé used

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
**As a** job seeker, **I want to** get a clear confirmation right after I apply **so that** I know my application was received.

**Tasks**
- [ ] After Easy Apply, show "Application sent!" with the résumé sent, date, reference number and status
- [ ] Link to My Applications

### AT-C1 – Confirmation after applying
- **Given** I click **Easy Apply** on a job
- **When** the application is saved
- **Then** the panel shows "Application sent!" with the résumé sent, today's date, a reference number and status Applied

### AT-C2 – Failed submission shows an error, not a confirmation
- **Given** the application cannot be saved (for example, the account is not allowed to apply)
- **When** I click **Easy Apply**
- **Then** an error message is shown, nothing is saved and no confirmation appears

---

## Notes for feature 4 (recruiter dashboard)
Recruiters can already read and update the `status` of applications to jobs where `jobs.recruiter_id` is their id (only the status column can change). To open an applicant's résumé file, a storage rule for recruiters will still be needed.
