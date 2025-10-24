<script lang="ts">
	import { Motion, useMotionValue, useMotionTemplate } from 'svelte-motion';
	import { onMount, onDestroy } from 'svelte';
	import { cn } from '$lib/utils.js';

	// Props (same defaults as your React component)
	export let gradientSize: number = 200;
	export let gradientColor: string = '#262626';
	export let gradientOpacity: number = 0.8;
	export let gradientFrom: string = '#9E7AFF';
	export let gradientTo: string = '#FE8BBB';

	// keep React-like API: allow `class` to be passed in as `className`
	let className: string = '';
	export { className as class };

	let cardRef: HTMLDivElement | null = null;

	// Client-only motion values (initialized in onMount)
	let mouseX: any = null;
	let mouseY: any = null;
	let gradSize: any = null;
	let gradColor: any = null;
	let gradFrom: any = null;
	let gradTo: any = null;

	// Motion-template outputs (MotionValues after mount). Use string fallback for SSR.
	let bgBorder: any = ''; // will be replaced with a MotionTemplate on mount
	let bgOverlay: any = '';

	// mounted flag -> render Motion components only on client
	let mounted = false;

	// --- handlers (safe to declare on server; they only run on client) ---
	function handleMouseMove(e: MouseEvent) {
		if (!cardRef || !mouseX || !mouseY) return;
		const rect = cardRef.getBoundingClientRect();
		mouseX.set(e.clientX - rect.left);
		mouseY.set(e.clientY - rect.top);
	}

	function handleMouseOut(e: MouseEvent) {
		// mirror React logic: if leaving the document, remove global listener and reset
		if (!(e as any).relatedTarget) {
			if (typeof document !== 'undefined')
				document.removeEventListener('mousemove', handleMouseMove);
			mouseX?.set(-gradientSize);
			mouseY?.set(-gradientSize);
		}
	}

	function handleMouseEnter() {
		if (typeof document !== 'undefined') document.addEventListener('mousemove', handleMouseMove);
		mouseX?.set(-gradientSize);
		mouseY?.set(-gradientSize);
	}

	// --- client init ---
	onMount(() => {
		// create motion values only on the client (prevents SSR 'document' / hydratation issues)
		mouseX = useMotionValue(-gradientSize);
		mouseY = useMotionValue(-gradientSize);
		gradSize = useMotionValue(gradientSize);
		gradColor = useMotionValue(gradientColor);
		gradFrom = useMotionValue(gradientFrom);
		gradTo = useMotionValue(gradientTo);

		// now safe to create motion templates
		bgBorder = useMotionTemplate`
      radial-gradient(${gradSize}px circle at ${mouseX}px ${mouseY}px,
        ${gradFrom},
        ${gradTo},
        var(--border) 100%
      )
    `;

		bgOverlay = useMotionTemplate`
      radial-gradient(${gradSize}px circle at ${mouseX}px ${mouseY}px,
        ${gradColor},
        transparent 100%
      )
    `;

		// add the same global listeners as og React comp
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseout', handleMouseOut);
		document.addEventListener('mouseenter', handleMouseEnter);

		// Initialize pos
		mouseX.set(-gradientSize);
		mouseY.set(-gradientSize);

		mounted = true;

		return () => {
			// cleanup is also handled in onDestroy but returning here is fine too
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseout', handleMouseOut);
			document.removeEventListener('mouseenter', handleMouseEnter);
		};
	});

	onDestroy(() => {
		if (typeof document !== 'undefined') {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseout', handleMouseOut);
			document.removeEventListener('mouseenter', handleMouseEnter);
		}
	});

	// --- keep MotionValues in sync if props change at runtime (behaves like React useEffect) ---
	$: if (gradSize) gradSize.set(gradientSize);
	$: if (gradColor) gradColor.set(gradientColor);
	$: if (gradFrom) gradFrom.set(gradientFrom);
	$: if (gradTo) gradTo.set(gradientTo);

	// if gradientSize changes, reset the mouse coords like React did
	$: if (mouseX && mouseY) {
		mouseX.set(-gradientSize);
		mouseY.set(-gradientSize);
	}
</script>

<div
	role="presentation"
	bind:this={cardRef}
	class={cn('group relative rounded-[inherit]', className)}
>
	{#if mounted}
		<!-- 1. Outer gradient border glow (client-only) -->
		<Motion style={{ background: bgBorder }} let:motion>
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<div
				use:motion
				class="pointer-events-none absolute inset-0 rounded-[inherit] bg-border duration-300 group-hover:opacity-100"
			/>
		</Motion>
	{/if}

	<!-- 2. Inner solid background (SSR + client) -->
	<div class="absolute inset-px rounded-[inherit] bg-background"></div>

	{#if mounted}
		<!-- 3. Overlay radial highlight (client-only) -->
		<Motion style={{ background: bgOverlay, opacity: gradientOpacity }} let:motion>
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<div
				use:motion
				class="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
			/>
		</Motion>
	{/if}

	<!-- children slot -->
	<div class="relative">
		<slot />
	</div>
</div>

<style>
	/* keep same sizing helpers as your earlier example if needed */
</style>
