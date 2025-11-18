<script lang="ts">
	import type { PageProps } from './$types.js';
	import type { MatchingConfig, FillBlankConfig } from '$lib/../types.js';
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

	function getOptionText(config: any, index: number): string {
		if (!config?.options || !Array.isArray(config.options)) return `Option ${index + 1}`;
		const option = config.options[index];
		return option?.text || `Option ${index + 1}`;
	}

	function getCorrectAnswers(question: any): string[] {
		const { questionType, config } = question;
		const answers: string[] = [];

		if (questionType === 'single_choice' || questionType === 'true_false') {
			if (config?.options) {
				const correctOption = config.options.find((opt: any) => opt.isCorrect);
				if (correctOption) answers.push(correctOption.text);
			}
		} else if (questionType === 'multiple_choice') {
			if (config?.options) {
				config.options.forEach((opt: any) => {
					if (opt.isCorrect) answers.push(opt.text);
				});
			}
		} else if (questionType === 'fill_blank') {
			if (config?.blanks) {
				return config.blanks.map((blank: any) => {
					const acceptedAnswers = blank.answers || [];
					return `Blank ${blank.index}: ${acceptedAnswers.join(' or ')}`;
				});
			}
		} else if (questionType === 'short_answer') {
			if (config?.answers) {
				return config.answers;
			}
		} else if (questionType === 'numeric') {
			if (config?.answer !== undefined) {
				const tolerance = config.tolerance || 0;
				if (tolerance > 0) {
					answers.push(`${config.answer} (±${tolerance})`);
				} else {
					answers.push(String(config.answer));
				}
				if (config.unit) answers[0] += ` ${config.unit}`;
			}
		} else if (questionType === 'matching') {
			if (config?.items) {
				return config.items.map((item: any) => `${item.text}: ${item.correctAnswer}`);
			}
		}

		return answers;
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
				<h1 class="text-3xl font-semibold tracking-tight text-foreground">
					{data.problem.title}
				</h1>
				<p class="text-sm text-muted-foreground">
					In course <span class="font-medium text-foreground">{data.course.title}</span>
				</p>
			</div>
			<Badge variant="outline">Attempt {data.submission.attemptNumber}</Badge>
		</div>
	</header>

	<hr class="border-border/70" />

	<!-- Score Summary -->
	<Card.Root class="border-2 bg-card/70">
		<Card.Header>
			<Card.Title>Submission Summary</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<p class="text-sm text-muted-foreground">Started</p>
					<p class="font-medium text-foreground">{formatDateTime(data.submission.startedAt)}</p>
				</div>
				{#if data.submission.submittedAt}
					<div>
						<p class="text-sm text-muted-foreground">Submitted</p>
						<p class="font-medium text-foreground">
							{formatDateTime(data.submission.submittedAt)}
						</p>
					</div>
				{/if}
			</div>

			<hr class="border-border/50" />

			<div>
				<p class="mb-2 text-sm text-muted-foreground">Your Score</p>
				<div class="flex items-baseline gap-3">
					<span class={`text-4xl font-bold ${getScoreColor(data.grading.percentage)}`}>
						{data.grading.earnedPoints.toFixed(2)}
					</span>
					<span class="text-xl text-muted-foreground">/ {data.grading.totalPoints}</span>
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
		<h2 class="text-xl font-semibold text-foreground">Question Feedback</h2>

		{#each data.questions as question, i}
			{@const result = getGradeResult(question.id)}
			{@const userAnswer = getUserAnswer(question.id)}

			<Card.Root class="border bg-card/70">
				<Card.Header class="pb-3">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<Card.Title class="text-base font-semibold">
									Question {i + 1}
								</Card.Title>
								{#if result?.isCorrect}
									<CheckCircle2 class="h-5 w-5 text-green-600 dark:text-green-400" />
								{:else if result && result.pointsEarned > 0}
									<AlertCircle class="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
								{:else if !isAnswered(userAnswer, question.questionType)}
									<CircleDashed class="h-5 w-5 text-gray-400 dark:text-gray-500" />
								{:else if result}
									<XCircle class="h-5 w-5 text-red-600 dark:text-red-400" />
								{/if}
							</div>
							<p class="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
								{question.questionText}
							</p>
						</div>
						{#if result}
							<div class="text-right">
								<p class="text-lg font-semibold text-foreground">
									{result.pointsEarned.toFixed(2)} / {result.pointsPossible}
								</p>
								<p class="text-xs text-muted-foreground">points</p>
							</div>
						{/if}
					</div>
				</Card.Header>
				<Card.Content class="space-y-3 pt-0">
					<!-- User's Answer Display -->
					{#if userAnswer !== undefined && userAnswer !== null}
						<div class="rounded-lg border bg-muted/30 p-3">
							<p class="mb-2 text-sm font-medium">Your Answer:</p>
							<div class="text-sm">
								{#if question.questionType === 'single_choice' || question.questionType === 'true_false'}
									{#if typeof userAnswer === 'number'}
										<p class="text-muted-foreground">
											{getOptionText(question.config, userAnswer)}
										</p>
									{:else}
										<p class="text-muted-foreground italic">No answer provided</p>
									{/if}
								{:else if question.questionType === 'multiple_choice'}
									{#if Array.isArray(userAnswer) && userAnswer.length > 0}
										<ul class="list-inside list-disc space-y-1 text-muted-foreground">
											{#each userAnswer as idx}
												<li>{getOptionText(question.config, idx)}</li>
											{/each}
										</ul>
									{:else}
										<p class="text-muted-foreground italic">No answers selected</p>
									{/if}
								{:else if question.questionType === 'short_answer'}
									{#if typeof userAnswer === 'string'}
										<p class="font-mono text-muted-foreground">{userAnswer}</p>
									{:else}
										<p class="text-muted-foreground italic">No answer provided</p>
									{/if}
								{:else if question.questionType === 'numeric'}
									{#if typeof userAnswer === 'number' || typeof userAnswer === 'string'}
										<p class="font-mono text-muted-foreground">{userAnswer}</p>
									{:else}
										<p class="text-muted-foreground italic">No answer provided</p>
									{/if}
								{:else if question.questionType === 'fill_blank'}
									{#if typeof userAnswer === 'object'}
										<div class="space-y-2">
											{#each Object.entries(userAnswer) as [index, value]}
												<div>
													<p class="font-medium text-foreground">Blank {index}:</p>
													<p class="ml-3 font-mono text-muted-foreground">{value}</p>
												</div>
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
					{#if result}
						{@const feedbackClass = result.isCorrect
							? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
							: result.pointsEarned > 0
								? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
								: !isAnswered(userAnswer, question.questionType)
									? 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800'
									: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'}
						<div class="rounded-lg border p-3 {feedbackClass}">
							{#if question.questionType !== 'text_only'}
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
							{/if}
							{#if result.feedback}
								<p class="mt-1 text-sm text-muted-foreground">{result.feedback}</p>
							{:else if question.explanation}
								<p class="mt-1 text-sm text-muted-foreground">{question.explanation}</p>
							{/if}
						</div>
					{/if}

					<!-- Correct Answers Display -->
					{#if data.problem.canShowAnswers}
						{@const correctAnswers = getCorrectAnswers(question)}
						{#if correctAnswers.length > 0}
							<div
								class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20"
							>
								<p class="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">
									Correct Answer{correctAnswers.length > 1 ? 's' : ''}:
								</p>
								{#if question.questionType === 'fill_blank'}
									<div class="space-y-2">
										{#each correctAnswers as answer}
											{@const [blankLabel, acceptedAnswers] = answer.split(': ')}
											<div>
												<p class="text-sm font-medium text-blue-800 dark:text-blue-200">
													{blankLabel}:
												</p>
												<ul class="mt-1 ml-4 space-y-0.5">
													{#each acceptedAnswers.split(' or ') as acceptedAnswer}
														<li class="font-mono text-sm text-blue-700 dark:text-blue-300">
															• {acceptedAnswer}
														</li>
													{/each}
												</ul>
											</div>
										{/each}
									</div>
								{:else if question.questionType === 'matching'}
									<ul class="space-y-1">
										{#each correctAnswers as answer}
											<li class="text-sm text-blue-700 dark:text-blue-300">• {answer}</li>
										{/each}
									</ul>
								{:else if correctAnswers.length === 1}
									<p class="text-sm text-blue-700 dark:text-blue-300">{correctAnswers[0]}</p>
								{:else}
									<ul class="space-y-1">
										{#each correctAnswers as answer}
											<li class="text-sm text-blue-700 dark:text-blue-300">• {answer}</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					{/if}

					<!-- Details for specific question types -->
					{#if result && result.details}
						<div class="rounded-lg bg-muted/50 p-3 text-sm">
							{#if question.questionType === 'fill_blank' && result.details.blankResults}
								<p class="font-medium">Blank Results:</p>
								<ul class="mt-2 space-y-2">
									{#each Object.entries(result.details.blankResults) as [index, correct]}
										{@const fillBlankConfig = question.config as FillBlankConfig | undefined}
										{@const blankConfig = fillBlankConfig?.blanks?.find(
											(b: any) => String(b.index) === String(index)
										)}
										{@const explanationText = blankConfig?.explanation || question.explanation}
										<li class="space-y-1">
											<div class="flex items-center gap-2">
												{#if correct}
													<CheckCircle2 class="h-4 w-4 text-green-600 dark:text-green-400" />
												{:else}
													<XCircle class="h-4 w-4 text-red-600 dark:text-red-400" />
												{/if}
												<span>Blank {index}: {correct ? 'Correct' : 'Incorrect'}</span>
											</div>
											{#if explanationText}
												<p class="ml-6 text-xs text-muted-foreground italic">{explanationText}</p>
											{/if}
										</li>
									{/each}
								</ul>
							{:else if question.questionType === 'matching' && result.details.itemResults}
								<p class="font-medium">Matching Results:</p>
								<ul class="mt-2 space-y-2">
									{#each Object.entries(result.details.itemResults) as [itemText, correct]}
										{@const matchingConfig = question.config as MatchingConfig | undefined}
										{@const itemConfig = matchingConfig?.items?.find(
											(item: any) => item.text === itemText
										)}
										{@const explanationText = itemConfig?.explanation || question.explanation}
										<li class="space-y-1">
											<div class="flex items-center gap-2">
												{#if correct}
													<CheckCircle2 class="h-4 w-4 text-green-600 dark:text-green-400" />
												{:else}
													<XCircle class="h-4 w-4 text-red-600 dark:text-red-400" />
												{/if}
												<span>{itemText}: {correct ? 'Correct' : 'Incorrect'}</span>
											</div>
											{#if explanationText}
												<p class="ml-6 text-xs text-muted-foreground italic">{explanationText}</p>
											{/if}
										</li>
									{/each}
								</ul>
							{:else if question.questionType === 'multiple_choice' && result.details.correctCount !== undefined}
								<p class="font-medium">Selection Results:</p>
								<p class="mt-1 text-muted-foreground">
									{result.details.correctCount} / {result.details.totalCorrect} correct selections
								</p>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</main>
