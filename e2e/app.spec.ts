import { test, expect } from "@playwright/test";

test.describe("AIDevProxy - Dashboard", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("AIDevProxy");
  });

  test("header shows app name", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AIDevProxy" })).toBeVisible();
  });

  test("footer shows version info", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("AIDevProxy v0.1.0 - AI 开发环境加速代理")
    ).toBeVisible();
  });

  test("proxy status shows stopped by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("已停止")).toBeVisible();
  });

  test('"启动代理" button is visible', async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "启动代理" })
    ).toBeVisible();
  });

  test("clicking 启动代理 changes state to running", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "启动代理" }).click();
    await expect(page.getByText("运行中")).toBeVisible();
  });

  test("running proxy shows env variable setup hints", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "启动代理" }).click();
    await expect(page.getByText(/HTTP_PROXY=http:\/\/127\.0\.0\.1:8899/)).toBeVisible();
    await expect(page.getByText(/HTTPS_PROXY=http:\/\/127\.0\.0\.1:8899/)).toBeVisible();
  });

  test("clicking 停止代理 reverts to stopped", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "启动代理" }).click();
    await expect(page.getByText("运行中")).toBeVisible();
    await page.getByRole("button", { name: "停止代理" }).click();
    await expect(page.getByText("已停止")).toBeVisible();
  });

  test("traffic stats section is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("📊 流量统计")).toBeVisible();

    const statsLabels = [
      "总请求",
      "传输流量",
      "节省流量",
      "镜像命中",
      "P2P 命中",
      "缓存大小",
      "活跃节点",
      "运行时间",
    ];
    for (const label of statsLabels) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });
});

test.describe("AIDevProxy - P2P Status", () => {
  test("P2P shows disconnected by default", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("🔗 P2P 网络")).toBeVisible();
    await expect(page.getByText("未启动")).toBeVisible();
  });

  test("clicking 加入网络 connects P2P", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "加入网络" }).click();
    await expect(page.getByText("已连接")).toBeVisible();
  });

  test("connected P2P shows peer count", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "加入网络" }).click();
    await expect(page.getByText(/个节点在线/)).toBeVisible();
  });

  test("clicking 断开 disconnects P2P", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "加入网络" }).click();
    await expect(page.getByText("已连接")).toBeVisible();
    await page.getByRole("button", { name: "断开" }).click();
    await expect(page.getByText("未启动")).toBeVisible();
  });
});

test.describe("AIDevProxy - Settings", () => {
  test("navigating to settings shows config form", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "设置" }).click();
    await expect(page.getByText("⚙️ 代理设置")).toBeVisible();
  });

  test("settings page shows all config options", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "设置" }).click();
    await expect(page.getByText("代理端口")).toBeVisible();
    await expect(page.getByText("启用智能镜像路由")).toBeVisible();
    await expect(page.getByText("启用 P2P 加速")).toBeVisible();
    await expect(page.getByText("启用本地缓存")).toBeVisible();
    await expect(page.getByText("开机自启动代理")).toBeVisible();
  });

  test("usage instructions are visible", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "设置" }).click();
    await expect(page.getByText("📋 使用说明")).toBeVisible();
    await expect(page.getByText("1. 设置环境变量")).toBeVisible();
    await expect(page.getByText("4. 支持的服务")).toBeVisible();
  });

  test("clicking save shows confirmation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "设置" }).click();
    await page.getByRole("button", { name: "保存设置" }).click();
    await expect(page.getByText("✓ 已保存")).toBeVisible();
  });

  test("navigating back to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "设置" }).click();
    await expect(page.getByText("⚙️ 代理设置")).toBeVisible();
    await page.getByRole("button", { name: "仪表盘" }).click();
    await expect(page.getByText("代理状态")).toBeVisible();
    await expect(page.getByText("📊 流量统计")).toBeVisible();
  });
});
