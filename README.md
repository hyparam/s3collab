# s3collab

A serverless collaborative markdown editor where **the only backend is an S3 bucket**.

- Open the app and it generates a random `word-word-word` room key, redirecting to `?key=moonlit-dazzling-lark`.
- Share that URL. Everyone on it edits the same markdown document, with live preview on the right.
- Sync is a single JSON op-log on S3. Writes use the new S3 conditional-write headers (`If-Match` / `If-None-Match`) to serialize concurrent edits. On a `412`, the client rebases its local edit against the winning version and retries.
- Browser credentials come from a Cognito Identity Pool with unauthenticated access — no application server, no lambdas.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm test
npm run lint
npm run typecheck # JSDoc-driven type checking via tsc --noEmit
```

Edit `public/config.json` to point at your bucket and identity pool (see below). Changing it does not require a rebuild; Vite serves `public/` as-is.

## AWS setup

### 1. S3 bucket

Create a bucket (any region). Set CORS to allow browser PUTs from your origin and to expose `ETag`:

```json
[
  {
    "AllowedOrigins": ["https://<your-username>.github.io", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 2. Cognito Identity Pool

Create an Identity Pool with **unauthenticated identities enabled**. Note the Identity Pool ID (looks like `us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### 3. IAM role for unauth identities

Attach this policy to the unauth role Cognito created. Replace `<bucket>` and `<prefix>`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::<bucket>/<prefix>*"
    }
  ]
}
```

### 4. Configure the app

Edit `public/config.json`:

```json
{
  "region": "us-east-1",
  "identityPoolId": "us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "bucket": "my-collab-bucket",
  "prefix": "rooms/"
}
```

## Deploying to GitHub Pages

Push to `main`. The workflow at `.github/workflows/pages.yml` runs lint + tests, builds with Vite, and publishes `dist/` to GitHub Pages. Enable Pages in the repo settings (source: *GitHub Actions*).

`vite.config.js` sets `base: './'`, so the build works under any repo subpath without extra config.

## How sync works

Each room is stored at `s3://<bucket>/<prefix><room-key>.json`:

```json
{
  "version": 1,
  "ops": [
    { "id": "…", "lamport": 1, "clientId": "…", "ts": 1700000000000,
      "type": "replace", "from": 0, "to": 0, "text": "hello" }
  ]
}
```

- State is folded by sorting ops by `(lamport, clientId)` and applying each replace-range in order.
- Local edits are diffed as a single `replace` op against current state.
- PUTs use `If-Match: <etag>` (or `If-None-Match: *` for the first write). A `412` triggers a refetch + rebase + retry up to 5 times.
- The tab polls every 2s while visible to pick up remote edits. Remote updates reapply to the textarea while preserving caret position.

This is a log-serialized design rather than a true CRDT: the conditional write *is* the serialization point, and concurrent edits to the same text range resolve as last-writer-wins after rebase. That's fine for small groups; for heavy real-time concurrency you'd want something like Yjs.

## License

MIT
