<script lang="ts">
	import type { PageProps } from './$types.js';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import {
		faSort,
		faSortUp,
		faSortDown,
		faTrophy,
		faQuoteLeft
	} from '@fortawesome/free-solid-svg-icons';
	import Button from '$lib/components/ui/button/button.svelte';
	import { getRatingTitle } from '$lib/rating.js';
	import RatingDisplay from '$lib/components/RatingDisplay.svelte';
	import UsernameDisplay from '$lib/components/UsernameDisplay.svelte';
	import Loading from '$lib/components/loading.svelte';
	import { onMount } from 'svelte';
	import 'katex/dist/katex.min.css';

	let { data }: PageProps = $props();

	const USERS_PER_PAGE = 50;

	type SortField = 'name' | 'rating' | 'quizzes' | 'debt';
	type SortOrder = 'asc' | 'desc' | null;

	interface User {
		id: string;
		name: string;
		shortName: string;
		rating: number;
		quizzesCompleted: number;
		debt: number;
	}

	let users = $state<User[]>(data.users);
	let filteredUsers = $state<User[]>(data.users);
	let currentPage = $state(1);
	let sortField = $state<SortField>('rating');
	let sortOrder = $state<SortOrder>('desc');
	let isLoaded = $state(false);
	let isLoading = $state(false);
	let currentAnnouncementIndex = $state(0);

	const courseName = data.course.title || 'Course Leaderboard';
	const courseQuote = data.course.quote;
	const quoteAuthor = data.course.quoteAuthor;
	const showDebt = data.course.showDebt || false;

	function handleSort(field: SortField) {
		if (sortField === field) {
			if (sortOrder === 'asc') {
				sortOrder = 'desc';
			} else if (sortOrder === 'desc') {
				sortOrder = 'asc';
			}
		} else {
			sortField = field;
			sortOrder = 'desc';
		}
	}

	function getSortIcon(field: SortField) {
		if (sortField !== field) return faSort;
		if (sortOrder === 'asc') return faSortUp;
		if (sortOrder === 'desc') return faSortDown;
		return faSort;
	}

	function sortUsers(usersToSort: User[]): User[] {
		if (!sortField || !sortOrder) return usersToSort;

		return [...usersToSort].sort((a, b) => {
			let aValue: number | string;
			let bValue: number | string;

			switch (sortField) {
				case 'name':
					aValue = a.name;
					bValue = b.name;
					if (typeof aValue === 'string' && typeof bValue === 'string') {
						return sortOrder === 'asc'
							? aValue.localeCompare(bValue)
							: bValue.localeCompare(aValue);
					}
					break;
				case 'rating':
					aValue = a.rating || 1500;
					bValue = b.rating || 1500;

					// Treat default rating (1500) as 0 for sorting purposes
					const ratingA = aValue === 1500 ? 0 : aValue;
					const ratingB = bValue === 1500 ? 0 : bValue;

					const comparison = (ratingA as number) - (ratingB as number);
					return sortOrder === 'asc' ? comparison : -comparison;
				case 'quizzes':
					aValue = a.quizzesCompleted || 0;
					bValue = b.quizzesCompleted || 0;

					const quizComparison = (aValue as number) - (bValue as number);
					return sortOrder === 'asc' ? quizComparison : -quizComparison;
				case 'debt':
					aValue = a.debt || 0;
					bValue = b.debt || 0;

					const debtComparison = (aValue as number) - (bValue as number);
					return sortOrder === 'asc' ? debtComparison : -debtComparison;
				default:
					return 0;
			}

			return 0;
		});
	}

	let totalPages = $derived(Math.ceil(filteredUsers.length / USERS_PER_PAGE));
	let startIndex = $derived((currentPage - 1) * USERS_PER_PAGE);
	let endIndex = $derived(startIndex + USERS_PER_PAGE);
	let currentUsers = $derived(filteredUsers.slice(startIndex, endIndex));

	onMount(() => {
		const timer = setTimeout(() => {
			isLoaded = true;
		}, 100);
		return () => clearTimeout(timer);
	});

	$effect(() => {
		let filtered = [...users];
		filtered = sortUsers(filtered);
		filteredUsers = filtered;
		currentPage = 1;
	});

	function previousAnnouncement() {
		if (!data.announcements) return;
		currentAnnouncementIndex =
			currentAnnouncementIndex === 0 ? data.announcements.length - 1 : currentAnnouncementIndex - 1;
	}

	function nextAnnouncement() {
		if (!data.announcements) return;
		currentAnnouncementIndex =
			currentAnnouncementIndex === data.announcements.length - 1 ? 0 : currentAnnouncementIndex + 1;
	}

	function previousPage() {
		if (currentPage > 1) currentPage--;
	}

	function nextPage() {
		if (currentPage < totalPages) currentPage++;
	}

	function goToPage(page: number) {
		currentPage = page;
	}
</script>

<svelte:head>
	<title>{courseName} - Dashboard</title>
	<meta
		name="description"
		content="Leaderboard for {courseName}. View user ratings, ranks, and statistics."
	/>
</svelte:head>

<main class="mx-auto max-w-[1600px] px-4 py-8">
	{#if !isLoaded}
		<Loading />
	{/if}
	<div class="users-page-container {isLoaded ? 'loaded' : 'loading'}">
		<!-- Title -->
		<div class="mb-6">
			<h1 class="mb-4 flex items-center text-3xl font-bold">
				<FontAwesomeIcon icon={faTrophy} class="trophy-icon mr-2" />
				{courseName} - Dashboard
			</h1>
			<hr class="mb-6" />
		</div>

		<!-- Mobile: Quote at top -->
		{#if courseQuote}
			<div
				class="from-primary/10 via-primary/5 to-background border-primary/20 relative mb-6 overflow-hidden rounded-xl border-2 bg-gradient-to-br shadow-lg lg:hidden"
			>
				<div
					class="bg-primary/5 absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full"
				></div>
				<div
					class="bg-primary/5 absolute bottom-0 left-0 h-24 w-24 -translate-x-12 translate-y-12 rounded-full"
				></div>

				<div class="relative p-6">
					<div class="flex items-start gap-4">
						<div class="flex-shrink-0">
							<div class="bg-primary/20 flex h-12 w-12 items-center justify-center rounded-full">
								<FontAwesomeIcon icon={faQuoteLeft} class="text-primary text-xl" />
							</div>
						</div>

						<div class="flex-1 pt-1">
							<blockquote
								class="text-foreground/90 mb-3 text-lg font-medium italic leading-relaxed"
							>
								"{courseQuote}"
							</blockquote>
							{#if quoteAuthor}
								<div class="flex justify-end">
									<cite
										class="text-primary flex items-center gap-2 text-sm font-semibold not-italic"
									>
										<span class="bg-primary/50 inline-block h-0.5 w-8 rounded-full"></span>
										{quoteAuthor}
									</cite>
								</div>
							{/if}
						</div>
					</div>

					<div class="from-primary to-primary/50 mt-4 h-1 w-20 rounded-full bg-gradient-to-r"></div>
				</div>
			</div>
		{/if}

		<!-- Desktop: Main content with right sidebar -->
		<div class="flex flex-col gap-6 lg:flex-row">
			<!-- Main Leaderboard - Takes less space on desktop -->
			<div class="flex-1 lg:max-w-[65%]">
				<div class="rounded-md border">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b bg-gray-800 dark:bg-white">
									<th
										class="h-12 w-[4rem] border-r border-gray-600 px-4 text-center align-middle font-medium text-white first:rounded-tl-md dark:border-gray-300 dark:text-gray-900"
									>
										Rank
									</th>
									<th
										class="h-12 w-[8rem] cursor-pointer border-r border-gray-600 px-4 text-center align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
										onclick={() => handleSort('rating')}
										role="button"
										tabindex="0"
									>
										<div class="flex items-center justify-center gap-2">
											Rating
											<FontAwesomeIcon icon={getSortIcon('rating')} class="h-3 w-3" />
										</div>
									</th>
									<th
										class="h-12 cursor-pointer border-r border-gray-600 px-4 text-left align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
										onclick={() => handleSort('name')}
										role="button"
										tabindex="0"
									>
										<div class="flex items-center gap-2">
											Name
											<FontAwesomeIcon icon={getSortIcon('name')} class="h-3 w-3" />
										</div>
									</th>
									<th
										class="h-12 w-[6rem] cursor-pointer border-r border-gray-600 px-4 text-center align-middle font-medium text-white hover:bg-gray-700 dark:border-gray-300 dark:text-gray-900 dark:hover:bg-gray-100"
										onclick={() => handleSort('quizzes')}
										role="button"
										tabindex="0"
									>
										<div class="flex items-center justify-center gap-2">
											Quizzes
											<FontAwesomeIcon icon={getSortIcon('quizzes')} class="h-3 w-3" />
										</div>
									</th>
									{#if showDebt}
										<th
											class="h-12 w-[6rem] cursor-pointer rounded-tr-md px-4 text-center align-middle font-medium text-white hover:bg-gray-700 dark:text-gray-900 dark:hover:bg-gray-100"
											onclick={() => handleSort('debt')}
											role="button"
											tabindex="0"
										>
											<div class="flex items-center justify-center gap-2">
												Debt
												<FontAwesomeIcon icon={getSortIcon('debt')} class="h-3 w-3" />
											</div>
										</th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#if isLoading}
									<tr>
										<td
											colspan={showDebt ? 5 : 4}
											class="text-muted-foreground h-24 px-4 text-center"
										>
											<div class="flex items-center justify-center">
												<Loading />
											</div>
										</td>
									</tr>
								{:else if currentUsers.length === 0}
									<tr>
										<td
											colspan={showDebt ? 5 : 4}
											class="text-muted-foreground h-24 px-4 text-center"
										>
											<span>No users available.</span>
										</td>
									</tr>
								{:else}
									{#each currentUsers as user, index}
										<tr class="hover:bg-muted/50 border-b transition-colors">
											<td class="border-border border-r p-4 text-center align-middle">
												<span class="text-lg font-bold">#{startIndex + index + 1}</span>
											</td>
											<td class="border-border border-r p-4 text-center align-middle">
												<RatingDisplay rating={Math.round(user.rating)} showIcon={true} />
											</td>
											<td class="border-border border-r p-4 align-middle">
												<a
													href="/user/{user.id}"
													class="text-primary font-medium hover:underline"
													title={getRatingTitle(Math.round(user.rating))}
												>
													<UsernameDisplay username={user.name} rating={Math.round(user.rating)} />
												</a>
											</td>
											<td class="p-4 text-center align-middle">
												<span class="text-sm font-medium">{user.quizzesCompleted || 0}</span>
											</td>
											{#if showDebt}
												<td class="p-4 text-center align-middle">
													<span class="text-sm font-medium text-red-600 dark:text-red-400"
														>{user.debt || 0}</span
													>
												</td>
											{/if}
										</tr>
									{/each}
								{/if}
							</tbody>
						</table>
					</div>
				</div>
				{#if totalPages > 1}
					<div class="mt-6 flex justify-center">
						<nav class="flex items-center gap-1">
							<Button
								variant="outline"
								onclick={previousPage}
								disabled={currentPage === 1}
								class={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
							>
								Previous
							</Button>

							<!-- Page numbers -->
							{#each Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
								let pageNumber;
								if (totalPages <= 7) {
									pageNumber = i + 1;
								} else if (currentPage <= 4) {
									pageNumber = i + 1;
								} else if (currentPage >= totalPages - 3) {
									pageNumber = totalPages - 6 + i;
								} else {
									pageNumber = currentPage - 3 + i;
								}
								return pageNumber;
							}) as pageNumber}
								{#if pageNumber === currentPage - 2 && currentPage > 4 && totalPages > 7}
									<span class="px-4 py-2">...</span>
								{:else if pageNumber === currentPage + 2 && currentPage < totalPages - 3 && totalPages > 7}
									<span class="px-4 py-2">...</span>
								{:else}
									<Button
										variant={pageNumber === currentPage ? 'default' : 'outline'}
										onclick={() => goToPage(pageNumber)}
										class="cursor-pointer"
									>
										{pageNumber}
									</Button>
								{/if}
							{/each}

							<Button
								variant="outline"
								onclick={nextPage}
								disabled={currentPage === totalPages}
								class={currentPage === totalPages
									? 'pointer-events-none opacity-50'
									: 'cursor-pointer'}
							>
								Next
							</Button>
						</nav>
					</div>
				{/if}
				<div class="mt-6 text-center">
					<div class="results-info">
						{#if isLoading}
							<span>Loading users...</span>
						{:else}
							<span>
								Showing {filteredUsers.length} users
								{#if totalPages > 1}
									• Page {currentPage} of {totalPages}
								{/if}
							</span>
						{/if}
					</div>
				</div>
				{#if currentUsers.length > 0}
					<div class="text-muted-foreground mt-6 text-sm">
						<p>Click on a name to view their profile and detailed statistics.</p>
					</div>
				{/if}
			</div>

			<!-- Right Sidebar - Desktop only -->
			<div class="hidden space-y-6 lg:block lg:w-[35%]">
				<!-- Quote Box -->
				{#if courseQuote}
					<div
						class="from-primary/10 via-primary/5 to-background border-primary/20 relative overflow-hidden rounded-xl border-2 bg-gradient-to-br shadow-lg"
					>
						<div
							class="bg-primary/5 absolute right-0 top-0 h-24 w-24 -translate-y-12 translate-x-12 rounded-full"
						></div>

						<div class="relative p-4">
							<div class="flex items-start gap-3">
								<div class="flex-shrink-0">
									<div
										class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full"
									>
										<FontAwesomeIcon icon={faQuoteLeft} class="text-primary text-lg" />
									</div>
								</div>

								<div class="flex-1 pt-1">
									<blockquote
										class="text-foreground/90 mb-2 text-base font-medium italic leading-relaxed"
									>
										"{courseQuote}"
									</blockquote>
									{#if quoteAuthor}
										<div class="flex justify-end">
											<cite
												class="text-primary flex items-center gap-2 text-xs font-semibold not-italic"
											>
												<span class="bg-primary/50 inline-block h-0.5 w-6 rounded-full"></span>
												{quoteAuthor}
											</cite>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Announcements -->
				<div class="border-border bg-card overflow-hidden rounded-xl border-2 shadow-lg">
					<div class="bg-primary/10 border-border border-b px-4 py-3">
						<h3 class="flex items-center gap-2 text-lg font-bold">📢 Announcements</h3>
					</div>
					<div class="p-4">
						{#if !data.announcements || data.announcements.length === 0}
							<p class="text-muted-foreground py-8 text-center text-sm">No announcements yet</p>
						{:else}
							<div class="mb-4">
								<h4 class="mb-2 text-base font-semibold">
									{data.announcements[currentAnnouncementIndex].title}
								</h4>
								<div class="text-muted-foreground prose prose-sm max-w-none text-sm">
									{@html data.announcements[currentAnnouncementIndex].processedContent ||
										'No content'}
								</div>
								<div class="text-muted-foreground mt-2 text-xs">
									{new Date(
										data.announcements[currentAnnouncementIndex].createdAt
									).toLocaleDateString()}
								</div>
							</div>

							{#if data.announcements.length > 1}
								<div class="border-border flex items-center justify-between border-t pt-3">
									<Button variant="outline" size="sm" onclick={previousAnnouncement}>
										Previous
									</Button>
									<span class="text-muted-foreground text-xs">
										{currentAnnouncementIndex + 1} / {data.announcements.length}
									</span>
									<Button variant="outline" size="sm" onclick={nextAnnouncement}>Next</Button>
								</div>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Recent Submissions -->
				<div class="border-border bg-card overflow-hidden rounded-xl border-2 shadow-lg">
					<div class="bg-primary/10 border-border border-b px-4 py-3">
						<h3 class="flex items-center gap-2 text-lg font-bold">🔥 Recent Submissions</h3>
					</div>
					<div class="p-4">
						{#if !data.recentSubmissions || data.recentSubmissions.length === 0}
							<p class="text-muted-foreground py-8 text-center text-sm">No recent submissions</p>
						{:else}
							<div class="space-y-3">
								{#each data.recentSubmissions as submission, index}
									<div
										class="bg-muted/50 hover:bg-muted flex items-start gap-3 rounded-lg p-3 transition-colors"
									>
										<div
											class="bg-primary/20 text-primary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
										>
											{index + 1}
										</div>
										<div class="min-w-0 flex-1">
											<a
												href="/user/{submission.userId}"
												class="hover:text-primary block truncate text-sm font-medium transition-colors"
											>
												{submission.userName}
											</a>
											<p class="text-muted-foreground truncate text-xs">
												{submission.quizName}
											</p>
											<p class="text-muted-foreground text-xs">
												{new Date(submission.submittedAt ?? 0).toLocaleString()}
											</p>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile: Announcements -->
		<div class="border-border bg-card mt-6 overflow-hidden rounded-xl border-2 shadow-lg lg:hidden">
			<div class="bg-primary/10 border-border border-b px-4 py-3">
				<h3 class="flex items-center gap-2 text-lg font-bold">📢 Announcements</h3>
			</div>
			<div class="p-4">
				{#if !data.announcements || data.announcements.length === 0}
					<p class="text-muted-foreground py-8 text-center text-sm">No announcements yet</p>
				{:else}
					<div class="mb-4">
						<h4 class="mb-2 text-base font-semibold">
							{data.announcements[currentAnnouncementIndex].title}
						</h4>
						<div class="text-muted-foreground prose prose-sm max-w-none text-sm">
							{@html data.announcements[currentAnnouncementIndex].processedContent || 'No content'}
						</div>
						<div class="text-muted-foreground mt-2 text-xs">
							{new Date(
								data.announcements[currentAnnouncementIndex].createdAt
							).toLocaleDateString()}
						</div>
					</div>

					{#if data.announcements.length > 1}
						<div class="border-border flex items-center justify-between border-t pt-3">
							<Button variant="outline" size="sm" onclick={previousAnnouncement}>Previous</Button>
							<span class="text-muted-foreground text-xs">
								{currentAnnouncementIndex + 1} / {data.announcements.length}
							</span>
							<Button variant="outline" size="sm" onclick={nextAnnouncement}>Next</Button>
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Mobile: Recent Submissions -->
		<div class="border-border bg-card mt-6 overflow-hidden rounded-xl border-2 shadow-lg lg:hidden">
			<div class="bg-primary/10 border-border border-b px-4 py-3">
				<h3 class="flex items-center gap-2 text-lg font-bold">🔥 Recent Submissions</h3>
			</div>
			<div class="p-4">
				{#if !data.recentSubmissions || data.recentSubmissions.length === 0}
					<p class="text-muted-foreground py-8 text-center text-sm">No recent submissions</p>
				{:else}
					<div class="space-y-3">
						{#each data.recentSubmissions as submission, index}
							<div
								class="bg-muted/50 hover:bg-muted flex items-start gap-3 rounded-lg p-3 transition-colors"
							>
								<div
									class="bg-primary/20 text-primary flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
								>
									{index + 1}
								</div>
								<div class="min-w-0 flex-1">
									<a
										href="/user/{submission.userId}"
										class="hover:text-primary block truncate text-sm font-medium transition-colors"
									>
										{submission.userName}
									</a>
									<p class="text-muted-foreground truncate text-xs">
										{submission.quizName}
									</p>
									<p class="text-muted-foreground text-xs">
										{new Date(submission.submittedAt ?? 0).toLocaleString()}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</main>
