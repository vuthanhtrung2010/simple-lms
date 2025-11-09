import type { Actions, PageServerLoad } from './$types.js';
import { courses, enrollments, enrollmentRequests } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { processMarkdownToHtml } from '$lib/markdown-processor.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const courseId = params.courseId;
	const userId = locals.user?.id;

	// Get course
	const course = await locals.db
		.select()
		.from(courses)
		.where(and(eq(courses.id, courseId), eq(courses.isDeleted, false)))
		.get();

	if (!course) {
		throw redirect(302, '/courses');
	}

	// Process markdown description on server
	const descriptionHtml = course.description ? await processMarkdownToHtml(course.description) : '';

	// Get user's enrollment status
	let userEnrollment = null;
	let enrollmentRequest = null;

	if (userId) {
		userEnrollment = await locals.db
			.select()
			.from(enrollments)
			.where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))
			.get();

		enrollmentRequest = await locals.db
			.select()
			.from(enrollmentRequests)
			.where(and(eq(enrollmentRequests.userId, userId), eq(enrollmentRequests.courseId, courseId)))
			.get();
	}

	return {
		course,
		descriptionHtml,
		userEnrollment,
		enrollmentRequest,
		isEnrolled: userEnrollment && !userEnrollment.isDeleted,
		userId
	};
};

export const actions: Actions = {
	join: async ({ locals, params, request }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in.' });
		}

		const courseId = params.courseId;
		const formData = await request.formData();
		const reason = (formData.get('reason') as string) || null;

		// Get the course
		const course = await locals.db
			.select()
			.from(courses)
			.where(and(eq(courses.id, courseId), eq(courses.isDeleted, false)))
			.get();

		if (!course) {
			return fail(404, { error: 'Course not found.' });
		}

		if (course.enrollmentMode === 'hidden') {
			return fail(403, { error: 'This course is hidden.' });
		}

		// Check if already enrolled
		const existingEnrollment = await locals.db
			.select()
			.from(enrollments)
			.where(and(eq(enrollments.userId, locals.user.id), eq(enrollments.courseId, courseId)))
			.get();

		if (existingEnrollment) {
			if (existingEnrollment.isDeleted) {
				// Restore deleted enrollment
				await locals.db
					.update(enrollments)
					.set({
						isDeleted: false,
						enrolledAt: Date.now()
					})
					.where(eq(enrollments.id, existingEnrollment.id));

				return { success: true, message: 'Successfully re-joined the course!' };
			} else {
				return fail(400, { error: 'You are already enrolled in this course.' });
			}
		}

		if (course.enrollmentMode === 'free') {
			// Direct enrollment
			await locals.db.insert(enrollments).values({
				userId: locals.user.id,
				courseId,
				role: 'student',
				enrolledAt: Date.now(),
				isDeleted: false
			});

			return { success: true, message: 'Successfully joined the course!' };
		} else if (course.enrollmentMode === 'request') {
			// Check if already requested
			const existingRequest = await locals.db
				.select()
				.from(enrollmentRequests)
				.where(
					and(
						eq(enrollmentRequests.userId, locals.user.id),
						eq(enrollmentRequests.courseId, courseId)
					)
				)
				.get();

			if (existingRequest) {
				if (existingRequest.status === 'pending') {
					return fail(400, { error: 'You have already requested to join this course.' });
				} else if (existingRequest.status === 'approved') {
					return fail(400, { error: 'Your request was already approved.' });
				} else if (existingRequest.status === 'rejected') {
					// Update the rejected request to pending again
					await locals.db
						.update(enrollmentRequests)
						.set({
							status: 'pending',
							requestedAt: Date.now(),
							reviewedAt: null,
							reviewedBy: null,
							message: null
						})
						.where(eq(enrollmentRequests.id, existingRequest.id));

					return { success: true, message: 'Request re-submitted successfully!' };
				}
			}

			// Create new request
			await locals.db.insert(enrollmentRequests).values({
				userId: locals.user.id,
				courseId,
				status: 'pending',
				requestedAt: Date.now(),
				message: reason
			});

			return { success: true, message: 'Request sent! Waiting for admin approval.' };
		}

		return fail(400, { error: 'Invalid enrollment mode.' });
	},

	leave: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in.' });
		}

		const courseId = params.courseId;

		const enrollment = await locals.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.userId, locals.user.id),
					eq(enrollments.courseId, courseId),
					eq(enrollments.isDeleted, false)
				)
			)
			.get();

		if (!enrollment) {
			return fail(400, { error: 'You are not enrolled in this course.' });
		}

		// Soft delete the enrollment
		await locals.db
			.update(enrollments)
			.set({ isDeleted: true })
			.where(eq(enrollments.id, enrollment.id));

		return { success: true, message: 'Successfully left the course.' };
	},

	cancelRequest: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in.' });
		}

		const courseId = params.courseId;

		// Delete the request
		await locals.db
			.delete(enrollmentRequests)
			.where(
				and(
					eq(enrollmentRequests.userId, locals.user.id),
					eq(enrollmentRequests.courseId, courseId),
					eq(enrollmentRequests.status, 'pending')
				)
			);

		return { success: true, message: 'Request cancelled.' };
	}
};
