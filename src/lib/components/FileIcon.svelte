<script lang="ts">
	import { getFileIcon } from "$lib/file-icons";

	type Props = { filename: string; size?: number };
	let { filename, size = 16 }: Props = $props();

	const icon = $derived(getFileIcon(filename));
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
	<!-- File shape -->
	<path
		d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
		fill={icon.color}
		opacity="0.15"
		stroke={icon.color}
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path d="M14 2v6h6" stroke={icon.color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
	<!-- Label -->
	<text
		x="12"
		y="17.5"
		text-anchor="middle"
		font-size="6.5"
		font-weight="700"
		font-family="system-ui, sans-serif"
		fill={icon.color}
	>
		{icon.label}
	</text>
</svg>
