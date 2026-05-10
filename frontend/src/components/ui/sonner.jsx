"use client"

import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      className="toaster group z-[99999]"
      toastOptions=
        classNames: {
          toast:
            "group toast z-[99999] bg-slate-900 text-white border border-white/10 shadow-xl rounded-xl",
          title:
            "text-white",
          description:
            "text-slate-200",
          actionButton:
            "bg-blue-600 text-white hover:bg-blue-700",
          cancelButton:
            "bg-slate-700 text-slate-100 hover:bg-slate-600",
          error:
            "bg-slate-900 text-white border border-red-500/40",
          success:
            "bg-slate-900 text-white border border-green-500/40",
          warning:
            "bg-slate-900 text-white border border-yellow-500/40",
          info:
            "bg-slate-900 text-white border border-blue-500/40",
        },
        style: {
          zIndex: 99999,
        },
      
      style=
        zIndex: 99999,
      
      {...props}
    />
  )
}

export { Toaster, toast }
