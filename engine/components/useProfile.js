"use client";
import { useEffect, useState } from "react";

export function useProfile() {
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lms.profile");
      setProfile(raw ? JSON.parse(raw) : null);
    } catch { setProfile(null); }
  }, []);
  const select = (p) => {
    localStorage.setItem("lms.profile", JSON.stringify(p));
    setProfile(p);
  };
  const logout = () => {
    localStorage.removeItem("lms.profile");
    setProfile(null);
  };
  return { profile, select, logout };
}
