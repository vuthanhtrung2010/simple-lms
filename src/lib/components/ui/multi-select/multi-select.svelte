<script module lang="ts">
	/**
	 * Animation types and configurations
	 */
	export interface AnimationConfig {
		/** Badge animation type */
		badgeAnimation?: 'bounce' | 'pulse' | 'wiggle' | 'fade' | 'slide' | 'none';
		/** Popover animation type */
		popoverAnimation?: 'scale' | 'slide' | 'fade' | 'flip' | 'none';
		/** Option hover animation type */
		optionHoverAnimation?: 'highlight' | 'scale' | 'glow' | 'none';
		/** Animation duration in seconds */
		duration?: number;
		/** Animation delay in seconds */
		delay?: number;
	}

	/**
	 * Option interface for MultiSelect component
	 */
	export interface MultiSelectOption {
		/** The text to display for the option. */
		label: string;
		/** The unique value associated with the option. */
		value: string;
		/** Optional icon component to display alongside the option. */
		icon?: any;
		/** Whether this option is disabled */
		disabled?: boolean;
		/** Custom styling for the option */
		style?: {
			/** Custom badge color */
			badgeColor?: string;
			/** Custom icon color */
			iconColor?: string;
			/** Gradient background for badge */
			gradient?: string;
		};
	}

	/**
	 * Group interface for organizing options
	 */
	export interface MultiSelectGroup {
		/** Group heading */
		heading: string;
		/** Options in this group */
		options: MultiSelectOption[];
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { tv, type VariantProps } from 'tailwind-variants';
	import { CheckIcon, ChevronDown, WandSparkles, XCircle, XIcon } from '@lucide/svelte';

	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Command,
		CommandEmpty,
		CommandGroup,
		CommandInput,
		CommandItem,
		CommandList,
		CommandSeparator
	} from '$lib/components/ui/command/index.js';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';

	/**
	 * Variants for the multi-select component to handle different styles.
	 */
	const multiSelectVariants = tv({
		base: 'm-1 transition-all duration-300 ease-in-out',
		variants: {
			variant: {
				default: 'border-foreground/10 text-foreground bg-card hover:bg-card/80',
				secondary:
					'border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80',
				destructive:
					'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
				inverted: 'inverted'
			},
			badgeAnimation: {
				bounce: 'hover:-translate-y-1 hover:scale-110',
				pulse: 'hover:animate-pulse',
				wiggle: 'hover:animate-wiggle',
				fade: 'hover:opacity-80',
				slide: 'hover:translate-x-1',
				none: ''
			}
		},
		defaultVariants: {
			variant: 'default',
			badgeAnimation: 'bounce'
		}
	});

	// Types are now defined in the script context="module" section above

	// Props
	const {
		options = [],
		defaultValue = [],
		placeholder = 'Select options',
		animation = 0,
		animationConfig = {},
		maxCount = 3,
		variant = 'default',
		hideSelectAll = false,
		searchable = true,
		emptyIndicator = undefined,
		autoSize = false,
		singleLine = false,
		popoverClassName = '',
		disabled = false,
		responsive = false,
		minWidth = undefined,
		maxWidth = undefined,
		deduplicateOptions = false,
		resetOnDefaultValueChange = true,
		closeOnSelect = false,
		className = '',
		onValueChange = () => {}
	} = $props<{
		options?: MultiSelectOption[] | MultiSelectGroup[];
		defaultValue?: string[];
		placeholder?: string;
		animation?: number;
		animationConfig?: AnimationConfig;
		maxCount?: number;
		variant?: VariantProps<typeof multiSelectVariants>['variant'];
		hideSelectAll?: boolean;
		searchable?: boolean;
		emptyIndicator?: string | undefined;
		autoSize?: boolean;
		singleLine?: boolean;
		popoverClassName?: string;
		disabled?: boolean;
		responsive?:
			| boolean
			| {
					mobile?: { maxCount?: number; hideIcons?: boolean; compactMode?: boolean };
					tablet?: { maxCount?: number; hideIcons?: boolean; compactMode?: boolean };
					desktop?: { maxCount?: number; hideIcons?: boolean; compactMode?: boolean };
			  };
		minWidth?: string | undefined;
		maxWidth?: string | undefined;
		deduplicateOptions?: boolean;
		resetOnDefaultValueChange?: boolean;
		closeOnSelect?: boolean;
		className?: string;
		onValueChange?: (values: string[]) => void;
	}>();

	// State
	let selectedValues = $state<string[]>(defaultValue);
	let isPopoverOpen = $state(false);
	let isAnimating = $state(false);
	let searchValue = $state('');
	let multiSelectId = $state(crypto.randomUUID());
	let listboxId = $derived(`${multiSelectId}-listbox`);
	let triggerDescriptionId = $derived(`${multiSelectId}-description`);
	let selectedCountId = $derived(`${multiSelectId}-count`);
	let prevDefaultValues = $state(defaultValue);
	let screenSize = $state<'mobile' | 'tablet' | 'desktop'>('desktop');
	let politeMessage = $state('');
	let assertiveMessage = $state('');
	let buttonRef: any;

	// onValueChange is now included in the props definition

	// Helper function to check if options are grouped
	function isGroupedOptions(
		opts: MultiSelectOption[] | MultiSelectGroup[]
	): opts is MultiSelectGroup[] {
		return opts.length > 0 && 'heading' in opts[0];
	}

	// Helper function to check if arrays are equal
	function arraysEqual(a: string[], b: string[]): boolean {
		if (a.length !== b.length) return false;
		const sortedA = [...a].sort();
		const sortedB = [...b].sort();
		return sortedA.every((val, index) => val === sortedB[index]);
	}

	// Get all options flattened
	function getAllOptions(): MultiSelectOption[] {
		if (options.length === 0) return [];
		let allOptions: MultiSelectOption[];

		if (isGroupedOptions(options)) {
			allOptions = options.flatMap((group) => group.options);
		} else {
			allOptions = options as MultiSelectOption[];
		}

		if (deduplicateOptions) {
			const valueSet = new Set<string>();
			const duplicates: string[] = [];
			const uniqueOptions: MultiSelectOption[] = [];

			allOptions.forEach((option) => {
				if (valueSet.has(option.value)) {
					duplicates.push(option.value);
				} else {
					valueSet.add(option.value);
					uniqueOptions.push(option);
				}
			});

			if (import.meta.env.DEV && duplicates.length > 0) {
				console.warn(
					`MultiSelect: Duplicate option values automatically removed: ${duplicates.join(', ')}.`
				);
			}

			return uniqueOptions;
		}

		return allOptions;
	}

	// Find option by value
	function getOptionByValue(value: string): MultiSelectOption | undefined {
		const option = getAllOptions().find((option) => option.value === value);
		if (!option && import.meta.env.DEV) {
			console.warn(`MultiSelect: Option with value "${value}" not found in options list`);
		}
		return option;
	}

	// Get filtered options based on search
	let filteredOptions = $derived(
		(() => {
			if (!searchable || !searchValue) return options;
			if (options.length === 0) return [];

			if (isGroupedOptions(options)) {
				return (options as MultiSelectGroup[])
					.map((group) => ({
						...group,
						options: group.options.filter(
							(option) =>
								option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
								option.value.toLowerCase().includes(searchValue.toLowerCase())
						)
					}))
					.filter((group) => group.options.length > 0);
			}

			return (options as MultiSelectOption[]).filter(
				(option) =>
					option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
					option.value.toLowerCase().includes(searchValue.toLowerCase())
			);
		})()
	);

	// Handle screen size changes
	function handleResize() {
		if (typeof window === 'undefined') return;

		const width = window.innerWidth;
		if (width < 640) {
			screenSize = 'mobile';
		} else if (width < 1024) {
			screenSize = 'tablet';
		} else {
			screenSize = 'desktop';
		}
	}

	// Get responsive settings based on screen size
	function getResponsiveSettings() {
		if (!responsive) {
			return {
				maxCount,
				hideIcons: false,
				compactMode: false
			};
		}

		if (responsive === true) {
			const defaultResponsive = {
				mobile: { maxCount: 2, hideIcons: false, compactMode: true },
				tablet: { maxCount: 4, hideIcons: false, compactMode: false },
				desktop: { maxCount: 6, hideIcons: false, compactMode: false }
			};

			const currentSettings = defaultResponsive[screenSize];
			return {
				maxCount: currentSettings?.maxCount ?? maxCount,
				hideIcons: currentSettings?.hideIcons ?? false,
				compactMode: currentSettings?.compactMode ?? false
			};
		}

		const currentSettings = responsive[screenSize];
		return {
			maxCount: currentSettings?.maxCount ?? maxCount,
			hideIcons: currentSettings?.hideIcons ?? false,
			compactMode: currentSettings?.compactMode ?? false
		};
	}

	// Animation classes
	function getBadgeAnimationClass() {
		if (animationConfig?.badgeAnimation) {
			switch (animationConfig.badgeAnimation) {
				case 'bounce':
					return isAnimating ? 'animate-bounce' : 'hover:-translate-y-1 hover:scale-110';
				case 'pulse':
					return 'hover:animate-pulse';
				case 'wiggle':
					return 'hover:animate-wiggle';
				case 'fade':
					return 'hover:opacity-80';
				case 'slide':
					return 'hover:translate-x-1';
				case 'none':
					return '';
				default:
					return '';
			}
		}
		return isAnimating ? 'animate-bounce' : '';
	}

	function getPopoverAnimationClass() {
		if (animationConfig?.popoverAnimation) {
			switch (animationConfig.popoverAnimation) {
				case 'scale':
					return 'animate-scaleIn';
				case 'slide':
					return 'animate-slideInDown';
				case 'fade':
					return 'animate-fadeIn';
				case 'flip':
					return 'animate-flipIn';
				case 'none':
					return '';
				default:
					return '';
			}
		}
		return '';
	}

	function getWidthConstraints() {
		const defaultMinWidth = screenSize === 'mobile' ? '0px' : '200px';
		const effectiveMinWidth = minWidth || defaultMinWidth;
		const effectiveMaxWidth = maxWidth || '100%';

		return {
			minWidth: effectiveMinWidth,
			maxWidth: effectiveMaxWidth,
			width: autoSize ? 'auto' : '100%'
		};
	}

	// Actions
	function handleInputKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			isPopoverOpen = true;
		} else if (event.key === 'Backspace' && !searchValue) {
			const newSelectedValues = [...selectedValues];
			newSelectedValues.pop();
			selectedValues = newSelectedValues;
			onValueChange(selectedValues);
		}
	}

	function toggleOption(optionValue: string) {
		if (disabled) return;

		const option = getOptionByValue(optionValue);
		if (option?.disabled) return;

		const newSelectedValues = selectedValues.includes(optionValue)
			? selectedValues.filter((value) => value !== optionValue)
			: [...selectedValues, optionValue];

		selectedValues = newSelectedValues;
		onValueChange(selectedValues);

		if (closeOnSelect) {
			isPopoverOpen = false;
		}
	}

	function handleClear() {
		if (disabled) return;

		selectedValues = [];
		onValueChange(selectedValues);
	}

	function clearExtraOptions() {
		if (disabled) return;

		const responsiveSettings = getResponsiveSettings();
		const newSelectedValues = selectedValues.slice(0, responsiveSettings.maxCount);
		selectedValues = newSelectedValues;
		onValueChange(selectedValues);
	}

	function toggleAll() {
		if (disabled) return;

		const allOptions = getAllOptions().filter((option) => !option.disabled);

		if (selectedValues.length === allOptions.length) {
			handleClear();
		} else {
			const allValues = allOptions.map((option) => option.value);
			selectedValues = allValues;
			onValueChange(selectedValues);
		}

		if (closeOnSelect) {
			isPopoverOpen = false;
		}
	}

	// Reactive functions for responsive design
	let responsiveSettings = $derived(getResponsiveSettings());
	let widthConstraints = $derived(getWidthConstraints());

	// Announce changes for accessibility
	function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
		if (priority === 'assertive') {
			assertiveMessage = message;
			setTimeout(() => (assertiveMessage = ''), 100);
		} else {
			politeMessage = message;
			setTimeout(() => (politeMessage = ''), 100);
		}
	}

	// Public API methods
	export function reset() {
		selectedValues = defaultValue;
		isPopoverOpen = false;
		searchValue = '';
		onValueChange(selectedValues);
	}

	export function getSelectedValues(): string[] {
		return selectedValues;
	}

	export function setSelectedValues(values: string[]) {
		selectedValues = values;
		onValueChange(selectedValues);
	}

	export function clear() {
		selectedValues = [];
		onValueChange(selectedValues);
	}

	export function focus() {
		if (buttonRef) {
			buttonRef.focus();
			const originalOutline = buttonRef.style.outline;
			const originalOutlineOffset = buttonRef.style.outlineOffset;
			buttonRef.style.outline = '2px solid hsl(var(--ring))';
			buttonRef.style.outlineOffset = '2px';
			setTimeout(() => {
				if (buttonRef) {
					buttonRef.style.outline = originalOutline;
					buttonRef.style.outlineOffset = originalOutlineOffset;
				}
			}, 1000);
		}
	}

	// Effects
	onMount(() => {
		handleResize();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	$effect(() => {
		if (isPopoverOpen === false) {
			searchValue = '';
		}
	});

	// Reset on defaultValue change
	$effect(() => {
		if (resetOnDefaultValueChange && !arraysEqual(prevDefaultValues, defaultValue)) {
			if (!arraysEqual(selectedValues, defaultValue)) {
				selectedValues = [...defaultValue];
			}
			prevDefaultValues = [...defaultValue];
		}
	});

	// Accessibility announcements
	$effect(() => {
		const selectedCount = selectedValues.length;
		const allOptions = getAllOptions();
		const totalOptions = allOptions.filter((opt) => !opt.disabled).length;

		if (selectedCount !== prevDefaultValues.length) {
			const diff = selectedCount - prevDefaultValues.length;

			if (diff > 0) {
				const addedItems = selectedValues.slice(-diff);
				const addedLabels = addedItems
					.map((value) => allOptions.find((opt) => opt.value === value)?.label)
					.filter(Boolean);

				if (addedLabels.length === 1) {
					announce(
						`${addedLabels[0]} selected. ${selectedCount} of ${totalOptions} options selected.`
					);
				} else {
					announce(
						`${addedLabels.length} options selected. ${selectedCount} of ${totalOptions} total selected.`
					);
				}
			} else if (diff < 0) {
				announce(`Option removed. ${selectedCount} of ${totalOptions} options selected.`);
			}
			prevDefaultValues = [...selectedValues];
		}
	});
</script>

<div class="sr-only">
	<div aria-live="polite" aria-atomic="true" role="status">
		{politeMessage}
	</div>
	<div aria-live="assertive" aria-atomic="true" role="alert">
		{assertiveMessage}
	</div>
</div>

<Popover bind:open={isPopoverOpen}>
	<div id={triggerDescriptionId} class="sr-only">
		Multi-select dropdown. Use arrow keys to navigate, Enter to select, and Escape to close.
	</div>
	<div id={selectedCountId} class="sr-only" aria-live="polite">
		{selectedValues.length === 0
			? 'No options selected'
			: `${selectedValues.length} option${
					selectedValues.length === 1 ? '' : 's'
				} selected: ${selectedValues
					.map((value) => getOptionByValue(value)?.label)
					.filter(Boolean)
					.join(', ')}`}
	</div>

	<PopoverTrigger>
		<Button
			bind:this={buttonRef}
			{disabled}
			role="combobox"
			aria-expanded={isPopoverOpen}
			aria-haspopup="listbox"
			aria-controls={isPopoverOpen ? listboxId : undefined}
			aria-describedby={`${triggerDescriptionId} ${selectedCountId}`}
			aria-label={`Multi-select: ${selectedValues.length} of ${
				getAllOptions().length
			} options selected. ${placeholder}`}
			class={cn(
				'flex h-auto min-h-10 items-center justify-between rounded-md border bg-inherit p-1 hover:bg-inherit [&_svg]:pointer-events-auto',
				autoSize ? 'w-auto' : 'w-full',
				responsiveSettings.compactMode && 'min-h-8 text-sm',
				screenSize === 'mobile' && 'min-h-12 text-base',
				disabled && 'cursor-not-allowed opacity-50',
				className
			)}
			style={`min-width: ${widthConstraints.minWidth}; max-width: min(${widthConstraints.maxWidth}, 100%); width: ${widthConstraints.width};`}
		>
			{#if selectedValues.length > 0}
				<div class="flex w-full items-center justify-between">
					<div
						class={cn(
							'flex items-center gap-1',
							singleLine ? 'multiselect-singleline-scroll overflow-x-auto' : 'flex-wrap',
							responsiveSettings.compactMode && 'gap-0.5'
						)}
						style={singleLine ? 'padding-bottom: 4px;' : ''}
					>
						{#each selectedValues.slice(0, responsiveSettings.maxCount) as value}
							{#if getOptionByValue(value)}
								{@const option = getOptionByValue(value)}
								{@const IconComponent = option?.icon}
								{@const customStyle = option?.style}
								<Badge
									class={cn(
										getBadgeAnimationClass(),
										multiSelectVariants({ variant }),
										customStyle?.gradient && 'border-transparent text-white',
										responsiveSettings.compactMode && 'px-1.5 py-0.5 text-xs',
										screenSize === 'mobile' && 'max-w-[120px] truncate',
										singleLine && 'flex-shrink-0 whitespace-nowrap',
										'[&>svg]:pointer-events-auto'
									)}
									style={`
                    animation-duration: ${animationConfig?.duration || animation}s;
                    animation-delay: ${animationConfig?.delay || 0}s;
                    ${customStyle?.badgeColor ? `background-color: ${customStyle.badgeColor};` : ''}
                    ${customStyle?.gradient ? `background: ${customStyle.gradient}; color: white;` : ''}
                  `}
								>
									{#if IconComponent && !responsiveSettings.hideIcons}
										<IconComponent
											class={cn(
												'mr-2 h-4 w-4',
												responsiveSettings.compactMode && 'mr-1 h-3 w-3',
												customStyle?.iconColor && 'text-current'
											)}
											style={customStyle?.iconColor ? `color: ${customStyle.iconColor}` : ''}
										/>
									{/if}
									<span class={cn(screenSize === 'mobile' && 'truncate')}>
										{option?.label}
									</span>
									<div
										role="button"
										tabindex={0}
										onclick={(e) => {
											e.stopPropagation();
											toggleOption(value);
										}}
										onkeydown={(event) => {
											if (event.key === 'Enter' || event.key === ' ') {
												event.preventDefault();
												event.stopPropagation();
												toggleOption(value);
											}
										}}
										aria-label={`Remove ${option?.label} from selection`}
										class="ml-1 flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm hover:bg-white/20 focus:ring-1 focus:ring-white/50 focus:outline-none"
									>
										<XCircle
											class={cn('h-3 w-3', responsiveSettings.compactMode && 'h-2.5 w-2.5')}
										/>
									</div>
								</Badge>
							{/if}
						{/each}

						{#if selectedValues.length > responsiveSettings.maxCount}
							<Badge
								class={cn(
									'inline-flex h-6 items-center gap-1 px-2',
									getBadgeAnimationClass(),
									multiSelectVariants({ variant }),
									responsiveSettings.compactMode && 'h-5 text-xs'
								)}
								style={`
                  animation-duration: ${animationConfig?.duration || animation}s;
                  animation-delay: ${animationConfig?.delay || 0}s;
                `}
							>
								{`+ ${selectedValues.length - responsiveSettings.maxCount} more`}
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										clearExtraOptions();
									}}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											clearExtraOptions();
										}
									}}
									aria-label="Clear extra selected items"
								>
									<XCircle
										class={cn(
											'ml-2 h-4 w-4 cursor-pointer',
											responsiveSettings.compactMode && 'ml-1 h-3 w-3'
										)}
									/>
								</button>
							</Badge>
						{/if}
					</div>
					<div class="flex items-center justify-between">
						<div
							role="button"
							tabindex={0}
							onclick={(e) => {
								e.stopPropagation();
								handleClear();
							}}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									event.stopPropagation();
									handleClear();
								}
							}}
							aria-label={`Clear all ${selectedValues.length} selected options`}
							class="mx-2 flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:outline-none"
						>
							<XIcon class="h-4 w-4" />
						</div>
						<Separator orientation="vertical" class="flex h-full min-h-6" />
						<ChevronDown class="mx-2 h-4 cursor-pointer text-muted-foreground" aria-hidden="true" />
					</div>
				</div>
			{:else}
				<div class="mx-auto flex w-full items-center justify-between">
					<span class="mx-3 text-sm text-muted-foreground">{placeholder}</span>
					<ChevronDown class="mx-2 h-4 cursor-pointer text-muted-foreground" />
				</div>
			{/if}
		</Button>
	</PopoverTrigger>

	<PopoverContent
		id={listboxId}
		role="listbox"
		aria-multiselectable="true"
		aria-label="Available options"
		class={cn(
			'w-auto p-0',
			getPopoverAnimationClass(),
			screenSize === 'mobile' && 'w-[85vw] max-w-[280px]',
			screenSize === 'tablet' && 'w-[70vw] max-w-md',
			screenSize === 'desktop' && 'min-w-[300px]',
			popoverClassName
		)}
		style={`
      animation-duration: ${animationConfig?.duration || animation}s;
      animation-delay: ${animationConfig?.delay || 0}s;
      max-width: min(${widthConstraints.maxWidth}, 85vw);
      max-height: ${screenSize === 'mobile' ? '70vh' : '60vh'};
      touch-action: manipulation;
    `}
	>
		<Command>
			{#if searchable}
				<CommandInput
					placeholder="Search options..."
					onkeydown={handleInputKeyDown}
					bind:value={searchValue}
					aria-label="Search through available options"
					aria-describedby={`${multiSelectId}-search-help`}
				/>
				<div id={`${multiSelectId}-search-help`} class="sr-only">
					Type to filter options. Use arrow keys to navigate results.
				</div>
			{/if}

			<CommandList
				class={cn(
					'multiselect-scrollbar max-h-[40vh] overflow-y-auto',
					screenSize === 'mobile' && 'max-h-[50vh]',
					'overscroll-behavior-y-contain'
				)}
			>
				<CommandEmpty>{emptyIndicator || 'No results found.'}</CommandEmpty>

				{#if !hideSelectAll && !searchValue}
					<CommandGroup>
						<CommandItem
							onSelect={toggleAll}
							role="option"
							aria-selected={selectedValues.length ===
								getAllOptions().filter((opt) => !opt.disabled).length}
							aria-label={`Select all ${getAllOptions().length} options`}
							class="cursor-pointer"
						>
							<div
								class={cn(
									'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
									selectedValues.length === getAllOptions().filter((opt) => !opt.disabled).length
										? 'bg-primary text-primary-foreground'
										: 'opacity-50 [&_svg]:invisible'
								)}
								aria-hidden="true"
							>
								<CheckIcon class="h-4 w-4" />
							</div>
							<span>
								(Select All
								{getAllOptions().length > 20 ? ` - ${getAllOptions().length} options` : ''})
							</span>
						</CommandItem>
					</CommandGroup>
				{/if}

				{#if isGroupedOptions(filteredOptions)}
					{#each filteredOptions as group}
						<CommandGroup heading={group.heading}>
							{#each group.options as option}
								{@const isSelected = selectedValues.includes(option.value)}
								<CommandItem
									onSelect={() => toggleOption(option.value)}
									role="option"
									aria-selected={isSelected}
									aria-disabled={option.disabled}
									aria-label={`${option.label}${isSelected ? ', selected' : ', not selected'}${option.disabled ? ', disabled' : ''}`}
									class={cn('cursor-pointer', option.disabled && 'cursor-not-allowed opacity-50')}
									disabled={option.disabled}
								>
									<div
										class={cn(
											'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
											isSelected
												? 'bg-primary text-primary-foreground'
												: 'opacity-50 [&_svg]:invisible'
										)}
										aria-hidden="true"
									>
										<CheckIcon class="h-4 w-4" />
									</div>
									{#if option.icon}
										{#key option.icon}
											<option.icon class="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
										{/key}
									{/if}
									<span>{option.label}</span>
								</CommandItem>
							{/each}
						</CommandGroup>
					{/each}
				{:else}
					<CommandGroup>
						{#each filteredOptions as option}
							{@const isSelected = selectedValues.includes(option.value)}
							<CommandItem
								onSelect={() => toggleOption(option.value)}
								role="option"
								aria-selected={isSelected}
								aria-disabled={option.disabled}
								aria-label={`${option.label}${isSelected ? ', selected' : ', not selected'}${option.disabled ? ', disabled' : ''}`}
								class={cn('cursor-pointer', option.disabled && 'cursor-not-allowed opacity-50')}
								disabled={option.disabled}
							>
								<div
									class={cn(
										'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
										isSelected
											? 'bg-primary text-primary-foreground'
											: 'opacity-50 [&_svg]:invisible'
									)}
									aria-hidden="true"
								>
									<CheckIcon class="h-4 w-4" />
								</div>
								{#if option.icon}
									{#key option.icon}
										<option.icon class="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
									{/key}
								{/if}
								<span>{option.label}</span>
							</CommandItem>
						{/each}
					</CommandGroup>
				{/if}

				<CommandSeparator />
				<CommandGroup>
					<div class="flex items-center justify-between">
						{#if selectedValues.length > 0}
							<CommandItem onSelect={handleClear} class="flex-1 cursor-pointer justify-center">
								Clear
							</CommandItem>
							<Separator orientation="vertical" class="flex h-full min-h-6" />
						{/if}
						<CommandItem
							onSelect={() => (isPopoverOpen = false)}
							class="max-w-full flex-1 cursor-pointer justify-center"
						>
							Close
						</CommandItem>
					</div>
				</CommandGroup>
			</CommandList>
		</Command>
	</PopoverContent>

	{#if animation > 0 && selectedValues.length > 0}
		<WandSparkles
			class={cn(
				'my-2 h-3 w-3 cursor-pointer bg-background text-foreground',
				isAnimating ? '' : 'text-muted-foreground'
			)}
			onclick={() => (isAnimating = !isAnimating)}
		/>
	{/if}
</Popover>

<style>
	:global(.multiselect-scrollbar::-webkit-scrollbar) {
		width: 6px;
		height: 6px;
	}

	:global(.multiselect-scrollbar::-webkit-scrollbar-track) {
		background: transparent;
	}

	:global(.multiselect-scrollbar::-webkit-scrollbar-thumb) {
		background-color: rgba(100, 100, 100, 0.5);
		border-radius: 3px;
	}

	:global(.multiselect-singleline-scroll::-webkit-scrollbar) {
		height: 2px;
	}

	:global(.animate-wiggle) {
		animation: wiggle 1s ease-in-out infinite;
	}

	:global(.animate-scaleIn) {
		animation: scaleIn 0.2s ease-out;
	}

	:global(.animate-slideInDown) {
		animation: slideInDown 0.3s ease-out;
	}

	:global(.animate-fadeIn) {
		animation: fadeIn 0.2s ease-out;
	}

	:global(.animate-flipIn) {
		animation: flipIn 0.3s ease-out;
	}

	@keyframes wiggle {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}

	@keyframes scaleIn {
		from {
			transform: scale(0.95);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes slideInDown {
		from {
			transform: translateY(-10px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes flipIn {
		from {
			transform: perspective(400px) rotateX(-10deg);
			opacity: 0;
		}
		to {
			transform: perspective(400px) rotateX(0);
			opacity: 1;
		}
	}
</style>
