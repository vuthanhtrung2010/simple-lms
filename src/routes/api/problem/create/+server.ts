import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { validateApiKey } from '$lib/server/auth/apiAuth.js';
import { problems, questions, problemTypes } from '$lib/server/db/schema.js';
import JSZip from 'jszip';
import { validateAndExtractQuestions } from '$lib/server/QuestionParsing.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Validate API key
		const { userId } = await validateApiKey(request.headers.get('Authorization'), locals.db);

		// Parse multipart form data
		const formData = await request.formData();

		const title = formData.get('title') as string;
		const categoryId = formData.get('categoryId') as string;
		const typeIds = formData.getAll('types') as string[];
		const attemptsAllowed = formData.get('attemptsAllowed') as string;
		const showAnswers = formData.get('showAnswers') as string;
		const shuffleQuestions = formData.get('shuffleQuestions') as string;
		const splitScreen = formData.get('splitScreen') as string;
		const timeLimit = formData.get('timeLimit') as string;
		const questionsFile = formData.get('questionsFile') as File;

		// Validate required fields
		if (!title || title.trim().length === 0) {
			return json({ success: false, error: 'Title is required' }, { status: 400 });
		}

		if (!categoryId) {
			return json({ success: false, error: 'Category is required' }, { status: 400 });
		}

		if (!typeIds || typeIds.length === 0) {
			return json({ success: false, error: 'At least one type is required' }, { status: 400 });
		}

		if (!questionsFile) {
			return json({ success: false, error: 'Questions ZIP file is required' }, { status: 400 });
		}

		// 1. Unzip the file in-memory
		const zip = await JSZip.loadAsync(await questionsFile.arrayBuffer());
		const questionsJsonFile = zip.file('questions.json');
		if (!questionsJsonFile) {
			return json({ success: false, error: 'questions.json not found in ZIP' }, { status: 400 });
		}

		const questionsJsonStr = await questionsJsonFile.async('string');
		let parsed;
		try {
			parsed = JSON.parse(questionsJsonStr);
		} catch (e) {
			return json({ success: false, error: 'Invalid questions.json: ' + e }, { status: 400 });
		}

		const questionsArr = parsed.questions;
		const problemMediaArr = parsed.media;

		if (!Array.isArray(questionsArr)) {
			return json(
				{ success: false, error: 'questions.json does not contain a questions array' },
				{ status: 400 }
			);
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
			return json({ success: false, error: 'R2 bucket not available' }, { status: 500 });
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
				} else if (typeof m === 'object' && m !== null && 'url' in m && typeof m.url === 'string') {
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
			return json({ success: false, error: 'Validation failed', details: errors }, { status: 400 });
		}

		// 4. Create the problem
		const [newProblem] = await locals.db
			.insert(problems)
			.values({
				title: title.trim(),
				description: '',
				media: problemMedia.length > 0 ? JSON.stringify(problemMedia) : null,
				attemptsAllowed: parseInt(attemptsAllowed) || -1,
				showAnswers: showAnswers || 'after_submission',
				shuffleQuestions: shuffleQuestions === 'true',
				splitScreen: splitScreen === 'true',
				timeLimit: parseInt(timeLimit) || null,
				createdBy: userId,
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

		return json({
			success: true,
			problem: {
				id: newProblem.id,
				title: newProblem.title
			}
		});
	} catch (err: any) {
		console.error('Failed to create problem:', err);
		return json(
			{
				success: false,
				error: err.message || 'Failed to create problem'
			},
			{ status: err.status || 500 }
		);
	}
};
