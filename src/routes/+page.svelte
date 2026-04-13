<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import DiffViewer from "$lib/components/DiffViewer.svelte";
	import AnnotationForm from "$lib/components/AnnotationForm.svelte";
	import AnnotationList from "$lib/components/AnnotationList.svelte";
	import ChangesSidebar from "$lib/components/ChangesSidebar.svelte";
	import { connect, disconnect, getState, submitReview } from "$lib/ws.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import type { Annotation } from "$lib/types";

	const wsState = getState();
	let annotations = $state<Annotation[]>([]);

	let pendingAnnotation = $state<{
		file: string;
		side: "additions" | "deletions";
		startLine: number;
		endLine: number;
	} | null>(null);

	function handleAddAnnotation(
		file: string,
		side: "additions" | "deletions",
		startLine: number,
		endLine: number,
	) {
		pendingAnnotation = { file, side, startLine, endLine };
	}

	function handleAnnotationSubmit(comment: string) {
		if (!pendingAnnotation) return;
		annotations = [
			...annotations,
			{
				id: crypto.randomUUID(),
				file: pendingAnnotation.file,
				side: pendingAnnotation.side,
				startLine: pendingAnnotation.startLine,
				endLine: pendingAnnotation.endLine,
				comment,
			},
		];
		pendingAnnotation = null;
	}

	function handleAnnotationCancel() {
		pendingAnnotation = null;
	}

	function handleRemoveAnnotation(id: string) {
		annotations = annotations.filter((a) => a.id !== id);
	}

	function handleSubmitReview() {
		if (annotations.length === 0) return;
		submitReview(annotations);
	}

	function scrollToFile(fileName: string) {
		const el = document.getElementById(`file-${fileName}`);
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	onMount(connect);
	onDestroy(disconnect);
</script>

<div class="bg-background flex h-screen flex-col">
	<!-- Top bar -->
	<header class="border-border bg-card flex items-center justify-between border-b px-4 py-2">
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-2">
				<svg class="text-primary h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
				</svg>
				<h1 class="text-foreground text-sm font-semibold">pi review</h1>
			</div>
			<Separator orientation="vertical" class="!h-4" />
			{#if wsState.connected}
				<span class="flex items-center gap-1.5 text-xs text-green-400">
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-green-400"></span>
					connected
				</span>
			{:else}
				<span class="flex items-center gap-1.5 text-xs text-red-400">
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400"></span>
					disconnected
				</span>
			{/if}
			{#if wsState.diffPayload}
				<span class="text-muted-foreground text-xs">
					{wsState.diffPayload.files.length} file{wsState.diffPayload.files.length !== 1 ? "s" : ""} changed
				</span>
			{/if}
		</div>
		<Button size="sm" onclick={handleSubmitReview} disabled={annotations.length === 0}>
			<svg class="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
			</svg>
			Submit Review ({annotations.length})
		</Button>
	</header>

	<!-- Main layout -->
	<div class="flex min-h-0 flex-1">
		<!-- Diff panel -->
		<main class="flex-1 overflow-y-auto">
			{#if wsState.error}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<svg class="text-destructive mx-auto mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
						</svg>
						<p class="text-destructive text-sm">{wsState.error}</p>
					</div>
				</div>
			{:else if !wsState.diffPayload}
				<div class="flex h-full items-center justify-center">
					<div class="flex flex-col items-center gap-3">
						<div class="border-muted-foreground/30 h-6 w-6 animate-spin rounded-full border-2 border-t-foreground"></div>
						<p class="text-muted-foreground text-sm">Waiting for diff data…</p>
					</div>
				</div>
			{:else if wsState.diffPayload.files.length === 0}
				<div class="flex h-full items-center justify-center">
					<div class="text-center">
						<svg class="text-muted-foreground mx-auto mb-2 h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-muted-foreground text-sm">No changes to review</p>
					</div>
				</div>
			{:else}
				<div class="space-y-4 p-4">
					{#each wsState.diffPayload.files as file (file.name)}
						<div id="file-{file.name}">
							<DiffViewer {file} {annotations} onAddAnnotation={handleAddAnnotation} />
						</div>
					{/each}
				</div>
			{/if}
		</main>

		<!-- Right sidebar -->
		<aside class="border-border bg-card hidden w-72 shrink-0 overflow-y-auto border-l p-4 xl:block">
			{#if wsState.diffPayload}
				<ChangesSidebar files={wsState.diffPayload.files} onFileClick={scrollToFile} />
				<Separator class="my-4" />
			{/if}
			<AnnotationList {annotations} onRemove={handleRemoveAnnotation} />
		</aside>
	</div>

	<!-- Annotation form (floating) -->
	{#if pendingAnnotation}
		<AnnotationForm
			file={pendingAnnotation.file}
			side={pendingAnnotation.side}
			startLine={pendingAnnotation.startLine}
			endLine={pendingAnnotation.endLine}
			onSubmit={handleAnnotationSubmit}
			onCancel={handleAnnotationCancel}
		/>
	{/if}
</div>
