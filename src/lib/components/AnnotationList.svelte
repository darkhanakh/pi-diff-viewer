<script lang="ts">
	import type { Annotation } from "$lib/types";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";

	type Props = {
		annotations: Annotation[];
		onRemove: (id: string) => void;
	};
	let { annotations, onRemove }: Props = $props();

	const grouped = $derived.by(() => {
		const map = new Map<string, Annotation[]>();
		for (const a of annotations) {
			const list = map.get(a.file) ?? [];
			list.push(a);
			map.set(a.file, list);
		}
		return map;
	});
</script>

{#if annotations.length > 0}
	<div class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<h3 class="text-foreground text-sm font-medium">
				Annotations
				<span class="text-muted-foreground ml-1 text-xs">({annotations.length})</span>
			</h3>
		</div>

		{#each [...grouped.entries()] as [file, anns] (file)}
			<div class="space-y-1.5">
				<div class="flex items-center gap-2">
					<svg class="text-muted-foreground h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="font-mono text-xs text-foreground/70">{file}</span>
				</div>

				{#each anns.sort((a, b) => a.startLine - b.startLine) as annotation (annotation.id)}
					<div class="bg-muted/50 group flex items-start gap-2 rounded-md px-3 py-2">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-1.5">
								<Badge variant="outline" class="h-4 px-1 font-mono text-[10px]">
									{annotation.startLine === annotation.endLine
										? `L${annotation.startLine}`
										: `L${annotation.startLine}-${annotation.endLine}`}
								</Badge>
								<Badge
									variant="outline"
									class="h-4 px-1 text-[10px] {annotation.side === 'additions'
										? 'border-green-500/30 text-green-400'
										: 'border-red-500/30 text-red-400'}"
								>
									{annotation.side === "additions" ? "+" : "−"}
								</Badge>
							</div>
							<p class="text-foreground/80 mt-1 text-[13px] leading-snug">{annotation.comment}</p>
						</div>
						<Button
							variant="ghost"
							size="icon-xs"
							class="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100"
							onclick={() => onRemove(annotation.id)}
							aria-label="Remove annotation"
						>
							<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</Button>
					</div>
				{/each}
			</div>

			<Separator class="last:hidden" />
		{/each}
	</div>
{:else}
	<div class="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
		<svg class="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
		</svg>
		<p class="text-xs">Click the <kbd class="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">+</kbd> button on any line to add an annotation</p>
	</div>
{/if}
