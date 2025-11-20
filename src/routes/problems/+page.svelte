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

	type SortField = 'name' | 'category' | 'rating' | 'course' | 'points';
	type SortOrder = 'asc' | 'desc' | null;

	// State - initialize from URL params
	let searchTerm = $state(data.filters.search);
	let types = $state<string[]>(data.filters.types);
	let chosenCategory = $state(data.filters.category);
	let currentPage = $state(data.pagination.currentPage);
	let hideSolved = $state(data.filters.hideSolved);
	let showTypes = $state(false);
	let sortField = $state<SortField | null>((data.filters.sortField as SortField) || null);
	let sortOrder = $state<SortOrder>((data.filters.sortOrder as SortOrder) || null);

	// Debounce timer
	let searchDebounceTimer: any = null;

	// Function to update URL and trigger server-side fetch
	function updateFilters(resetPage = true) {
		const url = new URL(window.location.href);

		if (resetPage) {
			url.searchParams.set('page', '1');
		} else {
			url.searchParams.set('page', String(currentPage));
		}

		if (searchTerm) {
			url.searchParams.set('search', searchTerm);
		} else {
			url.searchParams.delete('search');
		}

		if (chosenCategory) {
			url.searchParams.set('category', chosenCategory);
		} else {
			url.searchParams.delete('category');
		}

		if (types.length > 0) {
			url.searchParams.set('types', types.join(','));
		} else {
			url.searchParams.delete('types');
		}

		if (hideSolved) {
			url.searchParams.set('hideSolved', 'true');
		} else {
			url.searchParams.delete('hideSolved');
		}

		if (sortField && sortOrder) {
			url.searchParams.set('sortField', sortField);
			url.searchParams.set('sortOrder', sortOrder);
		} else {
			url.searchParams.delete('sortField');
			url.searchParams.delete('sortOrder');
		}

		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	// Debounced search
	function handleSearchInput() {
		if (searchDebounceTimer) {
			clearTimeout(searchDebounceTimer);
		}
		searchDebounceTimer = setTimeout(() => {
			updateFilters();
		}, 400);
	}

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
		updateFilters();
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

	function getTypeDisplay(types: string[]) {
		if (types.length === 0) return '-';
		return types.join(', ');
	}

	function handleRandomProblem() {
		if (data.problems.length === 0) return;
		const randomIndex = Math.floor(Math.random() * data.problems.length);
		const randomProblem = data.problems[randomIndex];
		window.open(`/course/${randomProblem.courseId}/problem/${randomProblem.id}`, '_blank');
	}

	function handleCourseChange(courseId: string | null) {
		const url = new URL(window.location.href);
		if (courseId === 'all' || courseId === null) {
			url.searchParams.set('course', 'all');
		} else {
			url.searchParams.set('course', courseId);
		}
		url.searchParams.set('page', '1'); // Reset to page 1 on course change
		goto(url.toString());
	}

	function goToPage(newPage: number) {
		currentPage = newPage;
		updateFilters(false);
	}
</script>

<main class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<div class="mb-3 flex items-center justify-between">
			<h1 class="text-3xl font-semibold">{m['problemsPage.title']()}</h1>
		</div>
		<hr class="mb-6" />

		<!-- Filters -->
		<Card class="border-border bg-card mb-8 rounded-2xl border shadow-sm">
			<CardHeader class="border-b pb-5">
				<div class="flex flex-col gap-1">
					<CardTitle class="flex items-center gap-2 text-lg font-semibold">
						<Filter class="text-primary h-5 w-5" />
						{m['problemsPage.filters.title']()}
					</CardTitle>
					<p class="text-muted-foreground text-sm">{m['problemsPage.filters.description']()}</p>
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
								oninput={handleSearchInput}
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
									<Select.Item
										value=""
										onclick={() => {
											chosenCategory = '';
											updateFilters();
										}}>{m['problemsPage.filters.category.all']()}</Select.Item
									>
									{#each data.categories as category}
										<Select.Item
											value={category}
											onclick={() => {
												chosenCategory = category;
												updateFilters();
											}}>{category}</Select.Item
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
							onValueChange={(values: string[]) => {
								types = values;
								updateFilters();
							}}
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
							onclick={() => {
								hideSolved = !hideSolved;
								updateFilters();
							}}
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
						disabled={data.problems.length === 0}
						class="w-full"
						variant="outline"
					>
						<Shuffle class="mr-2 h-4 w-4" />
						{m['problemsPage.actions.randomProblem']()}
						{#if data.pagination.totalProblems > 0}
							<span class="text-muted-foreground ml-2 text-xs">
								({data.pagination.totalProblems}
								{data.pagination.totalProblems === 1 ? 'problem' : 'problems'})
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
					{#if data.problems.length === 0}
						<tr>
							<td
								colspan={5 +
									(showTypes ? 1 : 0) +
									(data.hasMultipleCourses && data.selectedCourseId === 'all' ? 1 : 0)}
								class="px-4 py-8 text-center"
							>
								<p class="text-muted-foreground">{m['problemsPage.table.noProblems']()}</p>
								<p class="text-muted-foreground text-sm">
									{m['problemsPage.table.tryAdjustingFilters']()}
								</p>
							</td>
						</tr>
					{:else}
						{#each data.problems as problem}
							<tr class="hover:bg-muted/50 border-b">
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
									<td class="text-muted-foreground px-4 py-3 text-sm">
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
	{#if data.pagination.totalPages > 1}
		<div class="mt-6 flex items-center justify-center gap-2">
			<Button
				variant="outline"
				disabled={data.pagination.currentPage === 1}
				onclick={() => goToPage(data.pagination.currentPage - 1)}
			>
				<ChevronLeft class="mr-2 h-4 w-4" />
				Previous
			</Button>

			<div class="flex items-center gap-2">
				<span>Page</span>
				<Input
					type="number"
					class="w-16 text-center"
					value={data.pagination.currentPage}
					min="1"
					max={data.pagination.totalPages}
					oninput={(e) => {
						const target = e.target as HTMLInputElement;
						const val = parseInt(target.value);
						if (!isNaN(val) && val >= 1 && val <= data.pagination.totalPages) {
							goToPage(val);
						}
					}}
				/>
				<span>of {data.pagination.totalPages}</span>
			</div>

			<Button
				variant="outline"
				disabled={data.pagination.currentPage === data.pagination.totalPages}
				onclick={() => goToPage(data.pagination.currentPage + 1)}
			>
				Next
				<ChevronRight class="ml-2 h-4 w-4" />
			</Button>
		</div>

		<div class="text-muted-foreground mt-2 text-center text-sm">
			Showing {data.pagination.perPage * (data.pagination.currentPage - 1) + 1} -
			{Math.min(
				data.pagination.perPage * data.pagination.currentPage,
				data.pagination.totalProblems
			)}
			of {data.pagination.totalProblems} problems
		</div>
	{/if}

	<!-- Additional Info -->
	{#if data.problems.length > 0}
		<div class="text-muted-foreground mt-6 text-sm">
			<p>{m['problemsPage.results.clickForStatement']()}</p>
		</div>
	{/if}
</main>
