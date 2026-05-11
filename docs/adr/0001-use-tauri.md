# ADR-0001: 使用 Tauri 作为客户端框架

## 状态

Accepted

## 背景

产品需要同时支持 macOS、Windows、Linux 桌面平台，并需要系统级代理和网络能力。

## 决策

使用 Tauri v2 作为客户端框架，前端使用 React + TypeScript + Vite。

## 替代方案

- Electron
- 原生 Swift / Kotlin / Windows App SDK
- Flutter

## 影响

优点：

- 安装包更小（相对于 Electron）
- 系统能力可通过 Rust bridge 接入
- 适合桌面代理工具场景
- Tauri v2 支持移动端扩展

风险：

- 多平台代理和网络行为差异明显
- 需要 Rust 工具链
