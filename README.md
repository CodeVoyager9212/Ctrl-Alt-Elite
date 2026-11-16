# Ctrl-Alt-Elite
### SOEN 341 - Software Process
### CareerConnect
---
## Team Members
**Full Name, ID:** Philopater Salama (40229661)  
**GitHub Username:** CodeVoyager9212

**Full Name, ID:** Peter Chababi (40283304)  
**GitHub Username:** PChababi

**Full Name, ID:** Alfred Zaid (40287593)  
**GitHub Username:** EngrAlfred

**Full Name, ID:** Arman Soheili (40299968)  
**GitHub Username:** arman-shl

**Full Name, ID:** Anas Lahna (40285401)  
**GitHub Username:** Lahanas

**Full Name, ID:** Omar El Akrae  (40252799)  
**GitHub Username:** Omar01-E

---
## Project Description
CareerConnect is a website for finding jobs and tracking applications that helps job seekers keep track of their career path all in one place. Users are able to make profiles, upload their résumés, find jobs, save jobs, apply to jobs, and track their process with different states including Applied, Interview, Offered, and Rejected. Recruiters are able to post and manage job listings, review applicants, and change the application states. CareerConnect will also have a Generative AI component for résumé feedback or suggested job matches.

---
## Identified Problem
Job seekers often use different websites and tools to search for jobs, manage their resumes, and keep track of their applications. As the number of applications increases, it can become difficult to remember which jobs were applied to, their current status, and what steps need to be taken next. Recruiters also need an organized way to post jobs and manage applicants.

---
## Proposed Solution
CareerConnect provides one platform where job seekers can manage their job search and applications. Users can create a profile, upload their resume, search and save jobs, apply for positions, and track the status of each application. Recruiters can post job opportunities and manage applicants. The platform will also include a Generative AI feature to provide resume feedback or suggest job matches.

---
## Proposed Features
### Main Features
- User registration and authentication
- User profile management
- Resume upload and management
- Job posting and management
- Job search and filtering
- Job applications
- Application status tracking
- Application history
- Notifications and reminders
- Saved jobs
- Generative AI for resume feedback or job matching

### Additional Proposed Features
- **Job Application Streaks:** Allow users to build a streak by consistently applying for jobs and track their progress over time.
- **Application Map:** Show the locations of companies the user has applied to on a map for better visualization.
- **Job Comparison:** Allow users to compare multiple job opportunities side by side, such as salary, location, requirements, and other important information.

---
## Technologies
### Frontend
- **React:** Used to build the user interface and create the different pages and components of the website.
- **TypeScript:** Used to write and organize the frontend code.
- **HTML:** Used for the structure and content of the website.
- **CSS:** Used to style the website and design the user interface.

### Backend
- **Supabase:** Used to manage the backend of the application, including user authentication and application data.
- **SQL:** Used to manage and work with data stored in the database.

---
## Setup Instructions
To run CareerConnect, make sure Git, Node.js, and npm are installed. Clone the repository and open the project folder, then run `npm ci` to install the required dependencies. Create a `.env.local` file and add the Supabase URL and publishable key to connect the application to the backend. The required database setup is included in the Supabase migration file in the repository. Finally, run `npm run dev` and open the local address shown in the terminal to access CareerConnect.

### Enable Sprint 3 notifications and AI feedback

Use the team's existing Supabase project. The new migrations assume the `jobs`, `applications`, and `resumes` tables are already set up. Apply these two migrations in order with the Supabase SQL Editor, or include them in the team's migration workflow.

1. `supabase/migrations/202611110001_application_notifications.sql`
2. `supabase/migrations/202611110002_resume_feedback_quota.sql`

Deploy the Edge Function from the project folder with the Supabase CLI.

```sh
supabase functions deploy resume-feedback --project-ref YOUR_PROJECT_REF
```

In the team's Supabase Edge Function secrets, set `GEMINI_API_KEY` to a key from [Google AI Studio](https://aistudio.google.com/apikey). The function defaults to `gemini-3.5-flash-lite`. Set `GEMINI_MODEL` there if your team uses another model that supports PDF input and structured output. The frontend continues to use the existing Supabase URL and publishable key in `.env.local`.

Set deadlines in the recruiter Create Job or Edit Job forms. A date is inclusive through the end of that day in UTC. The Notifications inbox checks for deadlines within three days when opened or refreshed. It creates reminders for recruiters who own those postings and job seekers with an active application on them. Moving an application to Interview sends an in-app invitation linked to My Applications.

On **My Résumés**, choose a PDF up to 5 MB, then choose **Get AI feedback** and confirm sending the PDF to Google Gemini. A job seeker can make up to five analysis requests per UTC day. Feedback is displayed for the current page session. The full PDF is sent to Google. Google may use free-tier inputs and outputs to improve its products, so use a fictional or redacted PDF for the class demo.

Run `npm test` for the unit tests. The manual scenarios are in [Features 3 and 4 Acceptance Tests](Docs/Sprint%203/Features%203%20and%204%20Acceptance%20Tests.md).

### Enable Sprint 3 AI job matching

Apply `supabase/migrations/202611140001_ai_job_matching.sql` after the existing profile, resume, and jobs schema. Then deploy the dedicated function:

```sh
supabase functions deploy ai-job-matching --project-ref YOUR_PROJECT_REF
```

The function uses the platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` variables. It reuses `GEMINI_API_KEY` and the optional `GEMINI_MODEL` override from resume feedback; the default is `gemini-3.5-flash-lite`. Do not put either server secret in `.env.local` or any `VITE_` variable.

On Find Jobs, saved AI matches load without calling Gemini. Generation and refresh are manual, use the current primary resume and latest relevant profile fields, and have no cooldown. PDF and DOCX primary resumes are supported; legacy DOC files must be converted. See [AI Job Matching - User Story and Acceptance Tests](Docs/Sprint%203/AI%20Job%20Matching%20-%20User%20Story%20and%20Acceptance%20Tests.md) for measurable criteria and demo scenarios.

---
## Repository Link
GitHub Repository: [CareerConnect](https://github.com/CodeVoyager9212/Ctrl-Alt-Elite)
