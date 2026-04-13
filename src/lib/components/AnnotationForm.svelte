<script lang="ts">
	type Props = {
		file: string;
		side: "additions" | "deletions";
		startLine: number;
		endLine: number;
		onSubmit: (comment: string) => void;
		onCancel: () => void;
	};
	let { file, side, startLine, endLine, onSubmit, onCancel }: Props = $props();

	let comment = $state("");
	let textareaEl: HTMLTextAreaElement;

	function handleSubmit() {
		const trimmed = comment.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		comment = "";
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === "Escape") {
			e.preventDefault();
			onCancel();
		}
	}

	$effect(() => {
		textareaEl?.focus();
	});

	const lineLabel = $derived(startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`);
	const sideLabel = $derived(side === "additions" ? "new" : "old");
</script>

<div class="border-neutral-700 bg-neutral-800/90 fixed right-6 bottom-24 z-50 w-96 rounded-lg border shadow-2xl backdrop-blur">
	<div class="border-neutral-700 flex items-center justify-between border-b px-4 py-2">
		<div class="flex items-center gap-2 text-sm">
			<span class="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-xs text-blue-400">{file}</span>
			<span class="text-neutral-400">{lineLabel}</span>
			<span class="text-neutral-500">({sideLabel})</span>
		</div>
		<button onclick={onCancel} class="text-neutral-400 transition-colors hover:text-white">
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
	<div class="p-3">
		<textarea
			bind:this={textareaEl}
			bind:value={comment}
			onkeydown={handleKeydown}
			placeholder="Write your annotation..."
			rows="3"
			class="border-neutral-600 bg-neutral-900 text-neutral-100 placeholder-neutral-500 focus:border-blue-500 w-full resize-none rounded border p-2 text-sm focus:outline-none"
		></textarea>
		<div class="mt-2 flex items-center justify-between">
			<span class="text-neutral-500 text-xs">⌘+Enter to submit · Esc to cancel</span>
			<div class="flex gap-2">
				<button
					onclick={onCancel}
					class="text-neutral-400 hover:bg-neutral-700 rounded px-3 py-1 text-sm transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleSubmit}
					disabled={!comment.trim()}
					class="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
				>
					Add
				</button>
			</div>
		</div>
	</div>
</div>
