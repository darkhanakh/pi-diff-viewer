<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import {
		FileDiff as FileDiffComponent,
		type FileContents,
		type SelectedLineRange,
	} from "@pierre/diffs";
	import type { DiffFile, Annotation, PendingAnnotation } from "$lib/types";
	import { Badge } from "$lib/components/ui/badge/index.js";

	type Props = {
		file: DiffFile;
		annotations: Annotation[];
		pending: PendingAnnotation | null;
		onRequestAnnotation: (
			file: string,
			side: "additions" | "deletions",
			startLine: number,
			endLine: number,
		) => void;
		onSubmitAnnotation: (id: string, comment: string) => void;
		onCancelAnnotation: () => void;
		onRemoveAnnotation: (id: string) => void;
	};
	let {
		file,
		annotations,
		pending,
		onRequestAnnotation,
		onSubmitAnnotation,
		onCancelAnnotation,
		onRemoveAnnotation,
	}: Props = $props();

	let containerEl: HTMLDivElement;
	let instance: FileDiffComponent | null = null;

	const fileAnnotations = $derived(annotations.filter((a) => a.file === file.name));
	const addCount = $derived(
		file.newContents.split("\n").length - file.oldContents.split("\n").length,
	);

	// Build the combined line annotations array (committed + pending form)
	function buildLineAnnotations() {
		const items: Array<{
			side: "additions" | "deletions";
			lineNumber: number;
			metadata: Record<string, unknown>;
		}> = [];

		for (const a of fileAnnotations) {
			items.push({
				side: a.side,
				lineNumber: a.startLine,
				metadata: { kind: "comment", id: a.id, comment: a.comment },
			});
		}

		if (pending && pending.file === file.name) {
			items.push({
				side: pending.side,
				lineNumber: pending.startLine,
				metadata: { kind: "form", id: pending.id, startLine: pending.startLine, endLine: pending.endLine },
			});
		}

		return items;
	}

	function renderAnnotation(annotation: {
		metadata: Record<string, unknown>;
	}): HTMLElement {
		const { metadata } = annotation;

		if (metadata.kind === "form") {
			return createInlineForm(metadata as { id: string; startLine: number; endLine: number });
		}

		return createCommentBubble(metadata as { id: string; comment: string });
	}

	function createInlineForm(meta: { id: string; startLine: number; endLine: number }): HTMLElement {
		const wrapper = document.createElement("div");
		wrapper.style.cssText = `
			margin: 4px 0;
			padding: 0 8px;
			font-family: system-ui, -apple-system, sans-serif;
		`;

		const container = document.createElement("div");
		container.style.cssText = `
			background: oklch(0.178 0 0);
			border: 1px solid oklch(0.32 0.04 250);
			border-radius: 8px;
			overflow: hidden;
		`;

		// Header
		const header = document.createElement("div");
		header.style.cssText = `
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 12px;
			border-bottom: 1px solid oklch(0.265 0 0);
			font-size: 12px;
			color: oklch(0.65 0 0);
		`;
		const lineLabel =
			meta.startLine === meta.endLine ? `Line ${meta.startLine}` : `Lines ${meta.startLine}-${meta.endLine}`;
		header.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.12 250)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
			</svg>
			<span style="font-weight: 500;">Add review comment</span>
			<span style="color: oklch(0.5 0 0);">· ${lineLabel}</span>
		`;
		container.appendChild(header);

		// Textarea
		const textareaWrap = document.createElement("div");
		textareaWrap.style.cssText = "padding: 8px 12px;";

		const textarea = document.createElement("textarea");
		textarea.placeholder = "Leave a comment…";
		textarea.rows = 3;
		textarea.style.cssText = `
			width: 100%;
			box-sizing: border-box;
			background: oklch(0.141 0 0);
			border: 1px solid oklch(0.265 0 0);
			border-radius: 6px;
			color: oklch(0.9 0 0);
			font-size: 13px;
			font-family: system-ui, -apple-system, sans-serif;
			padding: 8px 10px;
			resize: vertical;
			outline: none;
			line-height: 1.5;
			min-height: 60px;
			transition: border-color 0.15s;
		`;
		textarea.addEventListener("focus", () => {
			textarea.style.borderColor = "oklch(0.55 0.12 250)";
		});
		textarea.addEventListener("blur", () => {
			textarea.style.borderColor = "oklch(0.265 0 0)";
		});
		textareaWrap.appendChild(textarea);
		container.appendChild(textareaWrap);

		// Footer with buttons
		const footer = document.createElement("div");
		footer.style.cssText = `
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 6px 12px 10px;
		`;

		const hint = document.createElement("span");
		hint.style.cssText = "font-size: 11px; color: oklch(0.45 0 0);";
		hint.textContent = "⌘↵ submit · Esc cancel";

		const btnGroup = document.createElement("div");
		btnGroup.style.cssText = "display: flex; gap: 6px;";

		const cancelBtn = document.createElement("button");
		cancelBtn.textContent = "Cancel";
		cancelBtn.style.cssText = `
			padding: 4px 12px;
			font-size: 12px;
			font-weight: 500;
			border-radius: 6px;
			border: 1px solid oklch(0.265 0 0);
			background: transparent;
			color: oklch(0.7 0 0);
			cursor: pointer;
			font-family: system-ui, -apple-system, sans-serif;
			transition: all 0.15s;
		`;
		cancelBtn.addEventListener("mouseenter", () => {
			cancelBtn.style.background = "oklch(0.222 0 0)";
		});
		cancelBtn.addEventListener("mouseleave", () => {
			cancelBtn.style.background = "transparent";
		});

		const submitBtn = document.createElement("button");
		submitBtn.textContent = "Comment";
		submitBtn.style.cssText = `
			padding: 4px 12px;
			font-size: 12px;
			font-weight: 500;
			border-radius: 6px;
			border: 1px solid transparent;
			background: oklch(0.55 0.15 145);
			color: white;
			cursor: pointer;
			font-family: system-ui, -apple-system, sans-serif;
			transition: all 0.15s;
			opacity: 0.5;
			pointer-events: none;
		`;

		textarea.addEventListener("input", () => {
			const hasText = textarea.value.trim().length > 0;
			submitBtn.style.opacity = hasText ? "1" : "0.5";
			submitBtn.style.pointerEvents = hasText ? "auto" : "none";
		});

		submitBtn.addEventListener("mouseenter", () => {
			submitBtn.style.background = "oklch(0.6 0.17 145)";
		});
		submitBtn.addEventListener("mouseleave", () => {
			submitBtn.style.background = "oklch(0.55 0.15 145)";
		});

		const doSubmit = () => {
			const text = textarea.value.trim();
			if (text) onSubmitAnnotation(meta.id, text);
		};
		const doCancel = () => onCancelAnnotation();

		submitBtn.addEventListener("click", doSubmit);
		cancelBtn.addEventListener("click", doCancel);

		textarea.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				doSubmit();
			}
			if (e.key === "Escape") {
				e.preventDefault();
				doCancel();
			}
		});

		btnGroup.appendChild(cancelBtn);
		btnGroup.appendChild(submitBtn);
		footer.appendChild(hint);
		footer.appendChild(btnGroup);
		container.appendChild(footer);
		wrapper.appendChild(container);

		// Auto-focus after DOM insertion
		requestAnimationFrame(() => textarea.focus());

		return wrapper;
	}

	function createCommentBubble(meta: { id: string; comment: string }): HTMLElement {
		const wrapper = document.createElement("div");
		wrapper.style.cssText = `
			margin: 4px 0;
			padding: 0 8px;
			font-family: system-ui, -apple-system, sans-serif;
		`;

		const container = document.createElement("div");
		container.style.cssText = `
			background: oklch(0.178 0 0);
			border: 1px solid oklch(0.265 0 0);
			border-radius: 8px;
			padding: 8px 12px;
			display: flex;
			align-items: flex-start;
			gap: 8px;
		`;

		const icon = document.createElement("div");
		icon.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.12 250)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px; flex-shrink: 0;">
				<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
			</svg>
		`;

		const body = document.createElement("div");
		body.style.cssText = "flex: 1; min-width: 0;";

		const text = document.createElement("p");
		text.style.cssText = `
			margin: 0;
			font-size: 13px;
			color: oklch(0.85 0 0);
			line-height: 1.45;
			white-space: pre-wrap;
			word-break: break-word;
		`;
		text.textContent = meta.comment;

		body.appendChild(text);

		const removeBtn = document.createElement("button");
		removeBtn.setAttribute("aria-label", "Remove annotation");
		removeBtn.style.cssText = `
			flex-shrink: 0;
			margin-top: 1px;
			padding: 2px;
			border: none;
			background: transparent;
			color: oklch(0.5 0 0);
			cursor: pointer;
			border-radius: 4px;
			display: flex;
			align-items: center;
			opacity: 0;
			transition: all 0.15s;
		`;
		removeBtn.innerHTML = `
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		`;
		removeBtn.addEventListener("click", () => onRemoveAnnotation(meta.id));
		removeBtn.addEventListener("mouseenter", () => {
			removeBtn.style.color = "oklch(0.65 0.2 25)";
			removeBtn.style.background = "oklch(0.222 0 0)";
		});
		removeBtn.addEventListener("mouseleave", () => {
			removeBtn.style.color = "oklch(0.5 0 0)";
			removeBtn.style.background = "transparent";
		});

		container.addEventListener("mouseenter", () => {
			removeBtn.style.opacity = "1";
		});
		container.addEventListener("mouseleave", () => {
			removeBtn.style.opacity = "0";
		});

		container.appendChild(icon);
		container.appendChild(body);
		container.appendChild(removeBtn);
		wrapper.appendChild(container);
		return wrapper;
	}

	function createInstance() {
		if (instance) instance.cleanUp();

		const oldFile: FileContents = { name: file.name, contents: file.oldContents };
		const newFile: FileContents = { name: file.name, contents: file.newContents };

		instance = new FileDiffComponent({
			theme: { dark: "pierre-dark", light: "pierre-light" },
			themeType: "dark",
			diffStyle: "split",
			enableGutterUtility: true,
			hunkSeparators: "line-info",
			onGutterUtilityClick(range: SelectedLineRange) {
				onRequestAnnotation(
					file.name,
					range.side as "additions" | "deletions",
					range.start,
					range.end,
				);
			},
			renderAnnotation,
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
		void pending;
		instance.setLineAnnotations(buildLineAnnotations());
		instance.rerender();
	});

	onMount(createInstance);
	onDestroy(() => instance?.cleanUp());
</script>

<div class="border-border overflow-hidden rounded-lg border">
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
	<div class="diff-container" bind:this={containerEl}></div>
</div>

<style>
	.diff-container {
		--diffs-font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		--diffs-font-size: 13px;
		--diffs-line-height: 1.5;
		--diffs-tab-size: 2;
	}
</style>
