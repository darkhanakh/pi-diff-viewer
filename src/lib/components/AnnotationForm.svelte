<script lang="ts">
	import { Button } from "$lib/components/ui/button/index.js";
	import { Textarea } from "$lib/components/ui/textarea/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";

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
	let textareaEl: HTMLTextAreaElement | undefined = $state();

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

	const lineLabel = $derived(
		startLine === endLine ? `L${startLine}` : `L${startLine}-${endLine}`,
	);
</script>

<div class="bg-card border-border fixed right-6 bottom-20 z-50 w-[420px] rounded-lg border shadow-2xl">
	<div class="border-border flex items-center gap-2 border-b px-4 py-2.5">
		<span class="text-muted-foreground text-xs font-medium">Add comment</span>
		<Badge variant="outline" class="font-mono text-[11px]">{file}</Badge>
		<Badge variant="secondary" class="text-[11px]">{lineLabel}</Badge>
		<Badge
			variant="outline"
			class="text-[11px] {side === 'additions'
				? 'border-green-500/30 bg-green-500/10 text-green-400'
				: 'border-red-500/30 bg-red-500/10 text-red-400'}"
		>
			{side === "additions" ? "new" : "old"}
		</Badge>
		<button
			onclick={onCancel}
			aria-label="Close"
			class="text-muted-foreground hover:text-foreground ml-auto transition-colors"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
	<div class="p-3">
		<Textarea
			bind:ref={textareaEl}
			bind:value={comment}
			onkeydown={handleKeydown}
			placeholder="Write your annotation..."
			rows={3}
			class="bg-background resize-none text-sm"
		/>
		<div class="mt-2.5 flex items-center justify-between">
			<span class="text-muted-foreground text-[11px]">⌘↵ submit · esc cancel</span>
			<div class="flex gap-2">
				<Button variant="ghost" size="sm" onclick={onCancel}>Cancel</Button>
				<Button size="sm" onclick={handleSubmit} disabled={!comment.trim()}>Add</Button>
			</div>
		</div>
	</div>
</div>
