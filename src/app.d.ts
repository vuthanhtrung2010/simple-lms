import { D1Database } from './types.ts';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			db: D1Database;
			session: AuthSession | null;
			user: User | null;
			sessionToken: string | null;
		}
		interface PageData {
			session: AuthSession | null;
			user: User | null;
		}
		// interface PageState {}
		interface Platform {
			env: Env;
			cf: CfProperties;
			ctx: ExecutionContext;
		}
	}
}

export {};
