-- ---------------------------------------------------------------------------
-- WorkforceIQ — seed data (idempotent, safe to re-run)
-- ---------------------------------------------------------------------------
-- Departments, job roles, skills, training catalog, and a starter policy set.
-- Demo *users* (auth + profiles + employees) are created by
-- `supabase/scripts/create-demo-users.mjs` via `npm run seed`.
-- ---------------------------------------------------------------------------

-- Departments
insert into public.departments (name, code, description) values
  ('Engineering',       'ENG', 'Product engineering, platform and infrastructure.'),
  ('Human Resources',   'HR',  'People operations, recruiting and culture.'),
  ('Product',           'PDT', 'Product management and design.'),
  ('Sales',             'SAL', 'Revenue generation and account management.'),
  ('Marketing',         'MKT', 'Brand, growth and communications.'),
  ('Finance',           'FIN', 'Accounting, planning and procurement.'),
  ('Operations',        'OPS', 'Facilities, logistics and business operations.'),
  ('Customer Support',  'SUP', 'Post-sales support and success.')
on conflict (code) do nothing;

-- Job roles
insert into public.roles (title, code, department_id, description)
select v.title, v.code, d.id, v.description
from (values
  ('Software Engineer',       'ENG-SW',   'ENG', 'Designs, builds and ships product software.'),
  ('Senior Software Engineer','ENG-SSR',  'ENG', 'Leads technical delivery and mentoring.'),
  ('Engineering Manager',     'ENG-MGR',  'ENG', 'Manages engineers and owns delivery.'),
  ('HR Administrator',        'HR-ADM',   'HR',  'HR operations and administrative support.'),
  ('HR Manager',              'HR-MGR',   'HR',  'Owns people programs and business partnering.'),
  ('Product Manager',         'PDT-PM',   'PDT', 'Owns product strategy and roadmap.'),
  ('UX Designer',             'PDT-UX',   'PDT', 'Owns product experience and design systems.'),
  ('Account Executive',       'SAL-AE',   'SAL', 'Owns sales pipeline and deals.'),
  ('Marketing Specialist',    'MKT-SPC',  'MKT', 'Executes marketing programs and campaigns.'),
  ('Financial Analyst',       'FIN-FA',   'FIN', 'Owns budgeting, reporting and analysis.'),
  ('Operations Coordinator',  'OPS-COORD','OPS', 'Manages facilities and logistics.'),
  ('Customer Success Manager','SUP-CSM',  'SUP', 'Manages post-sales customer relationships.')
) as v(title, code, dept_code, description)
join public.departments d on d.code = v.dept_code
on conflict (code) do nothing;

-- Skills
insert into public.skills (name, category, description) values
  ('TypeScript',       'engineering', 'Typed JavaScript for web and server.'),
  ('React',            'engineering', 'UI component development.'),
  ('Node.js',          'engineering', 'Server-side JavaScript runtime.'),
  ('PostgreSQL',       'engineering', 'Relational database design and SQL.'),
  ('Supabase',         'engineering', 'Postgres, Auth, RLS and Storage.'),
  ('Next.js',          'engineering', 'React metaframework for the web.'),
  ('Product Strategy', 'product',     'Roadmap, positioning and discovery.'),
  ('UX Research',      'design',      'User interviews and usability testing.'),
  ('Sales Negotiation','sales',       'Deal structuring and closing.'),
  ('Financial Modeling','finance',    'Forecasting and budget analysis.'),
  ('People Management','leadership',  'Coaching, feedback and team health.'),
  ('Recruiting',       'hr',          'Sourcing, screening and interviewing.'),
  ('Data Analysis',    'analytics',   'Querying and interpreting data.'),
  ('Communication',    'leadership',  'Clear written and verbal communication.')
on conflict (name) do nothing;

-- Training catalog
insert into public.training_courses (title, code, description, category, difficulty, duration_hours, provider, is_mandatory) values
  ('Security Awareness 2026',     'SEC-101', 'Data protection, phishing and password hygiene.',  'security',   'beginner',     2,   'WorkforceIQ Academy', true),
  ('Unconscious Bias at Work',    'HR-201',  'Inclusive behaviours and bias mitigation.',         'inclusion',  'beginner',     1.5, 'WorkforceIQ Academy', true),
  ('Rising Leader Program',       'LD-301',  'First-time people management foundations.',          'leadership', 'intermediate', 8,   'Internal',            false),
  ('SQL for Product Decisions',   'AN-401',  'Querying data to inform product choices.',           'analytics',  'intermediate', 6,   'DataCamp',            false),
  ('Advanced Performance Reviews','HR-402',  'Running fair, evidence-based reviews.',              'hr',         'advanced',     4,   'Internal',            false),
  ('Interview Training',          'HR-403',  'Structured interviews and evaluation scoring.',      'hr',         'intermediate', 3,   'Internal',            true)
on conflict (code) do nothing;

-- Policies
insert into public.policies (title, slug, category, status, version, content, created_by) values
  ('Code of Conduct',
   'code-of-conduct', 'conduct', 'published', 1,
   'Everyone at WorkforceIQ is expected to act with integrity, respect and accountability.' || chr(10) ||
   'We promote a safe, inclusive environment and take all reports of misconduct seriously.',
   null),
  ('Attendance and Leave Policy',
   'attendance-and-leave', 'hr', 'published', 1,
   'Leave types: annual, sick, maternity, paternity, bereavement, unpaid and other.' || chr(10) ||
   'Submit requests through the employee workspace; approvals are recorded against your record.',
   null),
  ('Remote Work and Technology Policy',
   'remote-work-and-technology', 'it', 'published', 1,
   'Company devices must be used for business purposes. MFA is mandatory for all accounts.' || chr(10) ||
   'Sensitive data is only stored in approved systems with role-based access.',
   null)
on conflict (slug) do nothing;

-- Policy chunks (for RAG-style retrieval). Regenerated idempotently per chunk index.
insert into public.policy_chunks (policy_id, chunk_index, content, character_count)
select p.id, c.chunk_index, c.content, length(c.content)
from public.policies p
join (values
  ('code-of-conduct', 0, 'WorkforceIQ Code of Conduct: act with integrity, respect and accountability.'),
  ('code-of-conduct', 1, 'We promote a safe, inclusive environment and take all reports of misconduct seriously.'),
  ('attendance-and-leave', 0, 'Leave types: annual, sick, maternity, paternity, bereavement, unpaid and other.'),
  ('attendance-and-leave', 1, 'Submit leave requests through the employee workspace; approvals are recorded against your record.'),
  ('remote-work-and-technology', 0, 'Company devices must be used for business purposes; MFA is mandatory for all accounts.'),
  ('remote-work-and-technology', 1, 'Sensitive data is only stored in approved systems with role-based access.')
) as c(slug, chunk_index, content)
on p.slug = c.slug
on conflict (policy_id, chunk_index) do nothing;