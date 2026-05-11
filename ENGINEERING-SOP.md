# AIDevProxy 工程体系 SOP

## 1. 系统目标

建立一套从产品设计、UI 出图、HTML 原型、客户端工程、调试、测试、发版到线上反馈的 AI 协作工程体系。

本项目为 Tauri 桌面代理客户端 + Next.js 网站的混合工程。

核心分工：

- 产品设计 → UI 图 → HTML 原型 → Tauri 客户端代码
- 本地工程 Agent：改代码、跑测试、调试、截图
- MCP / CLI：浏览器调试、终端执行、GitHub、Cloudflare、Tauri

## 2. 总流程

```txt
产品设计
    ↓
UI 图
    ↓
根据图生成 HTML / CSS 原型
    ↓
根据 HTML 生成 Tauri + React 客户端代码
    ↓
启动 npm run tauri dev
    ↓
截图验证
    ↓
视觉评审
    ↓
按反馈修改代码
    ↓
typecheck / lint / unit / e2e / build
    ↓
重新截图
    ↓
复查
    ↓
PR / CI / Release
```

## 3. 视觉闭环

本地 Agent 负责：

- 启动项目
- 截图
- 修改代码
- 跑测试
- 输出新截图

视觉判断交给外部评审：

- 看截图
- 识别视觉问题
- 给出可执行修改建议
- 对比 golden screenshots
- 复查 UI 是否偏移

## 4. Golden Screenshots

每个核心页面都要有标准视觉图：

```txt
golden-screenshots/
  dashboard.png
  settings.png
  p2p-status.png
```

每次 UI 修改后生成：

```txt
screenshots/after/dashboard.png
```

## 5. Design Tokens 锁定

输出 HTML 时必须同时输出 design tokens。

不能随便新增颜色、圆角、阴影、字号，必须优先使用 token。

## 6. AI 变更保护规则

每次改代码前必须输出：

1. 要改哪些文件
2. 为什么要改
3. 不会改哪些文件
4. 预期测试命令

禁止：

- 删除无关文件
- 重写整个项目
- 无理由升级依赖
- 绕过测试
- 删除失败测试
- 修改密钥
- 直接发布 stable

## 7. 质量门禁

每次迭代必须通过：

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
```

UI 相关改动还必须通过：

```txt
- DevTools 无 console error
- 关键页面截图完成
- 视觉复查通过
```

## 8. 人工审批点

以下操作必须人工确认：

- 新增依赖
- 删除文件
- 修改 release workflow
- 修改签名 / 公证配置
- 发布 stable
- 修改 Cloudflare production
- 读取或修改密钥
- 大规模重构

## 9. 让 Claude Code / Codex 遵循规则

本工程体系不依赖 Agent 自觉，而是通过四层机制约束：

1. 仓库规则文件：`CLAUDE.md` / `AGENTS.md`
2. 任务启动模板：`prompts/agent-task-template.md`
3. 权限与 Hooks：`docs/agent-permissions.md` / `claude-hooks/`
4. CI 与 Guard：`scripts/agent-guard.sh` / `.github/workflows/ci.yml`

### 9.1 根目录规则文件

- Claude Code 读取 `CLAUDE.md`
- Codex / 通用 Agent 读取 `AGENTS.md`

两个文件都要求 Agent：

- 先读 SOP / specs / ADR / design tokens
- 先计划再改代码
- UI 修改必须截图评审
- 禁止删除测试
- 禁止无审批新增依赖
- 禁止触碰密钥和发布配置

### 9.2 Guard 脚本

`scripts/agent-guard.sh` 用于阻止：

- 提交密钥文件
- 跳过测试
- 删除测试
- 无审批改依赖
- 无审批改发布 / 部署 / Tauri 配置

### 9.3 Hooks

`claude-hooks/` 提供示例脚本，用于拦截：

- 读取密钥
- 新增依赖
- release / deploy
- 破坏性删除

### 9.4 CI 强制

`.github/workflows/ci.yml` 会先运行 agent guard，再运行客户端质量门禁。

即使 Agent 没有遵守 Prompt，PR 也不能直接进入主分支。

## 10. Skills 能力包

`skills/` 用于把常见任务封装成可复用流程。

### 10.1 关系

```txt
CLAUDE.md / AGENTS.md = 项目宪法
ENGINEERING-SOP.md    = 工程制度
specs/                = 产品需求
prompts/              = 单次任务模板
skills/               = 可复用能力包
hooks + CI            = 强制执行器
```

### 10.2 当前 Skills

```txt
skills/quality-gate/
skills/ai-change-guard/
skills/github-pr-ci/
skills/tauri-debug/
skills/html-to-tauri-client/
skills/ui-visual-review/
skills/cloudflare-deploy/
```

### 10.3 使用规则

当任务属于某个 skill 覆盖范围时，Agent 必须先读对应 `SKILL.md`。

例如：

- 测试门禁 → `skills/quality-gate/SKILL.md`
- PR / CI → `skills/github-pr-ci/SKILL.md`
- Tauri 调试 → `skills/tauri-debug/SKILL.md`
- Cloudflare 部署 → `skills/cloudflare-deploy/SKILL.md`

Skill 不覆盖项目规则。Skill 是任务流程，`CLAUDE.md / AGENTS.md` 仍然是最高约束。
