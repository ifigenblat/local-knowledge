# Postman – LocalKnowledge API

Use these files to test the LocalKnowledge API directly in Postman (via the API Gateway on port 8000).

## Files

- **LocalKnowledge-API.postman_collection.json** – Collection of requests for all gateway routes.
- **LocalKnowledge-Environment.postman_environment.json** – Environment with `base_url`, `token`, and optional IDs/filenames.

## Services covered (via gateway)

| Service / backend route | Postman folder | Notes |
|-------------------------|----------------|-------|
| **Gateway** (8000) | Gateway | Root, Health, Services Health |
| **Auth** (5001) | Auth | Register, Login, Validate, Forgot/Reset password |
| **Users** (5002) | Users | List, Get, Create, Update, Delete |
| **Roles** (5003) | Roles | List, Get, Get by name, Get users, CRUD, Assign |
| **Cards** (5004) | Cards | List, Get, by category/type, CRUD, Review, Rate, Regenerate |
| **Backend** (5010) | Collections | List, Get, Create, Update, Delete, Add/Remove card |
| **Backend** (5010) | Upload | Upload single, Upload multiple, Upload progress |
| **Backend** (5010) | Preview | Preview file (e.g. DOCX, PDF) |
| **Backend** (5010) | Uploads (static) | Get uploaded file by path |
| **Backend** (5010) | AI | AI status |

## Import in Postman

1. Open Postman.
2. **Import collection:** File → Import → select `LocalKnowledge-API.postman_collection.json`.
3. **Import environment:** File → Import → select `LocalKnowledge-Environment.postman_environment.json`.
4. In the top-right environment dropdown, select **LocalKnowledge - Local**.

## Quick test flow

1. **Gateway → Health** – Check that the gateway is up.
2. **Auth → Login** – Use your email/password. The response token is saved automatically to **collection variables** (and to the environment if one is selected). Other requests use this token via Bearer auth.
3. **Auth → Validate Token** – Confirm the token works.
4. **Cards → List Cards** – List your cards (uses the saved token).
5. **Cards → Create Card** – Create a card; `card_id` is saved for later requests.

**If you get "No token provided" on other requests:**
1. Run **Auth → Login** and confirm you get **200** and a JSON body with a `token` field.
2. In the top-right dropdown, **select your environment** (e.g. "LocalKnowledge - Local") before or right after Login so the token is saved there.
3. After Login, open **Collection → Variables** (or **Environments → your env**) and confirm `token` has a **Current Value**. If it’s empty, paste the `token` value from the Login response body into that variable and Save.
4. Send the request again (e.g. **Validate Token** or **Cards → List Cards**); it should send `Authorization: Bearer <token>`.

## Environment variables

| Variable             | Purpose |
|----------------------|---------|
| `base_url`           | API Gateway URL (default: `http://localhost:8000`) |
| `token`              | JWT; set automatically by **Auth → Login** |
| `user_id`            | Set by Login; use in Users/Roles requests |
| `card_id`            | Set by **Cards → Create Card**; use in card update/delete/review/rate/regenerate |
| `collection_id`      | Set by **Collections → Create Collection** |
| `role_id`            | Set manually or from **Roles → List Roles** response |
| `upload_filename`    | Filename for **Preview File** and **Get Uploaded File** (e.g. `doc.pdf`) |
| `upload_progress_id`  | Job ID for **Upload Progress** (if backend returns one) |

## Prerequisites

- **Use the API Gateway (port 8000)** for all requests. Set `base_url` to `http://localhost:8000`. Do **not** call the backend (5010) or card service (5004) directly for `/api/cards` – the gateway validates the token and forwards to the right service.
- If you see only `{ "error": "Server error" }` with no `message` or `service` field, you are likely calling the wrong port (e.g. 5010). Switch to the **LocalKnowledge - Local** environment and ensure `base_url` is `http://localhost:8000`.
- API Gateway, Auth, User, Role, Card services (and optionally backend on 5010 for collections, upload, AI) must be running.

## Notes

- **Auth** (Register, Login, Forgot Password, Reset Password) do not require a token.
- All other requests use **Bearer {{token}}** from the environment.
- For **Upload**, use the Body → form-data tab and add a key `file` of type File, then choose a file.
