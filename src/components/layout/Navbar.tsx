"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<{ role: string; name: string; email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("havena_session");
      if (stored) {
        setSession(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const closeOnOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".profile-wrap")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", closeOnOutside);
    return () => document.removeEventListener("click", closeOnOutside);
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem("havena_session");
    } catch (e) {}
    setSession(null);
    setMenuOpen(false);
    router.push("/");
  };

  return (
    <header
      id="topbar"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: scrolled
          ? "rgba(255, 255, 255, 0.96)"
          : "rgba(255, 255, 255, 0.90)",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
        borderBottom: "1px solid rgba(227, 234, 241, 0.9)",
        boxShadow: scrolled
          ? "0 4px 20px rgba(15, 23, 42, 0.08)"
          : "0 2px 10px rgba(15, 23, 42, 0.04)",
        transition: "all 0.25s ease",
      }}
    >
      <div
        className="tb-in"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "10px 24px",
          height: 68,
        }}
      >
        {/* BRAND LOGO + TITLE */}
        <Link
          href="/"
          className="brand"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <img
            src="/image/HavenaKost.svg"
            alt="Havena Kost"
            className="brand-logo-img"
            style={{ height: 38, width: "auto", display: "block" }}
          />
          <span
            className="brand-text-wrap"
            style={{
              display: "flex",
              flexDirection: "column",
              lineHeight: 1.15,
            }}
          >
            <span
              className="brand-name"
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "#0F172A",
              }}
            >
              Havena<span style={{ color: "#0D9488" }}>Kost</span>
            </span>
            <span
              className="brand-sub"
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#64748B",
                letterSpacing: "-0.1px",
              }}
            >
              Malang Raya
            </span>
          </span>
        </Link>

        {/* PROFILE / LOGIN BUTTON ON RIGHT */}
        <div className="profile-wrap" style={{ position: "relative" }}>
          {session ? (
            <div>
              <button
                className="profile-pill"
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#fff",
                  border: "1px solid var(--line)",
                  padding: "5px 12px 5px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  boxShadow: "var(--sh-sm)",
                }}
              >
                <div style={{ textAlign: "right", lineHeight: 1.2 }}>
                  <b style={{ fontSize: 12, color: "var(--teal-950)", display: "block" }}>
                    {session.name.split(" ")[0]}
                  </b>
                  <small style={{ fontSize: 10, color: "var(--mut)" }}>
                    {session.role === "admin" ? "Super Admin" : "Mitra Pemilik"}
                  </small>
                </div>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--emerald-soft2)",
                    color: "var(--emerald-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {session.name.charAt(0)}
                </span>
              </button>

              {menuOpen && (
                <div
                  className="profile-menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: 230,
                    background: "#fff",
                    borderRadius: 16,
                    boxShadow: "var(--sh-lg)",
                    border: "1px solid var(--line)",
                    padding: 10,
                    zIndex: 110,
                    animation: "fadeUp 0.2s ease both",
                  }}
                >
                  <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", marginBottom: 6 }}>
                    <b style={{ fontSize: 12.5, color: "var(--teal-950)", display: "block" }}>{session.name}</b>
                    <small style={{ fontSize: 11, color: "var(--mut)" }}>{session.email}</small>
                  </div>

                  <Link
                    href={session.role === "admin" ? "/admin" : "/owner"}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--emerald-dark)",
                      textDecoration: "none",
                    }}
                  >
                    <svg className="ic" style={{ width: 15, height: 15 }}>
                      <use href="#i-grid" />
                    </svg>
                    Buka Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#EF4444",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <svg className="ic" style={{ width: 15, height: 15 }}>
                      <use href="#i-door" />
                    </svg>
                    Keluar (Logout)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="profile-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "#fff",
                border: "1.5px solid var(--line)",
                padding: "6px 16px",
                borderRadius: 999,
                cursor: "pointer",
                boxShadow: "var(--sh-sm)",
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              <svg
                className="ic"
                style={{ width: 16, height: 16, color: "var(--emerald-dark)" }}
              >
                <use href="#i-user" />
              </svg>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--teal-950)",
                }}
              >
                Masuk
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
