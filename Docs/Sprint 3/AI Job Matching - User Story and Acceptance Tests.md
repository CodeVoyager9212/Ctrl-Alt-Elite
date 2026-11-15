# Sprint 3 — AI Job Matching Suggestions

## User story

As a job seeker, I want CareerConnect to recommend relevant job opportunities based on my profile and primary resume so that I can discover suitable positions without manually reviewing every listing.

## Acceptance criteria

1. A signed-in job seeker with a primary PDF or DOCX resume can explicitly select **Generate My Matches** and receive up to eight ranked, currently eligible CareerConnect jobs.
2. Each result identifies the existing job, company, location/work arrangement, an integer 0–100 qualification-alignment score, a concise explanation, supported strengths, and missing or unverified qualifications.
3. Selecting **View job** opens the existing job-details panel. An inactive or past-deadline job is removed when saved results are retrieved.
4. Opening or reloading Find Jobs retrieves saved results and never automatically invokes Gemini.
5. Results are fresh for 24 hours only while the primary-resume fingerprint, relevant-profile fingerprint, and matching algorithm version remain unchanged.
6. Changing the primary resume makes saved results outdated. A non-primary upload or label change does not.
7. Changing headline, education, experience, skills, preferred job type, or preferred location makes results outdated. Changing unrelated profile data does not.
8. Outdated results remain visible with a reason and can be regenerated immediately; there is no cooldown after a completed request.
9. **Refresh Matches** always performs a new evaluation even while the cache is fresh. A failed refresh preserves the previous successful results.
10. If the current profile or primary resume changes while Gemini is running, that result is not saved and the user is asked to generate again.
11. A user without a primary resume sees a link to resume management and Gemini is not called.
12. If there are no eligible or suitable jobs, the page shows an empty state and does not fabricate a job.
13. Unauthenticated requests return 401. A job seeker cannot read another user's cache/resume, and browser roles have no cache-write or generation-RPC permission.
14. Only one unexpired generation lease per user can exist. A duplicate tab receives a conflict response; a lease older than five minutes can be recovered.
15. Invalid, duplicate, unknown-job, malformed, or out-of-range Gemini results are rejected or removed before storage.

## Automated acceptance coverage

Run `npm test`. `tests/aiJobMatching.test.mjs` verifies structured Gemini inputs/outputs, PDF input, invalid and duplicate IDs, malformed scores, empty results, profile/resume fingerprint behavior, materially different profile ranking, and the migration's cache/lock security invariants. Existing suites continue to cover dashboard analytics, notifications, and resume feedback.

The test suite mocks Gemini by injecting `fetch`; it never requires `GEMINI_API_KEY` and never makes a paid request.

## Manual acceptance scenarios

### Initial generation

1. Sign in as a job seeker with completed matching profile fields.
2. Upload/select a clear Resume A (PDF or DOCX) as primary.
3. Ensure at least two active, unexpired jobs have meaningfully different requirements.
4. Open Find Jobs and select **Generate My Matches**.
5. Confirm ranked cards show scores, evidence, gaps, and working **View job** actions.

### Primary-resume change

1. Save or screenshot the Resume A results.
2. In My Resumes, make a materially different Resume B primary.
3. Return to Find Jobs. Confirm saved results are visible but marked outdated because the primary resume changed.
4. Select **Regenerate Matches** immediately. Confirm no cooldown appears and the new explanations cite only qualifications supported by Resume B/current profile.

### Profile and combined changes

1. Edit skills, experience, preferred type, or location and save the profile.
2. Return to Find Jobs and confirm the profile-change notice; regenerate immediately.
3. Repeat after changing both the profile and primary resume before regenerating. Confirm the resulting strengths/preferences reflect both latest sources.

### Cache and failure

1. Reload Find Jobs after a successful generation. Confirm the timestamp/results reappear without a loading state that says analysis is running.
2. Temporarily use an invalid Gemini secret only in a safe local/test project, then refresh. Confirm the prior results remain visible with a retry error.
3. Restore the secret. Start generation in two tabs at nearly the same time. Confirm one proceeds and the other reports that matching is already running.

## Privacy note for the demonstration

The selected resume and current profile/job text are sent to Google Gemini only after the job seeker explicitly generates or refreshes. Use fictional or redacted resumes for the classroom demonstration. The recommendation cache stores fingerprints, job IDs, scores, explanations, strengths, and gaps—not resume content.
