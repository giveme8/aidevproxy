# ADR-0003: 项目技术栈基线

## 状态

Accepted

## 背景

项目当前包含两部分：

- Tauri 桌面客户端（代理核心）
- Next.js 官网（Cloudflare 部署）

随着功能迭代，需要一份稳定、可引用的技术栈基线，避免在协作过程中反复讨论运行时、框架与测试工具选择。

## 决策

采用以下技术栈作为当前默认基线：

- 运行时：Node.js（前端与工具链）、Rust（Tauri 后端）
- 桌面客户端：Tauri v2 + React 18 + TypeScript + Vite
- 网站：Next.js + OpenNext，部署到 Cloudflare Workers
- 包管理：npm（与现有 `package-lock.json` 保持一致）
- 测试与质量：Vitest、Playwright、ESLint、TypeScript typecheck

## 约束

- 新增功能优先在上述技术栈内实现，避免无必要引入并行框架。
- 如需调整关键栈（例如包管理器、主框架、部署平台），必须新增 ADR 说明原因、迁移步骤与回滚策略。

## 影响

优点：

- 为 Agent 与开发者提供统一的技术决策依据
- 降低项目内技术分歧与维护成本
- 与现有工程 SOP、CI 与文档体系保持一致

风险：

- 后续若出现平台约束变化，需及时更新基线 ADR
- 历史分支若使用不同约定，合并时可能产生额外适配成本
