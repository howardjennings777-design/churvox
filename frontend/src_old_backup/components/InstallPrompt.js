import React, { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "./ui/button";
import TeamWorkerEditPanel from "./TeamWorkerEditPanel";

const DISMISS_KEY = "churvox_install_dismissed";
const DISMISS_DAYS = 7;

function isDismissed() {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function isAutomationBrowser() {
  try {
    return Boolean(window.navigator.webdriver) || window.location.search.includes("audit=1");
  } catch {
    return false;
  }
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isFormLikeRoute() {
  const path = window.location.pathname || "";
  return /\/(new|edit)(\/|$)/i.test(path) || /\/jobs\/[^/]+|\/quotes\/[^/]+|\/invoices\/[^/]+|\/clients\/[^/]+/i.test(path);
}

function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  const device = getDeviceType();

  useEffect(() => {
    if (isAutomationBrowser() || isStandalone() || isDismissed() || isFormLikeRoute()) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timer = setTimeout(() => {
      if (device !== "desktop" && !isStandalone() && !isDismissed() && !isFormLikeRoute()) {
        setShowBanner(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timer);
    };
  }, [device]);

  useEffect(() => {
    if (isFormLikeRoute()) {
      setShowBanner(false);
      setShowInstructions(false);
    }
  }, []);

  const handleInstall = useCallback(async () => {
    setActionLoading(true);
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") {
          setShowBanner(false);
          setInstalled(true);
        }
      } catch {
        // prompt() can only be called once
      }
      setDeferredPrompt(null);
      setActionLoading(false);
      return;
    }

    setShowInstructions(true);
    setActionLoading(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // localStorage might be full or unavailable
    }
    setShowBanner(false);
    setShowInstructions(false);
  }, []);

  if (installed || !showBanner || isStandalone() || isAutomationBrowser() || isFormLikeRoute()) return null;

  if (showInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" data-testid="install-instructions-overlay">
        <div className="w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-churvox-card border border-churvox-border rounded-2xl p-5 shadow-2xl" data-testid="install-instructions-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Install Churvox</h3>
            <button onClick={handleDismiss} className="p-1 text-churvox-muted hover:text-white" data-testid="install-instructions-close">
              <X size={18} />
            </button>
          </div>
          {device === "ios" ? (
            <div className="space-y-3">
              <p className="text-sm text-churvox-muted">To install on your iPhone or iPad:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="bg-churvox-accent/20 text-churvox-accent font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">1</span>
                  <span className="text-white">Tap the <Share size={14} className="inline text-churvox-accent" /> <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="bg-churvox-accent/20 text-churvox-accent font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">2</span>
                  <span className="text-white">Scroll down and tap <strong>Add to Home Screen</strong></span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="bg-churvox-accent/20 text-churvox-accent font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">3</span>
                  <span className="text-white">Tap <strong>Add</strong> to confirm</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-churvox-muted">To install on your device:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <span className="bg-churvox-accent/20 text-churvox-accent font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">1</span>
                  <span className="text-white">Open the browser menu <strong>(three dots)</strong></span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="bg-churvox-accent/20 text-churvox-accent font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">2</span>
                  <span className="text-white">Tap <strong>Install App</strong> or <strong>Add to Home Screen</strong></span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="bg-churvox-accent/20 text-churvox-accent font-bold rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-xs">3</span>
                  <span className="text-white">Tap <strong>Install</strong> to confirm</span>
                </div>
              </div>
            </div>
          )}
          <Button onClick={handleDismiss} variant="outline" className="w-full mt-4 border-churvox-border text-churvox-muted hover:text-white" data-testid="install-instructions-dismiss">
            Got it
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-4 right-4 sm:left-auto sm:right-4 sm:w-80 sm:bottom-4 z-[35] pointer-events-none"
      style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
      data-testid="install-banner"
    >
      <div className="bg-churvox-card border border-churvox-border rounded-2xl p-4 shadow-2xl flex items-start gap-3 pointer-events-auto">
        <div className="h-10 w-10 rounded-xl bg-churvox-accent/15 flex items-center justify-center shrink-0">
          <Download size={20} className="text-churvox-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Install Churvox</p>
          <p className="text-xs text-churvox-muted mt-0.5">Add to your home screen for faster access</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall} disabled={actionLoading} className="bg-churvox-accent hover:bg-churvox-accent/90 text-xs px-4" data-testid="install-button">
              {actionLoading ? "Opening..." : "Install"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss} className="border-churvox-border text-churvox-muted hover:text-white text-xs" data-testid="install-dismiss">
              Not now
            </Button>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-0.5 text-churvox-muted/50 hover:text-churvox-muted" data-testid="install-banner-close">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export function InstallPrompt() {
  return (
    <>
      <TeamWorkerEditPanel />
      <InstallPromptBanner />
    </>
  );
}
