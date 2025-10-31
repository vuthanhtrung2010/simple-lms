<script lang="ts">
	import type { LayoutProps } from './$types.js';
	const { children }: LayoutProps = $props();
</script>

<div class="p-6">
	{@render children?.()}
</div>
