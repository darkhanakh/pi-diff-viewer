<script lang="ts">
	import { getAnnotations, removeAnnotation } from "$lib/annotations.svelte";
	import { getBasename } from "$lib/file-icons";
	import FileIcon from "./FileIcon.svelte";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";

	const store = getAnnotations();

	const grouped = $derived.by(() => {
		const map = new Map<string, typeof store.list>();
		for (const a of store.list) {
			const list = map.get(a.file) ?? [];
			list.push(a);
			map.set(a.file, list);
		}
		return map;
	});

	function scrollToFile(fileName: string) {
		const el = document.getElementById(`file-${fileName}`);
		el?.scrollIntoView({ behavior: "smooth", block: "start" });
	}
</script>

{#if store.count > 0}
	<div class="flex flex-col gap-3">
		<h3 class="text-foreground text-sm font-medium">
			Annotations <span class="text-muted-foreground ml-1 text-xs">({store.count})</span>
		</h3>

		{#each [...grouped.entries()] as [file, anns] (file)}
			<div class="space-y-1">
				<button
					class="hover:bg-muted/40 flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors"
					onclick={() => scrollToFile(file)}
					title={file}
				>
					<FileIcon filename={file} size={14} />
					<span class="text-foreground/70 truncate font-mono text-[11px]">{getBasename(file)}</span>
				</button>

				{#each anns.sort((a, b) => a.startLine - b.startLine) as annotation (annotation.id)}
					<div
						role="button"
						tabindex="0"
						class="bg-muted/40 hover:bg-muted/70 group flex w-full cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors"
						onclick={() => scrollToFile(annotation.file)}
						onkeydown={(e) => { if (e.key === "Enter") scrollToFile(annotation.file); }}
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-1.5">
								<Badge variant="outline" class="h-4 px-1 font-mono text-[10px]">L{annotation.startLine}</Badge>
								<Badge variant="outline" class="h-4 px-1 text-[10px] {annotation.side === 'additions' ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}">
									{annotation.side === "additions" ? "+" : "−"}
								</Badge>
							</div>
							<p class="text-foreground/80 mt-1 text-[12px] leading-snug">{annotation.comment}</p>
						</div>
						<button
							class="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
							onclick={(e) => { e.stopPropagation(); removeAnnotation(annotation.id); }}
							aria-label="Remove annotation"
						>
							<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				{/each}
			</div>
			<Separator class="last:hidden" />
		{/each}
	</div>
{:else}
	<div class="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
		<svg class="h-7 w-7 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
		</svg>
		<p class="text-[11px]">Click any line number to annotate</p>
	</div>
{/if}
