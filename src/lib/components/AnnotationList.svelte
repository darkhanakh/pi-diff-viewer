<script lang="ts">
	import type { Annotation } from "$lib/types";

	type Props = {
		annotations: Annotation[];
		onRemove: (id: string) => void;
	};
	let { annotations, onRemove }: Props = $props();
</script>

{#if annotations.length > 0}
	<div class="border-neutral-700 bg-neutral-800/80 border-t backdrop-blur">
		<div class="flex items-center justify-between px-4 py-2">
			<span class="text-sm font-medium text-neutral-300">
				{annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
			</span>
		</div>
		<div class="max-h-48 overflow-y-auto">
			{#each annotations as annotation (annotation.id)}
				<div class="border-neutral-700/50 group flex items-start gap-3 border-t px-4 py-2">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2 text-xs">
							<span class="font-mono text-blue-400">{annotation.file}</span>
							<span class="text-neutral-500">
								{annotation.startLine === annotation.endLine
									? `L${annotation.startLine}`
									: `L${annotation.startLine}-${annotation.endLine}`}
							</span>
							<span class="rounded px-1 text-neutral-500 {annotation.side === 'additions' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}">
								{annotation.side === "additions" ? "new" : "old"}
							</span>
						</div>
						<p class="mt-0.5 text-sm text-neutral-300">{annotation.comment}</p>
					</div>
					<button
						onclick={() => onRemove(annotation.id)}
						class="text-neutral-500 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	</div>
{/if}
