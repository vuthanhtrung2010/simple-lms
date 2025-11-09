<script lang="ts">
	import type { PageProps } from './$types.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { enhance } from '$app/forms';

	import type { QuestionType } from '$lib/../types.js';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	let isSubmitting = $state(false);

	type TakeQuestion = {
		id: string;
		questionType: QuestionType;
		orderIndex: number;
		points: number | null;
		questionHtml: string;
		config: any;
	};

	const questions: TakeQuestion[] = data.questions as any;

	// Local state for matching answers: q.id -> item.text -> selected choice id
	let matchingAnswers = $state<Record<string, Record<string, string>>>({});

	function getMatchingValue(qId: string, itemText: string): string {
		return matchingAnswers[qId]?.[itemText] ?? '';
	}

	function setMatchingValue(qId: string, itemText: string, value: string) {
		const byQuestion = matchingAnswers[qId] ?? {};
		matchingAnswers = {
			...matchingAnswers,
			[qId]: { ...byQuestion, [itemText]: value }
		};
	}

	// Local state for answers
	let singleChoiceAnswers = $state<Record<string, number>>({});
	let multipleChoiceAnswers = $state<Record<string, Set<number>>>({});

	// Timer state
	let currentTime = $state(Date.now());
	let timerId: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		// Update current time every second
		timerId = setInterval(() => {
			currentTime = Date.now();
		}, 1000);

		return () => {
			if (timerId) clearInterval(timerId);
		};
	});

	function formatTime(seconds: number): string {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hrs > 0) {
			return `${hrs}h ${mins}m ${secs}s`;
		} else if (mins > 0) {
			return `${mins}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	}

	function formatDateTime(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}

	// Computed values
	const elapsedSeconds = $derived(Math.floor((currentTime - data.submission.startedAt) / 1000));
	const timeLeftSeconds = $derived(
		data.submission.timeLimit ? data.submission.timeLimit * 60 - elapsedSeconds : null
	);

	function renderFillBlankQuestion(qId: string, html: string): string {
		return html.replace(/\{\{blank:(\d+)\}\}/g, (_, num) => {
			const blankIdx = Number(num);
			const inputId = `blank-${qId}-${blankIdx}`;
			return `<input
				type="text"
				id="${inputId}"
				name="blank-${qId}-${blankIdx}"
				data-question-id="${qId}"
				data-blank-index="${blankIdx}"
				class="inline-input mx-1 rounded border border-input bg-background px-2 py-1 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				placeholder="..."
				style="width: 120px;"
			/>`;
		});
	}

	function toggleMultipleChoice(qId: string, optIdx: number) {
		const current = multipleChoiceAnswers[qId] ?? new Set<number>();
		const newSet = new Set(current);
		if (newSet.has(optIdx)) {
			newSet.delete(optIdx);
		} else {
			newSet.add(optIdx);
		}
		multipleChoiceAnswers = { ...multipleChoiceAnswers, [qId]: newSet };
	}

	function isMultipleChoiceChecked(qId: string, optIdx: number): boolean {
		return multipleChoiceAnswers[qId]?.has(optIdx) ?? false;
	}
</script>

<svelte:head>
	<title>{data.problem.title} - Take quiz</title>
</svelte:head>

{#if data.problem.splitScreen && data.textOnlyQuestions.length > 0}
	<!-- Full Screen Split Layout -->
	<form
		method="POST"
		action="?/submit"
		class="flex h-screen flex-col"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				try {
					if (result.type === 'redirect') {
						goto(result.location);
					} else {
						await update();
					}
				} finally {
					isSubmitting = false;
				}
			};
		}}
	>
		<input type="hidden" name="submissionId" value={data.submission.id} />

		<!-- Fixed Header with Timer -->
		<header class="border-b bg-background px-4 py-3">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-xl font-semibold text-foreground">{data.problem.title}</h1>
					<p class="text-xs text-muted-foreground">
						{data.course.title}
					</p>
				</div>
				<div class="flex items-center gap-4 text-sm">
					<div>
						<span class="text-muted-foreground">Elapsed:</span>
						<span class="font-medium text-foreground">{formatTime(elapsedSeconds)}</span>
					</div>
					{#if timeLeftSeconds !== null}
						<div class:text-destructive={timeLeftSeconds < 60}>
							<span class="text-muted-foreground">Time left:</span>
							<span class="font-medium"
								>{timeLeftSeconds > 0 ? formatTime(timeLeftSeconds) : 'Time expired!'}</span
							>
						</div>
					{/if}
					<Button
						type="submit"
						disabled={isSubmitting || (timeLeftSeconds !== null && timeLeftSeconds <= 0)}
					>
						{isSubmitting ? 'Submitting...' : 'Submit'}
					</Button>
				</div>
			</div>
		</header>

		<!-- Resizable Panels -->
		<div class="flex-1 overflow-hidden">
			<Resizable.PaneGroup direction="horizontal">
				<Resizable.Pane defaultSize={40} minSize={25}>
					<div class="h-full overflow-y-auto p-4">
						<div class="space-y-4">
							{#each data.textOnlyQuestions as q, i}
								<Card.Root class="border bg-card/70">
									<Card.Header class="pb-2">
										<Card.Title class="text-base font-semibold">
											Reference {i + 1}
										</Card.Title>
									</Card.Header>
									<Card.Content class="pt-0">
										<div class="prose prose-sm dark:prose-invert max-w-none">
											{@html q.questionHtml}
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
				</Resizable.Pane>

				<Resizable.Handle withHandle />

				<Resizable.Pane defaultSize={60} minSize={35}>
					<div class="h-full overflow-y-auto p-4">
						<div class="space-y-4">
							{#each data.interactiveQuestions as q, i}
								<Card.Root class="border bg-card/70">
									<Card.Header class="pb-2">
										<div class="flex items-baseline justify-between gap-2">
											<Card.Title class="text-base font-semibold">
												Question {i + 1}
												{#if q.points != null}
													<span class="ml-2 text-xs font-normal text-muted-foreground">
														({q.points} pts)
													</span>
												{/if}
											</Card.Title>
										</div>
									</Card.Header>
									<Card.Content class="space-y-3 pt-0">
										<!-- Question text -->
										<div class="prose prose-sm dark:prose-invert max-w-none">
											{#if q.questionType === 'fill_blank'}
												{@html renderFillBlankQuestion(q.id, q.questionHtml)}
											{:else}
												{@html q.questionHtml}
											{/if}
										</div>

										<!-- Single Choice / True-False -->
										{#if (q.questionType === 'single_choice' || q.questionType === 'true_false') && q.config?.options}
											<div class="mt-3 space-y-2">
												{#each q.config.options as opt, idx}
													<label
														class="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:bg-accent"
													>
														<input
															type="radio"
															name={`q-${q.id}`}
															value={idx}
															checked={singleChoiceAnswers[q.id] === idx}
															onchange={() => {
																singleChoiceAnswers = { ...singleChoiceAnswers, [q.id]: idx };
															}}
															class="mt-1"
														/>
														<div class="prose prose-sm dark:prose-invert flex-1 text-sm">
															{@html opt.text}
														</div>
													</label>
												{/each}
											</div>
										{/if}

										<!-- Multiple Choice -->
										{#if q.questionType === 'multiple_choice' && q.config?.options}
											<div class="mt-3 space-y-2">
												{#each q.config.options as opt, idx}
													<label
														class="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:bg-accent"
													>
														<input
															type="checkbox"
															name={`mc-${q.id}`}
															value={idx}
															checked={isMultipleChoiceChecked(q.id, idx)}
															onchange={() => toggleMultipleChoice(q.id, idx)}
															class="mt-1"
														/>
														<div class="prose prose-sm dark:prose-invert flex-1 text-sm">
															{@html opt.text}
														</div>
													</label>
												{/each}
											</div>
										{/if}

										<!-- Matching -->
										{#if q.questionType === 'matching' && q.config?.items && q.config?.choices}
											<div class="mt-3 space-y-2">
												{#each q.config.items as item (item.text)}
													<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
														<div class="text-sm font-medium sm:w-1/2">{item.text}</div>
														<div class="sm:w-1/2">
															<Select.Root
																type="single"
																name={`matching-${q.id}-${item.text}`}
																value={getMatchingValue(q.id, item.text)}
																onValueChange={(val) => setMatchingValue(q.id, item.text, val)}
															>
																<Select.Trigger class="w-full">
																	{getMatchingValue(q.id, item.text) || 'Select'}
																</Select.Trigger>
																<Select.Content>
																	<Select.Group>
																		{#each q.config.choices as choice (choice.id)}
																			<Select.Item value={choice.id} label={choice.id}>
																				{choice.id}
																			</Select.Item>
																		{/each}
																	</Select.Group>
																</Select.Content>
															</Select.Root>
														</div>
													</div>
												{/each}
											</div>
										{/if}

										<!-- Short Answer -->
										{#if q.questionType === 'short_answer'}
											<div class="mt-3">
												<Input
													name={`short-${q.id}`}
													placeholder="Enter your answer"
													class="w-full"
												/>
											</div>
										{/if}

										<!-- Numeric -->
										{#if q.questionType === 'numeric'}
											<div class="mt-3">
												<Input
													type="text"
													inputmode="decimal"
													name={`numeric-${q.id}`}
													placeholder="Enter numeric answer (e.g., 3.14)"
													class="w-full"
												/>
											</div>
										{/if}
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					</div>
				</Resizable.Pane>
			</Resizable.PaneGroup>
		</div>
	</form>
{:else}
	<!-- Normal Layout (no split screen) -->
	<form
		method="POST"
		action="?/submit"
		class="mx-auto max-w-4xl space-y-6 px-4 py-8"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				try {
					if (result.type === 'redirect') {
						goto(result.location);
					} else {
						await update();
					}
				} finally {
					isSubmitting = false;
				}
			};
		}}
	>
		<input type="hidden" name="submissionId" value={data.submission.id} />

		<!-- Header -->
		<header class="mb-2 flex flex-col gap-2">
			<h1 class="text-3xl font-semibold tracking-tight text-foreground">{data.problem.title}</h1>
			<p class="text-sm text-muted-foreground">
				In course <span class="font-medium text-foreground">{data.course.title}</span>
			</p>
		</header>

		<!-- Timer Info -->
		<section
			class="flex flex-wrap gap-4 rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground"
		>
			<div>
				<span class="font-semibold text-foreground">Started:</span>
				<span>{formatDateTime(data.submission.startedAt)}</span>
			</div>
			<div>
				<span class="font-semibold text-foreground">Elapsed:</span>
				<span>{formatTime(elapsedSeconds)}</span>
			</div>
			{#if timeLeftSeconds !== null}
				<div class:text-destructive={timeLeftSeconds < 60}>
					<span class="font-semibold">Time left:</span>
					<span>{timeLeftSeconds > 0 ? formatTime(timeLeftSeconds) : 'Time expired!'}</span>
				</div>
			{/if}
		</section>

		<hr class="border-border/70" />

		<!-- Description (if available) -->
		{#if data.problem.descriptionHtml}
			<article class="prose prose-sm dark:prose-invert max-w-none">
				{@html data.problem.descriptionHtml}
			</article>
			<hr class="border-border/70" />
		{/if}

		<!-- Questions -->
		<div class="space-y-4">
			{#each questions as q, i}
				<Card.Root class="border bg-card/70">
					<Card.Header class="pb-2">
						<div class="flex items-baseline justify-between gap-2">
							<Card.Title class="text-base font-semibold">
								Question {i + 1}
								{#if q.points != null}
									<span class="ml-2 text-xs font-normal text-muted-foreground">
										({q.points} pts)
									</span>
								{/if}
							</Card.Title>
						</div>
					</Card.Header>
					<Card.Content class="space-y-3 pt-0">
						<!-- Question text -->
						<div class="prose prose-sm dark:prose-invert max-w-none">
							{#if q.questionType === 'fill_blank'}
								{@html renderFillBlankQuestion(q.id, q.questionHtml)}
							{:else}
								{@html q.questionHtml}
							{/if}
						</div>

						<!-- Single Choice / True-False -->
						{#if (q.questionType === 'single_choice' || q.questionType === 'true_false') && q.config?.options}
							<div class="mt-3 space-y-2">
								{#each q.config.options as opt, idx}
									<label
										class="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:bg-accent"
									>
										<input
											type="radio"
											name={`q-${q.id}`}
											value={idx}
											checked={singleChoiceAnswers[q.id] === idx}
											onchange={() => {
												singleChoiceAnswers = { ...singleChoiceAnswers, [q.id]: idx };
											}}
											class="mt-1"
										/>
										<div class="prose prose-sm dark:prose-invert flex-1 text-sm">
											{@html opt.text}
										</div>
									</label>
								{/each}
							</div>
						{/if}

						<!-- Multiple Choice -->
						{#if q.questionType === 'multiple_choice' && q.config?.options}
							<div class="mt-3 space-y-2">
								{#each q.config.options as opt, idx}
									<label
										class="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:bg-accent"
									>
										<input
											type="checkbox"
											name={`mc-${q.id}`}
											value={idx}
											checked={isMultipleChoiceChecked(q.id, idx)}
											onchange={() => toggleMultipleChoice(q.id, idx)}
											class="mt-1"
										/>
										<div class="prose prose-sm dark:prose-invert flex-1 text-sm">
											{@html opt.text}
										</div>
									</label>
								{/each}
							</div>
						{/if}

						<!-- Matching -->
						{#if q.questionType === 'matching' && q.config?.items && q.config?.choices}
							<div class="mt-3 space-y-2">
								{#each q.config.items as item (item.text)}
									<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
										<div class="text-sm font-medium sm:w-1/2">{item.text}</div>
										<div class="sm:w-1/2">
											<Select.Root
												type="single"
												name={`matching-${q.id}-${item.text}`}
												value={getMatchingValue(q.id, item.text)}
												onValueChange={(val) => setMatchingValue(q.id, item.text, val)}
											>
												<Select.Trigger class="w-full">
													{getMatchingValue(q.id, item.text) || 'Select'}
												</Select.Trigger>
												<Select.Content>
													<Select.Group>
														{#each q.config.choices as choice (choice.id)}
															<Select.Item value={choice.id} label={choice.id}>
																{choice.id}
															</Select.Item>
														{/each}
													</Select.Group>
												</Select.Content>
											</Select.Root>
										</div>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Short Answer -->
						{#if q.questionType === 'short_answer'}
							<div class="mt-3">
								<Input name={`short-${q.id}`} placeholder="Enter your answer" class="w-full" />
							</div>
						{/if}

						<!-- Numeric -->
						{#if q.questionType === 'numeric'}
							<div class="mt-3">
								<Input
									type="number"
									name={`numeric-${q.id}`}
									placeholder="Enter numeric answer"
									class="w-full"
								/>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<!-- Submit Button -->
		<div class="flex justify-end gap-3 border-t pt-4">
			<Button
				type="submit"
				size="lg"
				disabled={isSubmitting || (timeLeftSeconds !== null && timeLeftSeconds <= 0)}
			>
				{isSubmitting ? 'Submitting...' : 'Submit Answers'}
			</Button>
		</div>
	</form>
{/if}
