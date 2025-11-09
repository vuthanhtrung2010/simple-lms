import type { Actions, PageServerLoad } from './$types.js';
import { courses, enrollments, enrollmentRequests } from '$lib/server/db/schema.js';
import { and, eq, isNull, or } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user?.id;
	const isAdmin = locals.user?.perms && hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE);

	// Get all courses
	const allCourses = await locals.db.select().from(courses).where(eq(courses.isDeleted, false)).all();

	// Get user's enrollments if logged in
	let userEnrollments: typeof enrollments.$inferSelect[] = [];
	let userRequests: typeof enrollmentRequests.$inferSelect[] = [];
	
	if (userId) {
		userEnrollments = await locals.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.userId, userId),
					eq(enrollments.isDeleted, false)
				)
			)
			.all();

		userRequests = await locals.db
			.select()
			.from(enrollmentRequests)
			.where(eq(enrollmentRequests.userId, userId))
			.all();
	}

	const enrolledCourseIds = new Set(userEnrollments.map(e => e.courseId));
	const requestedCourseIds = new Map(
		userRequests.map(r => [r.courseId, r.status])
	);

	// Filter courses based on enrollment mode and user status
	const visibleCourses = allCourses.filter(course => {
		// Admin can see all courses
		if (isAdmin) return true;

		// Hidden courses: only if enrolled
		if (course.enrollmentMode === 'hidden') {
			return enrolledCourseIds.has(course.id);
		}

		// Request/Free modes: always visible
		return true;
	});

	return {
		courses: visibleCourses,
		enrolledCourseIds: Array.from(enrolledCourseIds),
		requestedCourseIds: Object.fromEntries(requestedCourseIds),
		isAdmin: !!isAdmin,
		userId
	};
};

export const actions: Actions = {
	join: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in to join a course.' });
		}

		const data = await request.formData();
		const courseId = data.get('courseId') as string;

		if (!courseId) {
			return fail(400, { error: 'Course ID is required.' });
		}

		// Get the course
		const course = await locals.db
			.select()
			.from(courses)
			.where(and(eq(courses.id, courseId), eq(courses.isDeleted, false)))
			.get();

		if (!course) {
			return fail(404, { error: 'Course not found.' });
		}

		// Check enrollment mode
		if (course.enrollmentMode === 'hidden') {
			return fail(403, { error: 'This course is hidden and requires admin approval.' });
		}

		// Check if already enrolled
		const existingEnrollment = await locals.db
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

		if (existingEnrollment) {
			return fail(400, { error: 'You are already enrolled in this course.' });
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
				requestedAt: Date.now()
			});

			return { success: true, message: 'Request sent! Waiting for admin approval.' };
		}

		return fail(400, { error: 'Invalid enrollment mode.' });
	},

	cancelRequest: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, { error: 'You must be logged in.' });
		}

		const data = await request.formData();
		const courseId = data.get('courseId') as string;

		if (!courseId) {
			return fail(400, { error: 'Course ID is required.' });
		}

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
