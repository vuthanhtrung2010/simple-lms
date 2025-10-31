<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { MultiSelect } from '$lib/components/ui/multi-select/index.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	let title = $state('');
	let isPublished = $state(false);
	let showDebt = $state(false);
	let quote = $state(data.defaults.quote);
	let quoteAuthor = $state(data.defaults.quoteAuthor);
	let selectedProblems: string[] = $state([]);
	let selectedStudents: string[] = $state([]);
	let selectedTeachers: string[] = $state([]);
	let selectedSupervisors: string[] = $state([]);
	let loading = $state(false);

	function handleRoleChange(
		role: 'student' | 'teacher' | 'supervisor',
		userId: string,
		checked: boolean
	) {
		// Remove from other roles if checked
		if (checked) {
			if (role !== 'student') selectedStudents = selectedStudents.filter((id) => id !== userId);
			if (role !== 'teacher') selectedTeachers = selectedTeachers.filter((id) => id !== userId);
			if (role !== 'supervisor')
				selectedSupervisors = selectedSupervisors.filter((id) => id !== userId);
		}
	}

	function isUserDisabled(userId: string, currentRole: string) {
		// Disable if user is already selected in another role
		if (currentRole !== 'student' && selectedStudents.includes(userId)) return true;
		if (currentRole !== 'teacher' && selectedTeachers.includes(userId)) return true;
		if (currentRole !== 'supervisor' && selectedSupervisors.includes(userId)) return true;
		return false;
	}
</script>

<div class="container mx-auto max-w-4xl py-8">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">Create Course</h1>
		<p class="text-muted-foreground">Fill in the details to create a new course.</p>
	</div>
	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ result, update }) => {
				loading = false;
				if (result.type === 'success') await goto('/admin/courses');
				await update();
			};
		}}
	>
		<div class="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Basic Information</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label for="title">Title *</Label>
						<Input id="title" name="title" bind:value={title} required disabled={loading} />
					</div>
					<div class="flex items-center space-x-4">
						<Checkbox id="isPublished" bind:checked={isPublished} disabled={loading} />
						<input type="hidden" name="isPublished" value={isPublished ? 'on' : 'off'} />
						<Label for="isPublished">Published</Label>
						<Checkbox id="showDebt" bind:checked={showDebt} disabled={loading} />
						<input type="hidden" name="showDebt" value={showDebt ? 'on' : 'off'} />
						<Label for="showDebt">Show Debt</Label>
					</div>
					<div class="space-y-2">
						<Label for="quote">Quote</Label>
						<Input id="quote" name="quote" bind:value={quote} disabled={loading} />
					</div>
					<div class="space-y-2">
						<Label for="quoteAuthor">Quote Author</Label>
						<Input
							id="quoteAuthor"
							name="quoteAuthor"
							bind:value={quoteAuthor}
							disabled={loading}
						/>
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Problems</CardTitle>
				</CardHeader>
				<CardContent>
					<MultiSelect
						placeholder="Select problems"
						options={data.problems.map((p) => ({ value: String(p.id), label: p.title }))}
						defaultValue={selectedProblems}
						onValueChange={(vals: string[]) => {
							selectedProblems = vals;
						}}
					/>
					{#each selectedProblems as pid}
						<input type="hidden" name="problems" value={pid} />
					{/each}
				</CardContent>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Enrollments</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-2">
						<Label>Students</Label>
						<MultiSelect
							placeholder="Select students"
							options={data.users.map((u) => ({ value: u.id, label: u.username }))}
							defaultValue={selectedStudents}
							onValueChange={(vals: string[]) => {
								selectedStudents = vals;
								vals.forEach((id: string) => handleRoleChange('student', id, true));
							}}
						/>
						{#each selectedStudents as uid}
							<input type="hidden" name="students" value={uid} />
						{/each}
					</div>
					<div class="space-y-2">
						<Label>Teachers</Label>
						<MultiSelect
							placeholder="Select teachers"
							options={data.users.map((u) => ({ value: u.id, label: u.username }))}
							defaultValue={selectedTeachers}
							onValueChange={(vals: string[]) => {
								selectedTeachers = vals;
								vals.forEach((id: string) => handleRoleChange('teacher', id, true));
							}}
						/>
						{#each selectedTeachers as uid}
							<input type="hidden" name="teachers" value={uid} />
						{/each}
					</div>
					<div class="space-y-2">
						<Label>Supervisors</Label>
						<MultiSelect
							placeholder="Select supervisors"
							options={data.users.map((u) => ({ value: u.id, label: u.username }))}
							defaultValue={selectedSupervisors}
							onValueChange={(vals: string[]) => {
								selectedSupervisors = vals;
								vals.forEach((id: string) => handleRoleChange('supervisor', id, true));
							}}
						/>
						{#each selectedSupervisors as uid}
							<input type="hidden" name="supervisors" value={uid} />
						{/each}
					</div>
				</CardContent>
			</Card>
			<div class="flex justify-end">
				<Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Course'}</Button
				>
			</div>
		</div>
	</form>
</div>
