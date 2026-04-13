<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import DiffViewer from "$lib/components/DiffViewer.svelte";
	import AnnotationList from "$lib/components/AnnotationList.svelte";
	import ChangesSidebar from "$lib/components/ChangesSidebar.svelte";
	import { connect, disconnect, getState, submitReview } from "$lib/ws.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { type Annotation, formatAnnotationsAsPrompt } from "$lib/types";

	const wsState = getState();
	let annotations = $state<Annotation[]>([]);
	let copied = $state(false);

	function handleAnnotationAdd(annotation: Annotation) {
		annotations = [...annotations, annotation];
	}

	function handleAnnotationRemove(id: string) {
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
	<header class="border-border bg-card/80 flex items-center justify-between border-b px-4 py-2 backdrop-blur">
		<div class="flex items-center gap-3">
			<h1 class="text-foreground/90 text-sm font-semibold tracking-tight">pi review</h1>
			<Separator orientation="vertical" class="!h-4" />
			{#if wsState.connected}
				<span class="flex items-center gap-1.5 text-xs text-emerald-400">
					<span class="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
					connected
				</span>
			{:else}
				<span class="text-muted-foreground flex items-center gap-1.5 text-xs">
					<span class="bg-muted-foreground inline-block h-1.5 w-1.5 rounded-full"></span>
					disconnected
				</span>
			{/if}
			{#if wsState.diffPayload}
				<span class="text-muted-foreground text-xs">
					{wsState.diffPayload.files.length} file{wsState.diffPayload.files.length !== 1 ? "s" : ""}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" size="sm" onclick={handleCopyPrompt} disabled={annotations.length === 0} class="text-xs">
				{#if copied}
					<svg class="mr-1.5 h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
					Copied
				{:else}
					<svg class="mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
					Copy Prompt
				{/if}
			</Button>
			<Button size="sm" onclick={handleSendToPi} disabled={annotations.length === 0} class="bg-emerald-600 text-xs text-white hover:bg-emerald-500">
				<svg class="mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
				Send to Pi{annotations.length > 0 ? ` (${annotations.length})` : ""}
			</Button>
		</div>
	</header>

	<div class="flex min-h-0 flex-1">
		<main class="flex-1 overflow-y-auto">
			{#if wsState.error}
				<div class="flex h-full items-center justify-center">
					<p class="text-destructive text-sm">{wsState.error}</p>
				</div>
			{:else if !wsState.diffPayload}
				<div class="flex h-full items-center justify-center">
					<div class="flex flex-col items-center gap-3">
						<div class="border-muted h-5 w-5 animate-spin rounded-full border-2 border-t-foreground"></div>
						<p class="text-muted-foreground text-xs">Waiting for diff data…</p>
					</div>
				</div>
			{:else if wsState.diffPayload.files.length === 0}
				<div class="flex h-full items-center justify-center">
					<p class="text-muted-foreground text-sm">No changes to review</p>
				</div>
			{:else}
				<div class="space-y-3 p-4">
					{#each wsState.diffPayload.files as file (file.name)}
						<div id="file-{file.name}">
							<DiffViewer
								{file}
								{annotations}
								onAnnotationAdd={handleAnnotationAdd}
								onAnnotationRemove={handleAnnotationRemove}
							/>
						</div>
					{/each}
				</div>
			{/if}
		</main>

		<aside class="border-border bg-card hidden w-64 shrink-0 overflow-y-auto border-l p-4 xl:block">
			{#if wsState.diffPayload}
				<ChangesSidebar files={wsState.diffPayload.files} onFileClick={scrollToFile} />
				<Separator class="my-4" />
			{/if}
			<AnnotationList {annotations} onRemove={handleAnnotationRemove} />
		</aside>
	</div>
</div>
