# Backend — Routes (API Reference)

All endpoints live under base prefix **`/api_crowe_bizcheck/`** (paths below are relative to it
unless absolute). Auth column: **public** = none; **token** = `X-Submission-Token`;
**admin** = `@admin_required` (cookie+CSRF); **owner/admin** = `@submission_owner_or_admin`;
**user** = `@auth_required` (legacy Bearer JWT). Rate limits in
[`../architecture/02-auth-and-security.md`](../architecture/02-auth-and-security.md).
Services referenced are documented in [`02-services.md`](02-services.md).

---

## `auth.py` — legacy user auth · prefix `/auth`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| POST | `/auth/register` | public | Create user, return JWT pair | `register_user` |
| POST | `/auth/login` | public | Authenticate, return JWT pair | `login_user` |
| POST | `/auth/refresh` | public | New access token from refresh token | `refresh_access_token` |
| GET | `/auth/me` | user | Current user profile | `User.find_by_id` |

## `blocks.py` — prefix `/blocks`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| GET | `/blocks/quiz?test=<slug>` | public | Full bilingual quiz data for one test (blocks→questions→options) | `get_quiz_data` |
| GET | `/blocks` | admin | All blocks (opt. `?test_id`) | `get_all_blocks` |
| POST | `/blocks` | admin | Create block | `create_block` |
| PUT | `/blocks/<id>` | admin | Update block | `update_block` |
| DELETE | `/blocks/<id>` | admin | Delete block | `delete_block` |

## `questions.py` — prefix `/questions`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| GET | `/questions/block/<block_id>` | public | Questions in a block (+answers) | `get_questions_by_block` |
| GET | `/questions` | admin | All questions (opt. `?test_id`) | `get_all_questions` |
| POST | `/questions` | admin | Create question + answers | `create_question` |
| PUT | `/questions/reorder` | admin | Batch reorder/move (items: id, block_id, order_index, parent_question_id) | direct SQL |
| PUT | `/questions/<id>` | admin | Update question + answers | `update_question` |
| DELETE | `/questions/<id>` | admin | Delete question | `delete_question` |
| DELETE | `/questions/all` | admin | Delete all questions | `delete_all_questions` |

## `results.py` — legacy · prefix `/results`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| POST | `/results` | user | Save a block result | `save_result` |
| GET | `/results/me` | user | Current user's results | `get_user_results` |
| GET | `/results` | admin | All results | `get_all_results` |

## `admin.py` — admin auth + dashboard · prefix `/admin`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| POST | `/admin/login` | public | Validate creds; set `admin_session`+`admin_csrf` cookies | `login_admin` |
| GET | `/admin/session` | admin | Probe used by SPA to confirm auth; returns `csrf_token` | — |
| POST | `/admin/logout` | public | Clear cookies (idempotent, always 200) | — |
| GET | `/admin/stats` | admin | Dashboard counts + per-block averages | `get_stats` |
| GET | `/admin/users` | admin | All users with scores | `get_users_with_scores` |

## `submissions.py` — the public quiz flow · prefix `/submissions`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| POST | `/submissions` | public | Create submission; **returns `submission_token`** | `create_submission`, `update_submission` |
| PATCH | `/submissions/<id>` | owner/admin | Update profile/answers/scores/contact; may notify sales | `update_submission`, `maybe_notify_sales` |
| POST | `/submissions/<id>/pdf` | owner/admin | Upload report PDF (base64, ≤20 MB) | `save_submission_pdf` |
| POST | `/submissions/<id>/send-email` | owner/admin | Queue report email (202, fire-and-forget) | `dispatch_report_email` |
| GET | `/submissions/<id>/report.pdf?t=<token>` | token (query) | Public emailed link → inline PDF | `get_submission_pdf` |
| GET | `/submissions` | admin | All submissions (opt. `?test_id`) | `get_all_submissions` |
| GET | `/submissions/<id>` | admin | Submission detail | `get_submission_detail` |
| GET | `/submissions/<id>/pdf` | admin | Download PDF (attachment) | `get_submission_pdf` |
| DELETE | `/submissions/<id>` | admin | Delete one | `delete_submission` |
| DELETE | `/submissions` | admin | Delete all | `delete_all_submissions` |
| GET | `/submissions/export/excel` | admin | All submissions → XLSX | `get_all_submissions` |
| GET | `/submissions/<id>/export/excel` | admin | One user → detailed XLSX | `build_single_user_workbook` |
| GET | `/submissions/tests/<test_id>/export/excel-combined` | admin | Summary+per-user sheets XLSX | `build_test_combined_workbook` |
| GET | `/submissions/tests/<test_id>/export/excels-zip` | admin | ZIP of per-user XLSX | `build_excels_zip_for_test` |
| GET | `/submissions/tests/<test_id>/export/pdfs-zip` | admin | ZIP of per-user PDFs | `build_pdfs_zip_for_test` |

## `telegram.py` — web-flow bot endpoints · prefix `/tg`
Token = the 24h deep-link token (`tg_token`), not the submission token.
| Method | Path | Auth | Does |
|---|---|---|---|
| POST | `/tg/link/<sub_id>` | owner/admin | Mint one-time deep-link token (24h); returns `{token, url, pdf_ready}` |
| GET | `/tg/report/<token>` | token | Report JSON + base64 PDF (bot fetches this) |
| POST | `/tg/contact/<token>` | token | Save Telegram contact; may notify sales |
| POST | `/tg/email/<token>` | token | User asked for email delivery → store email, queue send |
| POST | `/tg/lead/<token>` | token | Save lead (email+phone) from Telegram; may notify sales |

## `tests.py` — public `tests_bp` `/tests` + admin `admin_tests_bp` `/admin/tests`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| GET | `/tests` | public | Active tests (public fields) | `list_all_tests` (filtered) |
| GET | `/admin/tests` | admin | All tests (all fields) | `list_all_tests` |
| POST | `/admin/tests` | admin | Create test | `create_test` |
| POST | `/admin/tests/reorder` | admin | Drag-drop reorder | `reorder_tests` |
| PUT | `/admin/tests/<id>` | admin | Update test | `update_test` |
| DELETE | `/admin/tests/<id>` | admin | Delete test | `delete_test` |

## `templates.py` — public `/templates` + admin `/admin/templates`
| Method | Path | Auth | Does | Service |
|---|---|---|---|---|
| GET | `/templates` | public | Active templates (public fields) | `list_all_templates` |
| GET | `/admin/templates` | admin | All templates | `list_all_templates` |
| GET | `/admin/templates/<id>` | admin | Template + files | `get_template_with_files` |
| POST | `/admin/templates` | admin | Create template | `create_template` |
| PUT | `/admin/templates/<id>` | admin | Update template | `update_template` |
| DELETE | `/admin/templates/<id>` | admin | Delete template | `delete_template` |
| POST | `/admin/templates/<id>/files` | admin | Upload PDF (base64, ≤20 MB) | `add_file` |
| DELETE | `/admin/templates/<id>/files/<file_id>` | admin | Delete file | `delete_file` |
| GET | `/admin/templates/<id>/files/<file_id>/download` | admin | Download one file | `get_file_raw` |
| GET | `/admin/templates/<id>/download` | admin | Download all files as ZIP | `iter_template_files_raw` |

## `content.py` — testimonials + FAQ · public `/…` + admin `/admin/…`
| Method | Path | Auth | Does |
|---|---|---|---|
| GET | `/testimonials` | public | Active testimonials |
| POST | `/testimonials` | public | Submit a review (rate-limited; `Testimonial.create_public`) |
| GET/POST | `/admin/testimonials` | admin | List / create |
| PUT/DELETE | `/admin/testimonials/<id>` | admin | Update / delete |
| GET | `/faq` | public | Active FAQ |
| GET/POST | `/admin/faq` | admin | List / create |
| PUT/DELETE | `/admin/faq/<id>` | admin | Update / delete |

## `site_settings.py` — public `/site-settings` + admin `/admin/site-settings`
| Method | Path | Auth | Does |
|---|---|---|---|
| GET | `/site-settings` | public | CTA target slugs + `email_delivery_enabled` flag (SPA reads this) |
| GET | `/admin/site-settings` | admin | Same, for admin editor |
| PUT | `/admin/site-settings` | admin | Update CTA targets + flags |
