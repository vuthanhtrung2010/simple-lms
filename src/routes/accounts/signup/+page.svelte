<script lang="ts">
	import { useTheme } from 'svelte-themes';
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { AlertCircle } from '@lucide/svelte';
	import { Turnstile } from 'svelte-turnstile';

	import MagicCard from '$lib/components/magicui/MagicCard.svelte';
	import Calendar22 from '$lib/components/calendar-22.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Card,
		CardAction,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types.js';

	let { form }: PageProps = $props();

	const theme = useTheme();

	let formData = $state({
		fullname: form?.formData?.fullname || '',
		username: form?.formData?.username || '',
		email: form?.formData?.email || '',
		password: '',
		password2: '',
		dateOfBirth: undefined as Date | undefined
	});
	let isLoading = $state(false);
	let error = $state('');
	let comboboxOpen = $state(false);
	let turnstileStatus = $state<'success' | 'error' | 'expired' | 'required'>('required');

	// Reset form on successful navigation
	$effect(() => {
		// Use $page as a store
		if (!page.form) {
			formData = {
				fullname: form?.formData?.fullname || '',
				username: form?.formData?.username || '',
				email: form?.formData?.email || '',
				password: '',
				password2: '',
				dateOfBirth: undefined
			};
			isLoading = false;
			error = '';
			turnstileStatus = 'required';
		}
	});

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const { id, value } = target;

		// Username validation
		if (id === 'username') {
			// Allow only a-z, A-Z, 0-9, -, _, and . (dots)
			const usernameRegex = /^[a-zA-Z0-9\-_.]*$/;

			if (value && !usernameRegex.test(value)) {
				// Don't update if invalid characters are entered
				return;
			}
		}

		formData = {
			...formData,
			[id]: value
		};
	}

	function handleSubmit() {
		isLoading = true;
		error = '';

		// Basic validation
		if (
			!formData.username ||
			!formData.email ||
			!formData.password ||
			!formData.password2 ||
			!formData.fullname
		) {
			error = 'All fields are required';
			isLoading = false;
			return;
		}

		// Username validation
		const usernameRegex = /^[a-zA-Z0-9\-_.]+$/;
		if (!usernameRegex.test(formData.username)) {
			error =
				'Username can only contain letters, numbers, hyphens (-), underscores (_), and dots (.)';
			isLoading = false;
			return;
		}

		if (formData.username.length < 4) {
			error = 'Username must be at least 4 characters long';
			isLoading = false;
			return;
		}

		if (formData.username.length > 30) {
			error = 'Username must be no more than 30 characters long';
			isLoading = false;
			return;
		}

		if (formData.password !== formData.password2) {
			error = 'Passwords do not match';
			isLoading = false;
			return;
		}

		if (turnstileStatus !== 'success') {
			error = 'Please complete the Turnstile challenge.';
			isLoading = false;
			return;
		}
	}
</script>

<svelte:head>
	<title>{m['signupPage.title']({})}</title>
</svelte:head>

<div class="my-8 flex min-h-screen items-center justify-center">
	<Card class="w-full max-w-md border-none p-0 shadow-none">
		<MagicCard gradientColor={theme.resolvedTheme === 'dark' ? '#262626' : '#D9D9D955'} class="p-0">
			<CardHeader class="border-b border-border p-4 [.border-b]:pb-4">
				<CardTitle>{m['signupPage.title']({})}</CardTitle>
				<CardDescription>{m['signupPage.description']({})}</CardDescription>
				<CardAction>
					<Button href="/accounts/login" variant="link">
						{m['signupPage.loginLink']({})}
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent class="p-4">
				<form
					method="POST"
					use:enhance={() => {
						handleSubmit();
						return async ({ update, result }) => {
							if (result.type === 'success') {
								goto('/accounts/login');
							}
							await update();
							isLoading = false;
						};
					}}
				>
					<div class="flex flex-col gap-4">
						{#if error || page.form?.error}
							<div
								class="flex items-center gap-2 rounded border border-red-400 bg-red-100 px-4 py-2 text-red-700"
							>
								<AlertCircle size={16} />
								<span>{error || page.form.error}</span>
							</div>
						{/if}
						<!-- Full Name field -->
						<div class="grid gap-2">
							<Label for="fullname">Full Name</Label>
							<Input
								id="fullname"
								name="fullname"
								type="text"
								placeholder="John Doe"
								required
								bind:value={formData.fullname}
								disabled={isLoading}
							/>
						</div>
						<!-- Username field -->
						<div class="grid gap-2">
							<Label for="username">Username</Label>
							<Input
								id="username"
								name="username"
								type="text"
								placeholder="johndoe123"
								required
								bind:value={formData.username}
								onchange={handleChange}
								minlength={4}
								maxlength={30}
								disabled={isLoading}
							/>
							<p class="text-xs text-muted-foreground">
								4-30 characters. Only letters, numbers, hyphens (-), underscores (_), and dots (.)
								allowed.
							</p>
						</div>
						<div class="grid gap-2">
							<Label for="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="name@example.com"
								required
								bind:value={formData.email}
								disabled={isLoading}
							/>
						</div>
						<div class="grid gap-2">
							<Label for="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								required
								bind:value={formData.password}
								disabled={isLoading}
							/>
						</div>
						<div class="grid gap-2">
							<Label for="password2">Password Again</Label>
							<Input
								id="password2"
								name="password2"
								type="password"
								placeholder="Again, for confirmation"
								required
								bind:value={formData.password2}
								disabled={isLoading}
							/>
						</div>
						<!-- Date of birth field -->
						<Calendar22
							on:select={(date) => {
								formData = {
									...formData,
									dateOfBirth: date
								};
							}}
						/>
						{#if formData.dateOfBirth}
							<input type="hidden" name="dateOfBirth" value={formData.dateOfBirth.toISOString()} />
						{/if}
						<!-- Turnstile widget -->
						<div class="mt-2 flex justify-center">
							{#if PUBLIC_TURNSTILE_SITE_KEY}
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
							{/if}
						</div>
					</div>
				</form>
			</CardContent>
			<CardFooter class="flex-col gap-2 border-t border-border p-4 [.border-t]:pt-4">
				<Button
					type="submit"
					class="w-full"
					disabled={isLoading}
					onclick={() => document.querySelector('form')?.requestSubmit()}
				>
					{isLoading ? 'Creating account...' : 'Sign Up'}
				</Button>
				<!-- <Button variant="outline" class="w-full">
					Sign up with Google
				</Button> -->
			</CardFooter>
		</MagicCard>
	</Card>
</div>
