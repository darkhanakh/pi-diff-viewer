import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
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

/** Get the git repo root directory */
function getRepoRoot(cwd: string): string {
	return execSync("git rev-parse --show-toplevel", { cwd, encoding: "utf-8" }).trim();
}

/** Read file from git at a given ref, returns empty string if not found */
function gitShow(cwd: string, ref: string, filePath: string): string {
	try {
		return execSync(`git show ${ref}:${filePath}`, {
			cwd,
			encoding: "utf-8",
			maxBuffer: 10 * 1024 * 1024,
		});
	} catch {
		return "";
	}
}

/** Read file from disk, returns empty string if not found */
function readFromDisk(filePath: string): string {
	try {
		if (existsSync(filePath)) return readFileSync(filePath, "utf-8");
	} catch {
		/* binary or inaccessible */
	}
	return "";
}

function getGitDiffs(cwd: string, args: string): DiffPayload {
	const trimmedArgs = args.trim();
	const repoRoot = getRepoRoot(cwd);

	if (trimmedArgs === "--staged") {
		return getDiffFiles(repoRoot, "--cached");
	} else if (trimmedArgs && !trimmedArgs.startsWith("-")) {
		// Specific file paths — resolve relative to cwd then make relative to repo root
		return getSpecificFiles(cwd, repoRoot, trimmedArgs.split(/\s+/));
	} else {
		return getDiffFiles(repoRoot, "");
	}
}

/** Get diffs using git diff with the given flags (e.g. "" or "--cached") */
function getDiffFiles(repoRoot: string, diffFlags: string): DiffPayload {
	const files: DiffPayload["files"] = [];

	const cmd = `git diff ${diffFlags} --name-only`.trim();
	const changedFiles = execSync(cmd, { cwd: repoRoot, encoding: "utf-8" })
		.trim()
		.split("\n")
		.filter(Boolean);

	for (const relPath of changedFiles) {
		const absPath = resolve(repoRoot, relPath);
		const oldContents = gitShow(repoRoot, "HEAD", relPath);
		const newContents = diffFlags === "--cached"
			? gitShow(repoRoot, ":", relPath) // staged version from index
			: readFromDisk(absPath);           // working tree version

		if (oldContents === newContents) continue;
		// Skip binary files (simple heuristic)
		if (oldContents.includes("\0") || newContents.includes("\0")) continue;

		files.push({ name: relPath, oldContents, newContents });
	}

	return { type: "diff-data", files };
}

/** Get diffs for specific file paths */
function getSpecificFiles(cwd: string, repoRoot: string, paths: string[]): DiffPayload {
	const files: DiffPayload["files"] = [];

	for (const p of paths) {
		const absPath = resolve(cwd, p);
		// Make path relative to repo root for git operations
		const relPath = absPath.startsWith(repoRoot)
			? absPath.slice(repoRoot.length + 1)
			: p;

		const oldContents = gitShow(repoRoot, "HEAD", relPath);
		const newContents = readFromDisk(absPath);

		if (oldContents === newContents) continue;
		if (oldContents.includes("\0") || newContents.includes("\0")) continue;

		files.push({ name: relPath, oldContents, newContents });
	}

	return { type: "diff-data", files };
}

function formatAnnotationsAsPrompt(annotations: Annotation[]): string {
	if (annotations.length === 0) return "";

	const grouped = new Map<string, Annotation[]>();
	for (const a of annotations) {
		const list = grouped.get(a.file) ?? [];
		list.push(a);
		grouped.set(a.file, list);
	}

	let prompt = "## Code Review Annotations\n\n";
	prompt += "I've reviewed the code changes and have the following annotations. Please address each one:\n\n";

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
			for (const client of activeWss.clients) client.close();
			activeWss.close();
			activeWss = null;
		}
		if (activeServer) {
			activeServer.close();
			activeServer = null;
		}
	}

	pi.on("session_shutdown", async () => shutdownServer());

	pi.registerCommand("review", {
		description: "Open diff review GUI to annotate code changes",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Review requires interactive mode", "error");
				return;
			}

			shutdownServer();

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

			const buildDir = join(PACKAGE_ROOT, "build");
			if (!existsSync(buildDir)) {
				ctx.ui.notify("Web UI not built. Run `pnpm build` in the package directory first.", "error");
				return;
			}

			const server = createServer((req, res) => {
				const url = new URL(req.url ?? "/", "http://localhost");
				let filePath = join(buildDir, url.pathname);

				if (!existsSync(filePath) || (statSync(filePath).isDirectory() && !existsSync(join(filePath, "index.html")))) {
					filePath = join(buildDir, "index.html");
				} else if (statSync(filePath).isDirectory()) {
					filePath = join(filePath, "index.html");
				}

				if (!existsSync(filePath)) { res.writeHead(404); res.end("Not found"); return; }

				res.writeHead(200, {
					"Content-Type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
					"Cache-Control": "no-cache",
				});
				res.end(readFileSync(filePath));
			});

			const wss = new WebSocketServer({ server });
			activeServer = server;
			activeWss = wss;

			wss.on("connection", (ws) => {
				ws.send(JSON.stringify(diffData));

				ws.on("message", (data) => {
					try {
						const msg = JSON.parse(data.toString());
						if (msg.type === "submit-review") {
							const annotations: Annotation[] = msg.annotations;
							const prompt = formatAnnotationsAsPrompt(annotations);
							if (prompt) {
								pi.sendUserMessage(prompt);
								ctx.ui.notify(`Review submitted with ${annotations.length} annotation(s)`, "success");
							}
							shutdownServer();
						}
					} catch { /* ignore */ }
				});
			});

			await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
			const addr = server.address();
			const port = typeof addr === "object" && addr ? addr.port : 0;
			const url = `http://127.0.0.1:${port}`;

			ctx.ui.notify(`Review UI → ${url}`, "info");
			ctx.ui.setStatus("diff-review", `📝 Review: ${url}`);

			try {
				const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
				execSync(`${cmd} ${url}`);
			} catch {
				ctx.ui.notify(`Open ${url} in your browser`, "info");
			}

			server.on("close", () => ctx.ui.setStatus("diff-review", undefined));
		},
	});
}
