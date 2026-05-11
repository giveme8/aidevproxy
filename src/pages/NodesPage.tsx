import { useState, useEffect, useCallback } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import StatCard from "../components/ui/StatCard";
import TextInput from "../components/ui/TextInput";
import {
  IconUsers, IconCache, IconRadar, IconLaptop, IconDesktop,
  IconServer, IconPhone, IconSearch, IconPlus,
  IconExport, IconChevronRight, IconBan,
} from "../components/ui/Icons";
import BrandCube from "../components/BrandCube";
import { invoke } from "../tauri-api";

/* ── types ────────────────────────────────────────────── */

interface NodeData {
  id: string; name: string; ip: string; latency: number;
  cache: string; online: boolean; device: "laptop" | "desktop" | "server" | "phone";
  lastSeen: string; trusted: boolean; os?: string; version?: string;
  uptime?: string; bandwidth?: string;
}

/* ── helpers ───────────────────────────────────────────── */

const deviceIcon = (d: NodeData["device"], s = 16) => {
  if (d === "laptop") return <IconLaptop size={s} />;
  if (d === "desktop") return <IconDesktop size={s} />;
  if (d === "server") return <IconServer size={s} />;
  return <IconPhone size={s} />;
};

/** Hex colors retained for SVG stroke attributes where Tailwind classes do not apply. */
const latencyHex = (ms: number): string =>
  ms < 30 ? "#4ade80" : ms < 80 ? "#facc15" : "#fb923c";

/** Tailwind text-color class for latency values. */
const latencyTextClass = (ms: number): string =>
  ms < 30 ? "text-green-bright" : ms < 80 ? "text-yellow" : "text-orange";

/* ── main ─────────────────────────────────────────────── */

interface NodesPageProps { goTo?: (page: string) => void; }

export default function NodesPage({ goTo: _goTo }: NodesPageProps) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [dlRate, setDlRate] = useState("0");
  const [ulRate, setUlRate] = useState("0");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const n = await invoke<NodeData[]>("get_nodes");
      setNodes(n);
      if (!selectedNode && n.length > 0) setSelectedNode(n[0]);
    } catch {
      // keep current state
    }
  }, [selectedNode]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onlineNodes = nodes.filter((n) => n.online);
  const avgLatency = onlineNodes.length > 0
    ? Math.round(onlineNodes.reduce((s, n) => s + n.latency, 0) / onlineNodes.length)
    : 0;

  // Sum cache sizes from "X.Y GB" / "X MB" strings reported by each online node.
  const sharedCacheGb = onlineNodes.reduce((sum, n) => {
    const m = /^([\d.]+)\s*(GB|MB|KB|B)$/i.exec(n.cache.trim());
    if (!m) return sum;
    const v = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    const gb = unit === "GB" ? v : unit === "MB" ? v / 1024 : unit === "KB" ? v / 1024 / 1024 : v / 1024 / 1024 / 1024;
    return sum + gb;
  }, 0);

  const handleScan = async () => {
    try {
      const result = await invoke<{ found: number; message: string }>("scan_nodes");
      showToast(result.message);
      await fetchData();
    } catch { showToast("扫描失败"); }
  };

  const handleAddTrusted = async () => {
    try {
      await invoke("add_trusted_node", { node_id: selectedNode?.id });
      showToast(`已将 ${selectedNode?.name} 标记为受信任`);
      await fetchData();
    } catch { showToast("操作失败"); }
  };

  const handleDisconnect = async () => {
    try {
      await invoke("remove_node", { node_id: selectedNode?.id });
      showToast(`已断开 ${selectedNode?.name}`);
      await fetchData();
    } catch { showToast("操作失败"); }
  };

  /* ── shared class fragments ── */

  const tdBase =
    "py-[7px] px-3 text-xs border-b border-solid border-[rgba(42,45,53,0.4)] align-middle font-mono";
  const thClass =
    "text-left py-[7px] px-3 font-medium text-xs text-content-tertiary border-b border-solid border-edge-default whitespace-nowrap";
  const secClass =
    "text-xs font-semibold text-content-tertiary uppercase tracking-[0.8px] mb-2.5 border-b border-solid border-edge-default pb-2";

  /* ── topology positions ── */

  const cx = 180, cy = 170;
  const angles = [330, 30, 90, 210, 270];
  const dists = [90, 100, 80, 100, 85];
  const topo = nodes.slice(0, 5).map((n, i) => {
    const a = (angles[i] * Math.PI) / 180;
    return { ...n, x: cx + Math.cos(a) * dists[i], y: cy + Math.sin(a) * dists[i] };
  });

  const displayNode = selectedNode || nodes[0];

  return (
    <>
      <style>{`
        @keyframes flowDash { 0% { stroke-dashoffset: 24; } 100% { stroke-dashoffset: 0; } }
        @keyframes hubGlow { 0%,100% { filter: drop-shadow(0 0 6px rgba(34,197,94,.3)); } 50% { filter: drop-shadow(0 0 16px rgba(34,197,94,.6)); } }
      `}</style>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 p-6 h-full overflow-auto font-sans bg-surface-canvas text-content-primary">
        {/* ── LEFT ── */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* KPI row */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard label="在线节点数" value={`${onlineNodes.length} / ${nodes.length}`} icon={<IconUsers size={14} />} />
            <StatCard label="平均延迟" value={String(avgLatency)} unit="ms" />
            <StatCard label="共享缓存容量" value={sharedCacheGb > 0 ? sharedCacheGb.toFixed(1) : "—"} unit={sharedCacheGb > 0 ? "GB" : undefined} icon={<IconCache size={14} />} />
            <StatCard label="局域网发现状态" value={nodes.length > 0 ? "发现中" : "未启动"} sub={`共发现 ${nodes.length} 个节点`} icon={<IconRadar size={14} />} />
          </div>

          {/* Topology */}
          <Card title="节点拓扑" action={<span className="text-xs text-content-tertiary">局域网 / LAN</span>}>
            {nodes.length === 0 ? (
              <div className="text-xs text-content-tertiary text-center p-[60px]">暂无节点数据，点击下方「扫描节点」发现局域网设备</div>
            ) : (
              <div
                className="relative h-[340px] rounded-lg"
                style={{ background: "radial-gradient(ellipse at center, rgba(34,197,94,.06) 0%, transparent 70%)" }}
              >
                <svg width="100%" height="100%" className="absolute top-0 left-0">
                  {topo.map((n) => {
                    const c = latencyHex(n.latency);
                    return (
                      <g key={n.id}>
                        <line x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={c} strokeWidth={1.5} strokeOpacity={0.5} />
                        <line x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={c} strokeWidth={0.5} strokeDasharray="4 4" strokeOpacity={0.8} style={{ animation: "flowDash 0.8s linear infinite" }} />
                      </g>
                    );
                  })}
                </svg>
                <div className="absolute" style={{ left: cx - 25, top: cy - 25, animation: "hubGlow 2s ease-in-out infinite" }}>
                  <BrandCube size={50} glow />
                </div>
                <div className="absolute w-[60px] text-center" style={{ left: cx - 30, top: cy + 28 }}>
                  <div className="text-xs font-semibold text-green-bright">本机</div>
                  <div className="text-[9px] font-mono text-content-tertiary">127.0.0.1</div>
                </div>
                {topo.map((n) => {
                  const hex = latencyHex(n.latency);
                  return (
                    <div
                      key={n.id}
                      className="absolute flex flex-col items-center gap-0.5 cursor-pointer"
                      style={{ left: n.x - 28, top: n.y - 16 }}
                      onClick={() => setSelectedNode(n)}
                    >
                      <div
                        className="w-9 h-9 rounded-full bg-surface-card-2 border-[1.5px] flex items-center justify-center"
                        style={{ borderColor: hex, color: hex }}
                      >
                        {deviceIcon(n.device)}
                      </div>
                      <span className="text-[9px] font-medium text-content-primary max-w-[56px] text-center truncate">
                        {n.name.split("-")[0]}
                      </span>
                      <span className="text-[8px] font-mono text-content-tertiary">{n.ip}</span>
                      <span className={`text-[8px] font-mono font-semibold ${latencyTextClass(n.latency)}`}>
                        {n.latency}ms
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-4 mt-2.5 justify-center">
              {[{ dotColor: "bg-green-bright", label: "<30ms" }, { dotColor: "bg-yellow", label: "30-80ms" }, { dotColor: "bg-orange", label: ">80ms" }].map((x) => (
                <div key={x.label} className="flex items-center gap-1 text-[10px] text-content-tertiary">
                  <span className={`w-[10px] h-0.5 rounded-[1px] shrink-0 ${x.dotColor}`} />{x.label}
                </div>
              ))}
            </div>
          </Card>

          {/* Node List Table */}
          <Card title="节点列表" action={<span className="text-xs text-content-tertiary">{nodes.length} 个节点</span>}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["设备名称", "IP地址", "状态", "延迟", "共享缓存", "最后在线", "权限", "操作"].map((h) => (
                      <th key={h} className={thClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {nodes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={`${tdBase} font-sans text-center text-content-tertiary p-6`}>
                        暂无节点
                      </td>
                    </tr>
                  ) : (
                    nodes.map((n) => {
                      const sel = displayNode?.id === n.id;
                      return (
                        <tr
                          key={n.id}
                          onClick={() => setSelectedNode(n)}
                          className={`cursor-pointer transition-colors duration-150 ${sel ? "bg-[rgba(34,197,94,0.06)]" : ""}`}
                        >
                          <td className={`${tdBase} font-sans`}>
                            <div className="flex items-center gap-1.5">
                              <span className={n.online ? "text-green-bright" : "text-content-tertiary"}>
                                {deviceIcon(n.device)}
                              </span>
                              <span className="font-medium text-content-primary">{n.name}</span>
                            </div>
                          </td>
                          <td className={tdBase}>{n.ip}</td>
                          <td className={`${tdBase} font-sans`}>
                            <span className="inline-flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${n.online ? "bg-green" : "bg-red"}`} />
                              {n.online ? "在线" : "离线"}
                            </span>
                          </td>
                          <td className={`${tdBase} font-semibold ${latencyTextClass(n.latency)}`}>
                            {n.latency} ms
                          </td>
                          <td className={tdBase}>{n.cache}</td>
                          <td className={`${tdBase} font-sans text-content-secondary`}>{n.lastSeen}</td>
                          <td className={`${tdBase} font-sans`}>
                            {n.trusted ? <Badge color="green" size="sm">受信任</Badge> : <Badge color="gray" size="sm">未验证</Badge>}
                          </td>
                          <td className={`${tdBase} font-sans`}>
                            <IconChevronRight size={12} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" size="sm" icon={<IconSearch size={12} />} onClick={handleScan}>扫描节点</Button>
              <Button variant="secondary" size="sm" icon={<IconPlus size={12} />} onClick={handleAddTrusted}>添加受信任节点</Button>
              <Button variant="ghost" size="sm" icon={<IconBan size={12} />} onClick={handleDisconnect}>断开连接</Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<IconExport size={12} />}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(nodes, null, 2));
                    showToast("节点列表 JSON 已复制到剪贴板");
                  } catch {
                    showToast("复制失败");
                  }
                }}
              >
                复制节点列表
              </Button>
            </div>
          </Card>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col gap-4">
          <Card>
            {!displayNode ? (
              <div className="text-xs text-content-tertiary text-center p-6">选择一个节点查看详情</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={displayNode.online ? "text-green-bright" : "text-content-tertiary"}>
                      {deviceIcon(displayNode.device)}
                    </span>
                    <span className="text-base font-semibold text-content-primary">{displayNode.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${displayNode.online ? "bg-green" : "bg-red"}`} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-xs font-mono text-content-secondary">{displayNode.ip}</span>
                  {displayNode.trusted ? <Badge color="green" size="sm">受信任</Badge> : <Badge color="gray" size="sm">未验证</Badge>}
                </div>

                <div className={secClass}>节点信息</div>
                {[
                  ["设备类型", displayNode.device === "laptop" ? "笔记本" : displayNode.device === "desktop" ? "台式机" : displayNode.device === "server" ? "服务器" : "手机"],
                  ["操作系统", displayNode.os ?? "未知"],
                  ["客户端版本", displayNode.version ?? "未知"],
                  ["运行时间", displayNode.uptime ?? "未知"],
                  ["共享缓存", displayNode.cache],
                  ["带宽", displayNode.bandwidth ?? "未知"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between items-center py-1.5 text-xs">
                    <span className="text-content-tertiary">{l}</span>
                    <span className="text-content-primary font-medium">{v}</span>
                  </div>
                ))}

                <div className={`${secClass} mt-3.5`}>信任设置</div>
                <div className="text-xs text-content-secondary mb-2.5">
                  {displayNode.trusted
                    ? "该节点已被标记为受信任节点。受信任节点可以自动共享内容。"
                    : "该节点尚未验证。验证后可以安全共享内容。"}
                </div>
                <Button variant="danger" size="sm" icon={<IconBan size={12} />} onClick={handleDisconnect}>
                  {displayNode.trusted ? "取消信任" : "断开连接"}
                </Button>

                {/* Per-node rate limits are not yet backed by the proxy
                    server, so the controls below only persist locally in
                    this session. */}
                <div className={`${secClass} mt-3.5`}>限速设置（会话内）</div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-secondary min-w-9">下载</span>
                    <TextInput value={dlRate} onChange={setDlRate} placeholder="0 = 不限速" style={{ width: 100 }} />
                    <span className="text-xs text-content-tertiary">Mbps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-content-secondary min-w-9">上传</span>
                    <TextInput value={ulRate} onChange={setUlRate} placeholder="0 = 不限速" style={{ width: 100 }} />
                    <span className="text-xs text-content-tertiary">Mbps</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-surface-card border border-solid border-edge-default rounded-lg py-3 px-5 text-sm text-content-primary shadow-lg z-[100]">
          {toast}
        </div>
      )}
    </>
  );
}
