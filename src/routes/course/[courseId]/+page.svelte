<script lang="ts">
	import type { PageProps } from './$types.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Trophy,
		BookOpen,
		LogOut,
		Send,
		X,
		Clock,
		CheckCircle,
		XCircle,
		Users
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	let loadingAction = $state(false);
	let requestDialogOpen = $state(false);
	let requestReason = $state('');

	const getEnrollmentStatus = () => {
		if (data.userEnrollment && !data.userEnrollment.isDeleted) {
			return 'enrolled';
		}
		if (data.enrollmentRequest) {
			return data.enrollmentRequest.status;
		}
		return null;
	};

	const canViewContent = () => {
		return (
			data.isEnrolled ||
			data.userEnrollment?.role === 'teacher' ||
			data.userEnrollment?.role === 'supervisor'
		);
	};
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Course Header -->
	<div class="mb-8">
		<div class="mb-4 flex items-start justify-between gap-4">
			<div class="flex-grow">
				<h1 class="mb-2 text-4xl font-bold">{data.course.title}</h1>
				<div class="flex flex-wrap items-center gap-3">
					{#if data.course.isPublished}
						<Badge variant="outline" class="text-green-600">Published</Badge>
					{:else}
						<Badge variant="outline" class="text-yellow-600">Draft</Badge>
					{/if}

					{#if data.course.enrollmentMode === 'hidden'}
						<Badge variant="secondary" class="flex items-center gap-1">
							<Users class="h-3 w-3" />
							Hidden
						</Badge>
					{:else if data.course.enrollmentMode === 'request'}
						<Badge variant="secondary" class="flex items-center gap-1">
							<Send class="h-3 w-3" />
							Request to Join
						</Badge>
					{:else}
						<Badge variant="secondary" class="flex items-center gap-1">
							<Users class="h-3 w-3" />
							Free
						</Badge>
					{/if}

					{#if getEnrollmentStatus() === 'enrolled'}
						<Badge variant="default" class="flex items-center gap-1">
							<CheckCircle class="h-3 w-3" />
							Enrolled
						</Badge>
					{:else if getEnrollmentStatus() === 'pending'}
						<Badge variant="secondary" class="flex items-center gap-1">
							<Clock class="h-3 w-3" />
							Pending
						</Badge>
					{:else if getEnrollmentStatus() === 'rejected'}
						<Badge variant="destructive" class="flex items-center gap-1">
							<XCircle class="h-3 w-3" />
							Rejected
						</Badge>
					{/if}
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				{#if getEnrollmentStatus() === 'enrolled'}
					<form
						method="POST"
						action="?/leave"
						use:enhance={() => {
							loadingAction = true;
							return async ({ update }) => {
								await update();
								loadingAction = false;
							};
						}}
					>
						<Button type="submit" variant="destructive" disabled={loadingAction}>
							<LogOut class="mr-2 h-4 w-4" />
							Leave Course
						</Button>
					</form>
				{:else if getEnrollmentStatus() === 'pending'}
					<form
						method="POST"
						action="?/cancelRequest"
						use:enhance={() => {
							loadingAction = true;
							return async ({ update }) => {
								await update();
								loadingAction = false;
							};
						}}
					>
						<Button type="submit" variant="outline" disabled={loadingAction}>
							<X class="mr-2 h-4 w-4" />
							Cancel Request
						</Button>
					</form>
				{:else if getEnrollmentStatus() === 'rejected'}
					{#if data.course.enrollmentMode === 'request'}
						<Dialog bind:open={requestDialogOpen}>
							<Button variant="outline" onclick={() => (requestDialogOpen = true)}>
								<Send class="mr-2 h-4 w-4" />
								Request Again
							</Button>
							<DialogContent class="sm:max-w-[425px]">
								<form
									method="POST"
									action="?/join"
									use:enhance={() => {
										loadingAction = true;
										return async ({ update }) => {
											await update();
											loadingAction = false;
											requestDialogOpen = false;
											requestReason = '';
										};
									}}
								>
									<DialogHeader>
										<DialogTitle>Request to Join Course</DialogTitle>
										<DialogDescription>
											Tell us why you want to join "{data.course.title}". This will help the admin
											review your request.
										</DialogDescription>
									</DialogHeader>
									<div class="grid gap-4 py-4">
										<div class="grid gap-2">
											<Label for="reason">Reason (Optional)</Label>
											<Input
												id="reason"
												name="reason"
												type="text"
												bind:value={requestReason}
												placeholder="I want to join this course because..."
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											type="button"
											variant="outline"
											onclick={() => (requestDialogOpen = false)}
										>
											Cancel
										</Button>
										<Button type="submit" disabled={loadingAction}>
											{#if loadingAction}
												Sending...
											{:else}
												Send Request
											{/if}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					{/if}
				{:else if data.course.enrollmentMode === 'free'}
					{#if data.userId}
						<form
							method="POST"
							action="?/join"
							use:enhance={() => {
								loadingAction = true;
								return async ({ update }) => {
									await update();
									loadingAction = false;
								};
							}}
						>
							<Button type="submit" disabled={loadingAction}>
								<Users class="mr-2 h-4 w-4" />
								Join Course
							</Button>
						</form>
					{:else}
						<Button href="/login" variant="outline">Login to Join</Button>
					{/if}
				{:else if data.course.enrollmentMode === 'request'}
					{#if data.userId}
						<Dialog bind:open={requestDialogOpen}>
							<Button variant="outline" onclick={() => (requestDialogOpen = true)}>
								<Send class="mr-2 h-4 w-4" />
								Request to Join
							</Button>
							<DialogContent class="sm:max-w-[425px]">
								<form
									method="POST"
									action="?/join"
									use:enhance={() => {
										loadingAction = true;
										return async ({ update }) => {
											await update();
											loadingAction = false;
											requestDialogOpen = false;
											requestReason = '';
										};
									}}
								>
									<DialogHeader>
										<DialogTitle>Request to Join Course</DialogTitle>
										<DialogDescription>
											Tell us why you want to join "{data.course.title}". This will help the admin
											review your request.
										</DialogDescription>
									</DialogHeader>
									<div class="grid gap-4 py-4">
										<div class="grid gap-2">
											<Label for="reason">Reason (Optional)</Label>
											<Input
												id="reason"
												name="reason"
												type="text"
												bind:value={requestReason}
												placeholder="I want to join this course because..."
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											type="button"
											variant="outline"
											onclick={() => (requestDialogOpen = false)}
										>
											Cancel
										</Button>
										<Button type="submit" disabled={loadingAction}>
											{#if loadingAction}
												Sending...
											{:else}
												Send Request
											{/if}
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					{:else}
						<Button href="/login" variant="outline">Login to Request</Button>
					{/if}
				{/if}
			</div>
		</div>

		<!-- Quote -->
		{#if data.course.quote}
			<div class="mb-4 border-l-4 border-primary py-2 pl-4">
				<p class="text-lg text-muted-foreground italic">{data.course.quote}</p>
				{#if data.course.quoteAuthor}
					<p class="mt-1 text-sm text-muted-foreground">— {data.course.quoteAuthor}</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<Tabs value="about" class="w-full">
		<TabsList class="grid w-full grid-cols-3 lg:inline-grid lg:w-auto">
			<TabsTrigger value="about">
				<BookOpen class="mr-2 h-4 w-4" />
				About
			</TabsTrigger>
			<TabsTrigger value="problems" onclick={() => goto(`/problems?course=${data.course.id}`)}>
				<BookOpen class="mr-2 h-4 w-4" />
				Problems
			</TabsTrigger>
			{#if canViewContent()}
				<TabsTrigger value="ranking" onclick={() => goto(`/course/${data.course.id}/ranking`)}>
					<Trophy class="mr-2 h-4 w-4" />
					Ranking
				</TabsTrigger>
			{/if}
		</TabsList>

		<TabsContent value="about" class="mt-6">
			<Card>
				<CardHeader>
					<CardTitle>Course Description</CardTitle>
				</CardHeader>
				<CardContent>
					{#if data.descriptionHtml}
						<div class="prose prose-neutral dark:prose-invert max-w-none">
							{@html data.descriptionHtml}
						</div>
					{:else}
						<p class="text-muted-foreground">No description available.</p>
					{/if}
				</CardContent>
			</Card>
		</TabsContent>

		<TabsContent value="problems">
			<!-- This will be handled by navigation -->
		</TabsContent>

		<TabsContent value="ranking">
			<!-- This will be handled by navigation -->
		</TabsContent>
	</Tabs>
</div>
