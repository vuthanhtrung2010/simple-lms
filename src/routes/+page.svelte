<script lang="ts">
	import {
		BookOpen,
		Brain,
		Clock,
		Target,
		Zap,
		Users,
		Shield,
		Bell,
		CreditCard
	} from '@lucide/svelte';

	const features: Array<{
		icon: typeof Brain;
		title: string;
		description: string;
		badge?: string;
	}> = [
		{
			icon: Brain,
			title: 'AI-Powered Generation',
			description:
				'Generate exercises with high accuracy using advanced AI algorithms tailored to your curriculum.'
		},
		{
			icon: BookOpen,
			title: 'Multiple Subjects',
			description: 'Support for various subjects and topics, covering all your educational needs.'
		},
		{
			icon: Target,
			title: 'Exam Preparation',
			description:
				'Create targeted practice materials to help students prepare effectively for tests and examinations.'
		},
		{
			icon: Clock,
			title: 'Time-Saving',
			description: 'Dramatically reduce the time teachers spend creating exercises and quizzes.'
		},
		{
			icon: Users,
			title: 'Reduce Human Resources',
			description:
				'Minimize the workload on educators while maintaining high-quality educational content.'
		},
		{
			icon: Zap,
			title: 'Quick & Efficient',
			description: 'Generate comprehensive exercise sets in seconds, not hours.'
		},
		{
			icon: Shield,
			title: 'Security & Privacy',
			description:
				'Admin-only access to leaderboards and announcements. Secure role-based access control for sensitive features.'
		},
		{
			icon: Bell,
			title: 'Parent Notifications',
			description:
				'Coming soon: Automatic notifications to parents about student debts and payment reminders.',
			badge: 'Coming Soon'
		},
		{
			icon: CreditCard,
			title: 'Debt Management',
			description:
				'Coming soon: Advanced tracking and management of student payment obligations with automated reminder system.',
			badge: 'Coming Soon'
		}
	];
</script>

<svelte:head>
	<title>HSGS: Hackathon 2025 - AI-Powered Exercise Generation</title>
	<meta
		name="description"
		content="Generate high-quality exercises and quizzes across multiple subjects with AI. Perfect for exam preparation and reducing teaching workload."
	/>
</svelte:head>

<div class="min-h-screen font-sans">
	<!-- Hero Section -->
	<div class="animated-gradient-bg relative overflow-hidden">
		<div class="container mx-auto max-w-6xl px-4 py-16">
			<div class="mb-12 text-center">
				<h1 class="animated-gradient-text mb-6 text-5xl font-bold md:text-6xl">
					AI-Powered Exercise Generation
				</h1>
				<p class="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground md:text-2xl">
					Transform your teaching with intelligent quiz and exercise generation. Save time, reduce
					workload, and deliver high-quality practice materials.
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a
						href="/problems"
						class="inline-flex items-center rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground clay-btn transition-colors hover:bg-primary/90"
					>
						Browse Problems
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="container mx-auto max-w-6xl px-4 py-16">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold md:text-4xl">Why Choose Our Platform?</h2>
			<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
				Built for educators, optimized for learning, powered by AI
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature}
				<div
					class="relative rounded-lg border border-border bg-card p-6 transition-transform hover:-translate-y-2 duration-300 clay-card"
				>
					{#if feature.badge}
						<span
							class="absolute top-4 right-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
						>
							{feature.badge}
						</span>
					{/if}
					<div class="mb-4">
						<svelte:component this={feature.icon} class="h-12 w-12 text-primary" />
					</div>
					<h3 class="mb-2 text-xl font-semibold">{feature.title}</h3>
					<p class="text-muted-foreground">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- CTA Section -->
	<div class="border-y border-border bg-primary/5">
		<div class="container mx-auto max-w-4xl px-4 py-16 text-center">
			<h2 class="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
			<p class="mb-8 text-lg text-muted-foreground">
				Join us in revolutionizing education with AI-powered exercise generation
			</p>
			<a
				href="/problems"
				class="inline-flex items-center rounded-lg bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground clay-btn transition-colors hover:bg-primary/90"
			>
				Explore Problems Now
			</a>
		</div>
	</div>
</div>
