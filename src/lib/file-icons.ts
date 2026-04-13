// File extension → icon color + label mapping (Material-style)
const EXT_MAP: Record<string, { color: string; label: string }> = {
	// Languages
	ts: { color: "#3178c6", label: "TS" },
	tsx: { color: "#3178c6", label: "TX" },
	js: { color: "#f7df1e", label: "JS" },
	jsx: { color: "#f7df1e", label: "JX" },
	py: { color: "#3572a5", label: "PY" },
	rb: { color: "#cc342d", label: "RB" },
	go: { color: "#00add8", label: "GO" },
	rs: { color: "#dea584", label: "RS" },
	java: { color: "#b07219", label: "JA" },
	kt: { color: "#a97bff", label: "KT" },
	swift: { color: "#f05138", label: "SW" },
	c: { color: "#555555", label: "C" },
	cpp: { color: "#f34b7d", label: "C+" },
	cs: { color: "#178600", label: "C#" },
	php: { color: "#4f5d95", label: "PH" },
	lua: { color: "#000080", label: "LU" },
	zig: { color: "#ec915c", label: "ZG" },

	// Web
	html: { color: "#e34c26", label: "HT" },
	css: { color: "#563d7c", label: "CS" },
	scss: { color: "#c6538c", label: "SC" },
	svelte: { color: "#ff3e00", label: "SV" },
	vue: { color: "#41b883", label: "VU" },

	// Data / Config
	json: { color: "#a6a6a6", label: "JS" },
	yaml: { color: "#cb171e", label: "YM" },
	yml: { color: "#cb171e", label: "YM" },
	toml: { color: "#9c4221", label: "TM" },
	xml: { color: "#0060ac", label: "XM" },
	sql: { color: "#e38c00", label: "SQ" },
	graphql: { color: "#e10098", label: "GQ" },

	// Docs
	md: { color: "#083fa1", label: "MD" },
	txt: { color: "#a6a6a6", label: "TX" },
	rst: { color: "#141414", label: "RS" },

	// Shell
	sh: { color: "#89e051", label: "SH" },
	bash: { color: "#89e051", label: "SH" },
	zsh: { color: "#89e051", label: "SH" },
	fish: { color: "#89e051", label: "SH" },

	// Other
	dockerfile: { color: "#384d54", label: "DK" },
	docker: { color: "#384d54", label: "DK" },
	env: { color: "#ecd53f", label: "EN" },
	gitignore: { color: "#f05032", label: "GI" },
	lock: { color: "#a6a6a6", label: "LK" },
};

export function getFileIcon(filename: string): { color: string; label: string } {
	const lower = filename.toLowerCase();
	const base = lower.split("/").pop() ?? lower;

	// Check full basename first (Dockerfile, etc)
	if (EXT_MAP[base]) return EXT_MAP[base];

	// Check extension
	const ext = base.includes(".") ? base.split(".").pop() ?? "" : "";
	return EXT_MAP[ext] ?? { color: "#a6a6a6", label: ext.slice(0, 2).toUpperCase() || "F" };
}

export function getBasename(filepath: string): string {
	return filepath.split("/").pop() ?? filepath;
}

export function getDirname(filepath: string): string {
	const parts = filepath.split("/");
	return parts.length > 1 ? parts.slice(0, -1).join("/") : "";
}
