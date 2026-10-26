import "./PlaceholderPage.css";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <main className="placeholder-page">
      <header className="placeholder-page__heading">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </header>

      <section className="placeholder-page__card">
        <h2>Coming soon</h2>
        <p className="placeholder-page__description">{description}</p>
      </section>
    </main>
  );
}
