# Note
Github is a read-only mirror of the main repository hosted at Codeberg.

# Simple Learning Management System
## Installation
Before you install make sure you have [Bun](https://bun.sh/) installed on your machine.

1. Clone the repository:
   ```bash
   git clone https://codeberg.org/devtrung/simple-lms.git
   ```
2. Navigate to the project directory:
   ```bash
    cd simple-lms
    ```
3. Install dependencies using Bun:
    ```bash
    bun install
    ```
4. Create the D1 Database & R2 Bucket using wrangler:
    ```bash
    bun x wrangler d1 create simple_lms_db
    bun x wrangler r2 create simple-lms
    ```
5. Replace the database ID & Name and R2 bucket name in the `wrangler.jsonc` and `drizzle.config.ts` files with your created database ID & Name and R2 bucket name.
6. Fill the rest of the environment variables in the `.env.example` file and rename it to `.env`.
7. Run the migrations to set up the database schema:
    ```bash
    bun run db:migrate-production
    ```
8. Deploy it to Cloudflare Workers:
    ```bash
    bun run deploy
    ```

## Features
- Fully running in Cloudflare Infrastructure.
- Secure user authentication with JWT and encrypted sessions.
- Course management with lessons and quizzes.
- Interactive quizzes with multiple-choice questions.
- User progress tracking and analytics with debt.
- Responsive design for accessibility on various devices.
- Easy deployment and scalability using Cloudflare Workers and D1 database.
- Open-source and customizable to fit specific educational needs.
- Comprehensive documentation for easy setup and usage.
- Regular updates and community support.

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request with your changes at https://codeberg.org/devtrung/simple-lms.

## License
The project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](./LICENSE) file for details.