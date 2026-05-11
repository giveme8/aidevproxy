import React, { useState, useEffect, useRef, useCallback } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Select from "../components/ui/Select";
import { Sparkline, DonutChart } from "../components/visualizations";
import {
	IconRefresh, IconTrash, IconFolder, IconWave, IconUsers,
	IconPlay, IconPause, IconLaptop, IconDesktop, IconServer, IconShield,
	IconSpeedo, IconExport, IconPip, IconNpm, IconHuggingface, IconDocker,
} from "../components/ui/Icons";
import BrandCube from "../components/BrandCube";
import { invoke } from "../tauri-api";

/* ── types ──────────────────────────────────────────── */

interface ProxyStatus {
	running: boolean;
	port: number;
	config: {
		enable_mirror: boolean;
		enable_p2p: boolean;
		enable_cache: boolean;
		auto_start: boolean;
	};
}

interface ProxyStats {
	total_requests: number;
	total_bytes_saved: number;
	total_bytes_transferred: number;
	mirror_hits: number;
	p2p_hits: number;
	active_peers: number;
	cache_size_bytes: number;
	uptime_seconds: number;
}

interface P2PStatus {
	running: boolean;
	active_peers: number;
	p2p_hits: number;
	cache_size_bytes: number;
}

interface RequestRow {
	id: number;
	time: string;
	tool: string;
	host: string;
	mode: string;
	source: string;
	speed: string;
	status: number;
}

interface Peer {
	id: string;
	name: string;
	ip: string;
	latency: number;
	cache: string;
	online: boolean;
	lastSeen: string;
}

interface MirrorLatency {
	name: string;
	latency: number;
	hitRate: number;
}

interface SpeedTestResult {
	download_mbps: number;
	upload_mbps: number;
	latency_ms: number;
}

/* ── helpers ─────────────────────────────────────────── */

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + " GB";
	if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + " MB";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
}

/* ── constants ────────────────────────────────────────── */

const toolIcons: Record<string, React.ReactNode> = {
	pip: <IconPip size={14} />,
	npm: <IconNpm size={14} />,
	hf: <IconHuggingface size={14} />,
	docker: <IconDocker size={14} />,
};

const FLT = [
	{ value: "all", label: "全部" },
	{ value: "pip", label: "pip" },
	{ value: "npm", label: "npm" },
	{ value: "hf", label: "HuggingFace" },
	{ value: "docker", label: "Docker" },
];

const deviceIcons: Record<string, React.ReactNode> = {
	laptop: <IconLaptop />,
	desktop: <IconDesktop />,
	server: <IconServer />,
};

/* ── className helpers ───────────────────────────────── */

function qb(a: boolean): string {
	const base = "flex flex-col items-center justify-center gap-[6px] py-[14px] px-[6px] rounded-[10px] cursor-pointer text-[11px] font-medium transition-all text-center";
	if (a) return `${base} bg-[rgba(34,197,94,.10)] border border-[rgba(34,197,94,.4)] text-green-bright shadow-[0_0_12px_rgba(34,197,94,.15)]`;
	return `${base} bg-surface-card-2 border border-edge-default text-content-secondary hover:bg-surface-card-hover`;
}

/* ── KPI card ─────────────────────────────────────────── */

function KPI(lbl: string, v: string, o?: { u?: string; s?: string; t?: string; sd?: number[]; dv?: number; ic?: React.ReactNode }) {
	return (
		<div className="bg-surface-card border border-edge-default rounded-xl py-4 px-[18px] flex flex-col gap-2 min-w-0" key={lbl}>
			<span className="text-[12px] text-content-tertiary font-medium whitespace-nowrap overflow-hidden text-ellipsis">{lbl}</span>
			<div className="flex items-baseline gap-[6px]">
				<span className="text-3xl font-bold text-content-primary">{v}</span>
				{o?.u && <span className="text-base text-content-secondary font-medium">{o.u}</span>}
			</div>
			{o?.s && <span className="text-xs text-content-tertiary whitespace-nowrap overflow-hidden text-ellipsis">{o.s}</span>}
			<div className="flex items-center justify-between mt-1">
				{o?.t && (
					<span className={`text-[12px] font-semibold ${o.t.startsWith("-") ? "text-red" : "text-green-bright"}`}>
						{o.t}
					</span>
				)}
				{o?.sd && <Sparkline data={o.sd} width={72} height={28} />}
				{o?.dv !== undefined && (
					<DonutChart
						data={[{ value: o.dv, color: "#22c55e" }, { value: 100 - o.dv, color: "#1d2926" }]}
						size={36}
						thickness={6}
					/>
				)}
				{o?.ic}
			</div>
		</div>
	);
}

/* ── main component ───────────────────────────────────── */

interface DashboardPageProps { goTo?: (page: string) => void }

export default function DashboardPage({ goTo: _goTo }: DashboardPageProps) {
	const [status, setStatus] = useState<ProxyStatus | null>(null);
	const [stats, setStats] = useState<ProxyStats | null>(null);
	const [p2p, setP2p] = useState<P2PStatus | null>(null);
	const [reqs, setReqs] = useState<RequestRow[]>([]);
	const [peers, setPeers] = useState<Peer[]>([]);
	const [mirrors, setMirrors] = useState<MirrorLatency[]>([]);
	const [filter, setFilter] = useState("all");
	const [paused, setPaused] = useState(false);
	const [proxyLoading, setProxyLoading] = useState(false);
	const [toast, setToast] = useState<string | null>(null);
	const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
	const pausedRef = useRef(false);
	pausedRef.current = paused;

	const showToast = useCallback((msg: string) => {
		setToast(msg);
		setTimeout(() => setToast(null), 2500);
	}, []);

	const fetchAll = useCallback(async () => {
		if (pausedRef.current) return;
		try {
			const [s, st, p, r, pr, m] = await Promise.all([
				invoke<ProxyStatus>("get_proxy_status"),
				invoke<ProxyStats>("get_stats"),
				invoke<P2PStatus>("get_p2p_status"),
				invoke<RequestRow[]>("get_recent_requests"),
				invoke<Peer[]>("get_peers"),
				invoke<MirrorLatency[]>("get_mirror_latency"),
			]);
			setStatus(s);
			setStats(st);
			setP2p(p);
			setReqs(r);
			setPeers(pr);
			setMirrors(m);
		} catch {
			// backend not available, keep last known state
		}
	}, []);

	useEffect(() => {
		fetchAll();
		const interval = setInterval(fetchAll, 2000);
		return () => clearInterval(interval);
	}, [fetchAll]);

	const handleToggleProxy = async () => {
		setProxyLoading(true);
		try {
			if (status?.running) {
				await invoke("stop_proxy");
				showToast("代理已停止");
			} else {
				await invoke("start_proxy");
				showToast("代理已启动");
			}
			await fetchAll();
		} catch {
			showToast("操作失败，请检查后端服务");
		}
		setProxyLoading(false);
	};

	const handleClearCache = async () => {
		try {
			await invoke("clear_cache");
			showToast("缓存已清理");
			await fetchAll();
		} catch {
			showToast("清理缓存失败");
		}
	};

	const handleSpeedTest = async () => {
		try {
			const result = await invoke<SpeedTestResult>("run_speed_test");
			setSpeedResult(result);
			showToast(`测速完成: ↓${result.download_mbps}Mbps ↑${result.upload_mbps}Mbps`);
		} catch {
			showToast("测速失败");
		}
	};

	const handleExportLogs = async () => {
		try {
			const msg = await invoke<string>("export_logs");
			showToast(msg);
		} catch {
			showToast("导出失败");
		}
	};

	const running = status?.running ?? false;
	const port = status?.port ?? 8899;
	const filtered = filter === "all" ? reqs : reqs.filter((r) => r.tool === filter);
	const cacheHitRate = stats && stats.total_requests > 0
		? Math.round(((stats.mirror_hits + stats.p2p_hits) / stats.total_requests) * 100)
		: 0;

	return (
		<>
			<style>{`@keyframes hubPulse{0%,100%{box-shadow:0 0 8px rgba(34,197,94,.2)}50%{box-shadow:0 0 22px rgba(34,197,94,.5)}}`}</style>
			<div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 p-6 overflow-auto h-full font-sans bg-surface-canvas text-content-primary">
				{/* LEFT */}
				<div className="flex flex-col gap-4 min-w-0">
					{/* Proxy control bar */}
					<div className="flex items-center justify-between bg-surface-card border border-edge-default rounded-xl py-[14px] px-[18px]">
						<div className="flex items-center gap-[10px]">
							<span className={`w-[10px] h-[10px] rounded-full ${running ? "bg-green" : "bg-red"}`} />
							<span className="text-base font-semibold">{running ? "运行中" : "已停止"}</span>
							{running && <span className="text-[12px] text-content-tertiary font-mono">端口: {port}</span>}
						</div>
						<Button
							onClick={handleToggleProxy}
							disabled={proxyLoading}
							style={{ background: running ? "#ef4444" : "#22c55e", border: "none", color: "#fff", fontWeight: 600, padding: "8px 20px" }}
						>
							{proxyLoading ? "..." : running ? "停止代理" : "启动代理"}
						</Button>
					</div>
					{running && (
						<div className="mt-[10px] py-2 px-3 bg-surface-canvas rounded-md text-xs font-mono text-green-bright">
							export HTTP_PROXY=http://127.0.0.1:{port} && export HTTPS_PROXY=http://127.0.0.1:{port}
						</div>
					)}

					{/* KPI row */}
					<div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
						{KPI("今日请求数", stats ? stats.total_requests.toLocaleString() : "--")}
						{KPI("缓存命中率", String(cacheHitRate), { u: "%", dv: cacheHitRate || 0 })}
						{KPI("节省带宽", stats ? formatBytes(stats.total_bytes_saved) : "--")}
						{KPI("活跃节点", String(p2p?.active_peers ?? stats?.active_peers ?? 0), { s: "在线节点总数", ic: <IconUsers size={36} /> })}
					</div>

					{/* Real-time request table */}
					<Card
						title={<span className="text-sm font-semibold text-content-primary flex items-center gap-[6px]"><IconWave /> 实时请求</span>}
						action={
							<div className="flex items-center gap-2">
								<Select value={filter} options={FLT} onChange={setFilter} size="sm" />
								<Button variant="ghost" size="sm" icon={paused ? <IconPlay /> : <IconPause />} onClick={() => setPaused((p) => !p)} />
							</div>
						}
					>
						<div className="overflow-hidden">
							<table className="w-full border-collapse text-[12px] table-fixed">
								<colgroup>
									<col style={{ width: 78 }} />
									<col style={{ width: 88 }} />
									<col />
									<col style={{ width: 64 }} />
									<col style={{ width: 88 }} />
									<col style={{ width: 88 }} />
									<col style={{ width: 56 }} />
								</colgroup>
								<thead>
									<tr>
										{["时间", "工具", "主机", "模式", "来源", "速度", "状态"].map((h, i) => (
											<th
												key={h}
												className={`py-[7px] px-2 text-content-tertiary font-medium text-[11px] border-b border-edge-default whitespace-nowrap uppercase tracking-[0.3px] ${i === 6 ? "text-right pr-3" : "text-left"}`}
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{filtered.length === 0 ? (
										<tr>
											<td colSpan={7} className="py-[7px] px-2 text-content-tertiary border-b border-edge-default whitespace-nowrap text-center font-sans text-xs">
												{running ? "等待请求..." : "代理未启动"}
											</td>
										</tr>
									) : (
										filtered.map((r) => (
											<tr key={r.id}>
												<td className="py-[7px] px-2 text-content-secondary border-b border-edge-default whitespace-nowrap font-mono text-[11px]">{r.time}</td>
												<td className="py-[7px] px-2 text-content-primary border-b border-edge-default whitespace-nowrap text-xs">
													<span className="inline-flex items-center gap-[6px]">
														{toolIcons[r.tool] ?? null}
														<span>{r.tool}</span>
													</span>
												</td>
												<td className="py-[7px] px-2 text-content-secondary border-b border-edge-default truncate font-mono text-[11px]" title={r.host}>{r.host}</td>
												<td className="py-[7px] px-2 border-b border-edge-default whitespace-nowrap text-xs">
													<Badge color={r.mode === "cache" ? "green" : r.mode === "p2p" ? "blue" : r.mode === "mirror" ? "yellow" : "gray"} size="sm">{r.mode}</Badge>
												</td>
												<td className="py-[7px] px-2 text-content-secondary border-b border-edge-default whitespace-nowrap font-sans text-xs truncate" title={r.source}>{r.source}</td>
												<td className="py-[7px] px-2 text-green-bright border-b border-edge-default whitespace-nowrap font-mono text-[11px] font-semibold">{r.speed}</td>
												<td className="py-[7px] px-2 pr-3 border-b border-edge-default whitespace-nowrap font-mono text-xs text-right">
													<span className={`inline-block py-[1px] px-[6px] rounded text-[10px] font-semibold ${r.status < 400 ? "text-green-bright bg-[rgba(34,197,94,.12)] border border-[rgba(34,197,94,.3)]" : "text-red bg-[rgba(239,68,68,.12)] border border-[rgba(239,68,68,.3)]"}`}>
														{r.status}
													</span>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</Card>

					{/* Topology visualization */}
					<div className="bg-surface-card border border-edge-default rounded-xl p-5">
						<div className="text-sm font-semibold text-content-primary mb-4">拓扑可视化</div>
						<div className="flex items-center gap-5">
							<div className="flex-1 bg-surface-card-2 border border-edge-default rounded-lg p-[14px] flex flex-col gap-[10px]">
								<div className="text-[12px] font-semibold text-content-primary mb-[6px]">开发工具</div>
								{(["pip", "npm", "hf", "docker"] as const).map((t) => (
									<div key={t} className="flex items-center gap-2 py-[6px] px-2 bg-surface-card rounded-md text-[12px] text-content-secondary font-medium">
										<span>{toolIcons[t]}</span>
										<span>{t}</span>
									</div>
								))}
							</div>
							<div className="flex flex-col items-center gap-2">
								<div className="w-[120px] h-[120px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,.15),rgba(34,197,94,.02))] border-2 border-[rgba(34,197,94,.3)] flex items-center justify-center shrink-0 [animation:hubPulse_2s_ease-in-out_infinite]">
									<BrandCube size={48} glow />
								</div>
								<span className="text-[10px] text-content-tertiary">AIDevProxy Hub</span>
							</div>
							<div className="flex-1 flex flex-col gap-[10px]">
								<div className="flex-1 bg-surface-card-2 border border-edge-default rounded-lg p-3 text-center flex flex-col items-center gap-[6px]">
									<IconShield /><span className="text-xs text-content-secondary font-medium">智能镜像</span>
								</div>
								<div className="flex-1 bg-surface-card-2 border border-edge-default rounded-lg p-3 text-center flex flex-col items-center gap-[6px]">
									<IconFolder /><span className="text-xs text-content-secondary font-medium">本地缓存</span><span className="text-base text-content-primary font-semibold">{cacheHitRate}% 命中</span>
								</div>
								<div className="flex-1 bg-surface-card-2 border border-edge-default rounded-lg p-3 text-center flex flex-col items-center gap-[6px]">
									<IconServer /><span className="text-xs text-content-secondary font-medium">P2P 节点</span><span className="text-base text-content-primary font-semibold">{peers.length} 节点</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* RIGHT */}
				<div className="flex flex-col gap-4">
					{/* Mirror latency */}
					<Card title="镜像延迟" action={<Button variant="ghost" size="sm" icon={<IconRefresh />} onClick={fetchAll} />}>
						<div className="flex flex-col">
							{mirrors.length === 0 ? (
								<div className="text-[12px] text-content-tertiary text-center p-4">暂无数据</div>
							) : (
								mirrors.map((m) => {
									const health = Math.max(8, Math.min(100, Math.round(100 - (m.latency / 350) * 100)));
									const isSlow = m.latency >= 200;
									const isWarn = m.latency >= 80 && m.latency < 200;
									const barColor = isSlow ? "#fb923c" : isWarn ? "#facc15" : "#22c55e";
									return (
										<div key={m.name} className="py-[10px]">
											<div className="flex items-center justify-between mb-[6px]">
												<span className="text-[13px] text-content-secondary font-medium">{m.name}</span>
												<span className="text-[12px] font-semibold text-content-primary font-mono">{m.latency}ms</span>
											</div>
											<div className="w-full h-[3px] rounded-[2px] bg-edge-default overflow-hidden">
												<div
													style={{
														width: `${health}%`,
														background: barColor,
														boxShadow: `0 0 6px ${barColor}`,
													}}
													className="h-full rounded-[2px] transition-all"
												/>
											</div>
										</div>
									);
								})
							)}
						</div>
					</Card>

					{/* P2P nodes */}
					<Card title="P2P 节点">
						<div className="flex flex-col">
							{peers.length === 0 ? (
								<div className="text-[12px] text-content-tertiary text-center p-4">{running ? "未发现节点" : "代理未启动"}</div>
							) : (
								peers.map((p) => (
									<div key={p.id} className="flex items-center gap-[10px] py-2">
										<div className="text-content-tertiary text-base">{deviceIcons.laptop}</div>
										<div className="flex-1 flex flex-col gap-px">
											<span className="text-[12px] font-semibold text-content-primary">{p.name}</span>
											<span className="text-xs text-content-tertiary font-mono">{p.ip}</span>
										</div>
										<span className={`w-2 h-2 rounded-full shrink-0 ${p.online ? "bg-green" : "bg-red"}`} title={p.online ? "在线" : "离线"} />
									</div>
								))
							)}
						</div>
					</Card>

					{/* Quick actions */}
					<Card title="快捷操作">
						<div className="grid grid-cols-4 gap-[8px]">
							<div className={qb(running)} onClick={handleToggleProxy}>
								<IconShield />
								<span>{running ? "关闭系统代理" : "开启系统代理"}</span>
							</div>
							<div className={qb(false)} onClick={handleClearCache}>
								<IconTrash />
								<span>清理缓存</span>
							</div>
							<div className={qb(false)} onClick={handleSpeedTest}>
								<IconSpeedo />
								<span>{speedResult ? `↓${speedResult.download_mbps} ↑${speedResult.upload_mbps}` : "测速"}</span>
							</div>
							<div className={qb(false)} onClick={handleExportLogs}>
								<IconExport />
								<span>导出日志</span>
							</div>
						</div>
					</Card>
				</div>
			</div>

			{/* Toast notification */}
			{toast && (
				<div className="fixed bottom-6 right-6 bg-surface-card border border-edge-default rounded-lg py-3 px-5 text-sm text-content-primary shadow-lg z-[100] font-sans">
					{toast}
				</div>
			)}
		</>
	);
}
