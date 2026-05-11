# 密钥与环境变量规范

## 禁止

禁止把密钥写入：

- 源码
- 测试文件
- 截图
- 日志
- PR 描述
- AI 对话

## 环境文件

```txt
.env.local
.env.development
.env.production
.env.example
```

`.env.example` 只保留 key，不保留真实值。

## 示例

```env
VITE_API_BASE_URL=
CLOUDFLARE_ACCOUNT_ID=
```

## 人工审批

读取、修改、导出任何密钥都必须人工确认。
