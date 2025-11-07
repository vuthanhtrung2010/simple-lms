<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';

	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { MultiSelect } from '$lib/components/ui/multi-select/index.js';
	import CourseSelector from '$lib/components/CourseSelector.svelte';

	import RatingDisplay from '$lib/components/RatingDisplay.svelte';

	import { ChevronLeft, ChevronRight, Shuffle, Filter } from '@lucide/svelte';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	const PROBLEMS_PER_PAGE = 50;

	type SortField = 'name' | 'category' | 'rating' | 'course' | 'points';
	type SortOrder = 'asc' | 'desc' | null;

	// State
	let filteredProblems = $state<typeof data.problems>(data.problems);
	let searchTerm = $state('');
	let types = $state<string[]>([]);
	let chosenCategory = $state('');
	let currentPage = $state(
		page.url.searchParams.get('page') ? parseInt(page.url.searchParams.get('page')!) : 1
	);
	let hideSolved = $state(false);
	let showTypes = $state(false);
	let sortField = $state<SortField | null>(null);
	let sortOrder = $state<SortOrder>(null);

	function handleSort(field: SortField) {
		if (sortField === field) {
			if (sortOrder === null) {
				sortOrder = 'asc';
			} else if (sortOrder === 'asc') {
				sortOrder = 'desc';
			} else {
				sortField = null;
				sortOrder = null;
			}
		} else {
			sortField = field;
			sortOrder = 'asc';
		}
	}

	function getSortIcon(field: SortField) {
		if (sortField !== field) return '↕';
		if (sortOrder === 'asc') return '↑';
		if (sortOrder === 'desc') return '↓';
		return '↕';
	}

	function getStatusIcon(status?: any) {
		if (!status) return { icon: '', color: 'text-muted-foreground' };
		if (status.solved) return { icon: '✓', color: 'text-green-600' };
		if (status.attempted) return { icon: '−', color: 'text-yellow-600' };
		return { icon: '', color: 'text-muted-foreground' };
	}

	$effect(() => {
		let filtered = data.problems;

		// Search filter
		if (searchTerm) {
			filtered = filtered.filter((problem: (typeof data.problems)[0]) =>
				problem.name.toLowerCase().includes(searchTerm.toLowerCase())
			);
		}

		// Hide solved problems filter
		if (hideSolved) {
			filtered = filtered.filter((problem: (typeof data.problems)[0]) => !problem.status?.solved);
		}

		// Category filter
		if (chosenCategory) {
			filtered = filtered.filter(
				(problem: (typeof data.problems)[0]) =>
					problem.category.toLowerCase() === chosenCategory.toLowerCase()
			);
		}

		// Types filter
		if (types.length > 0) {
			filtered = filtered.filter((problem: (typeof data.problems)[0]) =>
				problem.type.some((type: string) => types.includes(type))
			);
		}

		// Apply sorting
		if (sortField && sortOrder) {
			filtered = [...filtered].sort((a, b) => {
				let aValue: string | number;
				let bValue: string | number;

				switch (sortField) {
					case 'name':
						aValue = a.name.toLowerCase();
						bValue = b.name.toLowerCase();
						break;
					case 'category':
						aValue = a.category.toLowerCase();
						bValue = b.category.toLowerCase();
						break;
					case 'rating':
						aValue = Math.round(a.rating ?? 0);
						bValue = Math.round(b.rating ?? 0);
						break;
					case 'course':
						aValue = a.courseTitle?.toLowerCase() || '';
						bValue = b.courseTitle?.toLowerCase() || '';
						break;
					case 'points':
						aValue = a.points;
						bValue = b.points;
						break;
					default:
						return 0;
				}

				if (typeof aValue === 'string' && typeof bValue === 'string') {
					const comparison = aValue.localeCompare(bValue);
					return sortOrder === 'asc' ? comparison : -comparison;
				}

				if (typeof aValue === 'number' && typeof bValue === 'number') {
					const comparison = aValue - bValue;
					return sortOrder === 'asc' ? comparison : -comparison;
				}

				return 0;
			});
		}

		filteredProblems = filtered;
	});

	let totalPages = $derived(Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE));
	let startIndex = $derived((currentPage - 1) * PROBLEMS_PER_PAGE);
	let endIndex = $derived(startIndex + PROBLEMS_PER_PAGE);
	let currentProblems = $derived(filteredProblems.slice(startIndex, endIndex));

	function getTypeDisplay(types: string[]) {
		if (types.length === 0) return '-';
		return types.join(', ');
	}

	function handleRandomProblem() {
		if (filteredProblems.length === 0) return;
		const randomIndex = Math.floor(Math.random() * filteredProblems.length);
		const randomProblem = filteredProblems[randomIndex];
		window.open(`/course/${randomProblem.courseId}/problem/${randomProblem.id}`, '_blank');
	}

	function handleCourseChange(courseId: string | null) {
		const url = new URL(window.location.href);
		if (courseId === 'all' || courseId === null) {
			url.searchParams.set('course', 'all');
		} else {
			url.searchParams.set('course', courseId);
		}
		goto(url.toString());
	}
</script>

<main class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<div class="mb-3 flex items-center justify-between">
			<h1 class="text-3xl font-semibold">{m['problemsPage.title']()}</h1>
		</div>
		<hr class="mb-6" />

		<!-- Filters -->
		<Card class="mb-8 rounded-2xl border border-border bg-card shadow-sm">
			<CardHeader class="border-b pb-5">
				<div class="flex flex-col gap-1">
					<CardTitle class="flex items-center gap-2 text-lg font-semibold">
						<Filter class="h-5 w-5 text-primary" />
						{m['problemsPage.filters.title']()}
					</CardTitle>
					<p class="text-sm text-muted-foreground">{m['problemsPage.filters.description']()}</p>
				</div>
			</CardHeader>

			<CardContent class="space-y-6">
				<!-- Top Row -->
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					<!-- Search -->
					<div class="flex flex-col gap-2">
						<Label for="search" class="text-sm font-medium">
							{m['problemsPage.search.label']()}
						</Label>
						<div class="relative flex-1">
							<Input
								id="search"
								type="text"
								placeholder={m['problemsPage.search.placeholder']()}
								bind:value={searchTerm}
							/>
						</div>
					</div>

					<!-- Category -->
					<div class="flex flex-col gap-2">
						<Label for="category" class="text-sm font-medium">
							{m['problemsPage.filters.category.label']()}
						</Label>
						<div class="flex gap-2">
							<Select.Root type="single">
								<Select.Trigger class="w-full">
									{chosenCategory || m['problemsPage.filters.category.placeholder']()}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="" onclick={() => (chosenCategory = '')}
										>{m['problemsPage.filters.category.all']()}</Select.Item
									>
									{#each data.categories as category}
										<Select.Item value={category} onclick={() => (chosenCategory = category)}
											>{category}</Select.Item
										>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<!-- Types -->
					<div class="flex flex-col gap-2">
						<Label for="types" class="text-sm font-medium">
							{m['problemsPage.filters.types.label']()}
						</Label>
						<MultiSelect
							placeholder={m['problemsPage.filters.types.placeholder']()}
							options={data.types
								? data.types.map((type: string) => ({ label: type, value: type }))
								: []}
							onValueChange={(values: string[]) => (types = values)}
							defaultValue={types}
							hideSelectAll
							searchable
							autoSize={false}
							variant="default"
						/>
					</div>
				</div>

				<!-- Course Selector (if multiple courses) -->
				{#if data.hasMultipleCourses}
					<div class="border-t pt-4">
						<Label for="course" class="mb-2 block text-sm font-medium">
							{m['problemsPage.filters.course.label']()}
						</Label>
						<CourseSelector
							courses={data.courses}
							selectedCourseId={data.selectedCourseId}
							onchange={handleCourseChange}
							showAllOption={true}
						/>
					</div>
				{/if}

				<!-- Toggles -->
				<div class="space-y-4 border-t pt-4">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">
							{m['problemsPage.filters.toggles.hideSolved']()}
						</span>
						<button
							type="button"
							aria-label="Toggle hide solved"
							onclick={() => (hideSolved = !hideSolved)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {hideSolved
								? 'bg-primary'
								: 'bg-muted'}"
						>
							<span
								class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {hideSolved
									? 'translate-x-6'
									: 'translate-x-1'}"
							></span>
						</button>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-sm font-medium"
							>{m['problemsPage.filters.toggles.showProblemTypes']()}</span
						>
						<button
							type="button"
							aria-label="Toggle show problem types"
							onclick={() => (showTypes = !showTypes)}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {showTypes
								? 'bg-primary'
								: 'bg-muted'}"
						>
							<span
								class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {showTypes
									? 'translate-x-6'
									: 'translate-x-1'}"
							></span>
						</button>
					</div>
				</div>

				<!-- Random Problem Button -->
				<div class="border-t pt-4">
					<Button
						onclick={handleRandomProblem}
						disabled={filteredProblems.length === 0}
						class="w-full"
						variant="outline"
					>
						<Shuffle class="mr-2 h-4 w-4" />
						{m['problemsPage.actions.randomProblem']()}
						{#if filteredProblems.length > 0}
							<span class="ml-2 text-xs text-muted-foreground">
								({filteredProblems.length}
								{filteredProblems.length === 1 ? 'problem' : 'problems'})
							</span>
						{/if}
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Problems Table -->
	<div class="rounded-md border">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead>
					<tr class="border-b bg-gray-800 dark:bg-white">
						<th
							class="h-12 w-16 rounded-tl-md border-r border-gray-600 px-4 text-center align-middle font-medium text-white dark:border-gray-300 dark:text-gray-900"
						>
							{m['problemsPage.table.status']()}
						</th>
						<th
							class="h-12 cursor-pointer border-r border-gray-600 px-4 text-left align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
							onclick={() => handleSort('name')}
						>
							<div class="flex items-center gap-2">
								{m['problemsPage.table.name']()}
								<span class="text-xs">{getSortIcon('name')}</span>
							</div>
						</th>
						<th
							class="h-12 min-w-[200px] cursor-pointer border-r border-gray-600 px-4 text-left align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
							onclick={() => handleSort('category')}
						>
							<div class="flex items-center gap-2">
								{m['problemsPage.table.category']()}
								<span class="text-xs">{getSortIcon('category')}</span>
							</div>
						</th>
						<!-- Rating Column -->
						<th
							class="h-12 w-[8rem] cursor-pointer border-r border-gray-600 px-4 text-left align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
							onclick={() => handleSort('rating')}
						>
							<div class="flex items-center gap-2">
								{m['problemsPage.table.rating']()}
								<span class="text-xs">{getSortIcon('rating')}</span>
							</div>
						</th>
						{#if data.hasMultipleCourses && data.selectedCourseId === 'all'}
							<th
								class="h-12 min-w-[150px] cursor-pointer border-r border-gray-600 px-4 text-left align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
								onclick={() => handleSort('course')}
							>
								<div class="flex items-center gap-2">
									{m['problemsPage.table.course']()}
									<span class="text-xs">{getSortIcon('course')}</span>
								</div>
							</th>
						{/if}
						{#if showTypes}
							<th
								class="h-12 min-w-[150px] border-r border-gray-600 px-4 text-left align-middle font-medium text-white dark:border-gray-300 dark:text-gray-900"
							>
								{m['problemsPage.table.types']()}
							</th>
						{/if}
						<th
							class="h-12 w-[4.5rem] cursor-pointer rounded-tr-md border-gray-600 px-4 text-left align-middle font-medium text-white hover:bg-gray-700 dark:text-gray-900 dark:hover:bg-gray-100"
							onclick={() => handleSort('points')}
						>
							<div class="flex items-center gap-2">
								{m['problemsPage.table.points']()}
								<span class="text-xs">{getSortIcon('points')}</span>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					{#if currentProblems.length === 0}
						<tr>
							<td
								colspan={5 +
									(showTypes ? 1 : 0) +
									(data.hasMultipleCourses && data.selectedCourseId === 'all' ? 1 : 0)}
								class="px-4 py-8 text-center"
							>
								<p class="text-muted-foreground">{m['problemsPage.table.noProblems']()}</p>
								<p class="text-sm text-muted-foreground">
									{m['problemsPage.table.tryAdjustingFilters']()}
								</p>
							</td>
						</tr>
					{:else}
						{#each currentProblems as problem}
							<tr class="border-b hover:bg-muted/50">
								<td class="px-4 py-3 text-center">
									{#if problem.status}
										{@const statusInfo = getStatusIcon(problem.status)}
										<span class={statusInfo.color}>{statusInfo.icon}</span>
									{:else}
										<span class="text-muted-foreground">−</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									<a
										href="/course/{problem.courseId}/problem/{problem.id}"
										class="hover:text-primary hover:underline"
									>
										{problem.name}
									</a>
								</td>
								<td class="px-4 py-3">{problem.category}</td>
								<td class="px-4 py-3">
									<RatingDisplay rating={Math.round(problem.rating ?? 0)} showIcon={true} />
								</td>
								{#if data.hasMultipleCourses && data.selectedCourseId === 'all'}
									<td class="px-4 py-3">{problem.courseTitle}</td>
								{/if}
								{#if showTypes}
									<td class="px-4 py-3 text-sm text-muted-foreground">
										{getTypeDisplay(problem.type)}
									</td>
								{/if}
								<td class="px-4 py-3">{problem.points}</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="mt-6 flex items-center justify-center gap-2">
			<Button variant="outline" disabled={currentPage === 1} onclick={() => (currentPage -= 1)}>
				<ChevronLeft class="mr-2 h-4 w-4" />
				Previous
			</Button>

			<div class="flex items-center gap-2">
				<span>Page</span>
				<Input
					type="text"
					class="w-16 text-center"
					bind:value={currentPage}
					oninput={(e) => {
						const target = e.target as HTMLInputElement;
						const val = parseInt(target.value);
						if (!isNaN(val) && val >= 1 && val <= totalPages) {
							currentPage = val;
						}
					}}
				/>
				<span>of {totalPages}</span>
			</div>

			<Button
				variant="outline"
				disabled={currentPage === totalPages}
				onclick={() => (currentPage += 1)}
			>
				Next
				<ChevronRight class="ml-2 h-4 w-4" />
			</Button>
		</div>
	{/if}

	<!-- Additional Info -->
	{#if currentProblems.length > 0}
		<div class="mt-6 text-sm text-muted-foreground">
			<p>{m['problemsPage.results.clickForStatement']()}</p>
		</div>
	{/if}
</main>
