<script lang="ts">
	import { LineChart } from 'layerchart';
	import { curveLinearClosed } from 'd3-shape';
	import { scaleBand } from 'd3-scale';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { getRatingClass } from '$lib/rating.js';

	let { ratings = [] }: { ratings: Array<{ type: string; rating: number }> } = $props();

	// Transform ratings data for the radar chart
	const chartData = $derived(
		ratings.map((r) => ({
			type: r.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
			rating: Math.round(r.rating)
		}))
	);

	const chartConfig = {
		rating: {
			label: 'Rating',
			color: 'var(--chart-1)'
		}
	} satisfies Chart.ChartConfig;
</script>

{#if chartData.length > 0}
	<Chart.Container config={chartConfig} class="mx-auto aspect-square max-h-[350px]">
		<LineChart
			data={chartData}
			series={[
				{
					key: 'rating',
					label: 'Rating',
					color: chartConfig.rating.color
				}
			]}
			radial
			x="type"
			xScale={scaleBand()}
			points={{ r: 5 }}
			padding={40}
			props={{
				spline: {
					curve: curveLinearClosed,
					fill: 'var(--color-rating)',
					fillOpacity: 0.3,
					stroke: 'var(--color-rating)',
					strokeWidth: 2,
					motion: 'tween'
				},
				xAxis: {
					tickLength: 0
				},
				yAxis: {
					format: () => ''
				},
				grid: {
					radialY: 'linear'
				},
				tooltip: {
					context: {
						mode: 'voronoi'
					}
				},
				highlight: {
					lines: false,
					points: true
				}
			}}
		>
			{#snippet tooltip()}
				<Chart.Tooltip />
			{/snippet}
		</LineChart>
	</Chart.Container>

	<div class="mt-6 space-y-2">
		{#each chartData as { type, rating }}
			<div class="flex items-center justify-between border-b pb-2">
				<span class="font-medium">{type}</span>
				<span class={`text-lg font-bold ${getRatingClass(rating)}`}>
					{rating}
				</span>
			</div>
		{/each}
	</div>
{:else}
	<div class="flex h-[350px] items-center justify-center text-muted-foreground">
		No rating data available
	</div>
{/if}
