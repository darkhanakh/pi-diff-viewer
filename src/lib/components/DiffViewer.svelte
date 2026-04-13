<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import {
		FileDiff as FileDiffComponent,
		type FileContents,
		type SelectedLineRange,
	} from "@pierre/diffs";
	import type { DiffFile, Annotation } from "$lib/types";
	import { Badge } from "$lib/components/ui/badge/index.js";

	type Props = {
		file: DiffFile;
		annotations: Annotation[];
		onAddAnnotation: (
			file: string,
			side: "additions" | "deletions",
			startLine: number,
			endLine: number,
		) => void;
	};
	let { file, annotations, onAddAnnotation }: Props = $props();

	let containerEl: HTMLDivElement;
	let instance: FileDiffComponent | null = null;

	const fileAnnotations = $derived(annotations.filter((a) => a.file === file.name));
	const addCount = $derived(file.newContents.split("\n").length - file.oldContents.split("\n").length);

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
				onAddAnnotation(
					file.name,
					range.side as "additions" | "deletions",
					range.start,
					range.end,
				);
			},
			renderAnnotation(annotation: { metadata: { id: string; comment: string } }) {
				const el = document.createElement("div");
				el.className = "annotation-bubble";
				el.innerHTML = `
					<div style="
						padding: 8px 12px;
						background: oklch(0.222 0 0);
						border: 1px solid oklch(0.265 0 0);
						border-radius: 6px;
						margin: 4px 8px;
						font-size: 13px;
						color: oklch(0.85 0 0);
						font-family: system-ui, sans-serif;
						line-height: 1.4;
					">
						<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
							<span style="
								display: inline-block;
								width: 6px; height: 6px;
								border-radius: 50%;
								background: oklch(0.7 0.15 250);
							"></span>
							<span style="font-size: 11px; color: oklch(0.556 0 0); font-weight: 500;">annotation</span>
						</div>
						<span>${annotation.metadata.comment}</span>
					</div>
				`;
				return el;
			},
		});

		instance.render({
			oldFile,
			newFile,
			lineAnnotations: fileAnnotations.map((a) => ({
				side: a.side,
				lineNumber: a.startLine,
				metadata: { id: a.id, comment: a.comment },
			})),
			containerWrapper: containerEl,
		});
	}

	$effect(() => {
		if (!instance) return;
		// Re-sync annotations
		void fileAnnotations;
		instance.setLineAnnotations(
			fileAnnotations.map((a) => ({
				side: a.side,
				lineNumber: a.startLine,
				metadata: { id: a.id, comment: a.comment },
			})),
		);
		instance.rerender();
	});

	onMount(createInstance);
	onDestroy(() => instance?.cleanUp());
</script>

<div class="border-border overflow-hidden rounded-lg border">
	<!-- File header -->
	<div class="bg-card border-border flex items-center gap-3 border-b px-4 py-2">
		<span class="font-mono text-sm text-foreground/80">{file.name}</span>
		{#if addCount > 0}
			<Badge variant="outline" class="border-green-500/30 bg-green-500/10 text-xs text-green-400">
				+{addCount}
			</Badge>
		{:else if addCount < 0}
			<Badge variant="outline" class="border-red-500/30 bg-red-500/10 text-xs text-red-400">
				{addCount}
			</Badge>
		{/if}
		{#if fileAnnotations.length > 0}
			<Badge variant="secondary" class="text-xs">
				{fileAnnotations.length} comment{fileAnnotations.length !== 1 ? "s" : ""}
			</Badge>
		{/if}
	</div>
	<!-- Diff body -->
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
