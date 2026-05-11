# macOS Platform Notes

## 代码签名

- 需要 Apple Developer ID Certificate
- 签名证书通过 GitHub Secrets 注入 CI
- 本地开发不需要签名

## 公证 (Notarization)

- macOS 应用需要 Apple 公证才能分发
- 使用 `tauri-apps/tauri-action@v0` 自动处理
- 需要 Apple API Key 或 app-specific password

## 系统代理权限

- macOS 需要辅助功能权限来设置系统代理
- 首次启动时会弹出权限请求
