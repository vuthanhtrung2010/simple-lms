// Minimal MIME type mapping for serving files from R2
// Extend as needed.

const MIME_MAP: Record<string, string> = {
	// images
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	avif: 'image/avif',
	bmp: 'image/bmp',
	ico: 'image/x-icon',

	// video
	mp4: 'video/mp4',
	webm: 'video/webm',
	ogg: 'video/ogg',
	ogv: 'video/ogg',
	mov: 'video/quicktime',

	// audio
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	oga: 'audio/ogg',
	ogg_audio: 'audio/ogg',
	m4a: 'audio/mp4',

	// documents
	pdf: 'application/pdf',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	ppt: 'application/vnd.ms-powerpoint',
	pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

	// text/code
	txt: 'text/plain; charset=utf-8',
	csv: 'text/csv; charset=utf-8',
	json: 'application/json; charset=utf-8',
	html: 'text/html; charset=utf-8',
	css: 'text/css; charset=utf-8',
	js: 'text/javascript; charset=utf-8',
	mjs: 'text/javascript; charset=utf-8',
	ts: 'text/plain; charset=utf-8',
	md: 'text/markdown; charset=utf-8'
};

export function getMimeType(filenameOrExt: string): string {
	const lower = filenameOrExt.toLowerCase();
	const ext = lower.includes('.') ? lower.split('.').pop()! : lower;
	return MIME_MAP[ext] ?? 'application/octet-stream';
}
