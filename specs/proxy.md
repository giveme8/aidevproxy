# Proxy Spec

## 核心功能

### 本地代理

- HTTP/HTTPS 代理转发
- SOCKS5 代理支持
- 系统代理自动配置 (PAC)

### 智能镜像

- npm/pip 等包管理器镜像加速
- 常用 AI 模型下载加速
- Docker Hub 镜像

### P2P 加速

- 节点间 P2P 传输
- 局域网发现与共享
- 带宽统计与限制

## 技术约束

- Tauri v2 Rust 后端处理网络层
- 前端 React 负责 UI 展示
- 代理端口避免与系统服务冲突
- 需要管理员权限设置系统代理
