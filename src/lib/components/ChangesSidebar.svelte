<script lang="ts">
	import type { DiffFile } from "$lib/types";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";

	type Props = {
		files: DiffFile[];
		onFileClick: (fileName: string) => void;
	};
	let { files, onFileClick }: Props = $props();

	function getStats(file: DiffFile) {
		const oldLines = file.oldContents.split("\n").length;
		const newLines = file.newContents.split("\n").length;
		const added = Math.max(0, newLines - oldLines);
		const removed = Math.max(0, oldLines - newLines);
		return { added, removed };
	}

	const totalStats = $derived.by(() => {
		let added = 0;
		let removed = 0;
		for (const f of files) {
			const s = getStats(f);
			added += s.added;
			removed += s.removed;
		}
		return { added, removed };
	});
</script>

<div class="flex flex-col gap-4">
	<div>
		<h2 class="text-foreground text-sm font-semibold">Changes in Diff</h2>
		<p class="text-muted-foreground mt-0.5 text-xs">
			{files.length} file{files.length !== 1 ? "s" : ""}
			<span class="text-green-400">+{totalStats.added}</span>
			<span class="text-red-400">−{totalStats.removed}</span>
		</p>
	</div>

	<Separator />

	<div class="flex flex-col gap-1">
		{#each files as file (file.name)}
			{@const stats = getStats(file)}
			<button
				class="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
				onclick={() => onFileClick(file.name)}
			>
				<svg class="text-muted-foreground h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
				</svg>
				<span class="text-foreground/80 min-w-0 flex-1 truncate font-mono text-xs">{file.name}</span>
				<div class="flex items-center gap-1">
					{#if stats.added > 0}
						<span class="text-[10px] text-green-400">+{stats.added}</span>
					{/if}
					{#if stats.removed > 0}
						<span class="text-[10px] text-red-400">−{stats.removed}</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>
