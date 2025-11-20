<script lang="ts">
	import type { PageProps } from './$types.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { MultiSelect } from '$lib/components/ui/multi-select/index.js';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type {
		QuestionType,
		BaseQuestion,
		SingleChoiceConfig,
		MultipleChoiceConfig,
		TrueFalseConfig,
		ShortAnswerConfig,
		FillBlankConfig,
		MatchingConfig,
		NumericConfig
	} from '$lib/../types.js';
	import { useTheme } from 'svelte-themes';

	import OverType from 'overtype';
	import { onMount, onDestroy } from 'svelte';

	let { data, form }: PageProps = $props();
	const theme = useTheme();

	let descEditorRef: HTMLDivElement;
	let descEditorInstance: any = null;
	let descriptionValue = $state(data.problem.description || '');

	let instructionsEditorRef: HTMLDivElement;
	let instructionsEditorInstance: any = null;
	let instructionsValue = $state(data.problem.instructions || '');

	let questionTextEditorRef = $state<HTMLDivElement | undefined>();
	let questionTextEditorInstance: any = null;

	let explanationEditorRef = $state<HTMLDivElement | undefined>();
	let explanationEditorInstance: any = null;

	onMount(() => {
		if (descEditorRef) {
			const [instance] = OverType.init(descEditorRef, {
				toolbar: true,
				theme: theme.resolvedTheme === 'dark' ? 'dark' : 'light',
				value: descriptionValue,
				onChange: (value: string) => {
					descriptionValue = value;
				}
			});
			descEditorInstance = instance;
		}

		if (instructionsEditorRef) {
			const [instance] = OverType.init(instructionsEditorRef, {
				toolbar: true,
				theme: theme.resolvedTheme === 'dark' ? 'dark' : 'light',
				value: instructionsValue,
				onChange: (value: string) => {
					instructionsValue = value;
				}
			});
			instructionsEditorInstance = instance;
		}
	});

	onDestroy(() => {
		if (descEditorInstance) {
			descEditorInstance.destroy();
		}
		if (instructionsEditorInstance) {
			instructionsEditorInstance.destroy();
		}
		if (questionTextEditorInstance) {
			questionTextEditorInstance.destroy();
		}
		if (explanationEditorInstance) {
			explanationEditorInstance.destroy();
		}
	});

	$effect(() => {
		if (descEditorInstance && descriptionValue !== descEditorInstance.getValue()) {
			descEditorInstance.setValue(descriptionValue);
		}
	});

	$effect(() => {
		if (instructionsEditorInstance && instructionsValue !== instructionsEditorInstance.getValue()) {
			instructionsEditorInstance.setValue(instructionsValue);
		}
	});

	// Initialize question text and explanation editors when dialog opens
	$effect(() => {
		if (dialogOpen && editingQuestion) {
			const currentQuestion = editingQuestion;
			setTimeout(() => {
				if (questionTextEditorRef && !questionTextEditorInstance) {
					const [instance] = OverType.init(questionTextEditorRef, {
						toolbar: true,
						theme: theme.resolvedTheme === 'dark' ? 'dark' : 'light',
						value: currentQuestion.questionText || '',
						onChange: (value: string) => {
							if (editingQuestion) {
								editingQuestion.questionText = value;
							}
						}
					});
					questionTextEditorInstance = instance;
				}

				if (explanationEditorRef && !explanationEditorInstance) {
					const [instance] = OverType.init(explanationEditorRef, {
						toolbar: true,
						theme: theme.resolvedTheme === 'dark' ? 'dark' : 'light',
						value: currentQuestion.explanation || '',
						onChange: (value: string) => {
							if (editingQuestion) {
								editingQuestion.explanation = value;
							}
						}
					});
					explanationEditorInstance = instance;
				}
			}, 100);
		} else if (!dialogOpen) {
			if (questionTextEditorInstance) {
				questionTextEditorInstance.destroy();
				questionTextEditorInstance = null;
			}
			if (explanationEditorInstance) {
				explanationEditorInstance.destroy();
				explanationEditorInstance = null;
			}
		}
	});

	let isSubmittingMetadata = $state(false);
	let isSubmittingQuestion = $state(false);
	let editingQuestionId = $state<string | null>(null);
	let showAddDialog = $state(false);
	let dialogOpen = $state(false);

	// Metadata form state
	let selectedTypes = $state<number[]>(data.problemTypes || []);
	let selectedCategory = $state<string>(String(data.problem.categoryId));
	let selectedShowAnswers = $state<string>(data.problem.showAnswers);

	// Question editor state
	let editingQuestion = $state<BaseQuestion | null>(null);
	let shortAnswerText = $state<string>('');

	// Sync dialog open state with editingQuestion
	$effect(() => {
		dialogOpen = editingQuestion !== null;
	});

	// Sync short answer text with editingQuestion
	$effect(() => {
		if (
			editingQuestion?.questionType === 'short_answer' &&
			editingQuestion.config &&
			'answers' in editingQuestion.config
		) {
			const config = editingQuestion.config as ShortAnswerConfig;
			shortAnswerText = config.answers.join(', ');
		}
	});

	function handleEditQuestion(question: any) {
		editingQuestionId = question.id;

		// Ensure fill_blank blanks have default values
		let config = question.config;
		if (question.questionType === 'fill_blank' && config && config.blanks) {
			config.blanks = config.blanks.map((blank: any) => ({
				...blank,
				caseSensitive: blank.caseSensitive ?? false,
				isRegex: blank.isRegex ?? false
			}));
		}

		editingQuestion = {
			questionType: question.questionType as QuestionType,
			questionText: question.questionText,
			explanation: question.explanation || '',
			points: question.points ?? 0,
			orderIndex: question.orderIndex,
			config: config,
			media: question.media || []
		};
		dialogOpen = true;
	}

	function handleAddQuestion() {
		const maxOrder =
			data.questions.length > 0 ? Math.max(...data.questions.map((q) => q.orderIndex)) : -1;
		editingQuestion = {
			questionType: 'single_choice',
			questionText: '',
			explanation: '',
			points: 1,
			orderIndex: maxOrder + 1,
			config: {
				options: [
					{ text: '', isCorrect: false },
					{ text: '', isCorrect: false }
				]
			},
			media: []
		};
		editingQuestionId = null;
		showAddDialog = true;
		dialogOpen = true;
	}

	function saveQuestion() {
		if (!editingQuestion) return;
		isSubmittingQuestion = true;

		const formData = new FormData();
		formData.append('questionData', JSON.stringify(editingQuestion));

		if (editingQuestionId) {
			formData.append('questionId', editingQuestionId);
		}

		const action = editingQuestionId ? '?/updateQuestion' : '?/addQuestion';

		fetch(action, {
			method: 'POST',
			body: formData
		})
			.then((res) => res.json())
			.then((result: any) => {
				if (result.type === 'success') {
					toast.success(result.data?.message || 'Question saved successfully');
					window.location.reload();
				} else {
					toast.error(result.data?.error || 'Failed to save question');
				}
			})
			.catch((err) => {
				toast.error('An error occurred');
				console.error(err);
			})
			.finally(() => {
				isSubmittingQuestion = false;
				editingQuestion = null;
				editingQuestionId = null;
				showAddDialog = false;
				dialogOpen = false;
			});
	}

	function deleteQuestion(questionId: string) {
		if (!confirm('Are you sure you want to delete this question?')) return;

		const formData = new FormData();
		formData.append('questionId', questionId);

		fetch('?/deleteQuestion', {
			method: 'POST',
			body: formData
		})
			.then((res) => res.json())
			.then((result: any) => {
				if (result.type === 'success') {
					toast.success('Question deleted successfully');
					window.location.reload();
				} else {
					toast.error(result.data?.error || 'Failed to delete question');
				}
			})
			.catch((err) => {
				toast.error('An error occurred');
				console.error(err);
			});
	}

	// Add option for single/multiple choice
	function addOption() {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as SingleChoiceConfig | MultipleChoiceConfig;
		config.options.push({ text: '', isCorrect: false });
		editingQuestion = { ...editingQuestion };
	}

	function removeOption(index: number) {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as SingleChoiceConfig | MultipleChoiceConfig;
		if (config.options.length <= 2) {
			toast.error('Must have at least 2 options');
			return;
		}
		config.options.splice(index, 1);
		editingQuestion = { ...editingQuestion };
	}

	// Add blank for fill_blank
	function addBlank() {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as FillBlankConfig;
		if (!config.blanks) config.blanks = [];
		config.blanks.push({
			index: config.blanks.length,
			answers: [''],
			caseSensitive: false,
			isRegex: false
		});
		editingQuestion = { ...editingQuestion };
	}

	function removeBlank(index: number) {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as FillBlankConfig;
		config.blanks.splice(index, 1);
		// Reindex
		config.blanks.forEach((b: any, i: number) => (b.index = i));
		editingQuestion = { ...editingQuestion };
	}

	// Add matching item
	function addMatchingItem() {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as MatchingConfig;
		if (!config.items) config.items = [];
		if (!config.choices) config.choices = [];
		config.items.push({ text: '', correctAnswer: config.choices[0]?.id || '' });
		editingQuestion = { ...editingQuestion };
	}

	function removeMatchingItem(index: number) {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as MatchingConfig;
		config.items.splice(index, 1);
		editingQuestion = { ...editingQuestion };
	}

	function addMatchingChoice() {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as MatchingConfig;
		if (!config.choices) config.choices = [];
		const nextId = String.fromCharCode(65 + config.choices.length); // A, B, C, ...
		config.choices.push({ id: nextId, text: '' });
		editingQuestion = { ...editingQuestion };
	}

	function removeMatchingChoice(index: number) {
		if (!editingQuestion || !editingQuestion.config) return;
		const config = editingQuestion.config as MatchingConfig;
		if (config.choices.length <= 2) {
			toast.error('Must have at least 2 choices');
			return;
		}
		config.choices.splice(index, 1);
		editingQuestion = { ...editingQuestion };
	}

	// Initialize config when question type changes
	function handleQuestionTypeChange(newType: QuestionType) {
		if (!editingQuestion) return;
		editingQuestion.questionType = newType;

		// Initialize appropriate config
		switch (newType) {
			case 'single_choice':
			case 'multiple_choice':
				editingQuestion.config = {
					options: [
						{ text: '', isCorrect: false },
						{ text: '', isCorrect: false }
					]
				};
				break;
			case 'true_false':
				editingQuestion.config = {
					options: [
						{ text: 'True', isCorrect: false },
						{ text: 'False', isCorrect: false }
					]
				};
				break;
			case 'short_answer':
				editingQuestion.config = {
					answers: [''],
					caseSensitive: false,
					isRegex: false
				};
				shortAnswerText = '';
				break;
			case 'fill_blank':
				editingQuestion.config = {
					blanks: [
						{
							index: 0,
							answers: [''],
							caseSensitive: false,
							isRegex: false
						}
					]
				};
				break;
			case 'matching':
				editingQuestion.config = {
					items: [{ text: '', correctAnswer: 'A' }],
					choices: [
						{ id: 'A', text: '' },
						{ id: 'B', text: '' }
					]
				};
				break;
			case 'numeric':
				editingQuestion.config = {
					answer: 0,
					tolerance: 0
				};
				break;
			case 'text_only':
				editingQuestion.config = undefined;
				editingQuestion.points = 0;
				break;
		}
	}

	$effect(() => {
		if (form?.error) {
			toast.error(form.error);
		} else if (form?.success) {
			toast.success(form.message || 'Updated successfully');
		}
	});
</script>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Manage Problem</h1>
		<p class="mt-2 text-muted-foreground">Edit problem metadata and manage questions</p>
	</div>

	<Tabs.Root value="metadata" class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="metadata">Problem Metadata & Settings</Tabs.Trigger>
			<Tabs.Trigger value="questions">Questions Management</Tabs.Trigger>
		</Tabs.List>

		<!-- Metadata Tab -->
		<Tabs.Content value="metadata">
			<Card.Root>
				<Card.Header>
					<Card.Title>Problem Metadata & Settings</Card.Title>
					<Card.Description>Update problem information and configuration</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						method="POST"
						action="?/updateMetadata"
						use:enhance={() => {
							isSubmittingMetadata = true;
							return async ({ update }) => {
								await update();
								isSubmittingMetadata = false;
							};
						}}
					>
						<input type="hidden" name="problemId" value={data.problem.id} />

						<div class="space-y-4">
							<!-- Title -->
							<div class="space-y-2">
								<Label for="title">Title</Label>
								<Input id="title" name="title" value={data.problem.title} required />
							</div>

							<!-- Description -->
							<div class="space-y-2">
								<Label for="description">Description</Label>
								<div
									bind:this={descEditorRef}
									style="height: 200px; border: 1px solid hsl(var(--border)); border-radius: var(--radius);"
								></div>
								<input type="hidden" name="description" value={descriptionValue} />
							</div>

							<!-- Instructions -->
							<div class="space-y-2">
								<Label for="instructions">Instructions (optional)</Label>
								<div
									bind:this={instructionsEditorRef}
									style="height: 150px; border: 1px solid hsl(var(--border)); border-radius: var(--radius);"
								></div>
								<input type="hidden" name="instructions" value={instructionsValue} />
							</div>
							<!-- Category -->
							<div class="space-y-2">
								<Label for="categoryId">Category</Label>
								<Select.Root type="single" name="categoryId" bind:value={selectedCategory}>
									<Select.Trigger>
										{data.categories.find((c) => c.id === Number(selectedCategory))?.name ||
											'Select category'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each data.categories as category}
												<Select.Item value={String(category.id)} label={category.name}>
													{category.name}
												</Select.Item>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>
							<!-- Types -->
							<div class="space-y-2">
								<Label for="types">Types *</Label>
								<MultiSelect
									placeholder="Select types"
									options={data.types.map((t) => ({
										value: String(t.id),
										label: t.name
									}))}
									defaultValue={selectedTypes.map((id) => String(id))}
									onValueChange={(vals) => {
										selectedTypes = vals.map((v) => parseInt(v));
									}}
								/>
								{#each selectedTypes as typeId}
									<input type="hidden" name="types" value={typeId} />
								{/each}
								<p class="text-sm text-muted-foreground">
									Select one or more types for this problem.
								</p>
							</div>

							<!-- Time Limit -->
							<div class="space-y-2">
								<Label for="timeLimit">Time Limit (minutes, 0 = no limit)</Label>
								<Input
									id="timeLimit"
									name="timeLimit"
									type="number"
									value={data.problem.timeLimit || 0}
									min="0"
								/>
							</div>

							<!-- Attempts Allowed -->
							<div class="space-y-2">
								<Label for="attemptsAllowed">Attempts Allowed (-1 = unlimited)</Label>
								<Input
									id="attemptsAllowed"
									name="attemptsAllowed"
									type="number"
									value={data.problem.attemptsAllowed}
									min="-1"
								/>
							</div>

							<!-- Show Answers -->
							<div class="space-y-2">
								<Label for="showAnswers">Show Answers</Label>
								<Select.Root type="single" name="showAnswers" bind:value={selectedShowAnswers}>
									<Select.Trigger>
										{selectedShowAnswers}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											<Select.Item value="never" label="Never">Never</Select.Item>
											<Select.Item value="after_submission" label="After Submission">
												After Submission
											</Select.Item>
											<Select.Item value="after_due" label="After Due Date">
												After Due Date
											</Select.Item>
											<Select.Item value="always" label="Always">Always</Select.Item>
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>
							<!-- Shuffle Questions -->
							<div class="flex items-center gap-2">
								<Checkbox
									id="shuffleQuestions"
									name="shuffleQuestions"
									checked={data.problem.shuffleQuestions}
								/>
								<Label for="shuffleQuestions">Shuffle Questions</Label>
							</div>

							<!-- Split Screen -->
							<div class="flex items-center gap-2">
								<Checkbox id="splitScreen" name="splitScreen" checked={data.problem.splitScreen} />
								<Label for="splitScreen">Split Screen Mode</Label>
							</div>

							<!-- Submit Button -->
							<div class="flex justify-end pt-4">
								<Button type="submit" disabled={isSubmittingMetadata}>
									{isSubmittingMetadata ? 'Saving...' : 'Save Metadata'}
								</Button>
							</div>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Questions Tab -->
		<Tabs.Content value="questions">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Questions Management</Card.Title>
							<Card.Description>Edit existing questions or add new ones</Card.Description>
						</div>
						<Button onclick={handleAddQuestion}>Add Question</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						{#if data.questions.length === 0}
							<p class="py-8 text-center text-muted-foreground">
								No questions yet. Click "Add Question" to create one.
							</p>
						{:else}
							{#each data.questions as question, i}
								<Card.Root class="border-l-4 border-l-primary/50">
									<Card.Header>
										<div class="flex items-start justify-between">
											<div>
												<Card.Title class="text-base">
													Question {i + 1} - {question.questionType}
													{#if question.points != null}
														<span class="text-sm font-normal text-muted-foreground">
															({question.points} pts)
														</span>
													{/if}
												</Card.Title>
												<Card.Description class="mt-2">
													{question.questionText.substring(0, 100)}
													{question.questionText.length > 100 ? '...' : ''}
												</Card.Description>
											</div>
											<div class="flex gap-2">
												<Button
													size="sm"
													variant="outline"
													onclick={() => handleEditQuestion(question)}
												>
													Edit
												</Button>
												<Button
													size="sm"
													variant="destructive"
													onclick={() => deleteQuestion(question.id)}
												>
													Delete
												</Button>
											</div>
										</div>
									</Card.Header>
								</Card.Root>
							{/each}
						{/if}
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Question Editor Dialog -->
<Dialog.Root
	bind:open={dialogOpen}
	onOpenChange={(open) => {
		if (!open) {
			editingQuestion = null;
			editingQuestionId = null;
			showAddDialog = false;
		}
	}}
>
	<Dialog.Content class="max-h-[90vh] max-w-4xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>
				{editingQuestionId ? 'Edit Question' : 'Add New Question'}
			</Dialog.Title>
		</Dialog.Header>

		{#if editingQuestion}
			<div class="space-y-4 py-4">
				<!-- Question Type -->
				<div class="space-y-2">
					<Label for="questionType">Question Type</Label>
					<Select.Root
						type="single"
						value={editingQuestion.questionType}
						onValueChange={(val) => handleQuestionTypeChange(val as QuestionType)}
					>
						<Select.Trigger>
							{editingQuestion.questionType}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Item value="text_only" label="Text Only">Text Only</Select.Item>
								<Select.Item value="single_choice" label="Single Choice">Single Choice</Select.Item>
								<Select.Item value="multiple_choice" label="Multiple Choice">
									Multiple Choice
								</Select.Item>
								<Select.Item value="true_false" label="True/False">True/False</Select.Item>
								<Select.Item value="short_answer" label="Short Answer">Short Answer</Select.Item>
								<Select.Item value="fill_blank" label="Fill in the Blank">
									Fill in the Blank
								</Select.Item>
								<Select.Item value="matching" label="Matching">Matching</Select.Item>
								<Select.Item value="numeric" label="Numeric">Numeric</Select.Item>
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Question Text -->
				<div class="space-y-2">
					<Label for="questionText">Question Text (Markdown supported)</Label>
					<div
						bind:this={questionTextEditorRef}
						style="height: 200px; border: 1px solid hsl(var(--border)); border-radius: var(--radius);"
					></div>
				</div>

				<!-- Points -->
				{#if editingQuestion.questionType !== 'text_only'}
					<div class="space-y-2">
						<Label for="points">Points</Label>
						<Input
							id="points"
							type="number"
							bind:value={editingQuestion.points}
							min="0"
							step="0.5"
						/>
					</div>
				{/if}

				<!-- Explanation -->
				<div class="space-y-2">
					<Label for="explanation">Explanation (shown after answering)</Label>
					<div
						bind:this={explanationEditorRef}
						style="height: 150px; border: 1px solid hsl(var(--border)); border-radius: var(--radius);"
					></div>
				</div>

				<!-- Config based on question type -->
				{#if editingQuestion.questionType === 'single_choice' || editingQuestion.questionType === 'multiple_choice'}
					<div class="space-y-2">
						<Label>Options</Label>
						{#each (editingQuestion.config as SingleChoiceConfig | MultipleChoiceConfig).options as option, idx}
							<div class="flex items-center gap-2">
								<Checkbox
									checked={option.isCorrect}
									onCheckedChange={(checked) => {
										if (!editingQuestion) return;
										option.isCorrect = checked;
										if (editingQuestion.questionType === 'single_choice' && checked) {
											// Uncheck others for single choice
											(editingQuestion.config as SingleChoiceConfig).options.forEach(
												(opt: any, i: number) => {
													if (i !== idx) opt.isCorrect = false;
												}
											);
										}
										editingQuestion = { ...editingQuestion } as BaseQuestion;
									}}
								/>
								<Input bind:value={option.text} placeholder="Option text" class="flex-1" />
								<Button size="sm" variant="destructive" onclick={() => removeOption(idx)}>
									Remove
								</Button>
							</div>
						{/each}
						<Button size="sm" variant="outline" onclick={addOption}>Add Option</Button>
					</div>
				{/if}

				{#if editingQuestion.questionType === 'true_false'}
					<div class="space-y-2">
						<Label>Correct Answer</Label>
						{#each (editingQuestion.config as TrueFalseConfig).options as option}
							<label class="flex items-center gap-2">
								<input
									type="radio"
									name="truefalse"
									checked={option.isCorrect}
									onchange={() => {
										if (!editingQuestion) return;
										(editingQuestion.config as TrueFalseConfig).options.forEach((opt: any) => {
											opt.isCorrect = opt.text === option.text;
										});
										editingQuestion = { ...editingQuestion } as BaseQuestion;
									}}
								/>
								<span>{option.text}</span>
							</label>
						{/each}
					</div>
				{/if}

				{#if editingQuestion.questionType === 'short_answer'}
					<div class="space-y-2">
						<Label>Accepted Answers (comma-separated)</Label>
						<Input
							bind:value={shortAnswerText}
							placeholder="answer1, answer2, answer3"
							oninput={() => {
								if (editingQuestion && editingQuestion.config) {
									(editingQuestion.config as ShortAnswerConfig).answers = shortAnswerText
										.split(',')
										.map((s) => s.trim())
										.filter((s) => s.length > 0);
								}
							}}
						/>
						<div class="flex items-center gap-4">
							<label class="flex items-center gap-2">
								<Checkbox
									bind:checked={(editingQuestion.config as ShortAnswerConfig).caseSensitive}
								/>
								<span class="text-sm">Case Sensitive</span>
							</label>
							<label class="flex items-center gap-2">
								<Checkbox bind:checked={(editingQuestion.config as ShortAnswerConfig).isRegex} />
								<span class="text-sm">Use Regex</span>
							</label>
						</div>
					</div>
				{/if}
				{#if editingQuestion.questionType === 'fill_blank'}
					<div class="space-y-2">
						<Label>Blanks (use ____(index)____ in question text)</Label>
						{#each (editingQuestion.config as FillBlankConfig).blanks as blank, idx}
							<div class="space-y-2 rounded border p-3">
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium">Blank {idx + 1}</span>
									<Button size="sm" variant="destructive" onclick={() => removeBlank(idx)}>
										Remove
									</Button>
								</div>
								<Input bind:value={blank.answers[0]} placeholder="Accepted answer(s)" />
								<div class="flex items-center gap-4">
									<label class="flex items-center gap-2">
										<Checkbox bind:checked={blank.caseSensitive} />
										<span class="text-sm">Case Sensitive</span>
									</label>
									<label class="flex items-center gap-2">
										<Checkbox bind:checked={blank.isRegex} />
										<span class="text-sm">Use Regex</span>
									</label>
								</div>
							</div>
						{/each}
						<Button size="sm" variant="outline" onclick={addBlank}>Add Blank</Button>
					</div>
				{/if}

				{#if editingQuestion.questionType === 'matching'}
					<div class="space-y-4">
						<div class="space-y-2">
							<Label>Choices</Label>
							{#each (editingQuestion.config as MatchingConfig).choices as choice, idx}
								<div class="flex items-center gap-2">
									<span class="w-8 font-medium">{choice.id}</span>
									<Input bind:value={choice.text} placeholder="Choice text" class="flex-1" />
									<Button size="sm" variant="destructive" onclick={() => removeMatchingChoice(idx)}>
										Remove
									</Button>
								</div>
							{/each}
							<Button size="sm" variant="outline" onclick={addMatchingChoice}>Add Choice</Button>
						</div>

						<div class="space-y-2">
							<Label>Items</Label>
							{#each (editingQuestion.config as MatchingConfig).items as item, idx}
								<div class="flex items-center gap-2">
									<Input bind:value={item.text} placeholder="Item text" class="flex-1" />
									<Select.Root
										type="single"
										value={item.correctAnswer}
										onValueChange={(val) => {
											item.correctAnswer = val;
											editingQuestion = { ...editingQuestion } as BaseQuestion;
										}}
									>
										<Select.Trigger class="w-24">
											{item.correctAnswer}
										</Select.Trigger>
										<Select.Content>
											<Select.Group>
												{#each (editingQuestion.config as MatchingConfig).choices as choice}
													<Select.Item value={choice.id} label={choice.id}>
														{choice.id}
													</Select.Item>
												{/each}
											</Select.Group>
										</Select.Content>
									</Select.Root>
									<Button size="sm" variant="destructive" onclick={() => removeMatchingItem(idx)}>
										Remove
									</Button>
								</div>
							{/each}
							<Button size="sm" variant="outline" onclick={addMatchingItem}>Add Item</Button>
						</div>
					</div>
				{/if}

				{#if editingQuestion.questionType === 'numeric'}
					<div class="space-y-2">
						<Label>Numeric Answer</Label>
						<div class="space-y-2">
							<div>
								<Label for="numericAnswer">Correct Answer</Label>
								<Input
									id="numericAnswer"
									type="number"
									step="any"
									bind:value={(editingQuestion.config as NumericConfig).answer}
									placeholder="0"
									required
								/>
							</div>
							<div>
								<Label for="numericTolerance">Tolerance (±)</Label>
								<Input
									id="numericTolerance"
									type="number"
									step="any"
									bind:value={(editingQuestion.config as NumericConfig).tolerance}
									placeholder="0"
									min="0"
								/>
								<p class="text-sm text-muted-foreground">Acceptable range: answer ± tolerance</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Dialog Actions -->
				<div class="flex justify-end gap-2 pt-4">
					<Button
						variant="outline"
						onclick={() => {
							editingQuestion = null;
							editingQuestionId = null;
							showAddDialog = false;
						}}
					>
						Cancel
					</Button>
					<Button onclick={saveQuestion} disabled={isSubmittingQuestion}>
						{isSubmittingQuestion ? 'Saving...' : 'Save Question'}
					</Button>
				</div>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
