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
				<p class="text-muted-foreground mx-auto mb-8 max-w-3xl text-xl md:text-2xl">
					Transform your teaching with intelligent quiz and exercise generation. Save time, reduce
					workload, and deliver high-quality practice materials.
				</p>
				<div class="flex flex-wrap justify-center gap-4">
					<a
						href="/problems"
						class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-lg px-6 py-3 font-semibold transition-colors"
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
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg">
				Built for educators, optimized for learning, powered by AI
			</p>
		</div>

		<div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
			{#each features as feature}
				<div
					class="border-border bg-card relative rounded-lg border p-6 transition-shadow hover:shadow-lg"
				>
					{#if feature.badge}
						<span
							class="bg-primary/10 text-primary absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold"
						>
							{feature.badge}
						</span>
					{/if}
					<div class="mb-4">
						<svelte:component this={feature.icon} class="text-primary h-12 w-12" />
					</div>
					<h3 class="mb-2 text-xl font-semibold">{feature.title}</h3>
					<p class="text-muted-foreground">{feature.description}</p>
				</div>
			{/each}
		</div>
	</div>

	<!-- CTA Section -->
	<div class="bg-primary/5 border-border border-y">
		<div class="container mx-auto max-w-4xl px-4 py-16 text-center">
			<h2 class="mb-4 text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
			<p class="text-muted-foreground mb-8 text-lg">
				Join us in revolutionizing education with AI-powered exercise generation
			</p>
			<a
				href="/problems"
				class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center rounded-lg px-8 py-4 text-lg font-semibold transition-colors"
			>
				Explore Problems Now
			</a>
		</div>
	</div>
</div>
