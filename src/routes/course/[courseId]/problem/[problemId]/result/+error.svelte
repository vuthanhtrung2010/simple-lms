<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faExclamationCircle, faEye } from '@fortawesome/free-solid-svg-icons';
	import { OctagonMinus, RefreshCw, Home, Ghost, ArrowLeft } from '@lucide/svelte';
	import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import MagicCard from '$lib/components/magicui/MagicCard.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';

	let status = $derived(page.status);
	let problemId = $derived(page.params.problemId);

	function reset() {
		if (typeof window !== 'undefined') window.location.reload();
	}
</script>

{#if status === 410}
	<main class="mx-auto max-w-4xl px-4 py-8">
		<Alert class="mb-6 border-destructive/30 bg-destructive/10 text-destructive">
			<FontAwesomeIcon icon={faExclamationCircle} class="h-4 w-4" />
			<AlertDescription>
				This submission has been marked as deleted or is no longer available.
			</AlertDescription>
			<Button class="mt-4 w-full" variant="outline" onclick={() => goto(`?ignoreDeleted`)}>
				<FontAwesomeIcon icon={faEye} class="mr-2 h-4 w-4" />
				View anyway
			</Button>
		</Alert>
	</main>
{:else if status === 403}
	<div class="flex min-h-[60vh] items-center justify-center p-4">
		<Card
			class="w-full max-w-lg border-none bg-gradient-to-br from-background to-muted/50 p-0 shadow-none"
		>
			<MagicCard gradientColor="#D9D9D955" class="p-0">
				<CardHeader class="p-8 text-center">
					<div class="mb-4 flex justify-center">
						<div class="relative">
							<OctagonMinus class="h-16 w-16 text-muted-foreground" />
							<div
								class="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500"
							>
								<span class="text-xs font-semibold text-white">!</span>
							</div>
						</div>
					</div>
					<CardTitle class="text-2xl font-semibold">Access denied</CardTitle>
					<CardDescription class="mt-2 text-lg">
						You are not enrolled in this course or cannot view this submission.
					</CardDescription>
				</CardHeader>
				<CardContent class="px-8 pb-8">
					<div class="space-y-4 text-center">
						<p class="text-muted-foreground">
							Please contact your instructor or check the course problems list.
						</p>
						<div class="flex flex-col gap-3 pt-4 sm:flex-row">
							<Button onclick={reset} class="flex-1">
								<RefreshCw class="mr-2 h-4 w-4" />
								Try again
							</Button>
							<Button href={`/problems`} variant="outline" class="flex-1">
								<Home class="mr-2 h-4 w-4" />
								Back to problems
							</Button>
						</div>
					</div>
				</CardContent>
			</MagicCard>
		</Card>
	</div>
{:else if status === 404}
	<div class="flex min-h-[60vh] items-center justify-center p-4">
		<Card
			class="w-full max-w-lg border-none bg-gradient-to-br from-background to-muted/50 p-0 shadow-none"
		>
			<MagicCard gradientColor="#D9D9D955" class="p-0">
				<CardHeader class="p-8 text-center">
					<div class="mb-4 flex justify-center">
						<div class="relative">
							<Ghost class="h-16 w-16 text-muted-foreground" />
							<div
								class="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500"
							>
								<span class="text-xs font-semibold text-white">!</span>
							</div>
						</div>
					</div>
					<CardTitle class="text-2xl font-semibold">Submission not found</CardTitle>
					<CardDescription class="mt-2 text-lg">
						We could not find this submission for problem {problemId}.
					</CardDescription>
				</CardHeader>
				<CardContent class="px-8 pb-8">
					<div class="space-y-4 text-center">
						<p class="text-muted-foreground">It may have been removed or the URL is incorrect.</p>
						<div class="flex flex-col gap-3 pt-4 sm:flex-row">
							<Button href={`/problems`} class="flex-1">
								<Home class="mr-2 h-4 w-4" />
								Go to problems
							</Button>
							<Button variant="outline" class="flex-1" onclick={() => window.history.back()}>
								<ArrowLeft class="mr-2 h-4 w-4" />
								Go back
							</Button>
						</div>
					</div>
				</CardContent>
			</MagicCard>
		</Card>
	</div>
{:else}
	<!-- Generic error -->
	<div class="flex min-h-[60vh] items-center justify-center p-4">
		<Card class="w-full max-w-lg border border-destructive/30 bg-destructive/5">
			<CardHeader class="text-center">
				<CardTitle class="text-xl font-semibold">Unexpected error</CardTitle>
				<CardDescription class="mt-2 text-sm text-muted-foreground">
					Something went wrong while loading this submission.
				</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-3 pb-6 text-center sm:flex-row">
				<Button onclick={reset} class="flex-1">
					<RefreshCw class="mr-2 h-4 w-4" />
					Try again
				</Button>
				<Button href={`/problems`} variant="outline" class="flex-1">
					<Home class="mr-2 h-4 w-4" />
					Back to problems
				</Button>
			</CardContent>
		</Card>
	</div>
{/if}
