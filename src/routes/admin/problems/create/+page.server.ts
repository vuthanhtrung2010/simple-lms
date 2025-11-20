import { hasPermission, UserPermissions } from '$lib/permissions.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { problems, questions, categories, types, problemTypes } from '$lib/server/db/schema.js';
import JSZip from 'jszip';
import { validateAndExtractQuestions } from '$lib/server/QuestionParsing.js';

export const load: PageServerLoad = async ({ locals }) => {
	// Load categories and types for the dropdowns
	const allCategories = await locals.db.select().from(categories).all();
	const allTypes = await locals.db.select().from(types).all();
	return {
		categories: allCategories,
		types: allTypes
	};
};

export const actions = {
	default: async ({ locals, request }) => {
		if (!locals.user?.perms || !hasPermission(locals.user.perms, UserPermissions.CREATE_PROBLEM))
			return fail(403, { error: 'You do not have permission to perform this action.' });

		const data = await request.formData();
		const title = data.get('title') as string;
		const description = data.get('description') as string;
		const categoryId = data.get('categoryId') as string;
		const typeIds = data.getAll('types') as string[];
		const attemptsAllowed = data.get('attemptsAllowed') as string;
		const showAnswers = data.get('showAnswers') as string;
		const shuffleQuestions = data.get('shuffleQuestions') === 'on';
		const splitScreen = data.get('splitScreen') === 'on';
		const timeLimit = data.get('timeLimit') as string;
		const questionsFile = data.get('questionsFile') as File;

		// Validate required fields
		if (!title || title.trim().length === 0) {
			return fail(400, { error: 'Title is required' });
		}

		if (!categoryId) {
			return fail(400, { error: 'Category is required' });
		}

		if (!typeIds || typeIds.length === 0) {
			return fail(400, { error: 'At least one type is required' });
		}

		try {
			// 1. Unzip the file in-memory
			if (!questionsFile) {
				return fail(400, { error: 'Questions ZIP file is required.' });
			}
			const zip = await JSZip.loadAsync(await questionsFile.arrayBuffer());
			const questionsJsonFile = zip.file('questions.json');
			if (!questionsJsonFile) {
				return fail(400, { error: 'questions.json not found in ZIP.' });
			}
			const questionsJsonStr = await questionsJsonFile.async('string');
			let parsed;
			try {
				parsed = JSON.parse(questionsJsonStr);
			} catch (e) {
				return fail(400, { error: 'Invalid questions.json: ' + e });
			}
			const questionsArr = parsed.questions;
			const problemMediaArr = parsed.media;
			if (!Array.isArray(questionsArr)) {
				return fail(400, { error: 'questions.json does not contain a questions array.' });
			}
			// 2. Collect media files from ZIP (in-memory)
			const mediaFiles: Record<string, ArrayBuffer> = {};
			const mediaFilePromises: Promise<void>[] = [];
			zip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
				if (!file.dir && relativePath !== 'questions.json') {
					mediaFilePromises.push(
						file.async('arraybuffer').then((buf) => {
							mediaFiles[relativePath] = buf;
						})
					);
				}
			});
			await Promise.all(mediaFilePromises);
			// 3. Validate and upload media, update URLs
			const domain = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
			if (!locals.r2) {
				return fail(500, { error: 'R2 bucket not available' });
			}
			// Handle problem-level media (attachments)
			let problemMedia: string[] = [];
			if (Array.isArray(problemMediaArr) && problemMediaArr.length > 0) {
				for (const m of problemMediaArr) {
					if (typeof m === 'string' && m.startsWith('http')) {
						problemMedia.push(m);
					} else if (typeof m === 'string') {
						const ext = m.split('.').pop() || 'bin';
						const uuid = crypto.randomUUID();
						const filename = `${uuid}.${ext}`;
						const fileData = mediaFiles[m];
						if (fileData) {
							await locals.r2.put(filename, fileData);
							problemMedia.push(`${domain}/file/${filename}`);
						}
					} else if (
						typeof m === 'object' &&
						m !== null &&
						'url' in m &&
						typeof m.url === 'string'
					) {
						if (m.url.startsWith('http')) {
							problemMedia.push(m.url);
						} else {
							const ext = m.url.split('.').pop() || 'bin';
							const uuid = crypto.randomUUID();
							const filename = `${uuid}.${ext}`;
							const fileData = mediaFiles[m.url];
							if (fileData) {
								await locals.r2.put(filename, fileData);
								problemMedia.push(`${domain}/file/${filename}`);
							}
						}
					}
				}
			}
			// Validate and upload question media
			const {
				valid,
				errors,
				questions: validatedQuestions
			} = await validateAndExtractQuestions({
				questions: questionsArr,
				r2: locals.r2,
				domain,
				mediaFiles
			});
			if (!valid) {
				return fail(400, { error: 'Validation failed', details: errors });
			}
			// 4. Create the problem
			const [newProblem] = await locals.db
				.insert(problems)
				.values({
					title: title.trim(),
					description: description?.trim() || '',
					media: problemMedia.length > 0 ? JSON.stringify(problemMedia) : null,
					attemptsAllowed: parseInt(attemptsAllowed) || -1,
					showAnswers: showAnswers || 'after_submission',
					shuffleQuestions: shuffleQuestions,
					splitScreen: splitScreen,
					timeLimit: parseInt(timeLimit) || null,
					createdBy: locals.user.id,
					categoryId: parseInt(categoryId)
				})
				.returning();
			// 5. Insert problem types into problemTypes junction table
			if (typeIds.length > 0) {
				await locals.db.insert(problemTypes).values(
					typeIds.map((typeId) => ({
						problemId: String(newProblem.id),
						typeId: parseInt(typeId)
					}))
				);
			}
			// 6. Insert questions into DB
			for (const q of validatedQuestions) {
				await locals.db.insert(questions).values({
					problemId: String(newProblem.id),
					questionType: q.questionType,
					questionText: q.questionText,
					explanation: q.explanation || '',
					points: q.points ?? 0,
					orderIndex: q.orderIndex,
					isRequired: true,
					config: q.config ? JSON.stringify(q.config) : null,
					media: q.media ? JSON.stringify(q.media) : null
				});
			}

			// Invalidate KV cache
			await locals.kv.delete('adminProblems');

			return {
				success: true
			};
		} catch (error) {
			console.error('Failed to create problem:', error);
			return fail(500, { error: 'Failed to create problem' });
		}
	}
} satisfies Actions;
