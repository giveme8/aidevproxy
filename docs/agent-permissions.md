# Agent Permissions Strategy

本文件描述 Claude Code / Codex 等本地编码 Agent 的权限策略。

## 原则

Prompt 负责让 Agent 知道规则。
Permissions / Hooks 负责阻止危险操作。
CI 负责防止不合格代码进入主分支。

## 自动允许

可以自动执行：

```txt
Read files
Edit src/pages/
Edit src/components/
Edit src/features/
Edit src/styles/
Edit src/__tests__/
Edit e2e/
Edit website/src/
Run npm run typecheck
Run npm run lint
Run npm run test
Run npm run test:e2e
Run npm run build
Run git diff
Run git status
```

## 需要询问

需要人工确认：

```txt
Edit package.json
Edit lockfiles
Edit src-tauri/
Edit .github/workflows/
Run npm install
Run npm update
Run gh pr create
Run wrangler deploy
```

## 禁止或强审批

禁止自动执行：

```txt
Read .env
Read private keys
Delete files
rm -rf
Publish stable release
Modify signing secrets
Modify production Cloudflare config
```

## 建议实现方式

- Claude Code：使用 `/permissions` 和 hooks
- Codex：使用 `AGENTS.md` + CI

## CI Diff Mode

`scripts/agent-guard.sh` supports a base-ref mode for CI and PR checks.

Local mode:

```bash
bash scripts/agent-guard.sh
```

CI / PR mode:

```bash
git fetch origin main
bash scripts/agent-guard.sh --base origin/main
```

In `--base` mode, the script checks changes from `merge-base(<base>, HEAD)` to `HEAD`, so it can detect PR changes in a clean GitHub Actions checkout.
