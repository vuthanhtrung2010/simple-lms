import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string) {
	// bcryptjs generates its own salt internally when using hash(password, rounds)
	return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
	return await bcrypt.compare(password, hash);
}
