<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { faArrowLeft, faFilter, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { onMount } from 'svelte';

	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import Loading from '$lib/components/loading.svelte';

	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	// State
	let allSubmissions = $state(data.submissions);
	let loading = $state(false);

	// Filter states - Initialize from URL params immediately
	let problemFilter = $state(data.problemId || '');
	let authorFilter = $state(data.userId || '');
	let isPolling = $state(true);

	// Pagination states
	let currentPage = $state(1);
	const itemsPerPage = 20;

	// Client-side filtering logic
	let filteredSubmissions = $state(data.submissions);

	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	// Update filtered submissions when filters change
	$effect(() => {
		let filtered = allSubmissions;

		// Problem filter
		if (problemFilter.trim()) {
			filtered = filtered.filter(
				(sub) =>
					sub.problemId.toLowerCase().includes(problemFilter.toLowerCase()) ||
					sub.problemTitle.toLowerCase().includes(problemFilter.toLowerCase())
			);
		}

		// Author filter
		if (authorFilter.trim()) {
			filtered = filtered.filter(
				(sub) =>
					sub.userUsername?.toLowerCase().includes(authorFilter.toLowerCase()) ||
					sub.userName?.toLowerCase().includes(authorFilter.toLowerCase())
			);
		}

		filteredSubmissions = filtered;
	});

	// Pagination logic
	let totalPages = $derived(Math.ceil(filteredSubmissions.length / itemsPerPage));
	let paginatedSubmissions = $derived(() => {
		return filteredSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
	});

	$effect(() => {
		allSubmissions = data.submissions;
	});

	// Polling effect - refresh submissions every 3 seconds
	$effect(() => {
		if (!isPolling || !mounted) return;

		const interval = setInterval(() => {
			invalidate('submissions:data');
		}, 3000);

		return () => clearInterval(interval);
	});

	// On filter change - set current page to 1
	$effect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			currentPage = 1;
		}
	});

	const formatDate = (timestamp: number | null | undefined): string => {
		if (!timestamp) return 'Not submitted';
		try {
			const date = new Date(timestamp);
			if (isNaN(date.getTime())) return 'Invalid Date';
			return date.toLocaleString();
		} catch {
			return 'Invalid Date';
		}
	};

	const getPageTitle = () => {
		if (data.problemId) {
			return `Problem Submissions`;
		}
		return 'All Submissions';
	};
</script>

<svelte:head>
	<title>{getPageTitle()}</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<div class="flex items-center gap-4">
				{#if data.problemId}
					<Button variant="ghost" size="sm" href={`/problem/${data.problemId}`}>
						<FontAwesomeIcon icon={faArrowLeft} class="mr-2 h-4 w-4" />
						Back to Problem
					</Button>
				{/if}
				<h1 class="text-3xl font-semibold">{getPageTitle()}</h1>
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (isPolling = !isPolling)}
					class={isPolling ? 'border-green-300 bg-green-50' : ''}
				>
					<FontAwesomeIcon icon={isPolling ? faPause : faPlay} class="mr-2 h-4 w-4" />
					{isPolling ? 'Pause' : 'Resume'}
				</Button>
				<span class="text-sm text-muted-foreground">
					{isPolling ? 'Auto-refreshing...' : 'Paused'}
				</span>
			</div>
		</div>

		<!-- Filters -->
		<Card.Root class="mb-6 rounded-2xl border shadow-sm">
			<Card.Header class="pb-2">
				<Card.Title class="flex items-center gap-2 text-lg">
					<FontAwesomeIcon icon={faFilter} class="h-4 w-4" />
					Filters
				</Card.Title>
				<Card.Description>Filter submissions by problem or author</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
					<!-- Problem Filter -->
					<div class="flex flex-col">
						<Label for="problem" class="mb-2 text-sm font-medium">Problem</Label>
						<Input
							id="problem"
							placeholder="Search by problem name..."
							bind:value={problemFilter}
							class="rounded-md"
						/>
					</div>

					<!-- Author Filter -->
					<div class="flex flex-col">
						<Label for="author" class="mb-2 text-sm font-medium">Author</Label>
						<Input
							id="author"
							placeholder="Search by username..."
							bind:value={authorFilter}
							class="rounded-md"
						/>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Submissions Table -->
		<Card.Root>
			<Card.Content class="p-0">
				{#if loading}
					<Loading />
				{:else if !paginatedSubmissions() || paginatedSubmissions().length === 0}
					<div class="p-8 text-center text-muted-foreground">No submissions found</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="border-b">
								<tr class="text-left">
									<th class="p-4 font-medium">ID</th>
									<th class="p-4 font-medium">Problem</th>
									<th class="p-4 font-medium">Author</th>
									<th class="p-4 font-medium">Attempt</th>
									<th class="p-4 font-medium">Points</th>
									<th class="p-4 font-medium">Submitted</th>
								</tr>
							</thead>
							<tbody>
								{#each paginatedSubmissions() as submission (submission.id)}
									<tr class="border-b hover:bg-muted/50">
										<td class="p-4">
											<a
												href={`/course/${submission.courseId}/problem/${submission.problemId}/result?attempt=${submission.attemptNumber}`}
												class="font-mono text-primary hover:underline"
											>
												{submission.id.substring(0, 8)}...
											</a>
										</td>
										<td class="p-4">
											<a
												href={`/course/${submission.courseId}/problem/${submission.problemId}`}
												class="text-primary hover:underline"
											>
												{submission.problemTitle}
											</a>
										</td>
										<td class="p-4">
											<a href={`/user/${submission.userId}`} class="text-primary hover:underline">
												{submission.userName || submission.userUsername}
											</a>
										</td>
										<td class="p-4">
											<Badge variant="outline">
												#{submission.attemptNumber}
											</Badge>
										</td>
										<td class="p-4">
											<Badge
												variant={submission.score === submission.maxScore ? 'default' : 'secondary'}
											>
												{Math.round(submission.score)}/{Math.round(submission.maxScore)}
											</Badge>
										</td>
										<td class="p-4 text-sm text-muted-foreground">
											{formatDate(submission.submittedAt)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="mt-6 flex justify-center gap-2">
				<Button variant="outline" disabled={currentPage === 1} onclick={() => (currentPage -= 1)}>
					Previous
				</Button>
				<span class="flex items-center px-4">
					Page {currentPage} of {totalPages}
				</span>
				<Button
					variant="outline"
					disabled={currentPage === totalPages}
					onclick={() => (currentPage += 1)}
				>
					Next
				</Button>
			</div>
		{/if}
	</div>
</div>
