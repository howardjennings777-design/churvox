# Public launch readiness — 28 July 2026

This change repairs the production path that allowed Product, Pricing, Demo and legal URLs to fall back to homepage HTML.

## Production behaviour

- The frontend start command runs the production startup wrapper.
- The build and startup paths both regenerate route-specific HTML.
- Product, Pricing, Demo, About, Security, Privacy, Terms and cancellation pages receive useful no-JavaScript content.
- Pricing remains unchanged: Start NZ$39, Crew NZ$89, Operator NZ$149 and Command NZ$299 per month plus GST.
- Structured data identifies Churvox as a New Zealand business application without inventing ratings, reviews or customer counts.

## Trust guardrails

- Public examples remain labelled as examples.
- No customer testimonial or adoption claim is added without evidence.
- Privacy, terms, security and billing support all point to hello@churvox.com.
- Stripe remains responsible for card entry.
- Owner approval remains required for important sends, money steps and record changes.

## Validation

The dedicated GitHub gate parses the startup scripts, installs from the lockfile, builds the exact production frontend and checks the generated route HTML for unique titles, legal content, pricing and structured data.
