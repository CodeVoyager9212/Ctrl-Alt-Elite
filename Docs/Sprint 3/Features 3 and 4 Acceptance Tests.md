# Sprint 3 Features 3 and 4 acceptance tests

Run these checks with test accounts and a sample PDF that you are comfortable sending to Google Gemini.

| User story | Setup and action | Expected result |
|---|---|---|
| As a recruiter, I want to know when a candidate applies. | Submit an application as a job seeker. Open **Notifications** as the recruiter who owns the posting. | One unread **New application** item links to the correct posting's applicants. Another recruiter cannot see it. |
| As a job seeker, I want to learn when my application status changes or I am invited to interview. | Change the application to **Under Review** and then to **Interview** as the recruiter. Open **Notifications** as the applicant. Mark one item as read and refresh. | The inbox shows a status update and a separate interview invitation. Each links to **My Applications**. Read state persists. |
| As a user, I want to know about upcoming deadlines for my postings or active applications. | Set an open posting's deadline within three days, with an active application from a job seeker. Open or refresh both accounts' inboxes twice. | Each inbox receives one reminder for the posting and deadline. If the recruiter reschedules or closes the posting, the next refresh clears the outdated reminder. |
| As a job seeker, I want AI feedback on my uploaded résumé. | Upload a sample PDF, click **Get AI feedback**, and confirm sending it to Google Gemini. | Loading is followed by Strengths, Areas to improve, and Suggested bullet rewrites. The suggestions refer to the sample résumé. |
| As a job seeker, I want to choose whether my résumé is sent for feedback. | Open the feedback confirmation and click **Cancel**. | The confirmation closes without starting an analysis. The original PDF remains available. |
