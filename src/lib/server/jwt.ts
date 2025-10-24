import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

type Unit =
	| 'Years'
	| 'Year'
	| 'Yrs'
	| 'Yr'
	| 'Y'
	| 'Weeks'
	| 'Week'
	| 'W'
	| 'Days'
	| 'Day'
	| 'D'
	| 'Hours'
	| 'Hour'
	| 'Hrs'
	| 'Hr'
	| 'H'
	| 'Minutes'
	| 'Minute'
	| 'Mins'
	| 'Min'
	| 'M'
	| 'Seconds'
	| 'Second'
	| 'Secs'
	| 'Sec'
	| 's'
	| 'Milliseconds'
	| 'Millisecond'
	| 'Msecs'
	| 'Msec'
	| 'Ms';
type UnitAnyCase = Unit | Uppercase<Unit> | Lowercase<Unit>;
type StringValue = `${number}` | `${number}${UnitAnyCase}` | `${number} ${UnitAnyCase}`;

export interface CustomJwtPayload {
	id: string; // the session ID
	userId: string; // the user ID
	email: string;
	username: string;
	fullname?: string;
}

export function sign(payload: CustomJwtPayload, expiresIn: StringValue = '7d'): string {
	if (!JWT_SECRET) {
		throw new Error('JWT_SECRET is not defined');
	}
	return jwt.sign(payload, JWT_SECRET!, { expiresIn });
}

export function verify(token: string) {
	if (!JWT_SECRET) {
		throw new Error('JWT_SECRET is not defined');
	}

	try {
		return jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
	} catch (error) {
		console.error('JWT verification error:', error);
		throw new Error('Invalid token');
	}
}
