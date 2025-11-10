<script lang="ts">
	import { page } from '$app/state';
	import { Ghost, Home, RefreshCw, Clock } from '@lucide/svelte';
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

	function reset() {
		if (typeof window !== 'undefined') window.location.reload();
	}
</script>

{#if status === 404}
	<div class="flex min-h-screen items-center justify-center p-4">
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
					<CardTitle class="text-2xl font-semibold">Invalid Reset Link</CardTitle>
					<CardDescription class="mt-2 text-lg">
						This password reset link is invalid or has already been used.
					</CardDescription>
				</CardHeader>
				<CardContent class="px-8 pb-8">
					<div class="space-y-4 text-center">
						<p class="text-muted-foreground">
							Please request a new password reset link if you still need to reset your password.
						</p>
						<div class="flex flex-col gap-3 pt-4 sm:flex-row">
							<Button href="/accounts/forgot-password" class="flex-1">
								<RefreshCw class="mr-2 h-4 w-4" />
								Request New Link
							</Button>
							<Button href="/accounts/login" variant="outline" class="flex-1">
								<Home class="mr-2 h-4 w-4" />
								Back to Login
							</Button>
						</div>
					</div>
				</CardContent>
			</MagicCard>
		</Card>
	</div>
{:else if status === 410}
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card
			class="w-full max-w-lg border-none bg-gradient-to-br from-background to-muted/50 p-0 shadow-none"
		>
			<MagicCard gradientColor="#D9D9D955" class="p-0">
				<CardHeader class="p-8 text-center">
					<div class="mb-4 flex justify-center">
						<div class="relative">
							<Clock class="h-16 w-16 text-muted-foreground" />
							<div
								class="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500"
							>
								<span class="text-xs font-semibold text-white">!</span>
							</div>
						</div>
					</div>
					<CardTitle class="text-2xl font-semibold">Reset Link Expired</CardTitle>
					<CardDescription class="mt-2 text-lg">
						This password reset link has expired.
					</CardDescription>
				</CardHeader>
				<CardContent class="px-8 pb-8">
					<div class="space-y-4 text-center">
						<p class="text-muted-foreground">
							For security reasons, reset links expire after 1 hour. Please request a new one.
						</p>
						<div class="flex flex-col gap-3 pt-4 sm:flex-row">
							<Button href="/accounts/forgot-password" class="flex-1">
								<RefreshCw class="mr-2 h-4 w-4" />
								Request New Link
							</Button>
							<Button href="/accounts/login" variant="outline" class="flex-1">
								<Home class="mr-2 h-4 w-4" />
								Back to Login
							</Button>
						</div>
					</div>
				</CardContent>
			</MagicCard>
		</Card>
	</div>
{:else}
	<!-- Generic error -->
	<div class="flex min-h-screen items-center justify-center p-4">
		<Card class="w-full max-w-lg border border-destructive/30 bg-destructive/5">
			<CardHeader class="text-center">
				<CardTitle class="text-xl font-semibold">Unexpected error</CardTitle>
				<CardDescription class="mt-2 text-sm text-muted-foreground">
					Something went wrong while processing your password reset.
				</CardDescription>
			</CardHeader>
			<CardContent class="flex flex-col gap-3 pb-6 text-center sm:flex-row">
				<Button onclick={reset} class="flex-1">
					<RefreshCw class="mr-2 h-4 w-4" />
					Try again
				</Button>
				<Button href="/accounts/forgot-password" variant="outline" class="flex-1">
					<Home class="mr-2 h-4 w-4" />
					Request New Link
				</Button>
			</CardContent>
		</Card>
	</div>
{/if}
