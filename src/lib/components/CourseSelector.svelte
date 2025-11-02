<script lang="ts">
	import { Check, ChevronsUpDown } from '@lucide/svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';

	type Course = {
		id: string;
		title: string;
	};

	type Props = {
		courses: Course[];
		selectedCourseId: string | null;
		onchange: (courseId: string | null) => void;
		showAllOption?: boolean;
	};

	let { courses, selectedCourseId, onchange, showAllOption = true }: Props = $props();

	let open = $state(false);

	const selectedCourse = $derived(
		selectedCourseId === null || selectedCourseId === 'all'
			? null
			: courses.find((c) => c.id === selectedCourseId)
	);

	function handleSelect(courseId: string | null) {
		onchange(courseId);
		open = false;
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		<Button
			variant="outline"
			role="combobox"
			aria-expanded={open}
			class="w-full justify-between sm:w-[300px]"
		>
			{#if selectedCourse}
				{selectedCourse.title}
			{:else if selectedCourseId === 'all' || selectedCourseId === null}
				All Courses
			{:else}
				Select course...
			{/if}
			<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-full p-0 sm:w-[300px]">
		<Command.Root>
			<Command.Input placeholder="Search course..." />
			<Command.Empty>No course found.</Command.Empty>
			<Command.List>
				<Command.Group>
					{#if showAllOption}
						<Command.Item value="all" onSelect={() => handleSelect('all')} class="cursor-pointer">
							<Check
								class={cn(
									'mr-2 h-4 w-4',
									selectedCourseId === 'all' || selectedCourseId === null
										? 'opacity-100'
										: 'opacity-0'
								)}
							/>
							All Courses
						</Command.Item>
					{/if}
					{#each courses as course (course.id)}
						<Command.Item
							value={course.title}
							onSelect={() => handleSelect(course.id)}
							class="cursor-pointer"
						>
							<Check
								class={cn(
									'mr-2 h-4 w-4',
									selectedCourseId === course.id ? 'opacity-100' : 'opacity-0'
								)}
							/>
							{course.title}
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
