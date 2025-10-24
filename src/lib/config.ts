export const Config = {
	siteURL: 'https://yacps.trunghsgs.edu.vn',
	sitename: 'Small LMS',
	siteDescription: 'Small LMS: A simple learning management system with basic features.',
	argon2id: {
		memoryCost: 15360,
		timeCost: 2,
		parallelism: 1
	}
};

export type ConfigType = typeof Config;
