import React, { useEffect } from "react";

export default function FloatingBottomNav() {
  useEffect(() => {
    document.body.classList.remove("cv-has-floating-dock");
    return () => document.body.classList.remove("cv-has-floating-dock");
  }, []);

  return null;
}
