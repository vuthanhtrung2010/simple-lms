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

<main class="mx-auto max-w-4xl px-4 py-8 space-y-6">
	<!-- Problem meta -->
	<section class="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground flex flex-wrap gap-4">
		<div>
			<span class="font-semibold text-foreground">Category:</span>
			<span>{data.problem?.categoryName ?? 'N/A'}</span>
		</div>
		{#if data.problem?.types && data.problem.types.length > 0}
			<div>
				<span class="font-semibold text-foreground">Type:</span>
				<span>{data.problem.types.join(', ')}</span>
			</div>
		{/if}
		{#if data.problem?.timeLimit}
			<div>
				<span class="font-semibold text-foreground">Time limit:</span>
				<span>{data.problem.timeLimit} min</span>
			</div>
		{/if}
		{#if data.problem?.attemptsAllowed !== undefined && data.problem.attemptsAllowed !== -1}
			<div>
				<span class="font-semibold text-foreground">Attempts:</span>
				<span>{data.problem.attemptsAllowed}</span>
			</div>
		{/if}
		<div>
			<span class="font-semibold text-foreground">Show answers:</span>
			<span>{formatShowAnswers(data.problem?.showAnswers)}</span>
		</div>
		<div>
			<span class="font-semibold text-foreground">Shuffle questions:</span>
			<span>{formatBoolean(data.problem?.shuffleQuestions)}</span>
		</div>
		<div>
			<span class="font-semibold text-foreground">Split screen:</span>
			<span>{formatBoolean(data.problem?.splitScreen)}</span>
		</div>
	</section>

	<!-- Description -->
	<article class="prose prose-neutral max-w-none dark:prose-invert">
		{@html data.problem?.descriptionHtml ?? '<p class="text-muted-foreground">No description available.</p>'}
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
