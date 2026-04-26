import React from "react";
import { safeReactChild } from "../../utils/safeRender";

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
    <div className={`min-h-[42vh] w-full flex items-center justify-center px-4 py-10 ${className}`}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {isLoading && (
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        )}

        {isError && (
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
            !
          </div>
        )}

        {isEmpty && (
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
            •
          </div>
        )}

        <h2 className="text-lg font-semibold text-slate-900">
          {safeReactChild(title || (isLoading ? "Loading..." : isError ? "Something went wrong" : "Nothing here yet"))}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {safeReactChild(message || (
            isLoading
              ? "Please wait while we load this page."
              : isError
              ? "We could not load this page properly. Please try again."
              : "There is no data to show yet."
          ))}
        </p>

        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}
