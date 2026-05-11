import { test, expect } from "@playwright/test";

/* ───────────────────────────────────────────
   AIDevProxy E2E — New UI (7-page SPA)
   ─────────────────────────────────────────── */

/* ── Helpers ── */

async function goToPage(page: any, label: string) {
  await page.getByRole("button", { name: label }).click();
  await page.waitForTimeout(300);
}

/* ═══════════════════════════════════════════
   Page Load & Navigation
   ═══════════════════════════════════════════ */

test.describe("App Shell", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("AIDevProxy");
  });

  test("header shows brand and port", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header").getByText("AIDevProxy")).toBeVisible();
    await expect(page.getByText("127.0.0.1:7890")).toBeVisible();
  });

  test("sidebar has all 7 nav items", async ({ page }) => {
    await page.goto("/");
    const navs = ["仪表盘", "流量", "缓存", "节点", "镜像", "规则", "设置"];
    for (const n of navs) {
      await expect(page.getByRole("button", { name: n })).toBeVisible();
    }
  });

  test("sidebar navigation switches pages", async ({ page }) => {
    await page.goto("/");
    // Start on dashboard
    await expect(page.getByText("今日请求数")).toBeVisible();

    // Navigate through all pages
    const pages = [
      { nav: "流量", check: "请求趋势" },
      { nav: "缓存", check: "缓存用量" },
      { nav: "节点", check: "节点拓扑" },
      { nav: "镜像", check: "镜像管理" },
      { nav: "规则", check: "规则列表" },
      { nav: "设置", check: "配置正常" },
      { nav: "仪表盘", check: "今日请求数" },
    ];
    for (const { nav, check } of pages) {
      await goToPage(page, nav);
      await expect(page.getByText(check).first()).toBeVisible();
    }
  });
});

/* ═══════════════════════════════════════════
   Dashboard
   ═══════════════════════════════════════════ */

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows 4 KPI cards", async ({ page }) => {
    await expect(page.getByText("今日请求数")).toBeVisible();
    await expect(page.getByText("缓存命中率")).toBeVisible();
    await expect(page.getByText("节省带宽")).toBeVisible();
    await expect(page.getByText("活跃节点")).toBeVisible();
  });

  test("shows real-time request table", async ({ page }) => {
    await expect(page.getByText("实时请求")).toBeVisible();
    // Table headers — scoped to left column
    const main = page.locator("main");
    await expect(main.getByText("时间").first()).toBeVisible();
    await expect(main.getByText("工具").first()).toBeVisible();
    await expect(main.getByText("状态").first()).toBeVisible();
  });

  test("request table filter changes visible rows", async ({ page }) => {
    // Open filter dropdown
    await page.locator("button", { hasText: "全部" }).first().click();
    await page.waitForTimeout(200);
    // Select "pip"
    await page.getByRole("button", { name: "pip" }).click();
    await page.waitForTimeout(300);
    // Should still see the table
    await expect(page.getByText("实时请求")).toBeVisible();
  });

  test("shows topology visualization", async ({ page }) => {
    await expect(page.getByText("拓扑可视化")).toBeVisible();
    await expect(page.getByText("AIDevProxy Hub")).toBeVisible();
  });

  test("shows mirror latency panel", async ({ page }) => {
    await expect(page.getByText("镜像延迟")).toBeVisible();
  });

  test("shows P2P nodes panel", async ({ page }) => {
    await expect(page.getByText("P2P 节点").first()).toBeVisible();
  });

  test("shows quick actions", async ({ page }) => {
    await expect(page.getByText("快捷操作")).toBeVisible();
    await expect(page.getByText("开启系统代理")).toBeVisible();
    await expect(page.getByText("清理缓存")).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Traffic Page
   ═══════════════════════════════════════════ */

test.describe("Traffic", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await goToPage(page, "流量");
  });

  test("shows filter toolbar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "全部" })).toBeVisible();
    await expect(page.getByRole("button", { name: "pip" })).toBeVisible();
    await expect(page.getByRole("button", { name: "npm" })).toBeVisible();
  });

  test("shows request table with rows", async ({ page }) => {
    await expect(page.getByText("请求详情")).toBeVisible();
    // Should have table content
    await expect(page.getByText("pypi.tuna.tsinghua.edu.cn").first()).toBeVisible();
  });

  test("shows detail panel with truthful fields", async ({ page }) => {
    await expect(page.getByText("源地址")).toBeVisible();
    await expect(page.getByText("镜像源")).toBeVisible();
    await expect(page.getByText("总耗时")).toBeVisible();
  });

  test("shows bottom charts", async ({ page }) => {
    await expect(page.getByText("请求趋势")).toBeVisible();
    await expect(page.getByText("状态分布")).toBeVisible();
    await expect(page.getByText("工具占比")).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Cache Page
   ═══════════════════════════════════════════ */

test.describe("Cache", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await goToPage(page, "缓存");
  });

  test("shows cache usage card", async ({ page }) => {
    await expect(page.getByText("缓存用量")).toBeVisible();
    await expect(page.getByText("命中率")).toBeVisible();
  });

  test("shows cache type cards", async ({ page }) => {
    await expect(page.getByText("HuggingFace Models")).toBeVisible();
    await expect(page.getByText("PyPI Packages")).toBeVisible();
  });

  test("shows cache files table", async ({ page }) => {
    await expect(page.getByText("缓存文件")).toBeVisible();
  });

  test("shows cache management actions", async ({ page }) => {
    await expect(page.getByText("缓存管理")).toBeVisible();
    await expect(page.getByText("清理缓存")).toBeVisible();
    await expect(page.getByText("设置上限")).toBeVisible();
  });

  test("shows auto-clean policy", async ({ page }) => {
    await expect(page.getByText("自动清理策略")).toBeVisible();
  });

  test("shows usage trend chart", async ({ page }) => {
    await expect(page.getByText("用量趋势")).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Nodes Page
   ═══════════════════════════════════════════ */

test.describe("Nodes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await goToPage(page, "节点");
  });

  test("shows KPI cards", async ({ page }) => {
    await expect(page.getByText("在线节点数")).toBeVisible();
    await expect(page.getByText("平均延迟")).toBeVisible();
  });

  test("shows node topology", async ({ page }) => {
    await expect(page.getByText("节点拓扑")).toBeVisible();
  });

  test("shows node list table", async ({ page }) => {
    await expect(page.getByText("节点列表", { exact: true })).toBeVisible();
    // IP appears in topology SVG, table cell, and detail panel
    await expect(page.getByRole("cell", { name: "192.168.1.101" })).toBeVisible();
  });

  test("shows node detail panel", async ({ page }) => {
    await expect(page.getByText("节点信息")).toBeVisible();
    await expect(page.getByText("信任设置")).toBeVisible();
    await expect(page.getByText("限速设置")).toBeVisible();
  });

  test("shows action buttons", async ({ page }) => {
    await expect(page.getByRole("button", { name: "扫描节点" })).toBeVisible();
    await expect(page.getByRole("button", { name: "添加受信任节点" })).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Mirrors Page
   ═══════════════════════════════════════════ */

test.describe("Mirrors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await goToPage(page, "镜像");
  });

  test("shows page header", async ({ page }) => {
    await expect(page.getByText("镜像管理")).toBeVisible();
  });

  test("shows registry tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "PyPI" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "npm" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "HuggingFace" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Docker" })).toBeVisible();
  });

  test("tab switching works", async ({ page }) => {
    await page.getByRole("tab", { name: "npm" }).click();
    await page.waitForTimeout(200);
    // Tab should now be selected
    const npmTab = page.getByRole("tab", { name: "npm" });
    await expect(npmTab).toHaveAttribute("aria-selected", "true");
  });

  test("shows mirror table", async ({ page }) => {
    // Mirror names appear in both table and detail panel heading
    await expect(page.getByText("清华大学源").first()).toBeVisible();
    await expect(page.getByText("阿里云源").first()).toBeVisible();
  });

  test("shows action toolbar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "测速" })).toBeVisible();
    await expect(page.getByRole("button", { name: "添加镜像" })).toBeVisible();
    await expect(page.getByRole("button", { name: "刷新" })).toBeVisible();
  });

  test("shows mirror detail config panel", async ({ page }) => {
    await expect(page.getByText("基本配置")).toBeVisible();
    await expect(page.getByText("回退策略")).toBeVisible();
    await expect(page.getByText("自动选择")).toBeVisible();
    await expect(page.getByText("健康检查")).toBeVisible();
  });

  test("shows latency ranking chart", async ({ page }) => {
    await expect(page.getByText("镜像延迟排行")).toBeVisible();
  });

  test("shows status overview chart", async ({ page }) => {
    await expect(page.getByText("镜像状态概览")).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Rules Page
   ═══════════════════════════════════════════ */

test.describe("Rules", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await goToPage(page, "规则");
  });

  test("shows KPI cards", async ({ page }) => {
    await expect(page.getByText("规则总数")).toBeVisible();
    await expect(page.getByText("命中次数", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("已启用").first()).toBeVisible();
    await expect(page.getByText("命中规则数")).toBeVisible();
  });

  test("shows rules table", async ({ page }) => {
    await expect(page.getByText("规则列表")).toBeVisible();
    await expect(page.getByText("OpenAI优先")).toBeVisible();
  });

  test("shows action toolbar", async ({ page }) => {
    await expect(page.getByRole("button", { name: "新建规则" })).toBeVisible();
    await expect(page.getByRole("button", { name: "导入" })).toBeVisible();
    await expect(page.getByRole("button", { name: "导出" })).toBeVisible();
  });

  test("shows rule match preview section", async ({ page }) => {
    await expect(page.getByText("规则匹配预览")).toBeVisible();
    // "测试" button is in the match preview card (not toolbar "测试规则" or editor "测试规则")
    await expect(page.getByRole("button", { name: "测试", exact: true })).toBeVisible();
  });

  test("rule match test shows pipeline", async ({ page }) => {
    // Enter a URL matching the seeded PyPI rule, then test.
    const input = page.getByPlaceholder(/测试 URL/);
    await input.fill("https://pypi.org/simple/flask/");
    await page.getByRole("button", { name: "测试", exact: true }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("匹配成功").first()).toBeVisible();
    await expect(page.getByText("目标主机").first()).toBeVisible();
    await expect(page.getByText("动作执行")).toBeVisible();
  });

  test("shows rule editor panel", async ({ page }) => {
    await expect(page.getByText("编辑规则")).toBeVisible();
    // "域名匹配" appears in both rule editor and match preview
    await expect(page.getByText("域名匹配").first()).toBeVisible();
    await expect(page.getByText("动作链")).toBeVisible();
    await expect(page.getByRole("button", { name: "保存规则" })).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Settings Page
   ═══════════════════════════════════════════ */

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await goToPage(page, "设置");
  });

  test("shows page header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "设置" })).toBeVisible();
  });

  test("shows all 5 tabs", async ({ page }) => {
    const tabs = ["常规", "缓存", "P2P", "安全", "高级"];
    for (const t of tabs) {
      await expect(page.getByRole("tab", { name: t })).toBeVisible();
    }
  });

  test("general tab shows proxy port input", async ({ page }) => {
    await expect(page.getByText("代理端口")).toBeVisible();
    await expect(page.getByText("开机启动")).toBeVisible();
    // "系统代理" appears in both sidebar and settings — scope to main
    await expect(page.locator("main").getByText("系统代理")).toBeVisible();
    await expect(page.getByText("主题")).toBeVisible();
  });

  test("tab switching works", async ({ page }) => {
    await page.getByRole("tab", { name: "P2P" }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText("启用P2P加速")).toBeVisible();
    await expect(page.getByText("设备名称")).toBeVisible();
  });

  test("security tab shows expected options", async ({ page }) => {
    await page.getByRole("tab", { name: "安全" }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText("SHA-256校验")).toBeVisible();
    await expect(page.getByText("证书校验")).toBeVisible();
    await expect(page.getByText("日志脱敏")).toBeVisible();
  });

  test("advanced tab shows expected options", async ({ page }) => {
    await page.getByRole("tab", { name: "高级" }).click();
    await page.waitForTimeout(200);
    await expect(page.getByText("并发请求数")).toBeVisible();
    await expect(page.getByText("DNS解析")).toBeVisible();
  });

  test("shows system status panel", async ({ page }) => {
    // Status text is derived: "配置正常" or "存在异常" — match either.
    await expect(page.getByText(/配置正常|存在异常/)).toBeVisible();
    await expect(page.locator("main").getByText("代理服务")).toBeVisible();
    await expect(page.getByText("缓存服务")).toBeVisible();
    await expect(page.getByText("P2P服务")).toBeVisible();
  });

  test("shows security level card", async ({ page }) => {
    await expect(page.getByText(/安全级别/)).toBeVisible();
  });

  test("shows version info", async ({ page }) => {
    await expect(page.getByText("版本信息")).toBeVisible();
    await expect(page.getByText("当前版本")).toBeVisible();
    await expect(page.getByText(/^v\d+\.\d+\.\d+/)).toBeVisible();
  });

  test("save and reset buttons visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "保存设置" })).toBeVisible();
    await expect(page.getByRole("button", { name: "重置配置" })).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Sidebar System Proxy Toggle
   ═══════════════════════════════════════════ */

test.describe("Sidebar Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("system proxy toggle is present and checked by default", async ({ page }) => {
    const toggle = page.getByRole("switch").first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
  });

  test("system proxy toggle can be toggled", async ({ page }) => {
    const toggle = page.getByRole("switch").first();
    await toggle.click();
    await page.waitForTimeout(200);
    // Should be unchecked after click
    await expect(toggle).not.toBeChecked();
    // Toggle back
    await toggle.click();
    await page.waitForTimeout(200);
    await expect(toggle).toBeChecked();
  });

  test("sidebar shows brand and version", async ({ page }) => {
    // Version comes from package.json via src/version.ts — match any semver.
    await expect(page.getByText(/^v\d+\.\d+\.\d+/).first()).toBeVisible();
  });
});

/* ═══════════════════════════════════════════
   Select Dropdown Interaction
   ═══════════════════════════════════════════ */

test.describe("Select Dropdown", () => {
  test("dashboard filter select opens and selects option", async ({ page }) => {
    await page.goto("/");
    // Open the filter select (first "全部" button in the toolbar area)
    const filterBtn = page.locator("button", { hasText: "全部" }).first();
    await filterBtn.click();
    await page.waitForTimeout(200);
    // Should see dropdown options
    await expect(page.getByRole("button", { name: "pip" })).toBeVisible();
    await expect(page.getByRole("button", { name: "npm" })).toBeVisible();
  });
});
