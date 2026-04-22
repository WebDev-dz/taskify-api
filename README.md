# Setup

```bash
npm install
cp .env.example .env
```

Add your DeepSeek and Firebase Admin credentials to `.env`.

Required Firebase variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

You can also use a single `FIREBASE_SERVICE_ACCOUNT_JSON` value instead of the three credential fields.

# Run

```bash
npm run dev
```

The API exports a shared Firebase Admin module at `src/config/firebase.ts`.
