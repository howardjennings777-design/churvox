
import "./PublicContactPage.css";
export default function PublicContactPage() {
  return (
    <main className="contactpub">
      <section>
        <a className="contactpub-brand" href="/"><img src="/brand/churvox-holo-c.svg" alt="" /><strong>CHURVOX</strong></a>
        <div className="contactpub-grid">
          <article>
            <p>EMAIL ONLY FOR NOW</p>
            <h1>Talk to Churvox by email.</h1>
            <span>We are keeping communication simple while Churvox is being finished. For questions, setup help, MYOB-ready workflow discussion or early customer interest, email us directly.</span>
            <div className="contactpub-actions"><a href="mailto:hello@churvox.com?subject=Churvox enquiry">Email hello@churvox.com</a><a href="/demo">Try live demo</a></div>
          </article>
          <aside><strong>What to include</strong><ul><li>Your business name</li><li>Trade or service type</li><li>Team size</li><li>What you need: jobs, workers, photos, invoices, MYOB, payroll or AI approvals</li></ul></aside>
        </div>
      </section>
    </main>
  );
}
