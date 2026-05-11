# Agent Task Template

请严格遵守仓库根目录的 `CLAUDE.md` / `AGENTS.md` 和 `ENGINEERING-SOP.md`。

## 任务

优化 / 实现：

```txt
在这里写具体任务。
```

## 必须先阅读

- `ENGINEERING-SOP.md`
- 相关 `specs/*.md`
- 相关 `docs/adr/*.md`
- `design-html/styles/design-tokens.json`
- 当前相关代码和测试

## 执行要求

1. 先输出 Implementation Plan，不要立刻改代码。
2. 列出会修改哪些文件。
3. 列出不会修改哪些文件。
4. 使用最小安全改动。
5. 修改后运行质量门禁。

## 允许修改

- `src/pages/`
- `src/components/`
- `src/features/`
- `src/styles/`
- `src/__tests__/`
- `e2e/`
- `website/src/`

## 禁止修改

- `package.json`
- lockfiles
- `.github/workflows/`
- `src-tauri/`
- `website/wrangler.toml`

除非你先说明原因并获得人工确认。

## 质量门禁

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
bash scripts/agent-guard.sh
```

## UI 任务额外要求

如果涉及 UI：

1. 生成截图到 `screenshots/after/`
2. 输出截图路径
3. 等待视觉评审
4. 根据反馈继续修改

## 最终输出格式

```md
## Changed Files

## Commands Run

## Test Results

## Screenshots

## Risks / Follow-ups
```
