import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } from '$env/static/private';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!transporter) {
		const host = SMTP_HOST || 'smtp.gmail.com';
		const port = parseInt(SMTP_PORT || '587', 10);
		const user = SMTP_USER || '';
		const pass = SMTP_PASSWORD || '';

		if (!user || !pass) {
			throw new Error('SMTP credentials not configured');
		}

		transporter = nodemailer.createTransport({
			host,
			port,
			secure: port === 465, // true for 465, false for other ports
			auth: {
				user,
				pass
			}
		});
	}

	return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
	const transport = getTransporter();
	const from = SMTP_FROM || SMTP_USER || 'noreply@example.com';

	const mailOptions = {
		from,
		to,
		subject: 'Password Reset Request',
		html: `
			<!DOCTYPE html>
			<html>
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Password Reset</title>
			</head>
			<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
				<table role="presentation" style="width: 100%; border-collapse: collapse;">
					<tr>
						<td style="padding: 40px 0; text-align: center;">
							<table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
								<tr>
									<td style="padding: 40px 30px;">
										<h1 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: bold;">
											Password Reset Request
										</h1>
										<p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
											We received a request to reset your password. Click the button below to create a new password:
										</p>
										<table role="presentation" style="margin: 30px auto;">
											<tr>
												<td style="border-radius: 4px; background-color: #007bff;">
													<a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
														Reset Password
													</a>
												</td>
											</tr>
										</table>
										<p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
											This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
										</p>
										<p style="margin: 20px 0 0 0; color: #999999; font-size: 12px; line-height: 1.5;">
											If the button doesn't work, copy and paste this link into your browser:<br>
											<a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
										</p>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</body>
			</html>
		`,
		text: `
Password Reset Request

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
		`
	};

	try {
		await transport.sendMail(mailOptions);
		return { success: true };
	} catch (error) {
		console.error('Error sending password reset email:', error);
		return { success: false, error };
	}
}
