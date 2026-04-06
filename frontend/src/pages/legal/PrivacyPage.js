import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-churvox-bg" data-testid="privacy-page">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <div className="mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-churvox-muted hover:text-white transition-colors mb-6" data-testid="back-link">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <ChurvoxLogo size="md" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="privacy-heading">Privacy Policy</h1>
          <p className="text-churvox-muted mt-2 text-sm">Last updated: April 2026</p>
        </div>
        <div className="prose prose-invert max-w-none space-y-6" data-testid="privacy-content">
          <div className="bg-churvox-card border border-churvox-border rounded-xl p-6 md:p-8 space-y-6">
            <p className="text-churvox-muted text-sm leading-relaxed">
              Churvox respects your privacy. This Privacy Policy explains what information we collect, how we use it, and the choices you have when using the Churvox app and related services.
            </p>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Information We Collect</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">We may collect information you provide directly to us, including your name, email address, business name, contact details, billing details, client records, job details, quotes, invoices, schedules, team member details, and any notes, files, or images you upload to the service.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">How We Use Your Information</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">We use your information to operate the service, manage your account, support your workflow, process payments, improve app performance, provide customer support, maintain security, and communicate important product or account updates.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Data Security</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">We take reasonable steps to protect your information from unauthorized access, loss, misuse, or disclosure. However, no system is completely secure, and we cannot guarantee absolute security.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Contact Us</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">If you have questions about this Privacy Policy, contact us at hello@churvox.com.</p>
            </div>
          </div>
        </div>
        <footer className="mt-12 pt-6 border-t border-churvox-border flex flex-wrap gap-4 text-xs text-churvox-muted">
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link to="/account-deletion" className="hover:text-white transition-colors">Account Deletion</Link>
        </footer>
      </div>
    </div>
  );
}
