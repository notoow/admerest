# Registration and review service

## Current state

The frontend, Supabase client, database migration, private evidence policies, review workflow and isolated browser rehearsal are implemented. Production configuration is deliberately empty and `registrationOpen` is false. No cloud database has been provisioned for admerest, no live account has been created and no email or medical document has been transmitted as part of QA.

- Public demo: `/account.html?demo=1` → `/admin.html?demo=1` → `/?demo=workflow&tower=<id>`.
- Rehearsal data lives in **sessionStorage**, in the same tab/origin. It cannot grant production roles, and its public view is explicitly labeled. A copied link cannot share that local state with another browser.
- Production account and admin pages use the same UI with the Supabase adapter. Admin access is verified by the backend RPC; the database independently enforces every transition.
- Web stays on GitHub Pages. `dist/backend-config.js` accepts only URL + **publishable** key. Never add a service-role key, personal access token, SMTP password or private document under `dist/`.

## Provisioning gate

1. Confirm the Supabase organization with the owner. The existing `notoow` organization was on Free with two active projects at inspection; do not reuse, pause, modify or delete unrelated projects to make room.
2. Query the exact project cost for the chosen organization, explain it, and obtain the cost confirmation required by the Supabase connector before creating `admerest` (preferred region Seoul `ap-northeast-2`). No paid upgrade is authorized yet.
3. Apply `supabase/migrations/20261002101527_record_review_service.sql` to the chosen fresh project. Use the connector migration tool for remote DDL. Keep `admerest_private` **out** of exposed schemas.
4. Set Auth site URL to `https://notoow.github.io/admerest/account.html` and redirect allowlist to that exact URL. Local QA URL may be added separately while testing. Configure an authenticated SMTP provider and verified sender domain. The default Supabase SMTP is not for production delivery; see [official guidance](https://supabase.com/docs/guides/auth/auth-smtp).
5. Decide credential-document retention, deletion procedure, privacy notice, operator identity and review criteria before accepting real evidence. The service expects redacted credentials and aggregated counts, **not patient-level medical records**. No consent text or compliance certification is fabricated in this prototype.
6. Obtain the intended reviewer's authenticated user UUID. Provision a reviewer with a targeted privileged SQL insert into `admerest_private.reviewers(user_id)`. Do not use editable Auth user metadata, nationality, email text entered in a form, or client-side flags to grant roles. A reviewer cannot approve their own record.
7. Set public URL + publishable key, test the actual login redirect/SMTP and Storage API with disposable synthetic accounts/files, run security/performance advisors, then enable `registrationOpen` and deploy. Do not call the online workflow complete before these checks pass.

## Data model

`admerest_submissions` contains versioned applications owned by an Auth user. An owner has at most one open application. A new update after approval is a separate application; the public snapshot stays intact while it is reviewed. Draft/changes-requested applications are editable. Submitted records and evidence are locked until a reviewer requests changes, approves, rejects, or the owner withdraws. Updates use an optimistic version predicate to prevent stale approvals.

`admerest_documents` contains metadata for two evidence kinds. The bucket `admerest-evidence` is private, accepts PDF/JPEG/PNG up to 10 MiB each, uses random object names under `user-id/submission-id/`, and provides 60-second signed URLs after authorized access. Uploads do not overwrite existing files. Delete metadata before its object; deletion is restricted to editable applications. Failed metadata insertion attempts object cleanup. Submitted/approved evidence remains locked. A scheduled retention cleanup is **not configured**.

`admerest_public_records` is a public, minimal snapshot. No email, Auth user ID, document path or review note is exposed here. The private ownership table retains a stable public ID across accepted updates. Only a privileged, authorization-checked database trigger publishes snapshots after reviewer approval. `verification_requested=false` produces a ranking-only record. Approval of such an update removes any previous verified status instead of inheriting it.

`admerest_review_events` records workflow changes and applicant-facing notes; it is readable only by the owner and designated reviewers. No arbitrary client writes. Owner can hide their published snapshot through an authenticated RPC. Hiding is not permanent account deletion. Before deleting an Auth account operationally, hide its public snapshot and remove/retain evidence according to the agreed policy.

The public leaderboard fetches paginated snapshots. The main page never combines production records with the three fictional demonstration profiles. `?demo=1` explicitly opens the historical demo. If live loading fails it shows a failure notice with empty real totals rather than passing demo numbers off as real. A verified shared link selects the corresponding 3D tower; unverified links focus the ranking row. The 3D scene initially materializes at most 12 professional towers and adds the selected out-of-range tower on demand.

## Verification and limits

`npm run check` includes JavaScript checks, existing scene/model tests, service-model tests, and execution of the actual migration in PGlite/Postgres with Auth/Storage schema stubs. The database test switches between anon, owner, stranger and reviewer roles, checks RLS, blocks self-certification and tampering, verifies evidence requirements and publication snapshots, and exercises hide-public behavior.

The PGlite integration test validates SQL and policy behavior, **not** the real Supabase Auth mail transport, PostgREST or signed Storage URLs. Those require a provisioned project. Browser QA covers isolated rehearsal and responsive layout without sending real messages/files.

Current scope does not include email review notifications, billing collection, automated CRM imports, sponsored campaign scheduling, account deletion self-service, analytics collection, or production audit/retention jobs. Users see review results in their dashboard. Ads remain clearly marked recruitment rows separate from ranking/verification.

## Recovery

- Submission errors keep the editable form. Do not claim saved/submitted until the API returns a row.
- Stale version returns a readable refresh prompt; no silent overwrite.
- Personal dashboards filter by owner at the database before pagination, including for reviewer accounts with access to other applications. The published snapshot is loaded independently through the owner RPC; a public-status failure leaves draft and evidence controls usable and offers a targeted retry.
- The dashboard separates the current application from the currently published record. A pending update preserves the old public snapshot. Hiding the snapshot does not withdraw an already submitted update; its later approval republishes the record, as stated in the confirmation.
- Evidence links expire after 60 seconds; the original preview button remains available to issue a fresh authorized link without reloading the review. Actual signed-URL transport still requires live Storage verification.
- Backend outage leaves local 3D/playground available, with no fabricated fallback live records.
- Export database backups under an agreed operational process. Pro backup retention is a plan feature, not proof a restore has been tested. See [official pricing](https://supabase.com/pricing).
