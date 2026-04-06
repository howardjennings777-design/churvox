import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-churvox-bg" data-testid="terms-page">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <div className="mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-churvox-muted hover:text-white transition-colors mb-6" data-testid="back-link">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <ChurvoxLogo size="md" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="terms-heading">Terms of Service</h1>
          <p className="text-churvox-muted mt-2 text-sm">Last updated: April 2026</p>
        </div>
        <div className="prose prose-invert max-w-none space-y-6" data-testid="terms-content">
          <div className="bg-churvox-card border border-churvox-border rounded-xl p-6 md:p-8 space-y-6">
            <p className="text-churvox-muted text-sm leading-relaxed">
              Churvox These Terms of Service govern your use of the Churvox app and related services. By using Churvox, you agree to these terms.
            </p>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Acceptance of Terms</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">By creating an account, subscribing to a plan, or using Churvox, you agree to these Terms of Service and any updated terms posted in the app or website.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Use of Service</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">You may use Churvox only for lawful business purposes. You must not misuse the platform, interfere with its operation, attempt unauthorized access, or use the service in a way that harms Churvox or other users.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">User Obligations</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">You are responsible for keeping your login secure, providing accurate account information, managing your team users, and ensuring that the data you enter into Churvox is lawful and that you have the right to use it.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Limitation of Liability</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">To the extent permitted by law, Churvox is provided on an as-available basis and we are not liable for indirect, incidental, special, consequential, or data-loss related damages arising from use of the service.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">If you have questions about these Terms of Service, contact us at hello@churvox.com.</p>
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
