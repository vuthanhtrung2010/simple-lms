<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { useTheme } from 'svelte-themes';

	interface ActivityHeatmapSubmission {
		timestamp: number;
	}

	interface ActivityHeatmapProps {
		submissions: ActivityHeatmapSubmission[];
	}

	interface ActivityData {
		[date: string]: number;
	}

	let { submissions }: ActivityHeatmapProps = $props();

	// State
	let activityData = $state<ActivityData>({});
	let currentYear = $state<number>(new Date().getFullYear());
	let maxCount = $state<number>(0);
	let mounted = $state(false);

	// Container ref for the component
	let containerRef: HTMLDivElement;
	let tooltipEl: HTMLDivElement | null = null;

	// Get theme
	const theme = useTheme();
	let isDarkMode = $derived(theme.resolvedTheme === 'dark');

	// Color mapping for activity levels - MUST MATCH EXACTLY
	const getActivityColor = (level: number, isDark: boolean) => {
		if (isDark) {
			// Dark mode colors
			const darkColors = ['#3b3b3b', '#0e4429', '#006d32', '#26a641', '#39d353'];
			return darkColors[level];
		} else {
			// Light mode colors
			const lightColors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
			return lightColors[level];
		}
	};

	onMount(() => {
		mounted = true;

		// Create tooltip element
		tooltipEl = document.createElement('div');
		tooltipEl.className = 'activity-tooltip';
		tooltipEl.style.cssText = `
			position: fixed;
			z-index: 1000;
			display: none;
			padding: 5px 8px;
			font-size: 12px;
			font-weight: normal;
			line-height: 1.5;
			color: #fff;
			text-align: center;
			background: rgba(0, 0, 0, 0.8);
			border-radius: 3px;
			pointer-events: none;
			white-space: nowrap;
		`;
		document.body.appendChild(tooltipEl);

		return () => {
			if (tooltipEl && tooltipEl.parentNode) {
				tooltipEl.parentNode.removeChild(tooltipEl);
			}
		};
	});

	// Process submissions to get activity data
	$effect(() => {
		const data: ActivityData = {};
		let max = 0;

		submissions.forEach((submission) => {
			const date = new Date(Number(submission.timestamp)).toISOString().split('T')[0];
			if (!data[date]) {
				data[date] = 0;
			}
			data[date]++;
			max = Math.max(max, data[date]);
		});

		activityData = data;
		maxCount = max;
	});

	// Calc visible year submissions total
	let visibleSubmissionsCount = $derived.by(() => {
		let total = 0;
		const isCurrentYear = currentYear === new Date().getFullYear();
		const startDate = isCurrentYear
			? new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate() + 1)
			: new Date(currentYear, 0, 1);
		const endDate = isCurrentYear ? new Date() : new Date(currentYear, 11, 31);

		Object.entries(activityData).forEach(([dateStr, count]) => {
			const submissionDate = new Date(dateStr);
			if (submissionDate >= startDate && submissionDate <= endDate) {
				total += count;
			}
		});

		return total;
	});

	// Generate calendar data and fill the table
	$effect(() => {
		if (!mounted || !containerRef || !activityData) return;

		const drawContribution = (year: number) => {
			// Clear all existing cells
			const table = document.getElementById('submission-activity-table');
			if (!table) return;

			table.querySelectorAll('td').forEach((el) => el.remove());

			// Update year display
			const yearSpan = document.getElementById('year');
			if (yearSpan) {
				yearSpan.setAttribute('data-year', year.toString());
			}

			// Show/hide prev/next year buttons
			const prevYearAction = document.getElementById('prev-year-action');
			const nextYearAction = document.getElementById('next-year-action');

			if (prevYearAction) {
				prevYearAction.style.display = year > new Date().getFullYear() - 5 ? '' : 'none';
			}

			if (nextYearAction) {
				nextYearAction.style.display = year < new Date().getFullYear() ? '' : 'none';
			}

			// Determine date range to display
			let startDate: Date, endDate: Date;
			const isCurrentYear = year === new Date().getFullYear();

			if (isCurrentYear) {
				endDate = new Date();
				startDate = new Date(endDate);
				startDate.setFullYear(startDate.getFullYear() - 1);
				startDate.setDate(startDate.getDate() + 1);

				if (yearSpan) {
					yearSpan.textContent = m['userPage.heatmap.pastYear']();
				}
			} else {
				startDate = new Date(year, 0, 1);
				endDate = new Date(year + 1, 0, 0);

				if (yearSpan) {
					yearSpan.textContent = year.toString();
				}
			}

			// Prepare days array
			const days: {
				date: Date;
				weekday: number;
				day_num: number;
				activity: number;
			}[] = [];

			for (
				let day = new Date(startDate), day_num = 1;
				day <= endDate;
				day.setDate(day.getDate() + 1), day_num++
			) {
				const isodate = day.toISOString().split('T')[0];
				days.push({
					date: new Date(day),
					weekday: day.getDay(),
					day_num,
					activity: activityData[isodate] || 0
				});
			}

			// Calculate sum of activity
			const sumActivity = days.reduce((sum, obj) => sum + obj.activity, 0);

			// Update total count display
			const totalCountSpan = document.getElementById('submission-total-count');
			if (totalCountSpan) {
				totalCountSpan.textContent = `${sumActivity} ${sumActivity === 1 ? m['userPage.heatmap.totalSubmission']() : m['userPage.heatmap.totalSubmissions']()}`;
			}

			// Update header text
			const headerElement = document.getElementById('submission-activity-header');
			if (headerElement) {
				if (isCurrentYear) {
					headerElement.textContent = `${sumActivity} ${sumActivity === 1 ? m['userPage.heatmap.submission']() : m['userPage.heatmap.submissions']()} ${m['userPage.heatmap.inLastYear']()}`;
				} else {
					headerElement.textContent = `${sumActivity} ${sumActivity === 1 ? m['userPage.heatmap.submission']() : m['userPage.heatmap.submissions']()} ${m['userPage.heatmap.inYear']({ year })}`;
				}
			}

			// Add blank cells for days before the first day
			for (let current_weekday = 0; current_weekday < days[0].weekday; current_weekday++) {
				const row = document.getElementById(`submission-${current_weekday}`);
				if (row) {
					const blankCell = document.createElement('td');
					blankCell.className = 'activity-blank';
					blankCell.style.cssText =
						'width: 12px; height: 12px; border-radius: 20%; padding: 0; box-sizing: border-box;';
					const div = document.createElement('div');
					div.style.cssText = 'width: 100%; height: 100%;';
					blankCell.appendChild(div);
					row.appendChild(blankCell);
				}
			}

			// Find maximum activity for scaling
			const maxActivity = Math.max(1, Math.max(...days.map((obj) => obj.activity)));

			// Check if dark mode is active
			const isDark = theme.resolvedTheme === 'dark';

			// Add activity cells
			days.forEach((obj) => {
				const level = Math.ceil((obj.activity / maxActivity) * 4);

				const formattedDate = obj.date.toLocaleDateString('en-US', {
					month: 'short',
					year: 'numeric',
					day: 'numeric'
				});

				const tooltipText = `${obj.activity} ${obj.activity === 1 ? m['userPage.heatmap.submission']() : m['userPage.heatmap.submissions']()} on ${formattedDate}`;

				const row = document.getElementById(`submission-${obj.weekday}`);
				if (row) {
					const cell = document.createElement('td');
					cell.className = `activity-label activity-${level}`;
					// Apply inline styles INCLUDING background color
					const bgColor = getActivityColor(level, isDark);
					cell.style.cssText = `width: 12px; height: 12px; border-radius: 20%; padding: 0; position: relative; box-sizing: border-box; background-color: ${bgColor};`;
					cell.setAttribute('data-submission-activity', tooltipText);
					cell.setAttribute('data-day', obj.day_num.toString());

					cell.addEventListener('mouseenter', function (e) {
						if (!tooltipEl) return;

						const rect = this.getBoundingClientRect();
						const dayNum = parseInt(this.getAttribute('data-day') || '0');

						tooltipEl.textContent = tooltipText;
						tooltipEl.style.display = 'block';

						// Position tooltip
						if (dayNum < 183) {
							// Show on right side (west)
							tooltipEl.style.left = `${rect.right + 10}px`;
							tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
							tooltipEl.style.transform = 'translateY(-50%)';
						} else {
							// Show on left side (east)
							tooltipEl.style.left = `${rect.left - tooltipEl.offsetWidth - 10}px`;
							tooltipEl.style.top = `${rect.top + rect.height / 2}px`;
							tooltipEl.style.transform = 'translateY(-50%)';
						}
					});

					cell.addEventListener('mouseleave', function () {
						if (tooltipEl) {
							tooltipEl.style.display = 'none';
						}
					});

					const div = document.createElement('div');
					// IMPORTANT: Make the inner div fill the cell completely
					div.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0;';
					cell.appendChild(div);

					row.appendChild(cell);
				}
			});
		};

		drawContribution(currentYear);
	});

	// Handle year change
	const handlePrevYear = () => {
		currentYear -= 1;
	};

	const handleNextYear = () => {
		const nextYear = currentYear + 1;
		if (nextYear <= new Date().getFullYear()) {
			currentYear = nextYear;
		}
	};
</script>

<div class="activity-heatmap" bind:this={containerRef}>
	<h4 id="submission-activity-header">
		{visibleSubmissionsCount}
		{visibleSubmissionsCount === 1
			? m['userPage.heatmap.submission']()
			: m['userPage.heatmap.submissions']()}
		{currentYear === new Date().getFullYear()
			? m['userPage.heatmap.inLastYear']()
			: m['userPage.heatmap.inYear']({ year: currentYear })}
	</h4>

	<div id="submission-activity" style="display: block;">
		<div id="submission-activity-actions">
			<button
				id="prev-year-action"
				onclick={handlePrevYear}
				style="display: {currentYear <= new Date().getFullYear() - 5 ? 'none' : ''};"
			>
				&laquo;
			</button>
			<span id="year" data-year={currentYear}>
				{currentYear === new Date().getFullYear() ? m['userPage.heatmap.pastYear']() : currentYear}
			</span>
			<button
				id="next-year-action"
				onclick={handleNextYear}
				style="display: {currentYear >= new Date().getFullYear() ? 'none' : ''};"
			>
				&raquo;
			</button>
		</div>

		<div id="submission-activity-display">
			<table id="submission-activity-table" class="submission-activity-table" cellspacing="1">
				<tbody>
					<tr id="submission-0">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.sun']()}</th>
					</tr>
					<tr id="submission-1">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.mon']()}</th>
					</tr>
					<tr id="submission-2">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.tue']()}</th>
					</tr>
					<tr id="submission-3">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.wed']()}</th>
					</tr>
					<tr id="submission-4">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.thu']()}</th>
					</tr>
					<tr id="submission-5">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.fri']()}</th>
					</tr>
					<tr id="submission-6">
						<th class="submission-date-col info-text">{m['userPage.heatmap.days.sat']()}</th>
					</tr>
				</tbody>
			</table>

			<div class="info-bar">
				<span id="submission-total-count" class="info-text">
					{visibleSubmissionsCount}
					{visibleSubmissionsCount === 1
						? m['userPage.heatmap.totalSubmission']()
						: m['userPage.heatmap.totalSubmissions']()}
				</span>
				<table class="info-table" cellspacing="1">
					<tbody>
						<tr>
							<th class="info-table-text info-text">{m['userPage.heatmap.legend.less']()}</th>
							<td class="activity-0" style="background-color: {getActivityColor(0, isDarkMode)};">
								<div></div>
							</td>
							<td class="activity-1" style="background-color: {getActivityColor(1, isDarkMode)};">
								<div></div>
							</td>
							<td class="activity-2" style="background-color: {getActivityColor(2, isDarkMode)};">
								<div></div>
							</td>
							<td class="activity-3" style="background-color: {getActivityColor(3, isDarkMode)};">
								<div></div>
							</td>
							<td class="activity-4" style="background-color: {getActivityColor(4, isDarkMode)};">
								<div></div>
							</td>
							<th class="info-table-text info-text">{m['userPage.heatmap.legend.more']()}</th>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>

<style>
	.activity-heatmap {
		position: relative;
		margin: 0.75rem 0;
	}

	#submission-activity-display {
		border: 1px solid var(--border);
		border-radius: 4px;
		position: relative;
		overflow-x: auto;
	}

	#submission-activity-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}

	#submission-activity-actions button {
		background: none;
		border: none;
		color: var(--primary);
		cursor: pointer;
		font-size: 1rem;
		padding: 0.25rem 0.5rem;
	}

	#submission-activity-actions button:hover {
		text-decoration: underline;
	}

	#year {
		font-weight: 800;
		min-width: 50px;
		text-align: center;
	}

	.submission-activity-table {
		width: 100%;
		padding: 5px;
		border-spacing: 1px;
		border-collapse: separate;
	}

	.submission-date-col {
		width: 8%;
		text-align: right;
		padding-right: 0.5rem;
		font-weight: normal;
		font-size: 0.75rem;
	}

	/* Info bar */
	.info-bar {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
		padding: 0 5px 5px 5px;
		align-items: center;
	}

	.info-text {
		font-size: 0.75rem;
		line-height: 1;
		font-weight: 100;
		color: var(--muted-foreground);
	}

	.info-table {
		width: 15%;
		min-width: 130px;
		border-spacing: 1px;
		border-collapse: separate;
		margin-left: auto;
	}

	.info-table .info-table-text {
		min-width: 25px;
		font-weight: normal;
		font-size: 0.75rem;
		line-height: 1;
		color: var(--muted-foreground);
		text-align: center;
		padding: 0 0.25rem;
		white-space: nowrap;
	}

	.info-table td {
		border-radius: 20%;
		padding: 0;
		width: 12px;
		height: 12px;
		box-sizing: content-box;
		min-width: 12px;
		max-width: 12px;
	}

	.info-table td div {
		margin-top: 100%;
		width: 12px;
		height: 0;
	}

	#submission-total-count {
		align-self: center;
		padding-left: 8%;
		font-size: 0.85em;
	}

	/* Mobile responsiveness */
	@media (max-width: 1000px) {
		.submission-activity-table {
			min-width: 650px;
		}

		.submission-activity-table th.submission-date-col {
			display: none;
		}

		#submission-total-count {
			padding-left: 5px;
		}
	}
</style>
