<script lang="ts">
	import type { LayoutProps } from "./$types.js";
	const { children, data }: LayoutProps = $props();
</script>

{@render children?.()}
