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

function customerLabel(value) {
  return String(value || "").trim() === "Work" ? "Jobs" : String(value || "").trim();
}

function setCustomerButtonLabel(button) {
  if (!button) return "";
  const current = exactLabel(button);
  const next = customerLabel(current);
  const span = button.querySelector("span");
  if (span && next && span.textContent !== next) span.textContent = next;
  if (next) button.setAttribute("aria-label", next);
  return next;
}

function navigateOwner(page) {
  window.history.pushState({}, "", `/dashboard${page === "today" ? "" : `#${page}`}`);
  window.dispatchEvent(new Event("hashchange"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureMobileMoreDestination(mobileMore, page, label) {
  const section = mobileMore?.querySelector("section");
  if (!section) return;
  const buttons = Array.from(section.querySelectorAll(":scope > button"));
  const existing = buttons.find((button) => new RegExp(`^\\s*${label}\\b`, "i").test(String(button.textContent || "")));
  if (existing) {
    existing.setAttribute("aria-label", label);
    return;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "cvStableMobileDestination";
  button.dataset.cvDestination = page;
  button.textContent = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", () => {
    const close = mobileMore.querySelector("section > header button");
    if (close) close.click();
    window.setTimeout(() => navigateOwner(page), 0);
  });

  const utility = buttons.find((item) => /^(Settings|Plans|Help)/i.test(String(item.textContent || "").trim()));
  section.insertBefore(button, utility || null);
}

function keepMobileTodayHeading(target, currentPage) {
  if (!target) return;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  let heading = target.querySelector(":scope > .cvMobileTodayHeading");
  if (!mobile || currentPage !== "today") {
    if (heading) heading.remove();
    return;
  }
  if (!heading) {
    heading = document.createElement("h1");
    heading.className = "cvMobileTodayHeading";
    heading.textContent = "Today";
    heading.style.margin = "0 0 12px";
    heading.style.color = "#161a17";
    heading.style.fontFamily = '"Manrope", sans-serif';
    heading.style.fontSize = "30px";
    heading.style.lineHeight = "1";
    heading.style.letterSpacing = "-0.045em";
    target.prepend(heading);
  }
}

export default function StudioReleaseBridge() {
  const { user, logout } = useAuth();
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
        nav.querySelectorAll("button").forEach(setCustomerButtonLabel);
      }

      const pageHeading = document.querySelector(".cvsContextIdentity b");
      if (pageHeading) {
        const next = customerLabel(pageHeading.textContent);
        if (next && pageHeading.textContent !== next) pageHeading.textContent = next;
        pageHeading.setAttribute("role", "heading");
        pageHeading.setAttribute("aria-level", "1");
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

      const logoutButton = document.querySelector(".cvsProfileMenu button.logout");
      if (logoutButton && logoutButton.dataset.cvStableLogout !== "true") {
        logoutButton.dataset.cvStableLogout = "true";
        logoutButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          logoutButton.disabled = true;
          const request = logout();
          window.history.replaceState({}, "", "/login?logged_out=1");
          window.dispatchEvent(new PopStateEvent("popstate"));
          Promise.resolve(request).catch(() => {});
        }, true);
      }

      const mobile = document.querySelector(".cvsMobileDock");
      if (mobile) {
        mobile.classList.add("cv7MobileNav");
        mobile.querySelectorAll("button").forEach(setCustomerButtonLabel);
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
          const text = customerLabel(button.textContent);
          if (/^Work$/i.test(String(button.textContent || "").trim())) button.textContent = "Jobs";
          if (/^Plans/i.test(text)) button.setAttribute("aria-label", "Plans");
          else if (/^Help/i.test(text)) button.setAttribute("aria-label", "Help");
          else if (/^Settings/i.test(text)) button.setAttribute("aria-label", "Settings");
          else if (text) button.setAttribute("aria-label", text.replace(/\d+$/, "").trim());
        });
        ensureMobileMoreDestination(mobileMore, "clients", "Clients");
        ensureMobileMoreDestination(mobileMore, "money", "Money");
        ensureMobileMoreDestination(mobileMore, "crew", "Team");
      }

      const target = document.querySelector(".cvsWorkspace");
      keepMobileTodayHeading(target, currentPage);
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
  }, [access, logout]);

  if (page !== "plans" || !workspace) return null;
  return createPortal(<StudioPlansRelease access={access} user={user} api={api} />, workspace);
}
