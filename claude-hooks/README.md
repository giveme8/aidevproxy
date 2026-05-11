# Claude Code Hooks

Claude Code hooks 用于把部分规则变成硬拦截。

## 推荐 Hooks

- 禁止读取密钥 → `pre-tool-use.sh`
- 禁止新增依赖 → `pre-tool-use.sh`
- 禁止 release / deploy 命令 → `pre-tool-use.sh`
- 每次编辑后运行 agent guard → `post-edit.sh`

## 示例脚本

```txt
claude-hooks/pre-tool-use.sh
claude-hooks/post-edit.sh
```

## 建议

不要只依赖 Prompt。Prompt 负责引导，hooks / permissions / CI 负责强制。
