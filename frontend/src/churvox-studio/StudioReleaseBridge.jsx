import React from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { createAccess } from "../churvox-product/controlBoardData";
import { areaForPage, pageFromLocation } from "./studioModel";
import StudioPlansRelease from "./StudioPlansRelease";
import "./studioRelease.css";

function pageFeature(page) {
  if (page === "timesheets") return "payroll";
  if (page === "accounting") return "accounting";
  const area = areaForPage(page);
  if (area === "utility") return page === "support" ? "help" : page;
  return area;
}

function exactLabel(button, fallback = "") {
  const span = button?.querySelector("span");
  return String(span?.textContent || fallback || button?.textContent || "").trim();
}

export default function StudioReleaseBridge() {
  const { user } = useAuth();
  const api = useApi();
  const access = React.useMemo(() => createAccess(user), [user]);
  const [page, setPage] = React.useState(pageFromLocation);
  const [workspace, setWorkspace] = React.useState(null);

  React.useEffect(() => {
    const sync = () => setPage(pageFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  React.useEffect(() => {
    const feature = pageFeature(page);
    if (!access.can(feature)) {
      window.history.replaceState({}, "", "/dashboard#plans");
      setPage("plans");
      window.dispatchEvent(new Event("hashchange"));
    }
  }, [access, page]);

  React.useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const currentPage = pageFromLocation();
      const main = document.querySelector('main[data-churvox-layout="fresh-studio"]');
      if (main) {
        main.classList.add("cvOwnerReady");
        main.dataset.screen = currentPage;
      }

      const nav = document.querySelector(".cvsWorkstream");
      if (nav) {
        nav.classList.add("cvOwnerNavigation");
        nav.dataset.plan = access.planKey;
        nav.querySelectorAll("button").forEach((button) => {
          const label = exactLabel(button);
          if (label) button.setAttribute("aria-label", label);
        });
      }

      const context = document.querySelector(".cvsContextBeam nav");
      if (context) {
        const area = areaForPage(currentPage);
        context.setAttribute("aria-label", `${area} navigation`);
        context.querySelectorAll("button").forEach((button) => {
          const label = String(button.textContent || "").trim();
          if (label) button.setAttribute("aria-label", label);
          if (label === "Time" || label === "Timesheets") {
            button.hidden = !access.can("payroll");
            button.setAttribute("aria-label", "Timesheets");
          }
          if (label === "Accounting") button.hidden = !access.can("accounting");
          if (label === "Dispatch") button.setAttribute("aria-label", "Jobs");
          if (label === "Week") button.setAttribute("aria-label", "Schedule");
          if (label === "Repeat work") button.setAttribute("aria-label", "Recurring");
          if (label === "People") button.setAttribute("aria-label", "Crew");
          if (label === "Live field") button.setAttribute("aria-label", "Field activity");
          if (label === "Time") button.setAttribute("aria-label", "Timesheets");
        });
      }

      const profile = document.querySelector(".cvsBeamActions .profile");
      if (profile) profile.classList.add("cv7Profile");

      const mobile = document.querySelector(".cvsMobileDock");
      if (mobile) {
        mobile.classList.add("cv7MobileNav");
        mobile.querySelectorAll("button").forEach((button) => {
          const label = exactLabel(button);
          if (label) button.setAttribute("aria-label", label);
        });
      }

      const mobileMore = document.querySelector(".cvsMobileMore");
      if (mobileMore) {
        mobileMore.classList.add("cv7MobileMore");
        mobileMore.setAttribute("role", "dialog");
        mobileMore.setAttribute("aria-modal", "true");
        mobileMore.setAttribute("aria-label", "More Churvox areas");
        const close = mobileMore.querySelector("section > header button");
        if (close) close.setAttribute("aria-label", "Close");
        mobileMore.querySelectorAll("section > button").forEach((button) => {
          const text = String(button.textContent || "").trim();
          if (/^Plans/i.test(text)) button.setAttribute("aria-label", "Plans");
          else if (/^Help/i.test(text)) button.setAttribute("aria-label", "Help");
          else if (/^Settings/i.test(text)) button.setAttribute("aria-label", "Settings");
        });
      }

      const target = document.querySelector(".cvsWorkspace");
      setWorkspace((current) => current === target ? current : target);
      if (target) target.classList.toggle("cvPlansReleaseHost", currentPage === "plans");
      setPage((current) => current === currentPage ? current : currentPage);
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    apply();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [access]);

  if (page !== "plans" || !workspace) return null;
  return createPortal(<StudioPlansRelease access={access} user={user} api={api} />, workspace);
}
