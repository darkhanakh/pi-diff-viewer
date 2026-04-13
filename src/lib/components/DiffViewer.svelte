<script lang="ts">
	import { onMount, onDestroy, tick } from "svelte";
	import {
		FileDiff as FileDiffComponent,
		type FileContents,
	} from "@pierre/diffs";
	import type { DiffFile, Annotation } from "$lib/types";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";

	type Props = {
		file: DiffFile;
		annotations: Annotation[];
		onAnnotationAdd: (annotation: Annotation) => void;
		onAnnotationRemove: (id: string) => void;
	};
	let { file, annotations, onAnnotationAdd, onAnnotationRemove }: Props = $props();

	let containerEl: HTMLDivElement;
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let commentText = $state("");
	let instance: FileDiffComponent | null = null;
	let observer: MutationObserver | null = null;

	// LOCAL pending state — no parent communication needed
	let pendingLine = $state<{ lineNumber: number; side: "additions" | "deletions" } | null>(null);

	const fileAnnotations = $derived(annotations.filter((a) => a.file === file.name));
	const addCount = $derived(
		file.newContents.split("\n").length - file.oldContents.split("\n").length,
	);

	function buildLineAnnotations() {
		return fileAnnotations.map((a) => ({
			side: a.side,
			lineNumber: a.startLine,
			metadata: { id: a.id, comment: a.comment },
		}));
	}

	function handleLineClick(lineNumber: number, side: "additions" | "deletions") {
		pendingLine = { lineNumber, side };
		tick().then(() => textareaEl?.focus());
	}

	function handleSubmit() {
		const trimmed = commentText.trim();
		if (!trimmed || !pendingLine) return;
		onAnnotationAdd({
			id: crypto.randomUUID(),
			file: file.name,
			side: pendingLine.side,
			startLine: pendingLine.lineNumber,
			endLine: pendingLine.lineNumber,
			comment: trimmed,
		});
		commentText = "";
		pendingLine = null;
	}

	function handleCancel() {
		commentText = "";
		pendingLine = null;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === "Escape") {
			e.preventDefault();
			handleCancel();
		}
	}

	function wireClickHandlers() {
		if (!containerEl) return;
		const host = containerEl.querySelector("diffs-container");
		const sr = host?.shadowRoot;
		if (!sr) return;

		for (const el of sr.querySelectorAll("[data-column-number]")) {
			const htmlEl = el as HTMLElement;
			if (htmlEl.dataset.piWired) continue;
			htmlEl.dataset.piWired = "true";
			htmlEl.style.cursor = "pointer";
			htmlEl.addEventListener("click", (e) => {
				e.stopPropagation();
				const lineNumber = parseInt(htmlEl.textContent?.trim() || "0", 10);
				if (!lineNumber) return;
				const isAdditions = !!htmlEl.closest("[data-additions]");
				handleLineClick(lineNumber, isAdditions ? "additions" : "deletions");
			});
		}
	}

	function createInstance() {
		if (instance) instance.cleanUp();

		const oldFile: FileContents = { name: file.name, contents: file.oldContents };
		const newFile: FileContents = { name: file.name, contents: file.newContents };

		instance = new FileDiffComponent({
			theme: { dark: "pierre-dark", light: "pierre-light" },
			themeType: "dark",
			diffStyle: "split",
			hunkSeparators: "line-info",
			lineHoverHighlight: "number",
			renderAnnotation(annotation: { metadata: { id: string; comment: string } }) {
				const wrapper = document.createElement("div");
				wrapper.style.cssText = "margin:4px 0;padding:0 8px;font-family:system-ui,-apple-system,sans-serif;";

				const container = document.createElement("div");
				container.style.cssText = "background:oklch(0.178 0 0);border:1px solid oklch(0.265 0 0);border-radius:8px;padding:8px 12px;display:flex;align-items:flex-start;gap:8px;";

				container.innerHTML = `
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.12 250)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top:2px;flex-shrink:0;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
					<p style="flex:1;min-width:0;margin:0;font-size:13px;color:oklch(0.85 0 0);line-height:1.45;white-space:pre-wrap;word-break:break-word;"></p>
				`;
				container.querySelector("p")!.textContent = annotation.metadata.comment;

				const removeBtn = document.createElement("button");
				removeBtn.setAttribute("aria-label", "Remove");
				removeBtn.style.cssText = "flex-shrink:0;padding:2px;border:none;background:transparent;color:oklch(0.5 0 0);cursor:pointer;border-radius:4px;display:flex;opacity:0;transition:all .15s;";
				removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
				removeBtn.addEventListener("click", () => onAnnotationRemove(annotation.metadata.id));
				container.addEventListener("mouseenter", () => { removeBtn.style.opacity = "1"; });
				container.addEventListener("mouseleave", () => { removeBtn.style.opacity = "0"; });

				container.appendChild(removeBtn);
				wrapper.appendChild(container);
				return wrapper;
			},
		});

		instance.render({
			oldFile,
			newFile,
			lineAnnotations: buildLineAnnotations(),
			containerWrapper: containerEl,
		});
	}

	$effect(() => {
		if (!instance) return;
		void fileAnnotations;
		instance.setLineAnnotations(buildLineAnnotations());
		instance.rerender();
	});

	onMount(() => {
		createInstance();
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				wireClickHandlers();
				const host = containerEl?.querySelector("diffs-container");
				const sr = host?.shadowRoot;
				if (sr) {
					observer = new MutationObserver(() => wireClickHandlers());
					observer.observe(sr, { childList: true, subtree: true });
				}
			});
		});
	});
	onDestroy(() => {
		observer?.disconnect();
		instance?.cleanUp();
	});
</script>

<div class="border-border overflow-hidden rounded-lg border">
	<!-- File header -->
	<div class="bg-card border-border flex items-center gap-3 border-b px-4 py-2">
		<span class="font-mono text-sm text-foreground/80">{file.name}</span>
		{#if addCount > 0}
			<Badge variant="outline" class="border-green-500/30 bg-green-500/10 text-xs text-green-400">+{addCount}</Badge>
		{:else if addCount < 0}
			<Badge variant="outline" class="border-red-500/30 bg-red-500/10 text-xs text-red-400">{addCount}</Badge>
		{/if}
		{#if fileAnnotations.length > 0}
			<Badge variant="secondary" class="text-xs">
				{fileAnnotations.length} comment{fileAnnotations.length !== 1 ? "s" : ""}
			</Badge>
		{/if}
	</div>

	<!-- Diff (click any line number to add comment) -->
	<div class="diff-container" bind:this={containerEl}></div>

	<!-- Comment form -->
	{#if pendingLine}
		<div class="border-border bg-card border-t">
			<div class="border-border flex items-center gap-2 border-b px-4 py-2">
				<svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
				</svg>
				<span class="text-foreground/80 text-sm font-medium">Add a comment on line {pendingLine.lineNumber}</span>
				<Badge variant="outline" class="text-[11px] {pendingLine.side === 'additions' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}">
					{pendingLine.side === "additions" ? "new" : "old"}
				</Badge>
			</div>
			<div class="p-3">
				<textarea
					bind:this={textareaEl}
					bind:value={commentText}
					onkeydown={handleKeydown}
					placeholder="Leave a comment"
					rows={4}
					class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-ring w-full resize-y rounded-lg border p-2.5 text-sm outline-none"
				></textarea>
			</div>
			<div class="border-border flex items-center justify-between border-t px-4 py-2">
				<span class="text-muted-foreground text-[11px]">⌘↵ to comment · Esc to cancel</span>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={handleCancel}>Cancel</Button>
					<Button size="sm" onclick={handleSubmit} disabled={!commentText.trim()} class="bg-emerald-600 text-white hover:bg-emerald-500">Comment</Button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.diff-container {
		--diffs-font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		--diffs-font-size: 13px;
		--diffs-line-height: 1.5;
		--diffs-tab-size: 2;
	}
</style>
