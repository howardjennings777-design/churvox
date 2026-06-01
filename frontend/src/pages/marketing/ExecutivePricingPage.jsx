import React from "react";
import { Link } from "react-router-dom";
import { Nav } from "./ExecutiveHomePage";
import { MARKETING_PLANS, QUICK_PRICING_NOTES } from "../../config/churvoxPlans";
import "./ExecutiveHomePage.css";
import "./ExecutiveMarketingPolish.css";

const plans = MARKETING_PLANS;
const quickNotes = QUICK_PRICING_NOTES;

export default function ExecutivePricingPage() {
  return (
    <main className="cvx-home cvx-public-page cxp-page" data-version="CHURVOX_PRICING_LOCKED_TIERS_20260602">
      <style>{`
        .cxp-page {
          min-height: 100vh;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          overflow-x: hidden;
          background:
            radial-gradient(circle at 10% 8%, rgba(22, 219, 120, 0.10), transparent 340px),
            radial-gradient(circle at 88% 5%, rgba(40, 184, 255, 0.10), transparent 380px),
            #f5f7f1;
          color: #10141f;
        }

        .cxp-wrap {
          width: min(100% - 36px, 1320px);
          margin: 0 auto;
        }

        .cxp-hero {
          padding: 54px 0 24px;
        }

        .cxp-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(320px, 0.48fr);
          gap: 34px;
          align-items: end;
        }

        .cxp-eyebrow {
          width: fit-content;
          margin: 0 0 14px;
          padding: 7px 11px;
          border-radius: 999px;
          background: rgba(22, 219, 120, 0.13);
          color: #087543;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .cxp-hero h1 {
          max-width: 850px;
          margin: 0 0 15px;
          color: #10141f;
          font-size: clamp(38px, 5vw, 70px);
          line-height: 0.96;
          letter-spacing: -0.065em;
        }

        .cxp-hero p {
          max-width: 780px;
          margin: 0;
          color: #333b4a;
          font-size: clamp(16px, 1.35vw, 19px);
          line-height: 1.45;
          font-weight: 680;
        }

        .cxp-pick-card {
          padding: 20px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: 0 20px 55px rgba(16, 20, 31, 0.07);
        }

        .cxp-pick-card strong {
          display: block;
          margin-bottom: 8px;
          color: #10141f;
          font-size: 17px;
          letter-spacing: -0.03em;
        }

        .cxp-pick-card span {
          display: block;
          color: #687181;
          font-size: 14px;
          line-height: 1.45;
          font-weight: 680;
        }

        .cxp-plans {
          padding: 24px 0 42px;
        }

        .cxp-plan-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          align-items: stretch;
        }

        .cxp-plan {
          position: relative;
          min-height: 560px;
          display: flex;
          flex-direction: column;
          padding: 20px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.74);
          box-shadow: 0 18px 45px rgba(16, 20, 31, 0.055);
        }

        .cxp-plan.is-featured {
          color: white;
          background:
            radial-gradient(circle at 90% 0%, rgba(40, 184, 255, 0.28), transparent 230px),
            linear-gradient(145deg, #081324, #0c1b33);
          border-color: rgba(255, 255, 255, 0.13);
          box-shadow: 0 24px 65px rgba(8, 19, 36, 0.22);
        }

        .cxp-plan small {
          width: fit-content;
          margin-bottom: 12px;
          padding: 6px 9px;
          border-radius: 999px;
          background: rgba(16, 20, 31, 0.07);
          color: #455064;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .cxp-plan.is-featured small {
          background: #16db78;
          color: #03150d;
        }

        .cxp-plan h2 {
          margin: 0 0 8px;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.052em;
        }

        .cxp-price {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin-bottom: 11px;
        }

        .cxp-price strong {
          font-size: 44px;
          line-height: 1;
          letter-spacing: -0.08em;
        }

        .cxp-price span {
          color: #687181;
          font-size: 12px;
          font-weight: 850;
        }

        .cxp-plan.is-featured .cxp-price span,
        .cxp-plan.is-featured .cxp-summary,
        .cxp-plan.is-featured .cxp-best,
        .cxp-plan.is-featured li {
          color: rgba(255, 255, 255, 0.76);
        }

        .cxp-summary {
          min-height: 58px;
          margin: 0 0 14px;
          color: #535c6c;
          font-size: 14px;
          line-height: 1.38;
          font-weight: 720;
        }

        .cxp-plan h3 {
          margin: 0 0 9px;
          color: inherit;
          font-size: 12px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
        }

        .cxp-plan ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 7px;
        }

        .cxp-plan li {
          color: #4d5666;
          font-size: 12px;
          line-height: 1.32;
          font-weight: 780;
        }

        .cxp-includes li:before {
          content: "✓";
          margin-right: 7px;
          color: #0b9b57;
          font-weight: 950;
        }

        .cxp-not-included {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid rgba(16, 20, 31, 0.10);
        }

        .cxp-plan.is-featured .cxp-not-included {
          border-top-color: rgba(255, 255, 255, 0.14);
        }

        .cxp-not-included li:before {
          content: "–";
          margin-right: 7px;
          color: #b45b5b;
          font-weight: 950;
        }

        .cxp-plan.is-featured .cxp-includes li:before {
          color: #16db78;
        }

        .cxp-plan.is-featured .cxp-not-included li:before {
          color: rgba(255, 255, 255, 0.55);
        }

        .cxp-best {
          margin: auto 0 14px;
          padding-top: 14px;
          color: #687181;
          font-size: 12px;
          line-height: 1.35;
          font-weight: 820;
        }

        .cxp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          width: 100%;
          padding: 0 16px;
          border-radius: 999px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          background: white;
          color: #10141f;
          text-decoration: none;
          font-size: 13px;
          font-weight: 950;
        }

        .cxp-btn.primary {
          border-color: transparent;
          background: #16db78;
          color: #03150d;
        }

        .cxp-notes {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          padding: 0 0 54px;
        }

        .cxp-note {
          padding: 15px 16px;
          border: 1px solid rgba(16, 20, 31, 0.10);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.65);
          color: #535c6c;
          font-size: 13px;
          line-height: 1.4;
          font-weight: 760;
        }

        .cxp-final {
          padding: 0 0 22px;
        }

        .cxp-final-box {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 24px;
          align-items: center;
          padding: 25px;
          border-radius: 26px;
          color: white;
          background:
            radial-gradient(circle at 86% 8%, rgba(40, 184, 255, 0.22), transparent 280px),
            linear-gradient(145deg, #081324, #0c1b33);
        }

        .cxp-final h2 {
          margin: 0 0 8px;
          font-size: clamp(30px, 4vw, 52px);
          line-height: 1;
          letter-spacing: -0.055em;
        }

        .cxp-final p {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 15px;
          line-height: 1.45;
          font-weight: 700;
        }

        .cxp-final .cxp-btn {
          width: auto;
          min-width: 140px;
        }

        @media (max-width: 1050px) {
          .cxp-hero-grid,
          .cxp-final-box {
            grid-template-columns: 1fr;
          }

          .cxp-plan-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .cxp-notes {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .cxp-wrap {
            width: min(100% - 24px, 1320px);
          }

          .cxp-hero {
            padding-top: 38px;
          }

          .cxp-hero h1 {
            font-size: clamp(36px, 11vw, 56px);
          }

          .cxp-plan-grid {
            grid-template-columns: 1fr;
          }

          .cxp-plan {
            min-height: 0;
          }
        }
      `}</style>

      <Nav />

      <section className="cxp-hero">
        <div className="cxp-wrap cxp-hero-grid">
          <div>
            <p className="cxp-eyebrow">Simple Churvox pricing</p>
            <h1>Choose the plan that matches how much admin you want handled.</h1>
            <p>
              Start with core job control, add crew workflow, then move into Operator where Churvox prepares invoices, follow-ups, reminders and job actions for approval.
            </p>
          </div>

          <aside className="cxp-pick-card">
            <strong>Best pick for most trade owners</strong>
            <span>
              Operator is the main Churvox plan. Churvox prepares the admin. You approve the action.
            </span>
          </aside>
        </div>
      </section>

      <section className="cxp-plans">
        <div className="cxp-wrap cxp-plan-grid">
          {plans.map((plan) => (
            <article key={plan.key} className={`cxp-plan ${plan.featured ? "is-featured" : ""}`}>
              <small>{plan.tag}</small>
              <h2>{plan.name}</h2>
              <div className="cxp-price">
                <strong>{plan.price}</strong>
                <span>/month + GST</span>
              </div>
              <p className="cxp-summary">{plan.summary}</p>

              <h3>Includes</h3>
              <ul className="cxp-includes">
                {plan.includes.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <div className="cxp-not-included">
                <h3>Not included</h3>
                <ul>
                  {plan.notIncluded.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>

              <p className="cxp-best">{plan.bestFor}</p>
              <Link to="/signup" className={`cxp-btn ${plan.featured ? "primary" : ""}`}>
                Choose {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="cxp-wrap cxp-notes">
        {quickNotes.map((note) => (
          <div className="cxp-note" key={note}>{note}</div>
        ))}
      </div>

      <section className="cxp-final">
        <div className="cxp-wrap cxp-final-box">
          <div>
            <h2>Churvox prepares the admin. You approve the action.</h2>
            <p>Pick the plan that fits now, then grow into stronger AI Operator, MYOB, payroll and command features when the business needs them.</p>
          </div>
          <Link to="/signup" className="cxp-btn primary">Start free</Link>
        </div>
      </section>
    </main>
  );
}
