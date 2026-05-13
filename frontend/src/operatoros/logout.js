
export function clearChurvoxAuth() {
  const keys = [
    "token",
    "authToken",
    "access_token",
    "jwt",
    "user",
    "churvox_user",
    "role",
    "churvox_role",
    "email",
    "userEmail",
    "ownerEmail",
    "currentUser",
    "selectedRole",
    "impersonation",
    "churvox_owner_name",
    "churvox_show_first_login_guide",
    "churvox_first_login_guide_done",
    "churvox_force_login",
    "churvox_logged_out",
  ];

  const clearStore = (store) => {
    try {
      keys.forEach((key) => store.removeItem(key));
      Object.keys(store).forEach((key) => {
        const lowered = key.toLowerCase();
        if (
          lowered.includes("token") ||
          lowered.includes("auth") ||
          lowered.includes("session") ||
          lowered.includes("churvox_user") ||
          lowered.includes("grassley_user")
        ) {
          store.removeItem(key);
        }
      });
    } catch {}
  };

  clearStore(localStorage);
  clearStore(sessionStorage);

  try {
    document.cookie.split(";").forEach((cookie) => {
      const name = cookie.split("=")[0].trim();
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  } catch {}
}

export async function logoutAndGoToLogin() {
  clearChurvoxAuth();

  try {
    localStorage.setItem("churvox_force_login", "true");
    localStorage.setItem("churvox_logged_out", String(Date.now()));
  } catch {}

  try {
    await fetch("https://grassley-backend.onrender.com/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {}

  clearChurvoxAuth();

  try {
    localStorage.setItem("churvox_force_login", "true");
    localStorage.setItem("churvox_logged_out", String(Date.now()));
  } catch {}

  window.location.replace("/login?logged_out=1");
}
