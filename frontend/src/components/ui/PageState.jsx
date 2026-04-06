import React from "react";

export default function PageState({
  type = "loading",
  title,
  message,
  action,
  className = "",
}) {
  const isLoading = type === "loading";
  const isError = type === "error";
  const isEmpty = type === "empty";

  return (
    <div className={`min-h-[50vh] w-full flex items-center justify-center px-4 py-10 ${className}`}>
      <div className="w-full max-w-md rounded-2xl border border-[#1f2937] bg-[#0f172a] p-6 text-center shadow-lg">
        {isLoading && (
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#1e293b] border-t-[#3b82f6]" />
        )}

        {isError && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-400">
            !
          </div>
        )}

        {isEmpty && (
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-500/10 text-2xl text-slate-300">
            •
          </div>
        )}

        <h2 className="text-xl font-bold text-white">
          {title || (isLoading ? "Loading..." : isError ? "Something went wrong" : "Nothing here yet")}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          {message || (
            isLoading
              ? "Please wait while we load this page."
              : isError
              ? "We could not load this page properly. Please try again."
              : "There is no data to show yet."
          )}
        </p>

        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
