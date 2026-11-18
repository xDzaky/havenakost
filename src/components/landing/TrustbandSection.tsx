"use client";

import React from "react";

export function TrustbandSection() {
  return (
    <section className="trustband container" style={{ padding: "26px 0 6px" }}>
      <div
        className="tb-strip"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          background: "rgba(255, 255, 255, 0.92)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "var(--sh-sm)",
          overflow: "hidden",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          className="tb-item"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
          }}
        >
          <span
            className="tb-ico i1"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--emerald-soft2)",
              color: "var(--emerald-dark)",
              flexShrink: 0,
            }}
          >
            <svg className="ic" style={{ width: 18, height: 18 }}>
              <use href="#i-shield" />
            </svg>
          </span>
          <div>
            <b style={{ fontSize: 13, color: "var(--teal-950)", display: "block" }}>
              Verifikasi Manual
            </b>
            <small style={{ fontSize: 11, color: "var(--mut)" }}>
              Ditinjau tim Super Admin
            </small>
          </div>
        </div>

        <div
          className="tb-item"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderLeft: "1px solid var(--line)",
          }}
        >
          <span
            className="tb-ico i2"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--sky-soft)",
              color: "var(--sky)",
              flexShrink: 0,
            }}
          >
            <svg className="ic" style={{ width: 18, height: 18 }}>
              <use href="#i-map" />
            </svg>
          </span>
          <div>
            <b style={{ fontSize: 13, color: "var(--teal-950)", display: "block" }}>
              Urut Jarak Terdekat
            </b>
            <small style={{ fontSize: 11, color: "var(--mut)" }}>
              Dari destinasi pilihanmu
            </small>
          </div>
        </div>

        <div
          className="tb-item"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderLeft: "1px solid var(--line)",
          }}
        >
          <span
            className="tb-ico i3"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--wa-soft)",
              color: "var(--wa-dark)",
              flexShrink: 0,
            }}
          >
            <svg className="ic" style={{ width: 18, height: 18 }}>
              <use href="#i-wa" />
            </svg>
          </span>
          <div>
            <b style={{ fontSize: 13, color: "var(--teal-950)", display: "block" }}>
              Kontak Langsung Pemilik
            </b>
            <small style={{ fontSize: 11, color: "var(--mut)" }}>
              WhatsApp tanpa perantara
            </small>
          </div>
        </div>

        <div
          className="tb-item"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderLeft: "1px solid var(--line)",
          }}
        >
          <span
            className="tb-ico i4"
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--gold-soft)",
              color: "var(--gold-dark)",
              flexShrink: 0,
            }}
          >
            <svg className="ic" style={{ width: 18, height: 18 }}>
              <use href="#i-wallet" />
            </svg>
          </span>
          <div>
            <b style={{ fontSize: 13, color: "var(--teal-950)", display: "block" }}>
              Gratis Selamanya
            </b>
            <small style={{ fontSize: 11, color: "var(--mut)" }}>
              Tanpa akun, tanpa biaya
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
