<script lang="ts">
	import type { PageProps } from './$types.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { User, Trophy, FileText, Calendar } from '@lucide/svelte';
	import { getRatingClass, getRatingTitle } from '$lib/rating.js';
	import { getGravatarURL } from '$lib/utils.js';
	import ActivityHeatmap from '$lib/components/ActivityHeatmap.svelte';
	import TypeRatingsRadar from '$lib/components/TypeRatingsRadar.svelte';
	import UserTabs from './UserTabs.svelte';

	let { data }: PageProps = $props();

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>{data.user.fullname || data.user.username} - User Profile</title>
</svelte:head>

<main class="mx-auto max-w-6xl px-4 py-8">
	<div class="user-profile grid gap-8 md:grid-cols-[250px_1fr]">
		<!-- Sidebar -->
		<aside class="user-sidebar">
			<div class="mb-6 flex flex-col items-center">
				<img
					src={getGravatarURL(data.user.email, 128)}
					alt={data.user.fullname || data.user.username}
					class="mb-4 h-32 w-32 rounded-full"
				/>
				<h1 class={`text-2xl font-semibold ${getRatingClass(data.avgRating)} text-center`}>
					{data.user.fullname || data.user.username}
				</h1>
				<p class="mb-4 text-center text-muted-foreground">
					{getRatingTitle(data.avgRating)}
				</p>

				<div class="mb-2 text-center">
					<span class="text-sm text-muted-foreground">Average Rating</span>
					<p class={`text-lg font-bold ${getRatingClass(data.avgRating)}`}>
						{Math.round(data.avgRating)}
					</p>
				</div>
			</div>

			<div class="mb-4 space-y-3 rounded-lg border bg-card p-4">
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm font-medium">
						<Trophy class="h-4 w-4" />
						Problems Solved
					</span>
					<span class="font-semibold">{data.stats.solvedProblems}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm font-medium">
						<FileText class="h-4 w-4" />
						Total Submissions
					</span>
					<span class="font-semibold">{data.stats.totalSubmissions}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm font-medium">
						<Calendar class="h-4 w-4" />
						Joined
					</span>
					<span class="text-sm">{formatDate(data.user.createdAt)}</span>
				</div>
			</div>

			<div class="rounded-lg border bg-card p-4">
				<a href={`/submissions?user=${data.user.id}`} class="block text-primary hover:underline">
					View all submissions
				</a>
			</div>
		</aside>

		<!-- Main content -->
		<div class="user-content">
			<UserTabs userId={data.user.id} currentUserId={data.currentUserId} />

			{#if data.user.bio}
				<div class="mb-6">
					<h2 class="mb-2 text-xl font-semibold">Bio</h2>
					<Card.Root>
						<Card.Content class="pt-6">
							<p class="whitespace-pre-wrap text-foreground">{data.user.bio}</p>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			<!-- Enrollments -->
			{#if data.enrollments.length > 0}
				<div class="mb-6">
					<h2 class="mb-2 text-xl font-semibold">Courses</h2>
					<Card.Root>
						<Card.Content class="p-4">
							<div class="space-y-2">
								{#each data.enrollments as enrollment}
									<div class="flex items-center justify-between">
										<a href={`/course/${enrollment.courseId}`} class="text-primary hover:underline">
											{enrollment.courseName}
										</a>
										<Badge variant="outline">
											{enrollment.role}
										</Badge>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			<!-- Type Ratings Radar Chart -->
			{#if data.userRatings.length > 0}
				<div class="mb-6">
					<h2 class="mb-2 text-xl font-semibold">Question Type Ratings</h2>
					<Card.Root>
						<Card.Content class="p-4">
							<TypeRatingsRadar ratings={data.userRatings} />
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			<!-- Activity Heatmap -->
			<div class="mb-6">
				<h2 class="mb-2 text-xl font-semibold">Submission Activity</h2>
				<Card.Root>
					<Card.Content class="pt-6">
						{#if data.activityData.length === 0}
							<p class="py-8 text-center text-muted-foreground">No submissions yet</p>
						{:else}
							<ActivityHeatmap submissions={data.activityData} />
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Rating History Placeholder -->
			<div>
				<h2 class="mb-2 text-xl font-semibold">Rating History</h2>
				<Card.Root>
					<Card.Content class="pt-6">
						<div class="relative h-[300px] w-full rounded-md border border-border bg-muted/20">
							<div class="absolute inset-0 flex items-center justify-center">
								<p class="text-sm text-muted-foreground">
									Rating history chart will be implemented here
								</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
</main>
