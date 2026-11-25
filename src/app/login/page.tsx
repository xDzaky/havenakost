"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";

// Daftar Kredensial Resmi Havena Kost (Sesuai ACCOUNTS.md)
const REGISTERED_ACCOUNTS = [
  {
    role: "admin",
    email: "adminhavenakost@gmail.com",
    displayEmail: "AdminHavenaKost@gmail.com",
    password: "HavenaKost123",
    name: "Super Admin Havena",
  },
  {
    role: "admin",
    email: "admin@havenakost.id",
    displayEmail: "admin@havenakost.id",
    password: "HavenaKost123",
    name: "Admin Operasional",
  },
  {
    role: "admin",
    email: "rizky@havenakost.id",
    displayEmail: "rizky@havenakost.id",
    password: "HavenaKost123",
    name: "Rizky Pratama (QA Lead)",
  },
  {
    role: "owner",
    email: "ratna.kusuma@gmail.com",
    displayEmail: "ratna.kusuma@gmail.com",
    password: "havena123",
    name: "Ratna Kusuma Dewi (Kost Griya Cendekia)",
  },
  {
    role: "owner",
    email: "hendra.wijaya@gmail.com",
    displayEmail: "hendra.wijaya@gmail.com",
    password: "havena123",
    name: "Hendra Wijaya (Kost Putra Tlogomas)",
  },
  {
    role: "owner",
    email: "dewi.anggraini@gmail.com",
    displayEmail: "dewi.anggraini@gmail.com",
    password: "havena123",
    name: "Dewi Anggraini (Kost Sigura-gura)",
  },
  {
    role: "owner",
    email: "agus.setiawan@gmail.com",
    displayEmail: "agus.setiawan@gmail.com",
    password: "havena123",
    name: "Agus Setiawan (Kost Suhat)",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "admin">("owner");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const inputEmail = email.trim().toLowerCase();
    const inputPass = password;

    if (!inputEmail || !inputPass) {
      setErrorMessage("Silakan isi email dan kata sandi terlebih dahulu.");
      setIsLoading(false);
      return;
    }

    // 1. Coba verifikasi dengan akun terdaftar
    const matchedAccount = REGISTERED_ACCOUNTS.find(
      (acc) => acc.email === inputEmail && acc.role === role
    );

    // 2. Otentikasi resmi via Better-Auth agar session cookie HTTP-only terpasang di browser
    try {
      const res = await authClient.signIn.email({
        email: inputEmail,
        password: inputPass,
      });

      if (res.error) {
        if (matchedAccount && matchedAccount.password !== inputPass) {
          setErrorMessage("Kata sandi salah untuk email ini. Periksa kembali huruf besar/kecil.");
        } else {
          setErrorMessage(
            res.error.message ||
              "Akun tidak ditemukan atau kata sandi tidak cocok. Gunakan kredensial resmi pada petunjuk di bawah."
          );
        }
        setIsLoading(false);
        return;
      }

      // Berhasil autentikasi
      const sessionData = {
        role: role,
        name: matchedAccount ? matchedAccount.name : inputEmail.split("@")[0],
        email: matchedAccount ? matchedAccount.displayEmail : inputEmail,
      };

      try {
        localStorage.setItem("havena_session", JSON.stringify(sessionData));
      } catch (err) {}

      setSuccessMessage(
        `Berhasil masuk sebagai ${sessionData.name}! Mengalihkan ke dashboard...`
      );
      setTimeout(() => {
        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/owner");
        }
      }, 500);
    } catch (err: any) {
      // Fallback darurat jika jaringan DB offline tetapi kredensial demo cocok
      if (matchedAccount && matchedAccount.password === inputPass) {
        const sessionData = {
          role: matchedAccount.role,
          name: matchedAccount.name,
          email: matchedAccount.displayEmail,
        };
        try {
          localStorage.setItem("havena_session", JSON.stringify(sessionData));
        } catch (e) {}

        setSuccessMessage(
          `Berhasil masuk sebagai ${matchedAccount.name}! Mengalihkan ke dashboard...`
        );
        setTimeout(() => {
          if (matchedAccount.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/owner");
          }
        }, 500);
        return;
      }

      setErrorMessage(
        "Koneksi server gagal atau kredensial tidak cocok. Pastikan memilih role dan kredensial yang tepat."
      );
      setIsLoading(false);
    }
  };

  // Helper untuk mengisi cepat form agar user tetap menekan tombol Masuk
  const fillPreset = (emailPreset: string, passPreset: string, rolePreset: "owner" | "admin") => {
    setRole(rolePreset);
    setEmail(emailPreset);
    setPassword(passPreset);
    setErrorMessage(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 16px",
      }}
    >
      <div
        className="dash-table-card"
        style={{
          maxWidth: 460,
          width: "100%",
          padding: "36px 32px",
          boxShadow: "0 10px 40px rgba(15, 76, 92, 0.12)",
          borderRadius: 24,
          background: "#fff",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <img
              src="/image/HavenaKost.svg"
              alt="Havena Kost"
              style={{ height: 44, margin: "0 auto" }}
            />
          </Link>
          <h2
            style={{
              fontSize: 21,
              fontWeight: 800,
              color: "var(--teal-950)",
              marginTop: 16,
              letterSpacing: "-0.4px",
            }}
          >
            Masuk ke Dashboard
          </h2>
          <p style={{ fontSize: 13, color: "var(--mut)", marginTop: 6, lineHeight: 1.5 }}>
            Masukkan kredensial akun untuk mengakses panel pengelolaan.
          </p>
        </div>

        {/* ROLE TABS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 20,
            background: "#F1F5F9",
            padding: 4,
            borderRadius: 14,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setRole("owner");
              setErrorMessage(null);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: role === "owner" ? "#fff" : "transparent",
              color: role === "owner" ? "var(--teal-950)" : "var(--mut)",
              boxShadow: role === "owner" ? "var(--sh-sm)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            Mitra Pemilik Kost
          </button>
          <button
            type="button"
            onClick={() => {
              setRole("admin");
              setErrorMessage(null);
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              background: role === "admin" ? "#fff" : "transparent",
              color: role === "admin" ? "var(--teal-950)" : "var(--mut)",
              boxShadow: role === "admin" ? "var(--sh-sm)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            Super Admin
          </button>
        </div>

        {/* ERROR / SUCCESS ALERTS */}
        {errorMessage && (
          <div
            style={{
              background: "#FEE2E2",
              border: "1px solid #FCA5A5",
              color: "#B91C1C",
              padding: "11px 14px",
              borderRadius: 12,
              fontSize: 12.5,
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              background: "#DCFCE7",
              border: "1px solid #86EFAC",
              color: "#15803D",
              padding: "11px 14px",
              borderRadius: 12,
              fontSize: 12.5,
              marginBottom: 18,
              lineHeight: 1.5,
            }}
          >
            {successMessage}
          </div>
        )}

        {/* FORM INPUT LOGIN */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                display: "block",
                marginBottom: 6,
                color: "var(--teal-950)",
              }}
            >
              Email Akun
            </label>
            <input
              type="email"
              className="finput"
              placeholder={
                role === "owner"
                  ? "ratna.kusuma@gmail.com"
                  : "AdminHavenaKost@gmail.com"
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: "1.5px solid var(--line)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                display: "block",
                marginBottom: 6,
                color: "var(--teal-950)",
              }}
            >
              Kata Sandi
            </label>
            <input
              type="password"
              className="finput"
              placeholder={role === "owner" ? "havena123" : "HavenaKost123"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 10,
                border: "1.5px solid var(--line)",
                fontSize: 13.5,
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-emerald"
            style={{
              width: "100%",
              padding: "12px 18px",
              fontWeight: 800,
              fontSize: 14,
              borderRadius: 12,
              cursor: "pointer",
            }}
            disabled={isLoading}
          >
            {isLoading ? "Memproses Autentikasi..." : "Masuk ke Dashboard"}
          </button>
        </form>

        {/* QUICK AUTOFILL ACCORDING TO ACCOUNTS.MD */}
        <div
          style={{
            marginTop: 26,
            paddingTop: 20,
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: "var(--faint)",
              marginBottom: 10,
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Isi Otomatis Kredensial Uji (AKUN-LOGIN.md)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              className="btn btn-line btn-sm"
              onClick={() =>
                fillPreset("ratna.kusuma@gmail.com", "havena123", "owner")
              }
              style={{
                fontSize: 11.5,
                padding: "8px 10px",
                borderRadius: 8,
                textAlign: "center",
                display: "block",
              }}
            >
              Pemilik: Bu Ratna
            </button>
            <button
              type="button"
              className="btn btn-line btn-sm"
              onClick={() =>
                fillPreset("AdminHavenaKost@gmail.com", "HavenaKost123", "admin")
              }
              style={{
                fontSize: 11.5,
                padding: "8px 10px",
                borderRadius: 8,
                textAlign: "center",
                display: "block",
              }}
            >
              Super Admin Utama
            </button>
          </div>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <Link
              href="/"
              style={{
                fontSize: 12.5,
                color: "var(--emerald-dark)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ← Kembali ke Beranda Publik
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
