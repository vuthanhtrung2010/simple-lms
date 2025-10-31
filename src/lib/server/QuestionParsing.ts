import { v4 as uuidv4 } from 'uuid';
import type { BaseQuestion, MatchingConfig, MediaUrl } from '../../types.js';

// Helper: Check if a string is a full URL
function isFullUrl(url: string): boolean {
	return /^https?:\/\//.test(url);
}

// Helper: Get extension from filename or mime
function getExtension(filename: string, mimeType?: string): string | undefined {
	const match = filename.match(/\.([a-zA-Z0-9]+)$/);
	if (match) return match[1].toLowerCase();
	if (mimeType) {
		// getMimeType is a function, not a map, so this is a fallback
		const ext = mimeType.split('/').pop();
		if (ext) return ext;
	}
	return undefined;
}

// Validate matching question config
function validateMatchingConfig(config: MatchingConfig): string[] {
	const errors: string[] = [];
	const choiceIds = new Set<string>(config.choices.map((c: { id: string }) => c.id));
	for (const item of config.items) {
		if (!choiceIds.has(item.correctAnswer)) {
			errors.push(`Matching item answer '${item.correctAnswer}' not found in choices.`);
		}
	}
	return errors;
}

// Main validator and media extractor
export async function validateAndExtractQuestions({
	questions,
	r2,
	domain,
	mediaFiles
}: {
	questions: BaseQuestion[];
	r2: R2Bucket; // R2 bucket instance
	domain: string; // e.g. https://mysite.com
	mediaFiles: Record<string, ArrayBuffer>; // Map of original media name to file data
}): Promise<{ valid: boolean; errors: string[]; questions: BaseQuestion[] }> {
	const errors: string[] = [];
	const newQuestions: BaseQuestion[] = [];

	for (const q of questions) {
		// Validate required fields
		if (!q.questionType || !q.questionText || typeof q.orderIndex !== 'number') {
			errors.push(`Missing required fields in question at orderIndex ${q.orderIndex}`);
			continue;
		}
		// Validate matching config
		if (q.questionType === 'matching' && q.config) {
			errors.push(...validateMatchingConfig(q.config as MatchingConfig));
		}
		// Media extraction
		let newMedia: MediaUrl[] = [];
		if (q.media && Array.isArray(q.media)) {
			for (const m of q.media) {
				if (typeof m === 'string' && isFullUrl(m)) {
					newMedia.push(m as MediaUrl);
				} else if (typeof m === 'string') {
					// Assume m is a filename
					const ext = getExtension(m) || 'bin';
					const uuid = uuidv4();
					const filename = `${uuid}.${ext}`;
					const fileData = mediaFiles[m];
					if (fileData) {
						await r2.put(filename, fileData);
						newMedia.push(`${domain}/file/${filename}` as MediaUrl);
					} else {
						errors.push(`Missing file data for media: ${m}`);
					}
				} else if (
					typeof m === 'object' &&
					m !== null &&
					'url' in m &&
					typeof (m as any).url === 'string'
				) {
					const mediaObj = m as any;
					if (isFullUrl(mediaObj.url)) {
						newMedia.push(mediaObj.url as MediaUrl);
					} else {
						const ext = getExtension(mediaObj.url, mediaObj.type) || 'bin';
						const uuid = uuidv4();
						const filename = `${uuid}.${ext}`;
						const fileData = mediaFiles[mediaObj.url];
						if (fileData) {
							await r2.put(filename, fileData);
							newMedia.push(`${domain}/file/${filename}` as MediaUrl);
						} else {
							errors.push(`Missing file data for media: ${mediaObj.url}`);
						}
					}
				}
			}
		}
		newQuestions.push({ ...q, media: newMedia });
	}

	return { valid: errors.length === 0, errors, questions: newQuestions };
}
