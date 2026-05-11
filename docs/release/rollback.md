# Rollback Plan

## 场景

- 新版本有严重 bug
- 安装包损坏
- 签名/公证失败

## 步骤

1. 在 GitHub Releases 中取消当前 release
2. 回退到上一个稳定 tag
3. 如果需要紧急修复：cherry-pick 到 release 分支
4. 更新 CHANGELOG 记录回退原因
