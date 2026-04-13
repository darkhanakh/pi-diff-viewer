<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import DiffViewer from "$lib/components/DiffViewer.svelte";
	import AnnotationForm from "$lib/components/AnnotationForm.svelte";
	import AnnotationList from "$lib/components/AnnotationList.svelte";
	import { connect, disconnect, getState, submitReview } from "$lib/ws.svelte";
	import type { Annotation } from "$lib/types";

	const wsState = getState();
	let annotations = $state<Annotation[]>([]);

	// Pending annotation form state
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

	onMount(() => {
		connect();
	});

	onDestroy(() => {
		disconnect();
	});
</script>

<div class="flex h-screen flex-col bg-neutral-900 text-neutral-100">
	<!-- Header -->
	<header class="border-neutral-700 flex items-center justify-between border-b px-4 py-2">
		<div class="flex items-center gap-3">
			<h1 class="text-sm font-semibold tracking-tight">pi review</h1>
			{#if wsState.connected}
				<span class="flex items-center gap-1 text-xs text-green-400">
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-green-400"></span>
					connected
				</span>
			{:else}
				<span class="flex items-center gap-1 text-xs text-red-400">
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-red-400"></span>
					disconnected
				</span>
			{/if}
			{#if wsState.diffPayload}
				<span class="text-xs text-neutral-500">
					{wsState.diffPayload.files.length} file{wsState.diffPayload.files.length !== 1 ? "s" : ""} changed
				</span>
			{/if}
		</div>
		<button
			onclick={handleSubmitReview}
			disabled={annotations.length === 0}
			class="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
		>
			Submit Review ({annotations.length})
		</button>
	</header>

	<!-- Main content -->
	<main class="flex-1 overflow-y-auto">
		{#if wsState.error}
			<div class="flex h-full items-center justify-center">
				<p class="text-red-400">{wsState.error}</p>
			</div>
		{:else if !wsState.diffPayload}
			<div class="flex h-full items-center justify-center">
				<div class="flex flex-col items-center gap-2">
					<div class="border-neutral-600 h-6 w-6 animate-spin rounded-full border-2 border-t-blue-400"></div>
					<p class="text-sm text-neutral-400">Waiting for diff data...</p>
				</div>
			</div>
		{:else if wsState.diffPayload.files.length === 0}
			<div class="flex h-full items-center justify-center">
				<p class="text-neutral-400">No changes to review</p>
			</div>
		{:else}
			<div class="space-y-1 p-4">
				{#each wsState.diffPayload.files as file (file.name)}
					<DiffViewer {file} {annotations} onAddAnnotation={handleAddAnnotation} />
				{/each}
			</div>
		{/if}
	</main>

	<!-- Annotation list -->
	<AnnotationList {annotations} onRemove={handleRemoveAnnotation} />

	<!-- Annotation form -->
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
