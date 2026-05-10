import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  title: "AIDevProxy — 让 AI 开发环境跑得飞快",
  description:
    "本地 AI 开发代理：拦截 pip/npm/HuggingFace 请求，智能镜像加速 + P2P 局域网分发 + 本地缓存。一次配置 HTTP_PROXY，覆盖所有工具。",
  keywords: ["AI", "proxy", "pip", "npm", "HuggingFace", "P2P", "cache", "mirror", "Rust", "libp2p"],
  openGraph: {
    title: "AIDevProxy — 让 AI 开发环境跑得飞快",
    description:
      "本地 AI 开发代理：拦截 pip/npm/HuggingFace 请求，智能镜像加速 + P2P 局域网分发 + 本地缓存。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geist.variable} ${geistMono.variable} ${notoSerifSC.variable}`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
