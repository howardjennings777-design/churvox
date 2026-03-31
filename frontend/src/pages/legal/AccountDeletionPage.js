import React from "react";
import { Link } from "react-router-dom";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-churvox-bg" data-testid="account-deletion-page">
      <div className="max-w-3xl mx-auto px-4 py-12 md:py-20">
        <div className="mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-churvox-muted hover:text-white transition-colors mb-6" data-testid="back-link">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <ChurvoxLogo size="md" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white" data-testid="account-deletion-heading">Account Deletion</h1>
          <p className="text-churvox-muted mt-2 text-sm">Last updated: March 2026</p>
        </div>
        <div className="prose prose-invert max-w-none space-y-6" data-testid="account-deletion-content">
          <div className="bg-churvox-card border border-churvox-border rounded-xl p-6 md:p-8 space-y-6">
            <p className="text-churvox-muted text-sm leading-relaxed">
              Churvox account deletion information placeholder text will be added here.
            </p>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">How to Delete Your Account</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">Detailed instructions for account deletion will be added here.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">What Happens When You Delete</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">Information about what data is removed and what is retained will be added here.</p>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Data Retention</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">Details about data retention after account deletion will be added here.</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Account deletion is permanent</p>
                <p className="text-xs text-churvox-muted mt-1">Once your account is deleted, all your data including jobs, invoices, clients, and team members will be permanently removed. This action cannot be undone.</p>
              </div>
            </div>
            <div className="border-t border-churvox-border pt-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Request Deletion</h2>
              <p className="text-churvox-muted text-sm leading-relaxed">To request account deletion, please contact us or use the Delete Account option in your account settings.</p>
              <Button asChild variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                <Link to="/settings" data-testid="go-to-settings-link">Go to Account Settings</Link>
              </Button>
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
