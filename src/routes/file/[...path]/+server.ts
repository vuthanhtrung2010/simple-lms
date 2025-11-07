import type { RequestHandler } from '@sveltejs/kit';
import { getMimeType } from '$lib/server/mime.js';

function getLastExtension(filename: string): string | undefined {
	const base = filename.split('/').pop() ?? '';
	const match = base.match(/\.([^.]+)$/);
	return match ? match[1].toLowerCase() : undefined;
}

function buildHeaders(obj: R2ObjectBody | R2Object, key: string) {
	const headers = new Headers();
	const ext = getLastExtension(key);
	const contentType =
		obj.httpMetadata?.contentType ?? (ext ? getMimeType(ext) : 'application/octet-stream');
	headers.set('Content-Type', contentType);
	if (obj.httpMetadata?.cacheControl) headers.set('Cache-Control', obj.httpMetadata.cacheControl);
	if (obj.etag) headers.set('ETag', obj.etag);
	if (obj.size !== undefined) headers.set('Content-Length', String(obj.size));
	// Encourage inline display when possible
	headers.set('Content-Disposition', `inline; filename="${key.split('/').pop() ?? 'file'}"`);
	return headers;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const bucket = locals.r2;
	if (!bucket) {
		return new Response('R2 bucket not available', { status: 500 });
	}

	const key = params.path;
	if (!key) return new Response('Missing file key', { status: 400 });

	const obj = await bucket.get(key);
	if (!obj) return new Response('Not found', { status: 404 });

	const headers = buildHeaders(obj, key);
	return new Response(obj.body, { status: 200, headers });
};

export const HEAD: RequestHandler = async ({ params, locals }) => {
	const bucket = locals.r2;
	if (!bucket) return new Response('R2 bucket not available', { status: 500 });

	const key = params.path;
	if (!key) return new Response('Missing file key', { status: 400 });

	const obj = await bucket.head(key);
	if (!obj) return new Response('Not found', { status: 404 });

	const headers = buildHeaders(obj, key);
	return new Response(null, { status: 200, headers });
};
