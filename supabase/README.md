# WorkforceIQ — Supabase

This directory is reserved for the database and seed definitions.

## Planned schema (`/migrations`)

Enforced once the live Supabase project is configured. Versioned SQL migrations
will define:

- `profiles` — extended user profile (name, role, department, manager).
- `employees` — core HR record (title, team, hire date, status).
- `goals` — employee objectives with progress and due dates.
- `performance_reviews` — review cycles and ratings.
- `skills` / `employee_skills` — skill catalog and proficiency levels.
- `attrition_scores` — rolling AI risk scores per employee.
- `onboarding_tasks` — onboarding checklist items.
- `policies` — policy documents served to the employee workspace.
- `ai_insights` — generated workforce briefings with supporting signals.

## Seed (`/seed`)

Idempotent seed script with realistic demo data (departments, employees,
goals, skills, onboarding plans) so every dashboard has meaningful content on
first run.

Nothing here is wired to the UI yet — dashboards currently render static
placeholder data from `lib/data/*`.