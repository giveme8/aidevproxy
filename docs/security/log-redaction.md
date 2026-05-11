# 日志脱敏规则

## 需要脱敏

- token
- subscription url
- email
- user id
- access key
- refresh token
- Cloudflare API token
- 代理节点密码
- 代理订阅地址

## 示例

原始：

```txt
https://example.com/sub?token=abcd1234
```

日志中：

```txt
https://example.com/sub?token=***REDACTED***
```

## 诊断包

诊断包必须使用 redacted config：

```txt
diagnostic.zip
  app.log
  error.log
  config.redacted.json
  system-info.json
  network-check.json
```
