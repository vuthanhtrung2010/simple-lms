<script lang="ts">
	import type { PageProps } from './$types.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	const courseId = data.course.id;
	const problemId = data.problem.id;

	function formatShowAnswers(mode: string | null | undefined): string {
		if (!mode) return 'After submission';
		switch (mode) {
			case 'never':
				return 'Never';
			case 'after_submission':
				return 'After submission';
			case 'after_due':
				return 'After due date';
			case 'always':
				return 'Always';
			default:
				return mode;
		}
	}

	function formatBoolean(value: boolean | null | undefined): string {
		return value ? 'Yes' : 'No';
	}

	function startQuiz() {
		void goto(`/course/${courseId}/problem/${problemId}/take`);
	}
</script>

<svelte:head>
	<title>{data.problem?.title ?? 'Problem'}</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 px-4 py-8">
	<!-- Title & Course -->
	<header class="mb-2 flex flex-col gap-2">
		<h1 class="text-foreground text-3xl font-semibold tracking-tight">
			{data.problem?.title}
		</h1>
		<p class="text-muted-foreground text-sm">
			In course
			<span class="text-foreground font-medium">{data.course.title}</span>
		</p>
	</header>

	<hr class="border-border/70" />

	<!-- Problem meta -->
	<section
		class="bg-card/60 text-muted-foreground flex flex-wrap gap-4 rounded-lg border p-4 text-sm"
	>
		<div>
			<span class="text-foreground font-semibold">Category:</span>
			<span>{data.problem?.categoryName ?? 'N/A'}</span>
		</div>
		{#if data.problem?.types && data.problem.types.length > 0}
			<div>
				<span class="text-foreground font-semibold">Type:</span>
				<span>{data.problem.types.join(', ')}</span>
			</div>
		{/if}
		{#if data.problem?.timeLimit}
			<div>
				<span class="text-foreground font-semibold">Time limit:</span>
				<span>{data.problem.timeLimit} min</span>
			</div>
		{/if}
		{#if data.problem?.attemptsAllowed !== undefined && data.problem.attemptsAllowed !== -1}
			<div>
				<span class="text-foreground font-semibold">Attempts:</span>
				<span>{data.problem.attemptsAllowed}</span>
			</div>
		{/if}
		<div>
			<span class="text-foreground font-semibold">Show answers:</span>
			<span>{formatShowAnswers(data.problem?.showAnswers)}</span>
		</div>
		<div>
			<span class="text-foreground font-semibold">Shuffle questions:</span>
			<span>{formatBoolean(data.problem?.shuffleQuestions)}</span>
		</div>
		<div>
			<span class="text-foreground font-semibold">Split screen:</span>
			<span>{formatBoolean(data.problem?.splitScreen)}</span>
		</div>
	</section>

	<!-- Description -->
	<article class="prose prose-neutral dark:prose-invert max-w-none">
		{@html data.problem?.descriptionHtml ??
			'<p class="text-muted-foreground">No description available.</p>'}
	</article>

	<!-- Take Quiz Button -->
	<div class="flex justify-center pt-4">
		<AlertDialog.Root>
			<AlertDialog.Trigger class={buttonVariants({ variant: 'default' })}>
				Start quiz
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Start this quiz?</AlertDialog.Title>
					<AlertDialog.Description>
						Once you start, the timer (if any) will begin counting down and your attempts will be
						tracked for this course. Make sure you are ready before continuing.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
					<AlertDialog.Action onclick={startQuiz}>Start quiz</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	</div>
</main>
