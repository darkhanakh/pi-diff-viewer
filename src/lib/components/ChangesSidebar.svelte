<script lang="ts">
	import type { DiffFile } from "$lib/types";
	import { getBasename, getDirname } from "$lib/file-icons";
	import FileIcon from "./FileIcon.svelte";

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

<div class="flex flex-col gap-3">
	<div>
		<h2 class="text-foreground text-sm font-semibold">Changes in Diff</h2>
		<p class="text-muted-foreground mt-0.5 text-xs">
			{files.length} file{files.length !== 1 ? "s" : ""}
			<span class="text-green-400">+{totalStats.added}</span>
			<span class="text-red-400">−{totalStats.removed}</span>
		</p>
	</div>

	<div class="flex flex-col gap-0.5">
		{#each files as file (file.name)}
			{@const stats = getStats(file)}
			{@const basename = getBasename(file.name)}
			{@const dirname = getDirname(file.name)}
			<button
				class="hover:bg-muted/60 flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
				onclick={() => onFileClick(file.name)}
				title={file.name}
			>
				<FileIcon filename={file.name} size={16} />
				<div class="min-w-0 flex-1">
					<div class="text-foreground/90 truncate text-xs font-medium">{basename}</div>
					{#if dirname}
						<div class="text-muted-foreground truncate text-[10px]">{dirname}</div>
					{/if}
				</div>
				<div class="flex shrink-0 items-center gap-1">
					{#if stats.added > 0}
						<span class="text-[10px] font-medium text-green-400">+{stats.added}</span>
					{/if}
					{#if stats.removed > 0}
						<span class="text-[10px] font-medium text-red-400">−{stats.removed}</span>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>
