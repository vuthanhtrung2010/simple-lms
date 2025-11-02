<script lang="ts">
	import { getRatingClass, getRatingTitle } from '$lib/rating.js';

	interface Props {
		rating: number;
		showIcon?: boolean;
		class?: string;
	}

	let { rating, showIcon = true, class: className = '' }: Props = $props();

	function RatingProgress(rating: number): number {
		const ratingLevels = [1000, 1300, 1600, 1900, 2400, 3000];
		const level = ratingLevels.findIndex((level) => rating < level);
		const actualLevel = level === -1 ? ratingLevels.length : level;

		if (actualLevel === ratingLevels.length) {
			return 1.0; // Max level
		}

		const prev = actualLevel === 0 ? 0 : ratingLevels[actualLevel - 1];
		const next = ratingLevels[actualLevel];

		return (rating - prev) / (next - prev);
	}

	let ratingClass = $derived(getRatingClass(rating));
	let ratingTitle = $derived(getRatingTitle(rating));
	let progress = $derived(RatingProgress(rating));
	let fillHeight = $derived(progress * 14); // Height of the fill area
	let startY = $derived(16 - fillHeight); // Start from bottom up
</script>

{#if rating && rating !== 0}
	<span class="rate-group {className}" title={ratingTitle}>
		{#if showIcon}
			{#if rating >= 3000}
				<svg class="rate-box rate-target" viewBox="0 0 16 16">
					<circle cx="8" cy="8" r="7" fill="white" stroke="#e74c3c" stroke-width="1"></circle>
					<circle cx="8" cy="8" r="3" fill="#e74c3c"></circle>
				</svg>
			{:else}
				<svg class="rate-box {ratingClass}" viewBox="0 0 16 16">
					<defs>
						<clipPath id="rating-clip-{rating}">
							<circle cx="8" cy="8" r="7" />
						</clipPath>
					</defs>
					<circle cx="8" cy="8" r="7"></circle>
					<path clip-path="url(#rating-clip-{rating})" d="M0 {startY}h16v{fillHeight}h-16z" />
				</svg>
			{/if}
		{/if}
		<span class="rating {ratingClass}">{rating}</span>
	</span>
{/if}

<style>
	/* Rating styles - should match the NextJS rating.css */
	.rate-group {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.rate-box {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.rating {
		font-weight: 600;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	/* Rating colors */
	.rate-admin {
		color: #e00;
	}

	.rate-target {
		color: #e00;
	}

	.rate-grandmaster {
		color: #e00;
	}

	.rate-master {
		color: #ffb100;
	}

	.rate-candidate-master {
		color: purple;
	}

	.rate-expert {
		color: blue;
	}

	.rate-amateur {
		color: #00a900;
	}

	.rate-newbie {
		color: #999;
	}
</style>
