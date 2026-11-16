# Autentikasi dan Otorisasi

## Better Auth

Konfigurasi ada di `src/lib/auth/auth.ts`:

- Email + password, session di database.
- `role` adalah additional field dengan `input: false`, default `owner`.
- Session berlaku 7 hari, refresh setiap 1 hari.
- Cookie `httpOnly`, `sameSite=lax`, `secure` di production.
- Rate limit bawaan Better Auth + limiter database per IP di route auth.
- Hook `databaseHooks.user.create.after` membuat `owner_profiles` untuk owner.

Endpoint Better Auth: `/api/auth/[...all]` (sign-up, sign-in, sign-out,
get-session, dll.). Dokumentasi resmi:
<https://www.better-auth.com/docs/installation>.

## Role

| Role | Cara dibuat | Akses |
| --- | --- | --- |
| `owner` | Registrasi publik `/api/auth/sign-up/email` | Endpoint `/api/owner/*` |
| `admin` | Script bootstrap `npm run admin:create` | Endpoint `/api/admin/*` |

Tidak ada endpoint publik untuk mengubah role. Registrasi dengan field `role`
tidak diterima (`input: false`); PATCH profil memakai schema `.strict()`
sehingga `role` ditolak.

## Status Owner

| Status | Arti |
| --- | --- |
| `pending` | Baru daftar; boleh login, membuat draft, tapi belum boleh mengajukan listing |
| `approved` | Boleh mengajukan listing; listing tetap harus di-approve admin |
| `rejected` | Ditolak; listing published diarsipkan |
| `suspended` | Ditangguhkan; seluruh endpoint owner diblokir 403 (kecuali GET profil untuk melihat alasan) sampai admin mengaktifkan |

## Helper Server

`src/lib/auth/session.ts`:

- `getCurrentUser(request)`
- `requireAuth(request)`
- `requireOwner(request)` → `{ user, profile }`
- `requireApprovedOwner(request)`
- `requireAdmin(request)`
- `ensureOwnerProfile(user)`

`src/lib/auth/guards.ts`:

- `ownerRoute(handler)`
- `adminRoute(handler)`

Contoh route:

```ts
export const GET = ownerRoute(async (request, context, session) => {
  const id = uuidSchema.parse((await context.params).id);
  const listing = await getOwnerListing(session.user.id, id);
  return jsonSuccess(listing);
});
```

Jangan mengandalkan middleware frontend. Setiap endpoint memanggil guard di
server dan setiap service memfilter `owner_id`.

## Kepemilikan Data

`src/lib/security/authorization.ts` menyediakan:

- `getOwnedKost(ownerId, kostId)`
- `getOwnedRoom(ownerId, roomId)`
- `getOwnedOccupancy(ownerId, occupancyId)`
- `getOwnedPhoto(ownerId, photoId)`

Semua mengembalikan **404** bila resource bukan milik owner yang login. Ini
mencegah enumerasi ID lintas akun.

## Permission Map

`src/lib/security/permissions.ts` mendokumentasikan permission per role
(`profile:read`, `listing:manage:own`, `review:moderate`, dst.) sebagai acuan
kebijakan. Enforcement utama tetap guard + ownership query.

## Bootstrap Admin

```bash
ADMIN_BOOTSTRAP_EMAIL=admin@example.com \
ADMIN_BOOTSTRAP_PASSWORD='minimal-12-karakter' \
ADMIN_BOOTSTRAP_NAME='Havena Admin' \
npm run admin:create
```

Script menolak mempromosikan owner yang sudah ada secara otomatis. Admin tidak
memiliki `owner_profiles`.

## Login/Logout

```bash
# login
curl -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"Password123!"}'

# session
curl http://localhost:3000/api/auth/get-session -H "Cookie: better-auth.session_token=..."

# logout
curl -X POST http://localhost:3000/api/auth/sign-out -H "Cookie: ..."
```

Frontend harus memakai `credentials: "include"` dan tidak menyimpan password
atau session token di localStorage.
