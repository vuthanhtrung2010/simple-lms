<script lang="ts">
	import type { PageProps } from './$types.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import { User, Trophy, Target } from '@lucide/svelte';
	import { getRatingClass, getRatingTitle } from '$lib/rating.js';
	import { getGravatarURL } from '$lib/utils.js';
	import UserTabs from '../UserTabs.svelte';

	let { data }: PageProps = $props();

	function getDifficultyColor(difficulty: string): string {
		switch (difficulty?.toLowerCase()) {
			case 'easy':
				return 'text-green-600 dark:text-green-400';
			case 'medium':
				return 'text-yellow-600 dark:text-yellow-400';
			case 'hard':
				return 'text-red-600 dark:text-red-400';
			default:
				return 'text-muted-foreground';
		}
	}

	function getDifficultyBadgeVariant(
		difficulty: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (difficulty?.toLowerCase()) {
			case 'easy':
				return 'default';
			case 'medium':
				return 'secondary';
			case 'hard':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<svelte:head>
	<title>{data.user.fullname || data.user.username}'s Problems</title>
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
				<h1 class="text-center text-2xl font-semibold">
					{data.user.fullname || data.user.username}
				</h1>
			</div>

			<div class="mb-4 space-y-3 rounded-lg border bg-card p-4">
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm font-medium">
						<Trophy class="h-4 w-4" />
						Problems Solved
					</span>
					<span class="font-semibold">{data.stats.totalSolved}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm font-medium">
						<Target class="h-4 w-4" />
						Attempted
					</span>
					<span class="font-semibold">{data.stats.totalAttempted}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="flex items-center gap-2 text-sm font-medium">
						<Trophy class="h-4 w-4 text-yellow-500" />
						Total Points
					</span>
					<span class="font-semibold">{data.stats.totalPoints}</span>
				</div>
			</div>
		</aside>

		<!-- Main content -->
		<div class="user-content">
			<UserTabs userId={data.user.id} currentUserId={data.currentUserId} />

			{#if Object.keys(data.problemsByCourse).length === 0}
				<Card.Root>
					<Card.Content class="pt-6">
						<p class="py-8 text-center text-muted-foreground">
							This user hasn't attempted any problems yet
						</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<Accordion.Root type="multiple" class="space-y-4">
					{#each Object.entries(data.problemsByCourse) as [courseId, courseData]}
						<Accordion.Item value={courseId} class="rounded-lg border bg-card">
							<Accordion.Trigger class="px-4 hover:no-underline">
								<div class="flex w-full items-center justify-between pr-4">
									<span class="text-lg font-semibold">{courseData.courseName}</span>
									<div class="flex items-center gap-4 text-sm">
										<Badge variant="default" class="bg-green-600">
											{courseData.solved.length} Solved
										</Badge>
										<Badge variant="secondary">
											{courseData.attempted.length} Attempted
										</Badge>
									</div>
								</div>
							</Accordion.Trigger>
							<Accordion.Content>
								<div class="px-4 pb-4">
									{#if courseData.solved.length > 0}
										<div class="mb-4">
											<h3 class="mb-2 text-sm font-semibold text-green-600 dark:text-green-400">
												✓ Solved Problems ({courseData.solved.length})
											</h3>
											<div class="space-y-2">
												{#each courseData.solved as problem}
													<a
														href={`/course/${courseId}/problem/${problem.id}`}
														class="flex items-center justify-between rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
													>
														<div class="flex items-center gap-3">
															<Trophy class="h-4 w-4 text-green-600 dark:text-green-400" />
															<span class="font-medium">{problem.title}</span>
														</div>
														<div class="flex items-center gap-3">
															<Badge variant={getDifficultyBadgeVariant(problem.difficulty)}>
																{problem.difficulty || 'N/A'}
															</Badge>
															<span class="text-sm font-semibold text-green-600 dark:text-green-400">
																{problem.userScore} / {problem.maxScore}
															</span>
														</div>
													</a>
												{/each}
											</div>
										</div>
									{/if}

									{#if courseData.attempted.length > 0}
										<div>
											<h3 class="mb-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
												⚠ Attempted Problems ({courseData.attempted.length})
											</h3>
											<div class="space-y-2">
												{#each courseData.attempted as problem}
													<a
														href={`/course/${courseId}/problem/${problem.id}`}
														class="flex items-center justify-between rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-3 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors"
													>
														<div class="flex items-center gap-3">
															<Target class="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
															<span class="font-medium">{problem.title}</span>
														</div>
														<div class="flex items-center gap-3">
															<Badge variant={getDifficultyBadgeVariant(problem.difficulty)}>
																{problem.difficulty || 'N/A'}
															</Badge>
															<span class="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
																{problem.userScore} / {problem.maxScore}
															</span>
														</div>
													</a>
												{/each}
											</div>
										</div>
									{/if}

									{#if courseData.solved.length === 0 && courseData.attempted.length === 0}
										<p class="py-4 text-center text-sm text-muted-foreground">
											No problems attempted in this course yet
										</p>
									{/if}
								</div>
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			{/if}
		</div>
	</div>
</main>
