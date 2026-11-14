import Navbar from "../components/Navbar";
import ApplicationPreview from "../components/ApplicationPreview";

function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />

      <main className="hero">
        <section className="hero__content">
          <p className="hero__eyebrow">
            Your job search, kept in order
          </p>

          <h1>One well-kept folder for every application you send.</h1>

          <p className="hero__description">
            Search openings, apply with a single tap, and watch each role move
            from applied to interview to offer—colour-coded and always within
            reach.
          </p>

          <div className="hero__actions">
            <button className="button button--primary button--large" type="button">
              Start your folder
            </button>

            <button
              className="button button--secondary button--large"
              type="button"
            >
              See a live dashboard
            </button>
          </div>

          <div className="hero__statistics">
            <div className="statistic">
              <strong>3 steps</strong>
              <span>Create, apply, track</span>
            </div>

            <div className="statistic">
              <strong>1 profile</strong>
              <span>Reused on every application</span>
            </div>

            <div className="statistic">
              <strong>4 stages</strong>
              <span>Of pipeline, colour-stamped</span>
            </div>
          </div>
        </section>

        <ApplicationPreview />
      </main>
    </div>
  );
}

export default LandingPage;