import {
	sqliteTable,
	text,
	integer,
	real,
	primaryKey,
	index,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';
import cuid from 'cuid';

// ==================== USER & AUTH ====================

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => cuid()),
	username: text('username').notNull().unique(),
	fullname: text('fullname'),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	permissions: text('permissions').notNull().default('0'), // Bitwise permissions stored as string
	bio: text('bio'),
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now()),
	dob: text('date_of_birth'),
	lastLoginAt: integer('last_login_at')
});

export const sessions = sqliteTable('sessions', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	expiresAt: integer('expires_at')
		.notNull()
		.$defaultFn(() => Date.now() + 7 * 24 * 60 * 60 * 1000) // Default to 7 days
});

// ==================== COURSE MANAGEMENT ====================

export const courses = sqliteTable('courses', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => cuid()),
	title: text('title').notNull(),
	description: text('description').notNull(),
	thumbnailUrl: text('thumbnail_url'),
	isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
	// Extended thing (from Mr. HDP requested for movitvation)
	showDebt: integer('show_debt', { mode: 'boolean' }).notNull().default(false),
	quote: text('quote').default('Thi đua là yêu nước, yêu nước phải thi đua'),
	quoteAuthor: text('quote_author').default('Bác Hồ'),
	// difficulty: text('difficulty'), // 'beginner', 'intermediate', 'advanced'
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now())
});

export const enrollments = sqliteTable(
	'enrollments',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		courseId: text('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('student'), // 'student', 'teacher', 'supervisor'
		enrolledAt: integer('enrolled_at')
			.notNull()
			.$defaultFn(() => Date.now()),
		completedAt: integer('completed_at')
	},
	(table) => [uniqueIndex('enrollment_user_course_idx').on(table.userId, table.courseId)]
);

// ==================== CATEGORIES & TYPES ====================

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

export const types = sqliteTable('types', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique()
});

// ==================== PROBLEMS/ASSIGNMENTS ====================

export const problems = sqliteTable('problems', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	description: text('description').notNull(),
	instructions: text('instructions'), // Detailed instructions
	media: text('media', { mode: 'json' }), // JSON array
	timeLimit: integer('time_limit'), // Time limit in minutes (null/0/-1 = no limit)
	attemptsAllowed: integer('attempts_allowed').default(-1), // null/-1/0 = unlimited
	showAnswers: text('show_answers').notNull().default('after_submission'), // 'never', 'after_submission', 'after_due', 'always'
	shuffleQuestions: integer('shuffle_questions', { mode: 'boolean' }).notNull().default(false),
	splitScreen: integer('split_screen', { mode: 'boolean' }).notNull().default(false), // Split screen view, show text_only questions on left side, real questions on right side
	rating: real('rating').notNull().default(1500), // ELO-style rating
	createdBy: text('created_by')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	categoryId: integer('category_id')
		.notNull()
		.references(() => categories.id, { onDelete: 'restrict' }), // Must have a category, prevent deletion if in use
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now())
});

// Junction table: Link problems to types (many-to-many)
export const problemTypes = sqliteTable(
	'problem_types',
	{
		problemId: text('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		typeId: integer('type_id')
			.notNull()
			.references(() => types.id, { onDelete: 'restrict' }), // Prevent deletion if in use
		assignedAt: integer('assigned_at')
			.notNull()
			.$defaultFn(() => Date.now())
	},
	(table) => [
		primaryKey({ columns: [table.problemId, table.typeId] }),
		index('problem_types_problem_idx').on(table.problemId),
		index('problem_types_type_idx').on(table.typeId)
	]
);

// Junction table: Link problems to courses (many-to-many)
export const courseProblems = sqliteTable(
	'course_problems',
	{
		courseId: text('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		problemId: text('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		orderIndex: integer('order_index').notNull().default(0)
	},
	(table) => [
		primaryKey({ columns: [table.courseId, table.problemId] }),
		index('course_problems_course_idx').on(table.courseId)
	]
);

// ==================== QUESTIONS ====================

/**
 * Question Types (Supported):
 * - single_choice: Single correct answer from multiple options
 * - multiple_choice: Multiple correct answers from options
 * - true_false: True or False question
 * - short_answer: Short text answer (auto-graded with exact match or keywords)
 * - fill_blank: Fill in the blank(s) in text
 * - matching: IELTS-style matching - select A/B/C/D for each item
 * - numeric: Numeric answer with tolerance
 * - text_only: Informational text (0 points)
 *
 * Not yet supported: essay, file_upload
 */
export const questions = sqliteTable(
	'questions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		problemId: text('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		questionType: text('question_type').notNull(), // See types above
		questionText: text('question_text').notNull(), // Supports markdown & LaTeX
		explanation: text('explanation'), // Explanation shown after answering
		points: real('points').notNull().default(0), // Points for this question
		orderIndex: integer('order_index').notNull(), // Order within the problem
		isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(true),

		// Configuration JSON for question-specific settings, options & correct answers
		// For single/multiple choice: { options: [{ id, text, isCorrect, feedback?, partialCredit?, media? }] }
		// For true_false: { options: [{ id, text: "True/False", isCorrect, feedback? }] }
		// For matching: { items: [{ text, correctAnswer }], choices: ["A. Option", "B. Option"] }
		// For fill_blank: { blanks: [{ index, answers: ["answer1"], caseSensitive? }] }
		// For numeric: { answer, tolerance?, unit? }
		// For short_answer: { answers: ["correct"], caseSensitive?, isRegex? }
		// For essay: { minWords?, maxWords?, rubric?: [{ criterion, points }] }
		// For file_upload: { allowedFileTypes?: [".pdf"], maxFileSize?, maxFiles? }
		config: text('config', { mode: 'json' }), // JSON

		media: text('media', { mode: 'json' }), // JSON array: [{ url: string, type?: string }]

		createdAt: integer('created_at')
			.notNull()
			.$defaultFn(() => Date.now()),
		updatedAt: integer('updated_at')
			.notNull()
			.$defaultFn(() => Date.now())
			.$onUpdate(() => Date.now())
	},
	(table) => [index('question_problem_order_idx').on(table.problemId, table.orderIndex)]
);

// ==================== SUBMISSIONS & ATTEMPTS ====================

export const submissions = sqliteTable(
	'submissions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		problemId: text('problem_id')
			.notNull()
			.references(() => problems.id, { onDelete: 'cascade' }),
		attemptNumber: integer('attempt_number').notNull().default(1),
		status: text('status').notNull().default('in_progress'), // 'in_progress', 'submitted', 'graded', 'returned'
		score: real('score').notNull().default(0),
		maxScore: real('max_score').notNull(),
		scorePercentage: real('score_percentage').notNull().default(0),

		startedAt: integer('started_at')
			.notNull()
			.$defaultFn(() => Date.now()),
		submittedAt: integer('submitted_at'),
		gradedAt: integer('graded_at'),

		timeSpent: integer('time_spent'), // Time spent in seconds

		// Grading
		autoGraded: integer('auto_graded', { mode: 'boolean' }).notNull().default(true),
		gradedBy: text('graded_by').references(() => users.id, { onDelete: 'set null' }), // Instructor who graded
		feedback: text('feedback'), // Overall feedback from instructor

		// Flags
		isLate: integer('is_late', { mode: 'boolean' }).notNull().default(false),
		isFlagged: integer('is_flagged', { mode: 'boolean' }).notNull().default(false), // For review
		flagReason: text('flag_reason')
	},
	(table) => [
		uniqueIndex('submission_user_problem_attempt_idx').on(
			table.userId,
			table.problemId,
			table.attemptNumber
		),
		index('submission_status_idx').on(table.status)
	]
);

// ==================== QUESTION ANSWERS ====================

/**
 * Student answers to individual questions within a submission
 */
export const questionAnswers = sqliteTable(
	'question_answers',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		submissionId: text('submission_id')
			.notNull()
			.references(() => submissions.id, { onDelete: 'cascade' }),
		questionId: text('question_id')
			.notNull()
			.references(() => questions.id, { onDelete: 'cascade' }),

		answerData: text('answer_data', { mode: 'json' }), // JSON with student's answer

		// Grading
		isCorrect: integer('is_correct', { mode: 'boolean' }),
		pointsEarned: real('points_earned').notNull().default(0),
		pointsPossible: real('points_possible').notNull(),

		autoGraded: integer('auto_graded', { mode: 'boolean' }).notNull().default(true),
		feedback: text('feedback'), // Feedback for this specific answer

		answeredAt: integer('answered_at')
			.notNull()
			.$defaultFn(() => Date.now())
	},
	(table) => [
		uniqueIndex('answer_submission_question_idx').on(table.submissionId, table.questionId)
	]
);

// ==================== TYPE RATINGS ====================

/**
 * Tracks user ratings for each type within a course enrollment
 * Similar to TopicRating in Prisma but named typeRatings to match the types system
 */
export const typeRatings = sqliteTable(
	'type_ratings',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		courseId: text('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		typeId: integer('type_id')
			.notNull()
			.references(() => types.id, { onDelete: 'cascade' }),
		rating: real('rating').notNull().default(1500), // ELO-style rating
		submissionCount: integer('submission_count').notNull().default(0),
		createdAt: integer('created_at')
			.notNull()
			.$defaultFn(() => Date.now()),
		updatedAt: integer('updated_at')
			.notNull()
			.$defaultFn(() => Date.now())
			.$onUpdate(() => Date.now())
	},
	(table) => [
		// Unique combination of user, course, and type
		uniqueIndex('type_rating_unique_idx').on(table.userId, table.courseId, table.typeId),
		index('type_rating_user_idx').on(table.userId),
		index('type_rating_course_idx').on(table.courseId),
		index('type_rating_type_idx').on(table.typeId)
	]
);

// ==================== ANNOUNCEMENTS ====================

export const announcements = sqliteTable(
	'announcements',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		courseId: text('course_id')
			.notNull()
			.references(() => courses.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		content: text('content').notNull().default(''),
		createdAt: integer('created_at')
			.notNull()
			.$defaultFn(() => Date.now()),
		updatedAt: integer('updated_at')
			.notNull()
			.$defaultFn(() => Date.now())
			.$onUpdate(() => Date.now())
	},
	(table) => [index('announcements_course_idx').on(table.courseId)]
);

// API KEY
export const apiKeys = sqliteTable('api_keys', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	key: text('key').notNull().unique(),
	createdAt: integer('created_at')
		.notNull()
		.$defaultFn(() => Date.now()),
	updatedAt: integer('updated_at')
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now()),
	expiresAt: integer('expires_at')
		.notNull()
		.$defaultFn(() => Date.now())
		.$onUpdate(() => Date.now())
});
