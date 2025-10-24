import { TURNSTILE_SECRET_KEY } from '$env/static/private';

interface TurnstileResponse {
	success: boolean;
	challenge_ts?: string;
	hostname?: string;
	'error-codes'?: string[];
	action?: string;
	cdata?: string;
}

export async function validateTurnstile(token: string, ip?: string): Promise<TurnstileResponse> {
	const formData = new FormData();
	formData.append('secret', TURNSTILE_SECRET_KEY);
	formData.append('response', token);
	if (ip) {
		formData.append('remoteip', ip);
	}

	try {
		const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: formData
		});

		const result = (await response.json()) as TurnstileResponse;
		return result;
	} catch (err) {
		console.error('Turnstile validation error:', err);
		return { success: false, 'error-codes': ['internal-error'] };
	}
}
