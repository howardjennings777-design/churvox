import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import JobCreateForm from "./forms/JobCreateForm";

const OPEN_EVENT = "churvox:open-job-popup";
const LEGACY_OPEN_EVENT = "churvox:open-job-modal";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const LAST_BACKGROUND_KEY = "churvox_last_non_modal_route";

function isJobsNewUrl(href) {
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname === "/jobs/new";
  } catch {
    return false;
  }
}

function searchFromHref(href) {
  try {
    return new URL(href, window.location.origin).search || "";
  } catch {
    return "";
  }
}

export function openJobModal(search = "") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { search } }));
}

export default function GlobalJobCreateModal() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [modalSearch, setModalSearch] = React.useState("");

  const firstSetup = React.useMemo(() => {
    try {
      return new URLSearchParams(modalSearch || "").get("first_setup") === "1";
    } catch {
      return false;
    }
  }, [modalSearch]);

  const openModal = React.useCallback((search = "") => {
    setModalSearch(search || "");
    setOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setOpen(false);
    setModalSearch("");
  }, []);

  React.useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (location.pathname !== "/jobs/new") {
      try { sessionStorage.setItem(LAST_BACKGROUND_KEY, path || "/dashboard#jobs"); } catch {}
      return;
    }

    const last = (() => {
      try { return sessionStorage.getItem(LAST_BACKGROUND_KEY) || "/dashboard#jobs"; } catch { return "/dashboard#jobs"; }
    })();

    openModal(location.search || "");
    navigate(last || "/dashboard#jobs", { replace: true });
  }, [location.pathname, location.search, location.hash, navigate, openModal]);

  React.useEffect(() => {
    const onOpen = (event) => openModal(event?.detail?.search || "");

    const onClick = (event) => {
      const target = event.target;
      const link = target?.closest?.("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      if (!isJobsNewUrl(href)) return;

      event.preventDefault();
      event.stopPropagation();
      openModal(searchFromHref(href));
    };

    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener(LEGACY_OPEN_EVENT, onOpen);
    document.addEventListener("click", onClick, true);

    try {
      const stored = window.localStorage.getItem(OPEN_JOB_MODAL_KEY);
      if (stored) {
        window.localStorage.removeItem(OPEN_JOB_MODAL_KEY);
        window.setTimeout(() => openModal(stored === "true" ? "" : stored), 60);
      }
    } catch {}

    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener(LEGACY_OPEN_EVENT, onOpen);
      document.removeEventListener("click", onClick, true);
    };
  }, [openModal]);

  if (!open) return null;

  return (
    <div
      className="freshPopupBackdrop freshJobPopupBackdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <section className="freshCard freshJobPopupCard">
        <header className="freshHero freshJobPopupHero">
          <span>{firstSetup ? "First job" : "New job"}</span>
          <h1>{firstSetup ? "Create job" : "Add job"}</h1>
          <p>Add the real job here without leaving the current area.</p>
        </header>

        <div className="freshJobPopupBody">
          <JobCreateForm
            modalSearch={modalSearch}
            onCancel={closeModal}
            onSuccess={() => {
              closeModal();
              window.dispatchEvent(new Event("churvox-records-refresh"));
              window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "job-created" } }));
            }}
            submitLabel={firstSetup ? "Create first job" : "Save job"}
          />
        </div>
      </section>
    </div>
  );
}
