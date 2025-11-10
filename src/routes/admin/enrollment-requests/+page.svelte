<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate, goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Check, X, Clock, User, Mail } from '@lucide/svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import { getGravatarURL } from '$lib/utils.js';
	import CourseSelector from '$lib/components/CourseSelector.svelte';

	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'pending':
				return { variant: 'secondary' as const, text: 'Pending' };
			case 'approved':
				return { variant: 'default' as const, text: 'Approved' };
			case 'rejected':
				return { variant: 'destructive' as const, text: 'Rejected' };
			default:
				return { variant: 'outline' as const, text: status };
		}
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

	let pendingRequests = $derived(data.requests.filter((r) => r.status === 'pending'));
	let processedRequests = $derived(data.requests.filter((r) => r.status !== 'pending'));
</script>

<svelte:head>
	<title>Enrollment Requests - Admin</title>
</svelte:head>

<main class="mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<h1 class="text-3xl font-semibold">Enrollment Requests</h1>
		<p class="text-muted-foreground">Manage course enrollment requests from students</p>
	</div>

	<!-- Course Filter -->
	{#if data.courses.length > 0}
		<Card.Root class="mb-6">
			<Card.Content class="p-4">
				<div class="flex flex-col gap-4">
					<Label for="course" class="text-sm font-medium">Filter by Course</Label>
					<CourseSelector
						courses={data.courses}
						selectedCourseId={data.selectedCourseId}
						onchange={handleCourseChange}
						showAllOption={true}
					/>
					<div class="text-sm text-muted-foreground">
						{#if data.selectedCourseId === 'all'}
							Showing requests from all courses
						{:else}
							{@const selectedCourse = data.courses.find((c) => c.id === data.selectedCourseId)}
							{#if selectedCourse}
								Showing requests for: <span class="font-medium">{selectedCourse.title}</span>
							{/if}
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Pending Requests -->
	<div class="mb-8">
		<h2 class="mb-4 text-xl font-semibold">
			Pending Requests
			{#if pendingRequests.length > 0}
				<Badge variant="secondary" class="ml-2">{pendingRequests.length}</Badge>
			{/if}
		</h2>

		{#if pendingRequests.length === 0}
			<Card.Root>
				<Card.Content class="py-12 text-center text-muted-foreground">
					<Clock class="mx-auto mb-4 h-12 w-12" />
					<p>No pending requests</p>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-4">
				{#each pendingRequests as request}
					<Card.Root>
						<Card.Content class="p-6">
							<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
								<div class="flex-1">
									<div class="mb-4 flex items-start gap-4">
										<img
											src={getGravatarURL(request.userEmail, 64)}
											alt={request.userName || request.userUsername}
											class="h-12 w-12 rounded-full"
										/>
										<div class="flex-1">
											<div class="mb-1 flex items-center gap-2">
												<a
													href={`/user/${request.userId}`}
													class="text-lg font-semibold hover:text-primary hover:underline"
												>
													{request.userName || request.userUsername}
												</a>
												<Badge variant="outline">@{request.userUsername}</Badge>
											</div>
											<div class="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
												<Mail class="h-4 w-4" />
												{request.userEmail}
											</div>
											<div class="mb-2">
												<span class="text-sm text-muted-foreground">Requested to join:</span>
												<a
													href={`/course/${request.courseId}`}
													class="ml-2 font-medium text-primary hover:underline"
												>
													{request.courseName}
												</a>
											</div>
											<div class="text-sm text-muted-foreground">
												Requested on {formatDate(request.requestedAt)}
											</div>
										</div>
									</div>

									{#if request.message}
										<div class="rounded-md border bg-muted/50 p-3">
											<p class="text-sm font-medium">Student's message:</p>
											<p class="mt-1 text-sm text-muted-foreground">{request.message}</p>
										</div>
									{/if}
								</div>

								<div class="flex gap-2 md:flex-col">
									<form
										method="POST"
										action="?/approve"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
												invalidate('enrollment-requests:data');
											};
										}}
									>
										<input type="hidden" name="requestId" value={request.id} />
										<Button type="submit" class="w-full">
											<Check class="mr-2 h-4 w-4" />
											Approve
										</Button>
									</form>

									<form
										method="POST"
										action="?/reject"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
												invalidate('enrollment-requests:data');
											};
										}}
									>
										<input type="hidden" name="requestId" value={request.id} />
										<Button type="submit" variant="destructive" class="w-full">
											<X class="mr-2 h-4 w-4" />
											Reject
										</Button>
									</form>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Processed Requests -->
	{#if processedRequests.length > 0}
		<div>
			<h2 class="mb-4 text-xl font-semibold">Processed Requests</h2>
			<div class="space-y-4">
				{#each processedRequests as request}
					<Card.Root>
						<Card.Content class="p-4">
							<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div class="flex items-center gap-3">
									<img
										src={getGravatarURL(request.userEmail, 48)}
										alt={request.userName || request.userUsername}
										class="h-10 w-10 rounded-full"
									/>
									<div>
										<div class="flex items-center gap-2">
											<a
												href={`/user/${request.userId}`}
												class="font-medium hover:text-primary hover:underline"
											>
												{request.userName || request.userUsername}
											</a>
											<span class="text-sm text-muted-foreground">→</span>
											<a
												href={`/course/${request.courseId}`}
												class="text-sm text-primary hover:underline"
											>
												{request.courseName}
											</a>
										</div>
										<div class="text-sm text-muted-foreground">
											{formatDate(request.requestedAt)}
										</div>
									</div>
								</div>
								<Badge variant={getStatusBadge(request.status).variant}>
									{getStatusBadge(request.status).text}
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</main>
