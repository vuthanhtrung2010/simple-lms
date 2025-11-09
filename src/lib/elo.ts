// ELO rating system utilities (adapted from hsgs-hackathon-backend)

/**
 * Calculate expected score for ELO rating system
 */
export function expectedScore(userRating: number, questionRating: number): number {
	return 1 / (1 + Math.pow(10, (questionRating - userRating) / 350));
}

/**
 * Calculate K-factor for user based on submissions solved and user rating
 */
export function userKFactor(submissionCount: number, userRating: number = 1500): number {
	const experienceFactor = 100 * Math.exp(-submissionCount / 25) + 20;
	const ratingStabilityFactor = Math.max(0.5, Math.min(1.5, (1800 - userRating) / 300));
	return experienceFactor * ratingStabilityFactor;
}

/**
 * Calculate K-factor for problem based on submission count
 */
export function problemKFactor(submissionCount: number, problemRating: number = 1500): number {
	const submissionFactor = 60 * Math.exp(-submissionCount / 40) + 10;
	const ratingDeviation = Math.abs(problemRating - 1500);
	const ratingStabilityFactor = Math.max(0.5, Math.min(1.0, (800 - ratingDeviation) / 800));
	return submissionFactor * ratingStabilityFactor;
}

/**
 * Update ratings using ELO system based on user's accuracy
 */
export function updateRatings(
	userRating: number,
	problemRating: number,
	userAccuracy: number,
	userSubmissionCount: number,
	problemSubmissionCount: number
): { newUserRating: number; newProblemRating: number; ratingChange: number } {
	// Validate accuracy
	userAccuracy = Math.max(0, Math.min(1, userAccuracy));

	// Calculate expected performance
	const expected = expectedScore(userRating, problemRating);

	// Non-linear accuracy mapping
	const transformedAccuracy =
		userAccuracy === 0
			? 0
			: userAccuracy <= 0.5
				? userAccuracy * 0.5
				: 0.5 + Math.pow(2 * (userAccuracy - 0.5), 1.5) * 0.5;

	// Performance difference
	const performanceDiff = transformedAccuracy - expected;

	// Surprise factor
	const surpriseFactor = 1 + Math.min(0.5, Math.abs(performanceDiff));

	// Calculate K-factors
	const userK = userKFactor(userSubmissionCount, userRating) * surpriseFactor;
	const problemK = problemKFactor(problemSubmissionCount, problemRating);

	// Calculate rating changes
	const ratingChange = Math.round(userK * performanceDiff);

	// For 0% accuracy, ensure rating ALWAYS decreases
	let finalRatingChange = ratingChange;
	if (userAccuracy === 0) {
		finalRatingChange = Math.min(ratingChange, -10);
		if (finalRatingChange >= 0) {
			finalRatingChange = -10;
		}
	}

	// Calculate new ratings
	const rawNewUserRating = userRating + finalRatingChange;
	const rawNewProblemRating =
		problemRating + Math.round(problemK * (expected - transformedAccuracy));

	// Apply rating floors
	const newUserRating = Math.max(1000, rawNewUserRating);
	const newProblemRating = Math.max(1000, rawNewProblemRating);

	// Effective rating change
	const effectiveRatingChange = newUserRating - userRating;

	let reportedRatingChange = effectiveRatingChange;
	if (userAccuracy === 0 && effectiveRatingChange >= 0) {
		const wouldHaveLost = Math.min(finalRatingChange, -10);
		reportedRatingChange = Math.max(wouldHaveLost, -30);
	}

	return {
		newUserRating,
		newProblemRating,
		ratingChange: reportedRatingChange
	};
}

/**
 * Update type ratings based on user accuracy
 */
export function updateTypeRating(
	currentRating: number,
	accuracy: number,
	submissionCount: number
): { newRating: number; ratingChange: number } {
	// Simple rating adjustment based on accuracy
	const baseRatingChange = Math.round((accuracy - 0.5) * 100);

	// K-factor decreases with more submissions
	const kFactor = Math.max(0.3, Math.min(1.0, 50 / (submissionCount + 10)));

	const ratingChange = Math.round(baseRatingChange * kFactor);
	const newRating = Math.max(1000, currentRating + ratingChange);

	return {
		newRating,
		ratingChange: newRating - currentRating
	};
}
