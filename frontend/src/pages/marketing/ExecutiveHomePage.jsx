import React from "react";
import { PublicNav, PublicFooter } from "./ChurvoxPublicShell";
import exactSitesMarkup from "./SitesExactHomeMarkup";

export const Nav = PublicNav;
export const Footer = PublicFooter;

const EXACT_STYLESHEET = "/sites-exact/sites.css?v=sites-approved-20260724";

export default function ExecutiveHomePage() {
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    const previousTitle = document.title;
    document.title = "Churvox | Run the job, not the admin";
    document.documentElement.classList.add("churvox-sites-exact-active");
    document.body.classList.add("churvox-sites-exact-active");

    let link = document.querySelector('link[data-churvox-sites-exact="1"]');
    let created = false;
    const markReady = () => setReady(true);
    if (!link) {
      created = true;
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = EXACT_STYLESHEET;
      link.dataset.churvoxSitesExact = "1";
      link.addEventListener("load", markReady, { once: true });
      link.addEventListener("error", markReady, { once: true });
      document.head.appendChild(link);
    } else {
      setReady(true);
    }
    const timeout = window.setTimeout(markReady, 1200);

    return () => {
      window.clearTimeout(timeout);
      document.title = previousTitle;
      document.documentElement.classList.remove("churvox-sites-exact-active");
      document.body.classList.remove("churvox-sites-exact-active");
      if (created && link?.parentNode) link.parentNode.removeChild(link);
    };
  }, []);

  return (
    <div
      data-churvox-exact-sites-home="approved-20260724"
      style={{ visibility: ready ? "visible" : "hidden", minHeight: "100vh" }}
      dangerouslySetInnerHTML={{ __html: exactSitesMarkup }}
    />
  );
}
