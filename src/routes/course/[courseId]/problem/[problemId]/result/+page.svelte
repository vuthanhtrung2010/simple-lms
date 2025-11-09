<script lang="ts">
	import type { PageProps } from './$types.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { CheckCircle2, XCircle, AlertCircle, CircleDashed } from '@lucide/svelte';

	let { data }: PageProps = $props();

	function formatDateTime(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	function getScoreColor(percentage: number): string {
		if (percentage >= 90) return 'text-green-600 dark:text-green-400';
		if (percentage >= 70) return 'text-blue-600 dark:text-blue-400';
		if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	}

	function getUserAnswer(questionId: string): any {
		return data.userAnswers.find((a) => a.questionId === questionId)?.answer;
	}

	function getGradeResult(questionId: string) {
		return data.grading.results.find((r) => r.questionId === questionId);
	}

	function isAnswered(answer: any, questionType: string): boolean {
		if (answer === undefined || answer === null) return false;
		
		if (questionType === 'multiple_choice') {
			return Array.isArray(answer) && answer.length > 0;
		}
		
		if (questionType === 'fill_blank' || questionType === 'matching') {
			return typeof answer === 'object' && Object.keys(answer).length > 0;
		}
		
		if (questionType === 'short_answer' || questionType === 'numeric') {
			return answer !== '' && answer !== null && answer !== undefined;
		}
		
		// For single_choice, true_false - check if it's a valid number
		return typeof answer === 'number';
	}
</script>

<svelte:head>
	<title>Submission Result - {data.problem.title}</title>
</svelte:head>

<main class="mx-auto max-w-4xl space-y-6 px-4 py-8">
	<!-- Header -->
	<header class="space-y-2">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-foreground text-3xl font-semibold tracking-tight">
					{data.problem.title}
				</h1>
				<p class="text-muted-foreground text-sm">
					In course <span class="text-foreground font-medium">{data.course.title}</span>
				</p>
			</div>
			<Badge variant="outline">Attempt {data.submission.attemptNumber}</Badge>
		</div>
	</header>

	<hr class="border-border/70" />

	<!-- Score Summary -->
	<Card.Root class="bg-card/70 border-2">
		<Card.Header>
			<Card.Title>Submission Summary</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<p class="text-muted-foreground text-sm">Started</p>
					<p class="text-foreground font-medium">{formatDateTime(data.submission.startedAt)}</p>
				</div>
				{#if data.submission.submittedAt}
					<div>
						<p class="text-muted-foreground text-sm">Submitted</p>
						<p class="text-foreground font-medium">
							{formatDateTime(data.submission.submittedAt)}
						</p>
					</div>
				{/if}
			</div>

			<hr class="border-border/50" />

			<div>
				<p class="text-muted-foreground mb-2 text-sm">Your Score</p>
				<div class="flex items-baseline gap-3">
					<span class={`text-4xl font-bold ${getScoreColor(data.grading.percentage)}`}>
						{data.grading.earnedPoints.toFixed(2)}
					</span>
					<span class="text-muted-foreground text-xl">/ {data.grading.totalPoints}</span>
					<span class={`text-2xl font-semibold ${getScoreColor(data.grading.percentage)}`}>
						({data.grading.percentage.toFixed(1)}%)
					</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<hr class="border-border/70" />

	<!-- Question Results -->
	<div class="space-y-4">
		<h2 class="text-foreground text-xl font-semibold">Question Feedback</h2>

		{#each data.questions as question, i}
			{@const result = getGradeResult(question.id)}
			{@const userAnswer = getUserAnswer(question.id)}

			{#if result}
				<Card.Root class="bg-card/70 border">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<Card.Title class="text-base font-semibold">
										Question {i + 1}
									</Card.Title>
									{#if result.isCorrect}
										<CheckCircle2 class="text-green-600 dark:text-green-400 h-5 w-5" />
									{:else if result.pointsEarned > 0}
										<AlertCircle class="text-yellow-600 dark:text-yellow-400 h-5 w-5" />
									{:else if !isAnswered(userAnswer, question.questionType)}
										<CircleDashed class="text-gray-400 dark:text-gray-500 h-5 w-5" />
									{:else}
										<XCircle class="text-red-600 dark:text-red-400 h-5 w-5" />
									{/if}
								</div>
								<p class="text-muted-foreground mt-1 text-sm">
									{question.questionText.slice(0, 100)}...
								</p>
							</div>
							<div class="text-right">
								<p class="text-foreground text-lg font-semibold">
									{result.pointsEarned.toFixed(2)} / {result.pointsPossible}
								</p>
								<p class="text-muted-foreground text-xs">points</p>
							</div>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3 pt-0">
						<!-- User's Answer Display -->
						{#if userAnswer !== undefined && userAnswer !== null}
							<div class="bg-muted/30 rounded-lg border p-3">
								<p class="text-sm font-medium mb-2">Your Answer:</p>
								<div class="text-sm">
									{#if question.questionType === 'single_choice' || question.questionType === 'true_false'}
										{#if typeof userAnswer === 'number'}
											<p class="text-muted-foreground">Selected option: {userAnswer + 1}</p>
										{:else}
											<p class="text-muted-foreground italic">No answer provided</p>
										{/if}
									{:else if question.questionType === 'multiple_choice'}
										{#if Array.isArray(userAnswer) && userAnswer.length > 0}
											<p class="text-muted-foreground">
												Selected options: {userAnswer.map((idx) => idx + 1).join(', ')}
											</p>
										{:else}
											<p class="text-muted-foreground italic">No answers selected</p>
										{/if}
									{:else if question.questionType === 'short_answer'}
										{#if typeof userAnswer === 'string'}
											<p class="text-muted-foreground font-mono">{userAnswer}</p>
										{:else}
											<p class="text-muted-foreground italic">No answer provided</p>
										{/if}
									{:else if question.questionType === 'numeric'}
										{#if typeof userAnswer === 'number' || typeof userAnswer === 'string'}
											<p class="text-muted-foreground font-mono">{userAnswer}</p>
										{:else}
											<p class="text-muted-foreground italic">No answer provided</p>
										{/if}
									{:else if question.questionType === 'fill_blank'}
										{#if typeof userAnswer === 'object'}
											<div class="space-y-1">
												{#each Object.entries(userAnswer) as [index, value]}
													<p class="text-muted-foreground">
														<span class="font-medium">Blank {index}:</span>
														<span class="font-mono ml-2">{value}</span>
													</p>
												{/each}
											</div>
										{:else}
											<p class="text-muted-foreground italic">No blanks filled</p>
										{/if}
									{:else if question.questionType === 'matching'}
										{#if typeof userAnswer === 'object'}
											<div class="space-y-1">
												{#each Object.entries(userAnswer) as [item, choice]}
													<p class="text-muted-foreground">
														<span class="font-medium">{item}:</span>
														<span class="ml-2">{choice}</span>
													</p>
												{/each}
											</div>
										{:else}
											<p class="text-muted-foreground italic">No matches made</p>
										{/if}
									{/if}
								</div>
							</div>
						{/if}

						<!-- Feedback Box -->
						{#if result.feedback || result.explanation}
							{@const feedbackClass = result.isCorrect 
								? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
								: result.pointsEarned > 0
								? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
								: !isAnswered(userAnswer, question.questionType)
								? 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
								: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}
							<div
								class="rounded-lg border p-3 {feedbackClass}"
							>
								<p class="text-sm font-medium">
									{#if result.isCorrect}
										✓ Correct!
									{:else if result.pointsEarned > 0}
										⚠ Partial Credit
									{:else if !isAnswered(userAnswer, question.questionType)}
										○ Unanswered
									{:else}
										✗ Incorrect
									{/if}
								</p>
								{#if result.feedback}
									<p class="text-muted-foreground mt-1 text-sm">{result.feedback}</p>
								{:else if result.explanation}
									<p class="text-muted-foreground mt-1 text-sm">{result.explanation}</p>
								{/if}
							</div>
						{/if}

						<!-- Details for specific question types -->
						{#if result.details}
							<div class="bg-muted/50 rounded-lg p-3 text-sm">
								{#if question.questionType === 'fill_blank' && result.details.blankResults}
									<p class="font-medium">Blank Results:</p>
									<ul class="mt-2 space-y-1">
										{#each Object.entries(result.details.blankResults) as [index, correct]}
											<li class="flex items-center gap-2">
												{#if correct}
													<CheckCircle2 class="text-green-600 dark:text-green-400 h-4 w-4" />
												{:else}
													<XCircle class="text-red-600 dark:text-red-400 h-4 w-4" />
												{/if}
												<span>Blank {index}: {correct ? 'Correct' : 'Incorrect'}</span>
											</li>
										{/each}
									</ul>
								{:else if question.questionType === 'matching' && result.details.itemResults}
									<p class="font-medium">Matching Results:</p>
									<p class="text-muted-foreground mt-1">
										{result.details.correctMatches} / {result.details.totalItems} correct matches
									</p>
								{:else if question.questionType === 'multiple_choice' && result.details.correctCount !== undefined}
									<p class="font-medium">Selection Results:</p>
									<p class="text-muted-foreground mt-1">
										{result.details.correctCount} / {result.details.totalCorrect} correct selections
									</p>
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/if}
		{/each}
	</div>
</main>
