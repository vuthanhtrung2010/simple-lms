import type { PageServerLoad, Actions } from './$types.js';
import { error, fail } from '@sveltejs/kit';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { enrollmentRequests, users, courses, enrollments } from '$lib/server/db/schema.js';
import { hasPermission, UserPermissions } from '$lib/permissions.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (
		!locals.user ||
		!locals.user.perms ||
		!hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE)
	) {
		error(403, 'Unauthorized');
	}

	// Get all courses
	const allCourses = await locals.db
		.select({
			id: courses.id,
			title: courses.title
		})
		.from(courses)
		.where(eq(courses.isDeleted, false))
		.orderBy(courses.title)
		.all();

	// Get selected course from query param
	const selectedCourseParam = url.searchParams.get('course');
	let selectedCourseId: string | null = null;

	if (selectedCourseParam === 'all') {
		selectedCourseId = 'all';
	} else if (selectedCourseParam && allCourses.some((c) => c.id === selectedCourseParam)) {
		selectedCourseId = selectedCourseParam;
	} else {
		selectedCourseId = 'all';
	}

	// Build query based on selected course
	let requests;

	if (selectedCourseId === 'all') {
		requests = await locals.db
			.select({
				id: enrollmentRequests.id,
				userId: enrollmentRequests.userId,
				courseId: enrollmentRequests.courseId,
				status: enrollmentRequests.status,
				requestedAt: enrollmentRequests.requestedAt,
				message: enrollmentRequests.message,
				userName: users.fullname,
				userUsername: users.username,
				userEmail: users.email,
				courseName: courses.title
			})
			.from(enrollmentRequests)
			.innerJoin(users, eq(enrollmentRequests.userId, users.id))
			.innerJoin(courses, eq(enrollmentRequests.courseId, courses.id))
			.orderBy(desc(enrollmentRequests.requestedAt))
			.all();
	} else {
		requests = await locals.db
			.select({
				id: enrollmentRequests.id,
				userId: enrollmentRequests.userId,
				courseId: enrollmentRequests.courseId,
				status: enrollmentRequests.status,
				requestedAt: enrollmentRequests.requestedAt,
				message: enrollmentRequests.message,
				userName: users.fullname,
				userUsername: users.username,
				userEmail: users.email,
				courseName: courses.title
			})
			.from(enrollmentRequests)
			.innerJoin(users, eq(enrollmentRequests.userId, users.id))
			.innerJoin(courses, eq(enrollmentRequests.courseId, courses.id))
			.where(eq(enrollmentRequests.courseId, selectedCourseId))
			.orderBy(desc(enrollmentRequests.requestedAt))
			.all();
	}

	return {
		requests,
		courses: allCourses,
		selectedCourseId
	};
};

export const actions: Actions = {
	approve: async ({ locals, request }) => {
		if (
			!locals.user ||
			!locals.user.perms ||
			!hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE)
		) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const requestId = formData.get('requestId') as string;

		if (!requestId) {
			return fail(400, { error: 'Missing request ID' });
		}

		// Get the request
		const enrollmentRequest = await locals.db
			.select()
			.from(enrollmentRequests)
			.where(eq(enrollmentRequests.id, requestId))
			.get();

		if (!enrollmentRequest) {
			return fail(404, { error: 'Request not found' });
		}

		if (enrollmentRequest.status !== 'pending') {
			return fail(400, { error: 'Request already processed' });
		}

		// Check if user is already enrolled
		const existingEnrollment = await locals.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.userId, enrollmentRequest.userId),
					eq(enrollments.courseId, enrollmentRequest.courseId)
				)
			)
			.get();

		if (existingEnrollment && !existingEnrollment.isDeleted) {
			return fail(400, { error: 'User is already enrolled' });
		}

		// Create or restore enrollment
		if (existingEnrollment && existingEnrollment.isDeleted) {
			await locals.db
				.update(enrollments)
				.set({
					isDeleted: false,
					enrolledAt: Date.now()
				})
				.where(eq(enrollments.id, existingEnrollment.id));
		} else {
			await locals.db.insert(enrollments).values({
				userId: enrollmentRequest.userId,
				courseId: enrollmentRequest.courseId,
				role: 'student',
				enrolledAt: Date.now(),
				isDeleted: false
			});
		}

		// Update request status
		await locals.db
			.update(enrollmentRequests)
			.set({
				status: 'approved',
				reviewedAt: Date.now(),
				reviewedBy: locals.user.id
			})
			.where(eq(enrollmentRequests.id, requestId));

		return { success: true, message: 'Request approved successfully' };
	},

	reject: async ({ locals, request }) => {
		if (
			!locals.user ||
			!locals.user.perms ||
			!hasPermission(locals.user.perms, UserPermissions.EDIT_COURSE)
		) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const requestId = formData.get('requestId') as string;

		if (!requestId) {
			return fail(400, { error: 'Missing request ID' });
		}

		// Get the request
		const enrollmentRequest = await locals.db
			.select()
			.from(enrollmentRequests)
			.where(eq(enrollmentRequests.id, requestId))
			.get();

		if (!enrollmentRequest) {
			return fail(404, { error: 'Request not found' });
		}

		if (enrollmentRequest.status !== 'pending') {
			return fail(400, { error: 'Request already processed' });
		}

		// Update request status
		await locals.db
			.update(enrollmentRequests)
			.set({
				status: 'rejected',
				reviewedAt: Date.now(),
				reviewedBy: locals.user.id
			})
			.where(eq(enrollmentRequests.id, requestId));

		return { success: true, message: 'Request rejected' };
	}
};
