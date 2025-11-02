<script lang="ts">
	import { getRatingClass } from '$lib/rating.js';

	interface Props {
		username: string;
		rating: number;
		class?: string;
	}

	let { username, rating, class: className = '' }: Props = $props();

	let ratingClass = $derived(getRatingClass(rating));
	let firstChar = $derived(username.charAt(0));
	let restChars = $derived(username.slice(1));
</script>

{#if rating >= 3000}
	<!-- Username với chữ cái đầu màu đỏ nhạt, phần còn lại màu đỏ như grandmaster (#e00) -->
	<span class={className}>
		<span style="color: #ff6b6b">{firstChar}</span>
		<span style="color: #e00">{restChars}</span>
	</span>
{:else}
	<span class="{ratingClass} {className}">{username}</span>
{/if}
