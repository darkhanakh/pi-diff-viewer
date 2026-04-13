<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import DiffViewer from "$lib/components/DiffViewer.svelte";
	import AnnotationList from "$lib/components/AnnotationList.svelte";
	import ChangesSidebar from "$lib/components/ChangesSidebar.svelte";
	import { connect, disconnect, getState, submitReview } from "$lib/ws.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { type Annotation, type PendingAnnotation, formatAnnotationsAsPrompt } from "$lib/types";

	const wsState = getState();
	let annotations = $state<Annotation[]>([]);
	let pending = $state<PendingAnnotation | null>(null);
	let copied = $state(false);

	function handleRequestAnnotation(
		file: string,
		side: "additions" | "deletions",
		startLine: number,
		endLine: number,
	) {
		pending = { id: crypto.randomUUID(), file, side, startLine, endLine };
	}

	function handleSubmitAnnotation(id: string, comment: string) {
		if (!pending) return;
		annotations = [
			...annotations,
			{
				id,
				file: pending.file,
				side: pending.side,
				startLine: pending.startLine,
				endLine: pending.endLine,
				comment,
			},
		];
		pending = null;
	}

	function handleCancelAnnotation() {
		pending = null;
	}

	function handleRemoveAnnotation(id: string) {
		annotations = annotations.filter((a) => a.id !== id);
	}

	function handleSendToPi() {
		if (annotations.length === 0) return;
		submitReview(annotations);
	}

	async function handleCopyPrompt() {
		const prompt = formatAnnotationsAsPrompt(annotations);
		if (!prompt) return;
		await navigator.clipboard.writeText(prompt);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function scrollToFile(fileName: string) {
		const el = document.getElementById(`file-${fileName}`);
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	onMount(connect);
	onDestroy(disconnect);
</script>

<div class="bg-background flex h-screen flex-col">
	<!-- Header -->
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

		<!-- Action buttons -->
		<div class="flex items-center gap-2">
			<!-- Copy Prompt -->
			<Button
				variant="outline"
				size="sm"
				onclick={handleCopyPrompt}
				disabled={annotations.length === 0}
			>
				{#if copied}
					<svg class="mr-1 h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
					Copied!
				{:else}
					<svg class="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
					</svg>
					Export Prompt
				{/if}
			</Button>

			<!-- Send to Pi -->
			<Button size="sm" onclick={handleSendToPi} disabled={annotations.length === 0}>
				<svg class="mr-1 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
				</svg>
				Send to Pi ({annotations.length})
			</Button>
		</div>
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
							<DiffViewer
								{file}
								{annotations}
								{pending}
								onRequestAnnotation={handleRequestAnnotation}
								onSubmitAnnotation={handleSubmitAnnotation}
								onCancelAnnotation={handleCancelAnnotation}
								onRemoveAnnotation={handleRemoveAnnotation}
							/>
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
</div>
