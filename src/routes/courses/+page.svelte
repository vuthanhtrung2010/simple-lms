<script lang="ts">
	import type { PageProps } from './$types.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Lock, Users, Send, CheckCircle, XCircle, Clock } from '@lucide/svelte';

	let { data }: PageProps = $props();

	// Separate courses into sections
	const activeCourses = $derived(
		data.courses.filter((course) => data.enrolledCourseIds.includes(course.id))
	);

	const publishedCourses = $derived(
		data.courses.filter((course) => {
			// Not enrolled
			if (data.enrolledCourseIds.includes(course.id)) return false;
			// Published courses
			if (course.isPublished) return true;
			// Hidden courses visible to admin
			if (data.isAdmin && course.enrollmentMode === 'hidden') return true;
			return false;
		})
	);

	const unpublishedCourses = $derived(
		data.isAdmin
			? data.courses.filter((course) => {
					// Not enrolled
					if (data.enrolledCourseIds.includes(course.id)) return false;
					// Unpublished and not hidden
					return !course.isPublished && course.enrollmentMode !== 'hidden';
				})
			: []
	);

	const getCourseStatus = (courseId: string) => {
		if (data.enrolledCourseIds.includes(courseId)) {
			return 'enrolled';
		}
		if (data.requestedCourseIds[courseId]) {
			return data.requestedCourseIds[courseId];
		}
		return null;
	};

	const getEnrollmentModeDisplay = (mode: string) => {
		switch (mode) {
			case 'hidden':
				return { text: 'Hidden', icon: Lock, color: 'text-gray-500' };
			case 'request':
				return { text: 'Request to Join', icon: Send, color: 'text-blue-500' };
			case 'free':
				return { text: 'Free', icon: Users, color: 'text-green-500' };
			default:
				return { text: mode, icon: Lock, color: 'text-gray-500' };
		}
	};

	const getStatusBadge = (status: string | null) => {
		switch (status) {
			case 'enrolled':
				return { text: 'Enrolled', variant: 'default' as const, icon: CheckCircle };
			case 'pending':
				return { text: 'Pending', variant: 'secondary' as const, icon: Clock };
			case 'approved':
				return { text: 'Approved', variant: 'default' as const, icon: CheckCircle };
			case 'rejected':
				return { text: 'Rejected', variant: 'destructive' as const, icon: XCircle };
			default:
				return null;
		}
	};
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">Courses</h1>
		<p class="mt-2 text-muted-foreground">Browse and join available courses</p>
	</div>

	<!-- Active Courses Section -->
	{#if activeCourses.length > 0}
		<div class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Active Courses ({activeCourses.length})</h2>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each activeCourses as course (course.id)}
					{@const status = getCourseStatus(course.id)}
					{@const statusBadge = getStatusBadge(status)}
					{@const enrollmentMode = getEnrollmentModeDisplay(course.enrollmentMode || 'hidden')}

					<Card class="flex flex-col">
						<CardHeader>
							<div class="flex items-start justify-between gap-2">
								<CardTitle class="text-xl">{course.title}</CardTitle>
								{#if statusBadge}
									{@const StatusIcon = statusBadge.icon}
									<Badge variant={statusBadge.variant} class="flex items-center gap-1">
										<StatusIcon class="h-3 w-3" />
										{statusBadge.text}
									</Badge>
								{/if}
							</div>
							{@const EnrollmentIcon = enrollmentMode.icon}
							<div class="flex items-center gap-2 text-sm {enrollmentMode.color}">
								<EnrollmentIcon class="h-4 w-4" />
								<span>{enrollmentMode.text}</span>
							</div>
						</CardHeader>
						<CardContent class="flex flex-grow flex-col gap-4">
							{#if course.quote}
								<div class="border-l-4 border-primary py-2 pl-4">
									<p class="text-sm text-muted-foreground italic">{course.quote}</p>
									{#if course.quoteAuthor}
										<p class="mt-1 text-xs text-muted-foreground">— {course.quoteAuthor}</p>
									{/if}
								</div>
							{/if}

							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								{#if course.isPublished}
									<Badge variant="outline" class="text-green-600">Published</Badge>
								{:else}
									<Badge variant="outline" class="text-yellow-600">Draft</Badge>
								{/if}
							</div>

							<div class="mt-auto pt-4">
								<Button href="/course/{course.id}" class="w-full" variant="outline">
									View Course
								</Button>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Published Courses Section -->
	<div class="mb-12">
		<h2 class="mb-4 text-2xl font-semibold">Published Courses ({publishedCourses.length})</h2>
		{#if publishedCourses.length === 0}
			<Card>
				<CardContent class="py-12 text-center">
					<p class="text-muted-foreground">No courses to display.</p>
				</CardContent>
			</Card>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each publishedCourses as course (course.id)}
					{@const status = getCourseStatus(course.id)}
					{@const statusBadge = getStatusBadge(status)}
					{@const enrollmentMode = getEnrollmentModeDisplay(course.enrollmentMode || 'hidden')}

					<Card class="flex flex-col">
						<CardHeader>
							<div class="flex items-start justify-between gap-2">
								<CardTitle class="text-xl">{course.title}</CardTitle>
								{#if statusBadge}
									{@const StatusIcon = statusBadge.icon}
									<Badge variant={statusBadge.variant} class="flex items-center gap-1">
										<StatusIcon class="h-3 w-3" />
										{statusBadge.text}
									</Badge>
								{/if}
							</div>
							{@const EnrollmentIcon = enrollmentMode.icon}
							<div class="flex items-center gap-2 text-sm {enrollmentMode.color}">
								<EnrollmentIcon class="h-4 w-4" />
								<span>{enrollmentMode.text}</span>
							</div>
						</CardHeader>
						<CardContent class="flex flex-grow flex-col gap-4">
							{#if course.quote}
								<div class="border-l-4 border-primary py-2 pl-4">
									<p class="text-sm text-muted-foreground italic">{course.quote}</p>
									{#if course.quoteAuthor}
										<p class="mt-1 text-xs text-muted-foreground">— {course.quoteAuthor}</p>
									{/if}
								</div>
							{/if}

							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								{#if course.isPublished}
									<Badge variant="outline" class="text-green-600">Published</Badge>
								{:else}
									<Badge variant="outline" class="text-yellow-600">Draft</Badge>
								{/if}
							</div>

							<div class="mt-auto pt-4">
								<Button href="/course/{course.id}" class="w-full" variant="outline">
									View Course
								</Button>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Unpublished Courses Section (Admin Only) -->
	{#if data.isAdmin}
		<div class="mb-12">
			<h2 class="mb-4 text-2xl font-semibold">Unpublished Courses ({unpublishedCourses.length})</h2>
			{#if unpublishedCourses.length === 0}
				<Card>
					<CardContent class="py-12 text-center">
						<p class="text-muted-foreground">No courses to display.</p>
					</CardContent>
				</Card>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each unpublishedCourses as course (course.id)}
						{@const status = getCourseStatus(course.id)}
						{@const statusBadge = getStatusBadge(status)}
						{@const enrollmentMode = getEnrollmentModeDisplay(course.enrollmentMode || 'hidden')}

						<Card class="flex flex-col">
							<CardHeader>
								<div class="flex items-start justify-between gap-2">
									<CardTitle class="text-xl">{course.title}</CardTitle>
									{#if statusBadge}
										{@const StatusIcon = statusBadge.icon}
										<Badge variant={statusBadge.variant} class="flex items-center gap-1">
											<StatusIcon class="h-3 w-3" />
											{statusBadge.text}
										</Badge>
									{/if}
								</div>
								{@const EnrollmentIcon = enrollmentMode.icon}
								<div class="flex items-center gap-2 text-sm {enrollmentMode.color}">
									<EnrollmentIcon class="h-4 w-4" />
									<span>{enrollmentMode.text}</span>
								</div>
							</CardHeader>
							<CardContent class="flex flex-grow flex-col gap-4">
								{#if course.quote}
									<div class="border-l-4 border-primary py-2 pl-4">
										<p class="text-sm text-muted-foreground italic">{course.quote}</p>
										{#if course.quoteAuthor}
											<p class="mt-1 text-xs text-muted-foreground">— {course.quoteAuthor}</p>
										{/if}
									</div>
								{/if}

								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									{#if course.isPublished}
										<Badge variant="outline" class="text-green-600">Published</Badge>
									{:else}
										<Badge variant="outline" class="text-yellow-600">Draft</Badge>
									{/if}
								</div>

								<div class="mt-auto pt-4">
									<Button href="/course/{course.id}" class="w-full" variant="outline">
										View Course
									</Button>
								</div>
							</CardContent>
						</Card>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
