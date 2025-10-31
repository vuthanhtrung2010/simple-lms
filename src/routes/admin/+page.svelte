<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Config } from '$lib/config.js';
</script>

<h1 class="mb-4 text-3xl font-bold">{m['adminPage.title']()}</h1>
<p class="text-lg">{m['adminPage.description']({ sitename: Config.sitename })}</p>
