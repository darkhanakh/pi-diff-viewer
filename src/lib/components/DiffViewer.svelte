<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { FileDiff as FileDiffComponent, type FileContents, type SelectedLineRange } from "@pierre/diffs";
	import type { DiffFile, Annotation } from "$lib/types";

	type Props = {
		file: DiffFile;
		annotations: Annotation[];
		onAddAnnotation: (file: string, side: "additions" | "deletions", startLine: number, endLine: number) => void;
	};
	let { file, annotations, onAddAnnotation }: Props = $props();

	let containerEl: HTMLDivElement;
	let instance: FileDiffComponent | null = null;

	let oldFile: FileContents;
	let newFile: FileContents;

	function createInstance() {
		if (instance) {
			instance.cleanUp();
		}

		oldFile = { name: file.name, contents: file.oldContents };
		newFile = { name: file.name, contents: file.newContents };

		instance = new FileDiffComponent({
			theme: { dark: "pierre-dark", light: "pierre-light" },
			diffStyle: "split",
			enableGutterUtility: true,
			onGutterUtilityClick(range: SelectedLineRange) {
				onAddAnnotation(
					file.name,
					range.side as "additions" | "deletions",
					range.start,
					range.end,
				);
			},
		});

		instance.render({
			oldFile,
			newFile,
			lineAnnotations: annotations
				.filter((a) => a.file === file.name)
				.map((a) => ({
					side: a.side,
					lineNumber: a.startLine,
					metadata: { id: a.id, comment: a.comment },
				})),
			containerWrapper: containerEl,
		});
	}

	$effect(() => {
		if (!containerEl || !instance) return;

		const fileAnnotations = annotations.filter((a) => a.file === file.name);
		instance.setLineAnnotations(
			fileAnnotations.map((a) => ({
				side: a.side,
				lineNumber: a.startLine,
				metadata: { id: a.id, comment: a.comment },
			})),
		);
		instance.rerender();
	});

	onMount(() => {
		createInstance();
	});

	onDestroy(() => {
		if (instance) {
			instance.cleanUp();
			instance = null;
		}
	});
</script>

<div class="diff-container" bind:this={containerEl}></div>

<style>
	.diff-container {
		--diffs-font-family: "Berkeley Mono", "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		--diffs-font-size: 13px;
		--diffs-line-height: 1.5;
		--diffs-tab-size: 2;
	}

	.diff-container :global(pierre-file-diff) {
		display: block;
	}
</style>
