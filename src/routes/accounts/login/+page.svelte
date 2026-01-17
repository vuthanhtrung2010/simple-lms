<script lang="ts">
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { useTheme } from 'svelte-themes';
	import { AlertCircle } from '@lucide/svelte';
	import { Turnstile } from 'svelte-turnstile';
	import { Button } from '$lib/components/ui/button/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardAction,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	// MagicCard removed
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types.js';

	let { form }: PageProps = $props();

	const theme = useTheme();

	let email = $state('');
	let password = $state('');
	let isLoading = $state(false);
	let error = $state('');
	let turnstileStatus = $state<'success' | 'error' | 'expired' | 'required'>('required');

	// Reset form on successful navigation
	$effect(() => {
		// Use $page as a store
		if (!page.form) {
			email = '';
			password = '';
			isLoading = false;
			error = '';
			turnstileStatus = 'required';
		}
	});
</script>

<svelte:head>
	<title>{m['loginPage.title']({})}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-secondary/30">
	<div class="w-full max-w-sm clay-card p-0 overflow-hidden">
		<CardHeader class="border-b border-border/50 bg-primary/5 p-6">
			<CardTitle class="text-center text-2xl text-primary">{m['loginPage.title']({})}</CardTitle>
			<CardDescription class="text-center text-base">
				{m['loginPage.description']({})}
			</CardDescription>
			<CardAction>
				<a href="/accounts/signup" class={buttonVariants({ variant: 'link' })}>
					{m['loginPage.signUpLink']({})}
				</a>
			</CardAction>
		</CardHeader>
		<CardContent class="p-6">
			<form
				method="POST"
				use:enhance={() => {
					isLoading = true;
					error = '';
					return async ({ update, result }) => {
						if (result.type === 'redirect') {
							goto(result.location);
						}

						if (result.type === 'success') {
							const callbackUrl =
								new URL(window.location.href).searchParams.get('callbackUrl') || '/';
							goto(callbackUrl);
						}
						await update();
						isLoading = false;
					};
				}}
			>
				<div class="flex flex-col gap-6">
					{#if error || form?.error}
						<div
							class="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-destructive"
						>
							<AlertCircle size={20} />
							<span class="font-medium">{error || form?.error}</span>
						</div>
					{/if}
					<div class="grid gap-2">
						<Label for="email" class="ml-1 text-base">{m['loginPage.form.email']({})}</Label>
						<Input
							id="email"
							name="email"
							type="email"
							placeholder={m['loginPage.form.emailPlaceholder']({})}
							required
							bind:value={email}
							disabled={isLoading}
							class="h-10 border-2 px-4 rounded-xl focus-visible:ring-primary/50"
						/>
					</div>
					<div class="grid gap-2">
						<div class="flex items-center justify-between">
							<Label for="password" class="ml-1 text-base">{m['loginPage.form.password']({})}</Label>
							<a
								href="/accounts/forgot-password"
								class="ml-auto inline-block text-sm underline-offset-4 hover:underline"
								tabindex="-1"
							>
								{m['loginPage.forgotPassword']({})}
							</a>
						</div>
						<Input
							id="password"
							name="password"
							type="password"
							required
							bind:value={password}
							disabled={isLoading}
							class="h-10 border-2 px-4 rounded-xl focus-visible:ring-primary/50"
						/>
					</div>

					<!-- Turnstile -->
					<div class="grid gap-2">
						<Turnstile
							theme={theme.resolvedTheme === 'dark' ? 'dark' : 'light'}
							on:error={() => {
								turnstileStatus = 'error';
								error = m['loginPage.errors.turnstileFailed']({});
							}}
							on:expired={() => {
								turnstileStatus = 'expired';
								error = m['loginPage.errors.turnstileExpired']({});
							}}
							on:before-interactive={() => {
								turnstileStatus = 'required';
							}}
							on:callback={() => {
								turnstileStatus = 'success';
							}}
							on:error={() => {
								turnstileStatus = 'error';
								error = m['loginPage.errors.turnstileFailed']({});
							}}
							siteKey={PUBLIC_TURNSTILE_SITE_KEY}
						/>
					</div>
				</div>
				<CardFooter class="mt-8 flex-col gap-2 p-0">
					<Button
						type="submit"
						class="w-full py-6 text-lg clay-btn hover:brightness-110"
						disabled={isLoading || turnstileStatus !== 'success'}
					>
						{isLoading ? m['loginPage.form.loggingIn']({}) : m['loginPage.form.loginButton']({})}
					</Button>
				</CardFooter>
			</form>
		</CardContent>
	</div>
</div>
