import { API_URL } from "./api";

export const saveToken = () => {
  sessionStorage.setItem("loggedIn", "1");
};

export const isAuthenticated = () => {
  return !!sessionStorage.getItem("loggedIn");
};

export const logout = async () => {
  await fetch(`${API_URL}/api/logout`, { method: "POST", credentials: "include" });
  sessionStorage.removeItem("loggedIn");
};
