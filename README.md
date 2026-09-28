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
