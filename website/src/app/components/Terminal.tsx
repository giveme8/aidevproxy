"use client";

import { useEffect, useMemo, useState } from "react";

interface Line {
  kind: "prompt" | "route" | "ok" | "p2p" | "done";
  text: string;
}

const SCRIPT: Line[] = [
  { kind: "prompt", text: "pip install transformers accelerate" },
  { kind: "route", text: "↳ pypi.org → mirrors.tuna.tsinghua.edu.cn" },
  { kind: "ok", text: "✓ Resolving dependencies … 0.3s" },
  { kind: "ok", text: "✓ Downloading transformers-4.46.0 (8.2 MB)  ─── 412 MB/s" },
  { kind: "p2p", text: "↻ accelerate-1.1.0  ←  P2P · 局域网 (peer 192.168.1.42)" },
  { kind: "ok", text: "✓ Cached locally · 已宣告至 DHT" },
  { kind: "done", text: "Done in 2.4s    saved 18.7s   (vs. upstream)" },
];

function colorFor(kind: string) {
  switch (kind) {
    case "prompt": return "var(--terminal-ink)";
    case "route": return "#E8B89E";
    case "ok": return "#A8C792";
    case "p2p": return "#9EBCE8";
    case "done": return "var(--accent)";
    default: return "var(--terminal-dim)";
  }
}

export default function Terminal() {
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState("");

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const line = SCRIPT[step];
    if (!line) return;

    if (step === 0) {
      let i = 0;
      const tick = () => {
        i++;
        setTyping(SCRIPT[0].text.slice(0, i));
        if (i < SCRIPT[0].text.length) {
          t1 = setTimeout(tick, 50 + Math.random() * 40);
        } else {
          t2 = setTimeout(() => setStep(1), 500);
        }
      };
      setTyping("");
      t1 = setTimeout(tick, 600);
    } else {
      t2 = setTimeout(() => {
        if (step >= SCRIPT.length) {
          setStep(0);
          setTyping("");
        } else {
          setStep(step + 1);
        }
      }, 700);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [step]);

  const linesShown: (Line & { caret?: boolean; text: string })[] =
    step === 0
      ? [{ kind: "prompt", text: typing, caret: true }]
      : [
          { kind: "prompt", text: SCRIPT[0].text },
          ...SCRIPT.slice(1, step + 1),
        ];

  return (
    <div
      style={{
        background: "var(--terminal-bg)",
        borderRadius: 14,
        padding: "20px 22px 22px",
        fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
        fontSize: 14,
        lineHeight: 1.7,
        color: "var(--terminal-ink)",
        boxShadow:
          "0 30px 80px -30px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset",
        minHeight: 260,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <span
          style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }}
        />
        <span
          style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }}
        />
        <span
          style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }}
        />
        <span
          style={{
            marginLeft: "auto",
            color: "var(--terminal-dim)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          aidevproxy · live
        </span>
      </div>
      {linesShown.map((l, i) => (
        <div key={i} style={{ color: colorFor(l.kind), whiteSpace: "pre" }}>
          {l.kind === "prompt" && (
            <span style={{ color: "var(--accent)", marginRight: 8 }}>$</span>
          )}
          {l.text}
          {l.caret && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: 17,
                background: "var(--accent)",
                verticalAlign: "middle",
                marginLeft: 1,
                animation: "blink 0.8s step-end infinite",
              }}
            />
          )}
        </div>
      ))}
      <style jsx>{`
        @keyframes blink {
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
