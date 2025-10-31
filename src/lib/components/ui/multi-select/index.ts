import MultiSelect from './multi-select.svelte';
// Import the types directly from the module
import type {
	MultiSelectOption as MultiSelectOptionType,
	MultiSelectGroup as MultiSelectGroupType,
	AnimationConfig as AnimationConfigType
} from './multi-select.svelte';

// Export component
export { MultiSelect };

// Export types with renamed aliases
export type MultiSelectOption = MultiSelectOptionType;
export type MultiSelectGroup = MultiSelectGroupType;
export type AnimationConfig = AnimationConfigType;
