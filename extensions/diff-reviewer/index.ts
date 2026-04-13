import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = resolve(__dirname, "../..");

const MIME_TYPES: Record<string, string> = {
	".html": "text/html",
	".js": "application/javascript",
	".css": "text/css",
	".json": "application/json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

interface Annotation {
	file: string;
	side: "additions" | "deletions";
	startLine: number;
	endLine: number;
	comment: string;
}

interface DiffPayload {
	type: "diff-data";
	files: Array<{
		name: string;
		oldContents: string;
		newContents: string;
	}>;
}

function getGitDiffs(cwd: string, args: string): DiffPayload {
	const files: DiffPayload["files"] = [];
	const trimmedArgs = args.trim();

	if (trimmedArgs === "--staged") {
		// Staged changes
		const patch = execSync("git diff --cached", { cwd, encoding: "utf-8" });
		return parsePatchToFiles(cwd, patch);
	} else if (trimmedArgs && !trimmedArgs.startsWith("-")) {
		// Specific file path(s)
		const paths = trimmedArgs.split(/\s+/);
		for (const p of paths) {
			const fullPath = resolve(cwd, p);
			if (!existsSync(fullPath)) continue;

			try {
				const oldContents = execSync(`git show HEAD:${p}`, {
					cwd,
					encoding: "utf-8",
				});
				const newContents = readFileSync(fullPath, "utf-8");
				if (oldContents !== newContents) {
					files.push({ name: p, oldContents, newContents });
				}
			} catch {
				// New file (not in git yet)
				const newContents = readFileSync(fullPath, "utf-8");
				files.push({ name: p, oldContents: "", newContents });
			}
		}
		return { type: "diff-data", files };
	} else {
		// Default: working tree changes
		const patch = execSync("git diff", { cwd, encoding: "utf-8" });
		return parsePatchToFiles(cwd, patch);
	}
}

function parsePatchToFiles(cwd: string, patch: string): DiffPayload {
	const files: DiffPayload["files"] = [];
	if (!patch.trim()) return { type: "diff-data", files };

	// Get list of changed files from git
	const changedFiles = execSync("git diff --name-only", {
		cwd,
		encoding: "utf-8",
	})
		.trim()
		.split("\n")
		.filter(Boolean);

	for (const file of changedFiles) {
		try {
			let oldContents = "";
			try {
				oldContents = execSync(`git show HEAD:${file}`, {
					cwd,
					encoding: "utf-8",
				});
			} catch {
				// New file
			}
			const fullPath = resolve(cwd, file);
			const newContents = existsSync(fullPath)
				? readFileSync(fullPath, "utf-8")
				: "";
			if (oldContents !== newContents) {
				files.push({ name: file, oldContents, newContents });
			}
		} catch {
			// Skip binary or inaccessible files
		}
	}

	return { type: "diff-data", files };
}

function formatAnnotationsAsPrompt(annotations: Annotation[]): string {
	if (annotations.length === 0) return "";

	const grouped = new Map<string, Annotation[]>();
	for (const a of annotations) {
		const existing = grouped.get(a.file) ?? [];
		existing.push(a);
		grouped.set(a.file, existing);
	}

	let prompt = "## Code Review Annotations\n\n";
	prompt +=
		"I've reviewed the code changes and have the following annotations. Please address each one:\n\n";

	for (const [file, anns] of grouped) {
		for (const a of anns.sort((x, y) => x.startLine - y.startLine)) {
			const lineRef =
				a.startLine === a.endLine
					? `line ${a.startLine}`
					: `lines ${a.startLine}-${a.endLine}`;
			const side = a.side === "additions" ? "new" : "old";
			prompt += `### \`${file}\` (${lineRef}, ${side} side)\n`;
			prompt += `${a.comment}\n\n`;
		}
	}

	prompt += "---\nPlease address all review annotations above.";
	return prompt;
}

export default function (pi: ExtensionAPI) {
	let activeServer: ReturnType<typeof createServer> | null = null;
	let activeWss: WebSocketServer | null = null;

	function shutdownServer() {
		if (activeWss) {
			for (const client of activeWss.clients) {
				client.close();
			}
			activeWss.close();
			activeWss = null;
		}
		if (activeServer) {
			activeServer.close();
			activeServer = null;
		}
	}

	pi.on("session_shutdown", async () => {
		shutdownServer();
	});

	pi.registerCommand("review", {
		description: "Open diff review GUI to annotate code changes",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Review requires interactive mode", "error");
				return;
			}

			shutdownServer();

			// Get diff data
			let diffData: DiffPayload;
			try {
				diffData = getGitDiffs(ctx.cwd, args);
			} catch (err: any) {
				ctx.ui.notify(`Failed to get diffs: ${err.message}`, "error");
				return;
			}

			if (diffData.files.length === 0) {
				ctx.ui.notify("No changes found to review", "info");
				return;
			}

			// Resolve build directory
			const buildDir = join(PACKAGE_ROOT, "build");
			if (!existsSync(buildDir)) {
				ctx.ui.notify(
					"Web UI not built. Run `pnpm build` in the package directory first.",
					"error",
				);
				return;
			}

			// Start HTTP + WebSocket server
			const server = createServer((req, res) => {
				const url = new URL(req.url ?? "/", `http://localhost`);
				let filePath = join(buildDir, url.pathname);

				// SPA fallback
				if (
					!existsSync(filePath) ||
					(statSync(filePath).isDirectory() && !existsSync(join(filePath, "index.html")))
				) {
					filePath = join(buildDir, "index.html");
				} else if (statSync(filePath).isDirectory()) {
					filePath = join(filePath, "index.html");
				}

				if (!existsSync(filePath)) {
					res.writeHead(404);
					res.end("Not found");
					return;
				}

				const ext = extname(filePath);
				const mime = MIME_TYPES[ext] ?? "application/octet-stream";
				const content = readFileSync(filePath);
				res.writeHead(200, {
					"Content-Type": mime,
					"Cache-Control": "no-cache",
				});
				res.end(content);
			});

			const wss = new WebSocketServer({ server });
			activeServer = server;
			activeWss = wss;

			wss.on("connection", (ws) => {
				// Send diff data to client
				ws.send(JSON.stringify(diffData));

				ws.on("message", (data) => {
					try {
						const msg = JSON.parse(data.toString());
						if (msg.type === "submit-review") {
							const annotations: Annotation[] = msg.annotations;
							const prompt = formatAnnotationsAsPrompt(annotations);
							if (prompt) {
								pi.sendUserMessage(prompt);
								ctx.ui.notify(
									`Review submitted with ${annotations.length} annotation(s)`,
									"success",
								);
							} else {
								ctx.ui.notify("No annotations to submit", "info");
							}
							shutdownServer();
						}
					} catch {
						// Ignore malformed messages
					}
				});
			});

			// Find available port and start
			await new Promise<void>((resolve) => {
				server.listen(0, "127.0.0.1", () => resolve());
			});

			const addr = server.address();
			const port = typeof addr === "object" && addr ? addr.port : 0;
			const url = `http://127.0.0.1:${port}`;

			ctx.ui.notify(`Review UI opened at ${url}`, "info");
			ctx.ui.setStatus("diff-review", `📝 Review open at ${url}`);

			// Open browser
			try {
				const openCmd =
					process.platform === "darwin"
						? "open"
						: process.platform === "win32"
							? "start"
							: "xdg-open";
				execSync(`${openCmd} ${url}`);
			} catch {
				ctx.ui.notify(`Open ${url} in your browser`, "info");
			}

			// Clean up status when server closes
			server.on("close", () => {
				ctx.ui.setStatus("diff-review", undefined);
			});
		},
	});
}
