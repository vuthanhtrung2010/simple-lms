<script lang="ts">
	const { children, data } = $props<{ children: () => unknown; data: App.PageData }>();
</script>

{@render children?.()}
