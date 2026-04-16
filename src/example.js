export const demoMarkdown = `# s3collab

Edit a document with anyone, in real time. No sign-up, no servers -- just a static page and an S3 bucket.

Share the link and start typing on the left. Your changes show up here on the right, for everyone.

## How it works

Every edit is stored as an operation in a shared log on S3. When two people edit at the same time, S3's **conditional writes** detect the conflict -- the second writer rebases against the first and retries automatically. No server needed.

## The stack

- **Storage & sync**: S3 conditional puts (\`If-Match\`)
- **Auth**: Cognito identity pool (anonymous)
- **Hosting**: GitHub Pages
- **Backend**: *there is no backend*
`
