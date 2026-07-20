import React from "react";
import { Check, Clipboard, Copy, ExternalLink, Link2, Megaphone, X } from "lucide-react";
import "./ChurvoxPromotionCentre.css";

const BASE_URL = "https://www.churvox.com/testers/";
const STORAGE_KEY = "churvox:hq-promotion-plan:v1";

const channels = [
  {
    id: "facebook",
    label: "Facebook",
    source: "facebook",
    medium: "social",
    content: "founding_10_founder_post",
    heading: "Founder post",
    note: "Best first post for your business page or personal profile.",
    copy: `Running a service business often means doing the work all day and catching up on admin at night.\n\nI’m building Churvox to change that. It prepares jobs, worker updates, messages, quotes, invoices and follow-ups, then leaves the decisions with the owner.\n\nI’m selecting up to 10 real service businesses to test Churvox for 30 days and tell me what genuinely helps. There is no card, no sales call and no pressure to continue.\n\nApply here: {link}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    source: "linkedin",
    medium: "social",
    content: "founding_10_linkedin",
    heading: "Professional introduction",
    note: "Clear product story without sounding like a hard sell.",
    copy: `I’m looking for up to 10 service businesses to help test Churvox.\n\nChurvox is an owner-controlled admin system for businesses managing clients, jobs, workers, quotes and invoices. It prepares the routine work, while important messages, changes and money-related actions remain with the owner for approval.\n\nSelected testers receive 30 days of access and setup support by email. No card, no sales calls and no automatic subscription.\n\nTester application: {link}`,
  },
  {
    id: "groups",
    label: "Business groups",
    source: "community_group",
    medium: "community",
    content: "founding_10_group_post",
    heading: "Community group post",
    note: "Useful for tradie, small-business and local business groups where promotion is allowed.",
    copy: `Hi everyone — I’m looking for a small group of service-business owners to test something I’ve built.\n\nChurvox helps organise clients, jobs, worker updates, quotes, invoices and follow-ups, while keeping the owner in control of anything important.\n\nI’m selecting up to 10 businesses for 30 days of tester access. I’m especially keen to hear from lawn care, landscaping, cleaning, property maintenance, handyman, painting, plumbing, electrical, pest control and similar businesses.\n\nThere are no calls, no card and no pressure to continue. Details are here: {link}`,
  },
  {
    id: "instagram",
    label: "Instagram",
    source: "instagram",
    medium: "social",
    content: "founding_10_instagram",
    heading: "Short caption",
    note: "Use with a Churvox screenshot or simple product graphic.",
    copy: `Less night-time admin. More control over the work.\n\nChurvox prepares jobs, worker updates, messages, quotes, invoices and follow-ups. The owner checks and approves what matters.\n\nWe’re selecting up to 10 service businesses for 30 days of tester access. No card. No sales calls. No pressure to continue.\n\nApply through the link: {link}\n\n#servicebusiness #tradies #smallbusiness #jobmanagement #churvox`,
  },
];

const plan = [
  ["day-1", "Day 1", "Post the Facebook founder story", "facebook"],
  ["day-2", "Day 2", "Post the LinkedIn introduction", "linkedin"],
  ["day-3", "Day 3", "Share once in a relevant business group", "groups"],
  ["day-4", "Day 4", "Post a Churvox workflow screenshot with the Instagram caption", "instagram"],
  ["day-5", "Day 5", "Reply only to genuine questions or applications", "facebook"],
  ["day-6", "Day 6", "Share the tester link from your business page again", "facebook"],
  ["day-7", "Day 7", "Review application sources inside HQ", "groups"],
];

function trackedLink(channel) {
  const url = new URL(BASE_URL);
  url.searchParams.set("utm_source", channel.source);
  url.searchParams.set("utm_medium", channel.medium);
  url.searchParams.set("utm_campaign", "founding_10");
  url.searchParams.set("utm_content", channel.content);
  return url.toString();
}

function completeCopy(channel) {
  return channel.copy.replaceAll("{link}", trackedLink(channel));
}

function readCompleted() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCompleted(values) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(values)); } catch {}
}

async function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

export default function ChurvoxPromotionCentre() {
  const [open, setOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState("facebook");
  const [copied, setCopied] = React.useState("");
  const [completed, setCompleted] = React.useState(() => readCompleted());
  const active = channels.find((channel) => channel.id === activeId) || channels[0];
  const link = trackedLink(active);
  const post = completeCopy(active);

  React.useEffect(() => {
    if (!open) return undefined;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const close = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => {
      document.documentElement.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  React.useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(""), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy(value, label) {
    try {
      await copyToClipboard(value);
      setCopied(label);
    } catch {
      setCopied("Copy failed");
    }
  }

  function togglePlan(id) {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      saveCompleted(next);
      return next;
    });
  }

  return (
    <>
      <button type="button" className="cvPromotionLauncher" onClick={() => setOpen(true)} aria-label="Open Churvox promotion centre">
        <Megaphone size={18} />
        <span>Promotion</span>
      </button>

      {open ? (
        <div className="cvPromotionBackdrop" role="dialog" aria-modal="true" aria-label="Churvox promotion centre">
          <section className="cvPromotionPanel">
            <header className="cvPromotionHeader">
              <div>
                <small>Churvox HQ · owner copy desk</small>
                <h2>Promotion Centre</h2>
                <p>Finished posts, tracked links and a simple weekly plan. This screen copies content only—it never publishes or sends anything.</p>
              </div>
              <button type="button" className="cvPromotionClose" onClick={() => setOpen(false)} aria-label="Close promotion centre"><X size={22} /></button>
            </header>

            <div className="cvPromotionLayout">
              <aside className="cvPromotionSide">
                <span className="cvPromotionSideLabel">Choose a channel</span>
                <nav>
                  {channels.map((channel) => (
                    <button type="button" key={channel.id} className={active.id === channel.id ? "active" : ""} onClick={() => setActiveId(channel.id)}>
                      <span>{channel.label}</span>
                      <small>{channel.heading}</small>
                    </button>
                  ))}
                </nav>

                <section className="cvPromotionSafety">
                  <Check size={17} />
                  <div><strong>Nothing auto-posts</strong><p>You still choose where and when a post is used.</p></div>
                </section>
              </aside>

              <main className="cvPromotionMain">
                <section className="cvPromotionPostCard">
                  <div className="cvPromotionPostHead">
                    <div><small>{active.label}</small><h3>{active.heading}</h3><p>{active.note}</p></div>
                    <span>Ready to copy</span>
                  </div>
                  <pre>{post}</pre>
                  <div className="cvPromotionActions">
                    <button type="button" className="primary" onClick={() => copy(post, "Post copied")}><Copy size={16} />Copy full post</button>
                    <button type="button" onClick={() => copy(link, "Link copied")}><Link2 size={16} />Copy tracked link</button>
                    <a href={link} target="_blank" rel="noreferrer"><ExternalLink size={16} />Preview tester page</a>
                  </div>
                  {copied ? <div className={`cvPromotionCopied${copied === "Copy failed" ? " error" : ""}`} role="status"><Clipboard size={15} />{copied}</div> : null}
                </section>

                <section className="cvPromotionLinkCard">
                  <div><small>Campaign link</small><strong>{link}</strong></div>
                  <p>Applications from this link will show the channel and campaign inside the HQ Applications inbox.</p>
                </section>

                <section className="cvPromotionPlan">
                  <header><div><small>Low-pressure rollout</small><h3>Seven-day Founding 10 plan</h3></div><span>{completed.length}/7 done</span></header>
                  <div>
                    {plan.map(([id, day, task, channelId]) => {
                      const done = completed.includes(id);
                      return (
                        <button type="button" key={id} className={done ? "done" : ""} onClick={() => togglePlan(id)}>
                          <span className="cvPromotionCheck">{done ? <Check size={15} /> : null}</span>
                          <b>{day}</b>
                          <strong>{task}</strong>
                          <em>{channels.find((channel) => channel.id === channelId)?.label}</em>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </main>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
