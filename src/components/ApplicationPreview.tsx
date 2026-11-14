const applications = [
  {
    title: "Product Designer",
    company: "Fieldnote Studio",
    location: "Remote",
    description:
      "Own the onboarding flow and design a calm, tactile components library.",
    status: "Applied",
  },
  {
    title: "Frontend Engineer",
    company: "Larkspur Labs",
    location: "Toronto",
    description:
      "Build accessible, performant UI on a design-system-first React stack.",
    status: "Interview",
  },
];

function ApplicationPreview() {
  return (
    <section
      className="application-preview"
      aria-label="Application dashboard preview"
    >
      <div className="application-preview__tabs">
        <button className="preview-tab preview-tab--active" type="button">
          Applied
        </button>
        <button className="preview-tab" type="button">
          Interview
        </button>
        <button className="preview-tab" type="button">
          Offer
        </button>
      </div>

      <div className="application-preview__list">
        {applications.map((application) => (
          <article className="application-card" key={application.title}>
            <div className="application-card__heading">
              <div>
                <h3>{application.title}</h3>
                <p>
                  {application.company} · {application.location}
                </p>
              </div>

              <span
                className={`status-badge status-badge--${application.status.toLowerCase()}`}
              >
                {application.status}
              </span>
            </div>

            <p className="application-card__description">
              {application.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ApplicationPreview;