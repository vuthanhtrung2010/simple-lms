<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { MultiSelect } from '$lib/components/ui/multi-select/index.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let title = $state('');
	let categoryId = $state<number | undefined>(undefined);
	let categoryValue = $state<string>('');
	let selectedTypes = $state<number[]>([]);
	let attemptsAllowed = $state(-1);
	let showAnswers = $state('after_submission');
	let shuffleQuestions = $state(false);
	let splitScreen = $state(false);
	let timeLimit = $state(0);
	let questionFile = $state<File | null>(null);
	let loading = $state(false);

	let fileInput: HTMLInputElement;

	// Derived values
	let categoryTriggerContent = $derived(
		categoryId !== undefined
			? (data.categories.find((c) => c.id === categoryId)?.name ?? 'Select a category')
			: 'Select a category'
	);

	// Sync categoryValue with categoryId
	$effect(() => {
		if (categoryValue) {
			categoryId = parseInt(categoryValue);
		} else {
			categoryId = undefined;
		}
	});

	function handleFileChange(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			questionFile = target.files[0];
		}
	}
</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Create Problem</h1>
		<p class="text-muted-foreground">Fill in the details to create a new problem.</p>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			loading = true;
			return async ({ result, update }) => {
				loading = false;
				if (result.type === 'success') {
					await goto('/admin/problems');
				}
				await update();
			};
		}}
	>
		<div class="space-y-6">
			<!-- Title -->
			<Card>
				<CardHeader>
					<CardTitle>Basic Information</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label for="title">Title *</Label>
						<Input
							id="title"
							name="title"
							bind:value={title}
							placeholder="Enter problem title"
							required
							disabled={loading}
						/>
					</div>

					<!-- Category -->
					<div class="space-y-2">
						<Label for="category">Category *</Label>
						<Select.Root type="single" name="categoryId" bind:value={categoryValue}>
							<Select.Trigger disabled={loading}>
								{categoryTriggerContent}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each data.categories as category (category.id)}
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
						<p class="text-sm text-muted-foreground">Select one or more types for this problem.</p>
					</div>
				</CardContent>
			</Card>

			<!-- Settings -->
			<Card>
				<CardHeader>
					<CardTitle>Problem Settings</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<!-- Attempts Allowed -->
					<div class="space-y-2">
						<Label for="attempts">Attempts Allowed</Label>
						<Input
							id="attempts"
							name="attemptsAllowed"
							type="number"
							bind:value={attemptsAllowed}
							min="-1"
							disabled={loading}
						/>
						<p class="text-sm text-muted-foreground">
							Set to -1 or 0 for unlimited attempts, or a positive number to limit attempts.
						</p>
					</div>

					<!-- Show Answers -->
					<div class="space-y-2">
						<Label for="showAnswers">Show Answers</Label>
						<Select.Root type="single" name="showAnswers" bind:value={showAnswers}>
							<Select.Trigger disabled={loading}>
								{showAnswers || 'Select when to show answers'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="never" label="Never">Never</Select.Item>
								<Select.Item value="after_submission" label="After Submission"
									>After Submission</Select.Item
								>
								<Select.Item value="after_due" label="After Due Date">After Due Date</Select.Item>
								<Select.Item value="always" label="Always">Always</Select.Item>
							</Select.Content>
						</Select.Root>
						<p class="text-sm text-muted-foreground">
							Control when students can see correct answers.
						</p>
					</div>

					<!-- Shuffle Questions -->
					<div class="flex items-center space-x-2">
						<Checkbox id="shuffleQuestions" bind:checked={shuffleQuestions} disabled={loading} />
						<input type="hidden" name="shuffleQuestions" value={shuffleQuestions ? 'on' : 'off'} />
						<Label for="shuffleQuestions" class="cursor-pointer">Shuffle Questions</Label>
					</div>

					<!-- Split Screen -->
					<div class="space-y-2">
						<div class="flex items-center space-x-2">
							<Checkbox id="splitScreen" bind:checked={splitScreen} disabled={loading} />
							<input type="hidden" name="splitScreen" value={splitScreen ? 'on' : 'off'} />
							<Label for="splitScreen" class="cursor-pointer">Split Screen View</Label>
						</div>
						<p class="text-sm text-muted-foreground">
							When enabled, text-only questions will appear on the left side, and interactive
							questions on the right side.
						</p>
					</div>

					<!-- Time Limit -->
					<div class="space-y-2">
						<Label for="timeLimit">Time Limit (seconds)</Label>
						<Input
							id="timeLimit"
							name="timeLimit"
							type="number"
							bind:value={timeLimit}
							min="0"
							disabled={loading}
						/>
						<p class="text-sm text-muted-foreground">
							Time limit in seconds. Set to 0 or leave empty for no time limit.
						</p>
					</div>
				</CardContent>
			</Card>

			<!-- Questions Upload -->
			<Card>
				<CardHeader>
					<CardTitle>Questions</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label for="questionsFile">Upload Questions (ZIP file)</Label>
						<input
							bind:this={fileInput}
							id="questionsFile"
							name="questionsFile"
							type="file"
							accept=".zip"
							onchange={handleFileChange}
							disabled={loading}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<p class="text-sm text-muted-foreground">
							Upload a ZIP file containing questions.json and any referenced media files. Media
							paths are specified within the JSON file and will be automatically uploaded to R2
							object storage.
						</p>
						{#if questionFile}
							<p class="text-sm text-green-600">Selected: {questionFile.name}</p>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Submit Button -->
			<div class="flex justify-end gap-4">
				<Button
					type="button"
					variant="outline"
					onclick={() => goto('/admin/problems')}
					disabled={loading}
				>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{loading ? 'Creating...' : 'Create Problem'}
				</Button>
			</div>
		</div>
	</form>
</div>
