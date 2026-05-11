import React, { useState, useEffect, useCallback, useRef } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import TextInput from "../components/ui/TextInput";
import Toggle from "../components/ui/Toggle";
import Tabs from "../components/ui/Tabs";
import { IconCheckCircle, IconShield, IconHelp, IconEdit, IconFolder, IconReset } from "../components/ui/Icons";
import { invoke } from "../tauri-api";
import { APP_VERSION } from "../version";

/* ── types ────────────────────────────────────────────── */

interface Settings {
  port: string; startup: boolean; sys_proxy: boolean; theme: string; lang: string;
  min_tray: boolean; tray_action: string;
  cache_dir: string; cache_max: number; auto_clean: boolean;
  clean_policy: string; keep_days: string; low_disk: string;
  p2p: boolean; lan_discovery: boolean; device_name: string; same_subnet: boolean;
  max_conn: string; up_limit: string; up_unit: string; down_limit: string; down_unit: string;
  sha256: boolean; cert_verify: string; allow_insecure: boolean; log_desensitize: boolean;
  desens_level: string; acl: string; allowed_ips: string;
  concurrent: string; idle_timeout: string; dns: string; tcp_opt: string;
  udp_relay: boolean; ipv6: boolean;
}

type Tab = "general" | "cache" | "p2p" | "security" | "advanced";
const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "常规" }, { id: "cache", label: "缓存" }, { id: "p2p", label: "P2P" },
  { id: "security", label: "安全" }, { id: "advanced", label: "高级" },
];

const defaultSettings: Settings = {
  port: "7890", startup: true, sys_proxy: true, theme: "深色", lang: "简体中文",
  min_tray: false, tray_action: "显示主窗口",
  cache_dir: "/Users/Shared/AIProxy/cache", cache_max: 50, auto_clean: true,
  clean_policy: "LRU (最近最少使用)", keep_days: "7", low_disk: "可用空间小于 10GB",
  p2p: true, lan_discovery: true, device_name: "lab-macbook-01", same_subnet: true,
  max_conn: "200", up_limit: "10", up_unit: "MB/s", down_limit: "0", down_unit: "MB/s",
  sha256: true, cert_verify: "严格校验", allow_insecure: false, log_desensitize: true,
  desens_level: "标准", acl: "白名单模式", allowed_ips: "192.168.1.0/24,10.0.0.0/8",
  concurrent: "1024", idle_timeout: "60", dns: "系统 DNS", tcp_opt: "启用",
  udp_relay: true, ipv6: false,
};

/* ── helpers ───────────────────────────────────────────── */

function FormRow({ label, help, last, children }: { label: string; help?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={last ? "flex items-center justify-between py-2.5" : "flex items-center justify-between py-2.5 border-b border-b-[rgba(42,45,53,0.5)]"}>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs font-medium text-content-tertiary mb-1">{label}</span>
        {help && <IconHelp size={12} />}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function SvcRow({ name, running }: { name: string; running: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-content-primary py-1">
      <span
        className={`w-[6px] h-[6px] rounded-full shrink-0 ${
          running ? "bg-green shadow-[0_0_6px_#22c55e]" : "bg-content-tertiary"
        }`}
      />
      <span>{name}</span>
      <span
        className={`text-xs ml-auto ${running ? "text-green-bright" : "text-content-tertiary"}`}
      >
        {running ? "运行中" : "已停止"}
      </span>
    </div>
  );
}

interface ServiceStatus {
  proxy: boolean;
  p2p: boolean;
  cache: boolean;
  security: boolean;
}

function deriveSecurityLevel(s: Settings): { level: "高" | "中" | "低"; colorClass: string; advice: string } {
  if (s.allow_insecure || s.cert_verify === "跳过") {
    return {
      level: "低",
      colorClass: "text-red",
      advice: "当前允许不安全连接或已跳过证书校验，建议在生产环境中开启严格校验。",
    };
  }
  if (s.cert_verify === "严格校验" && s.sha256 && s.log_desensitize) {
    return {
      level: "高",
      colorClass: "text-green-bright",
      advice: "证书严格校验 + 内容校验 + 日志脱敏均已开启。",
    };
  }
  return {
    level: "中",
    colorClass: "text-yellow",
    advice: "已启用基础安全设置，可在严格场景下开启 SHA-256 校验与日志脱敏。",
  };
}

function CacheFields({ s, set }: { s: Settings; set: (k: keyof Settings, v: string | boolean) => void }) {
  return (
    <>
      <FormRow label="缓存目录">
        <div className="w-[180px]"><TextInput value={s.cache_dir} onChange={(v) => set("cache_dir", v)} icon={<IconFolder size={14} />} /></div>
      </FormRow>
      <FormRow label="缓存上限">
        <div className="w-[60px]"><TextInput value={String(s.cache_max)} onChange={(v) => set("cache_max", v)} /></div>
        <span className="text-xs text-content-tertiary">GB</span>
        <input type="range" min={1} max={200} value={s.cache_max} onChange={(e) => set("cache_max", e.target.value)} className="w-20 accent-green" />
      </FormRow>
      <FormRow label="自动清理">
        <Toggle value={s.auto_clean} onChange={(v) => set("auto_clean", v)} />
      </FormRow>
      <FormRow label="清理策略">
        <Select value={s.clean_policy} options={["LRU (最近最少使用)", "LFU (最不经常使用)", "FIFO (先进先出)", "大小优先"]} onChange={(v) => set("clean_policy", v)} />
      </FormRow>
      <FormRow label="保留最近">
        <div className="w-[50px]"><TextInput value={s.keep_days} onChange={(v) => set("keep_days", v)} /></div>
        <span className="text-xs text-content-tertiary">天</span>
      </FormRow>
      <FormRow label="低磁盘空间时清理" last>
        <Select value={s.low_disk} options={["可用空间小于 10GB", "可用空间小于 20GB", "可用空间小于 50GB", "关闭"]} onChange={(v) => set("low_disk", v)} />
      </FormRow>
    </>
  );
}

/* ── main ─────────────────────────────────────────────── */

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [tab, setTab] = useState<Tab>("general");
  const [toast, setToast] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const settingsRef = useRef(settings); // keep latest for unmount save
  const [services, setServices] = useState<ServiceStatus>({
    proxy: false,
    p2p: false,
    cache: false,
    security: false,
  });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const set = (k: keyof Settings, v: string | boolean) => setSettings((s) => ({ ...s, [k]: v }));

  // Keep ref in sync for unmount save
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Flush unsaved settings on unmount (guard against debounce cancellation)
  useEffect(() => {
    return () => {
      invoke("save_settings", settingsRef.current as unknown as Record<string, unknown>).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await invoke<Settings>("get_settings");
        setSettings(s);
      } catch {
        // use defaults
      }
    };
    load();
  }, []);

  const refreshServices = useCallback(async () => {
    try {
      const [proxyStatus, p2pStatus] = await Promise.all([
        invoke<{ running: boolean; config: { enable_cache: boolean } }>("get_proxy_status"),
        invoke<{ running: boolean }>("get_p2p_status"),
      ]);
      setServices({
        proxy: proxyStatus.running,
        p2p: p2pStatus.running,
        cache: !!proxyStatus.config?.enable_cache,
        security: settings.sha256 && settings.cert_verify !== "跳过",
      });
    } catch {
      setServices({ proxy: false, p2p: false, cache: false, security: false });
    }
  }, [settings.sha256, settings.cert_verify]);

  useEffect(() => {
    refreshServices();
    const id = setInterval(refreshServices, 5000);
    return () => clearInterval(id);
  }, [refreshServices]);

  // Auto-save settings on change (debounced 500ms, skip initial mount).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await invoke("save_settings", settings as unknown as Record<string, unknown>);
      } catch {
        // silent — next change will retry
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [settings]);

  const handleReset = async () => {
    try {
      await invoke("reset_settings");
      const s = await invoke<Settings>("get_settings");
      setSettings(s);
      showToast("设置已恢复默认");
    } catch {
      showToast("重置失败");
    }
  };

  const content = (() => {
    switch (tab) {
    case "general":
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="常规设置">
            <FormRow label="代理端口">
              <div className="w-[100px]"><TextInput value={settings.port} onChange={(v) => set("port", v)} /></div>
            </FormRow>
            <FormRow label="开机启动">
              <Toggle value={settings.startup} onChange={(v) => set("startup", v)} />
            </FormRow>
            <FormRow label="系统代理" help>
              <Toggle value={settings.sys_proxy} onChange={(v) => set("sys_proxy", v)} />
            </FormRow>
            <FormRow label="主题">
              <Select value={settings.theme} options={["深色", "浅色", "跟随系统"]} onChange={(v) => set("theme", v)} />
            </FormRow>
            <FormRow label="语言">
              <Select value={settings.lang} options={["简体中文", "English", "日本語"]} onChange={(v) => set("lang", v)} />
            </FormRow>
            <FormRow label="最小化到托盘">
              <Toggle value={settings.min_tray} onChange={(v) => set("min_tray", v)} />
            </FormRow>
            <FormRow label="托盘点击行为" last>
              <Select value={settings.tray_action} options={["显示主窗口", "显示菜单", "无操作"]} onChange={(v) => set("tray_action", v)} />
            </FormRow>
          </Card>
          <Card title="缓存设置">
            <CacheFields s={settings} set={set} />
          </Card>
        </div>
      );
    case "cache":
      return <Card title="缓存设置"><CacheFields s={settings} set={set} /></Card>;
    case "p2p":
      return (
        <Card title="P2P 设置">
          <FormRow label="启用P2P加速"><Toggle value={settings.p2p} onChange={(v) => set("p2p", v)} /></FormRow>
          <FormRow label="启用局域网发现" help><Toggle value={settings.lan_discovery} onChange={(v) => set("lan_discovery", v)} /></FormRow>
          <FormRow label="设备名称">
            <div className="w-[180px]"><TextInput value={settings.device_name} onChange={(v) => set("device_name", v)} /></div>
          </FormRow>
          <FormRow label="仅允许同网段" help><Toggle value={settings.same_subnet} onChange={(v) => set("same_subnet", v)} /></FormRow>
          <FormRow label="最大连接数">
            <div className="w-20"><TextInput value={settings.max_conn} onChange={(v) => set("max_conn", v)} /></div>
          </FormRow>
          <FormRow label="上传限速">
            <div className="w-[70px]"><TextInput value={settings.up_limit} onChange={(v) => set("up_limit", v)} /></div>
            <Select value={settings.up_unit} options={["KB/s", "MB/s", "GB/s"]} onChange={(v) => set("up_unit", v)} size="sm" />
          </FormRow>
          <FormRow label="下载限速" last>
            <div className="w-[70px]"><TextInput value={settings.down_limit} onChange={(v) => set("down_limit", v)} /></div>
            <Select value={settings.down_unit} options={["KB/s", "MB/s", "GB/s"]} onChange={(v) => set("down_unit", v)} size="sm" />
          </FormRow>
        </Card>
      );
    case "security":
      return (
        <Card title="安全设置">
          <FormRow label="SHA-256校验" help><Toggle value={settings.sha256} onChange={(v) => set("sha256", v)} /></FormRow>
          <FormRow label="证书校验"><Select value={settings.cert_verify} options={["严格校验", "宽松", "跳过"]} onChange={(v) => set("cert_verify", v)} /></FormRow>
          <FormRow label="允许不安全连接" help><Toggle value={settings.allow_insecure} onChange={(v) => set("allow_insecure", v)} /></FormRow>
          <FormRow label="日志脱敏" help><Toggle value={settings.log_desensitize} onChange={(v) => set("log_desensitize", v)} /></FormRow>
          <FormRow label="脱敏级别"><Select value={settings.desens_level} options={["基础", "标准", "严格"]} onChange={(v) => set("desens_level", v)} /></FormRow>
          <FormRow label="访问控制"><Select value={settings.acl} options={["白名单模式", "黑名单模式", "关闭"]} onChange={(v) => set("acl", v)} /></FormRow>
          <FormRow label="允许的IP/CIDR" last>
            <div className="w-[190px]"><TextInput value={settings.allowed_ips} onChange={(v) => set("allowed_ips", v)} /></div>
            <IconEdit size={14} />
          </FormRow>
        </Card>
      );
    case "advanced":
      return (
        <Card title="高级设置">
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <FormRow label="并发请求数">
                <div className="w-20"><TextInput value={settings.concurrent} onChange={(v) => set("concurrent", v)} /></div>
              </FormRow>
              <FormRow label="连接空闲超时(秒)">
                <div className="w-20"><TextInput value={settings.idle_timeout} onChange={(v) => set("idle_timeout", v)} /></div>
              </FormRow>
              <FormRow label="DNS解析" last><Select value={settings.dns} options={["系统 DNS", "Google DNS", "Cloudflare DNS", "自定义 DNS"]} onChange={(v) => set("dns", v)} /></FormRow>
            </div>
            <div>
              <FormRow label="TCP优化"><Select value={settings.tcp_opt} options={["启用", "禁用", "自动"]} onChange={(v) => set("tcp_opt", v)} /></FormRow>
              <FormRow label="UDP中继"><Toggle value={settings.udp_relay} onChange={(v) => set("udp_relay", v)} /></FormRow>
              <FormRow label="IPv6支持" last><Toggle value={settings.ipv6} onChange={(v) => set("ipv6", v)} /></FormRow>
            </div>
          </div>
        </Card>
      );
    }
  })();

  return (
    <div className="flex flex-col xl:flex-row gap-4 p-6 h-full overflow-auto">
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-white m-0">设置</h2>
        <div className="mt-4 mb-5">
          <Tabs items={TABS} active={tab} onChange={(id: string) => setTab(id as Tab)} />
        </div>
        {content}
        <div className="flex gap-2 justify-end mt-5">
          <Button variant="danger" icon={<IconReset size={14} />} onClick={handleReset}>重置配置</Button>
        </div>
      </div>

      <div className="w-full xl:w-80 xl:shrink-0 flex flex-col gap-3">
        <Card>
          {(() => {
            const items: { name: string; running: boolean }[] = [
              { name: "代理服务", running: services.proxy },
              { name: "缓存服务", running: services.cache },
              { name: "P2P服务", running: services.p2p },
              { name: "安全校验", running: services.security },
            ];
            const downCount = items.filter((i) => !i.running).length;
            const allOk = downCount === 0;
            return (
              <>
                <div className="flex flex-col items-center">
                  <IconCheckCircle size={40} />
                  <div className={`text-lg font-semibold mt-2.5 ${allOk ? "text-green-bright" : "text-yellow"}`}>
                    {allOk ? "配置正常" : "存在异常"}
                  </div>
                  <div className="text-xs text-content-tertiary mt-1">
                    {allOk ? "所有服务运行正常" : `${downCount} 个服务未运行`}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-edge-default">
                  {items.map((i) => <SvcRow key={i.name} name={i.name} running={i.running} />)}
                </div>
              </>
            );
          })()}
        </Card>

        {(() => {
          const sec = deriveSecurityLevel(settings);
          const bgColor =
            sec.level === "高"
              ? "rgba(34,197,94,.04)"
              : sec.level === "中"
                ? "rgba(250,204,21,.04)"
                : "rgba(239,68,68,.04)";
          const borderColor =
            sec.level === "高"
              ? "rgba(34,197,94,.15)"
              : sec.level === "中"
                ? "rgba(250,204,21,.15)"
                : "rgba(239,68,68,.15)";
          return (
            <Card style={{ border: `1px solid ${borderColor}`, background: bgColor }}>
              <div className="flex items-center gap-1.5">
                <IconShield size={16} className={sec.colorClass} />
                <span className={`text-sm font-semibold ${sec.colorClass}`}>安全级别: {sec.level}</span>
              </div>
              <p className="text-xs text-content-tertiary leading-[1.6] mt-1.5 mb-2">{sec.advice}</p>
              <Button variant="ghost" size="sm" onClick={() => setTab("security")}>前往安全设置</Button>
            </Card>
          );
        })()}

        <Card title="版本信息">
          <div className="flex justify-between py-[3px] text-xs">
            <span className="text-content-tertiary">当前版本</span>
            <span className="text-green-bright font-semibold">{APP_VERSION}</span>
          </div>
          <div className="flex justify-between py-[3px] text-xs">
            <span className="text-content-tertiary">代理端口</span>
            <span className="text-content-primary font-mono">{settings.port}</span>
          </div>
        </Card>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-surface-card border border-edge-default rounded-lg px-5 py-3 text-sm text-content-primary shadow-lg z-[100]">
          {toast}
        </div>
      )}
    </div>
  );
}
