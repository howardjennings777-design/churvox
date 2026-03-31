import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "./ui/button";

export function UpgradePrompt({ feature, message }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-churvox-border bg-churvox-card/50 text-center space-y-3" data-testid={`upgrade-prompt-${feature}`}>
      <div className="h-10 w-10 rounded-full bg-churvox-accent/15 flex items-center justify-center">
        <Lock size={18} className="text-churvox-accent" />
      </div>
      <p className="text-sm text-white font-medium">{message || `Upgrade to unlock ${feature}`}</p>
      <Button asChild size="sm" className="bg-churvox-accent hover:bg-churvox-accent/90">
        <Link to="/plans" data-testid="upgrade-prompt-link">View Plans</Link>
      </Button>
    </div>
  );
}
