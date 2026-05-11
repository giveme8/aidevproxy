# ADR-0002: 使用 Cloudflare 部署网站

## 状态

Accepted

## 背景

项目需要一个官方网站来展示产品信息和文档，同时需要低成本、高性能的托管方案。

## 决策

使用 Next.js + OpenNext 构建网站，部署到 Cloudflare Workers。

## 替代方案

- Vercel
- GitHub Pages
- 自建服务器

## 影响

优点：

- Cloudflare 全球边缘网络延迟低
- 与项目使用的 Cloudflare 生态一致
- 免费额度足够官网使用

风险：

- OpenNext 适配层可能有兼容性问题
- 部分 Next.js 特性不支持
