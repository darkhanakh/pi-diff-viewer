<script lang="ts">
	import "./layout.css";

	let { children } = $props();
</script>

<svelte:head>
	<title>pi review</title>
</svelte:head>

<div class="dark">
	{@render children()}
</div>
