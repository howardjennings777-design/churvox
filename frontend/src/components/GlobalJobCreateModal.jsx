import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Briefcase, X } from "lucide-react";
import JobCreateForm from "./forms/JobCreateForm";

const OPEN_EVENT = "churvox:open-job-modal";
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
      try {
        sessionStorage.setItem(LAST_BACKGROUND_KEY, path || "/dashboard#jobs");
      } catch {}
      return;
    }

    const last = (() => {
      try {
        return sessionStorage.getItem(LAST_BACKGROUND_KEY) || "/dashboard#jobs";
      } catch {
        return "/dashboard#jobs";
      }
    })();

    openModal(location.search || "");
    navigate(last || "/dashboard#jobs", { replace: true });
  }, [location.pathname, location.search, location.hash, navigate, openModal]);

  React.useEffect(() => {
    const onOpen = (event) => {
      openModal(event?.detail?.search || "");
    };

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
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener("click", onClick, true);
    };
  }, [openModal]);

  if (!open) return null;

  return (
    <div className="cv-route-modal cv-global-job-modal" role="dialog" aria-modal="true" aria-label="Create new job">
      <button
        type="button"
        className="cv-route-modal__backdrop"
        aria-label="Close new job"
        onClick={closeModal}
      />

      <section className="cv-route-modal__sheet cv-route-modal__sheet--job">
        <header className="cv-route-modal__header">
          <div>
            <p>{firstSetup ? "Step 4 of 4" : "New job"}</p>
            <h1>{firstSetup ? "Create your first job" : "New Job"}</h1>
            <span>Quick add from wherever you are. Save it, then carry on.</span>
          </div>

          <button type="button" className="cv-route-modal__close" onClick={closeModal}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="cv-route-modal__body">
          <JobCreateForm
            modalSearch={modalSearch}
            onCancel={closeModal}
            onSuccess={() => {
              closeModal();
              window.dispatchEvent(new Event("churvox-records-refresh"));
              window.dispatchEvent(new Event("churvox-auth-refresh"));
            }}
            submitLabel={firstSetup ? "Create first job" : "Create Job"}
          />
        </div>
      </section>
    </div>
  );
}
