import type { PageServerLoad } from './$types.js';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import {
	courses,
	courseProblems,
	problems,
	questions,
	enrollments,
	submissions,
	questionAnswers
} from '$lib/server/db/schema.js';
import { gradeSubmission } from '$lib/grader.js';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { courseId, problemId } = params;
	const attemptNumber = parseInt(url.searchParams.get('attempt') || '1', 10);

	// Require authentication
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const db = locals.db;

	// Ensure course exists
	const course = await db
		.select({ id: courses.id, title: courses.title })
		.from(courses)
		.where(and(eq(courses.id, courseId), eq(courses.isDeleted, false)))
		.get();

	if (!course) {
		error(404, 'Course not found');
	}

	// Ensure current user is enrolled
	const enrollment = await db
		.select({ id: enrollments.id })
		.from(enrollments)
		.where(
			and(
				eq(enrollments.courseId, courseId),
				eq(enrollments.userId, locals.user.id!),
				eq(enrollments.isDeleted, false)
			)
		)
		.get();

	if (!enrollment) {
		error(403, 'You are not enrolled in this course');
	}

	// Ensure problem exists and is linked to course
	const problemIdNum = Number(problemId);
	if (!Number.isInteger(problemIdNum)) {
		error(404, 'Problem not found');
	}

	const link = await db
		.select({ problemId: courseProblems.problemId })
		.from(courseProblems)
		.where(and(eq(courseProblems.courseId, courseId), eq(courseProblems.problemId, problemId)))
		.get();

	if (!link) {
		error(404, 'Problem not found in this course');
	}

	const problem = await db
		.select({
			id: problems.id,
			title: problems.title,
			showAnswers: problems.showAnswers
		})
		.from(problems)
		.where(eq(problems.id, problemIdNum))
		.get();

	if (!problem) {
		error(404, 'Problem not found');
	}

	// Find the submission
	const submission = await db
		.select({
			id: submissions.id,
			attemptNumber: submissions.attemptNumber,
			status: submissions.status,
			startedAt: submissions.startedAt,
			submittedAt: submissions.submittedAt,
			score: submissions.score,
			maxScore: submissions.maxScore
		})
		.from(submissions)
		.where(
			and(
				eq(submissions.userId, locals.user.id!),
				eq(submissions.problemId, String(problem.id)),
				eq(submissions.attemptNumber, attemptNumber)
			)
		)
		.get();

	if (!submission) {
		error(404, 'Submission not found');
	}

	// Load questions with config
	const rawQuestions = await db
		.select({
			id: questions.id,
			questionType: questions.questionType,
			questionText: questions.questionText,
			config: questions.config,
			orderIndex: questions.orderIndex,
			points: questions.points,
			explanation: questions.explanation
		})
		.from(questions)
		.where(eq(questions.problemId, String(problem.id)))
		.orderBy(questions.orderIndex)
		.all();

	// Parse config strings
	const parsedQuestions = rawQuestions.map((q) => {
		let parsedConfig = q.config;
		if (typeof q.config === 'string') {
			try {
				parsedConfig = JSON.parse(q.config);
			} catch (e) {
				parsedConfig = null;
			}
		}
		return { ...q, config: parsedConfig };
	});

	// Load user answers
	const userAnswers = await db
		.select({
			questionId: questionAnswers.questionId,
			answer: questionAnswers.answerData
		})
		.from(questionAnswers)
		.where(eq(questionAnswers.submissionId, submission.id))
		.all();

	// Parse answer JSON
	const parsedAnswers = userAnswers.map((ans) => {
		let parsedAnswer = ans.answer;
		if (typeof ans.answer === 'string') {
			try {
				parsedAnswer = JSON.parse(ans.answer);
			} catch (e) {
				parsedAnswer = ans.answer;
			}
		}

		const question = parsedQuestions.find((q) => q.id === ans.questionId);
		return {
			questionId: ans.questionId,
			questionType: question?.questionType || 'text_only',
			answer: parsedAnswer
		};
	});

	// Grade the submission
	const gradeResult = gradeSubmission(parsedQuestions as any, parsedAnswers as any);

	// Determine if answers should be shown
	const canShowAnswers =
		problem.showAnswers === 'always' ||
		problem.showAnswers === 'after_submission' ||
		(problem.showAnswers === 'after_due' && submission.status === 'graded');

	return {
		course,
		problem: {
			id: problem.id,
			title: problem.title,
			canShowAnswers
		},
		submission: {
			id: submission.id,
			attemptNumber: submission.attemptNumber,
			status: submission.status,
			startedAt: submission.startedAt,
			submittedAt: submission.submittedAt,
			score: submission.score,
			maxScore: submission.maxScore
		},
		grading: {
			results: gradeResult.results,
			totalPoints: gradeResult.totalPoints,
			earnedPoints: gradeResult.earnedPoints,
			percentage: gradeResult.percentage
		},
		questions: parsedQuestions.map((q) => ({
			id: q.id,
			questionType: q.questionType,
			questionText: q.questionText,
			orderIndex: q.orderIndex,
			points: q.points,
			config: q.config,
			explanation: q.explanation
		})),
		userAnswers: parsedAnswers
	};
};
