# Creating Master Admin User

## Problem
The master admin user needs to exist in the database with a **bcrypt-hashed password**. Simply adding credentials to `.env` doesn't create the user.

## Solutions

### Option 1: Run the Script (Recommended)
Make sure your database is accessible and your `.env` file has `DATABASE_URL` set correctly, then run:

```bash
node scripts/create-master-admin-direct.js
```

Or with custom credentials:
```bash
MASTER_ADMIN_EMAIL=master@lamafix.com MASTER_ADMIN_PASSWORD=Master123! node scripts/create-master-admin-direct.js
```

### Option 2: Use Prisma Studio
1. Make sure your app is running (`npm run dev`)
2. Open a new terminal and run:
   ```bash
   npx prisma studio
   ```
3. Navigate to the `User` model
4. Click "Add record"
5. Fill in:
   - `email`: `master@lamafix.com`
   - `password`: You need to hash it first. Run this in Node.js:
     ```javascript
     const bcrypt = require('bcryptjs');
     bcrypt.hash('Master123!', 10).then(console.log);
     ```
   - `role`: `MASTER_ADMIN`
   - `storeId`: Leave empty (null)
6. Save the record

### Option 3: Use SQL Directly
If you have database access, run this SQL (replace the hashed password):

```sql
-- First, generate the hash using Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('Master123!', 10).then(console.log);
-- Then use that hash in the SQL below

INSERT INTO "User" (id, email, password, role, "storeId")
VALUES (
  'clx1234567890',  -- Generate a unique ID or use cuid()
  'master@lamafix.com',
  '$2a$10$YOUR_HASHED_PASSWORD_HERE',  -- Replace with actual hash
  'MASTER_ADMIN',
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = 'MASTER_ADMIN',
  "storeId" = NULL;
```

### Option 4: Create via API (if you have another admin account)
If you can login as another admin:
1. Go to `/users` page
2. Click "Add User"
3. Fill in:
   - Email: `master@lamafix.com`
   - Password: `Master123!`
   - Role: `MASTER_ADMIN`
   - Store: Leave empty
4. Save

## Verify the User Exists

Run this to check:
```bash
node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.user.findUnique({where: {email: 'master@lamafix.com'}}).then(u => console.log(u ? 'User exists' : 'User not found')).finally(() => p.\$disconnect())"
```

## Troubleshooting

### Database Connection Error
If you get "Can't reach database server":
1. Check your `DATABASE_URL` in `.env`
2. If using Neon, make sure the database is not paused
3. Try using the direct connection string (not pooler) for scripts
4. Make sure your network allows connections to the database

### Password Not Working
- Make sure the password is hashed with bcrypt (10 rounds)
- The password in the database must be the hash, not the plain text
- Verify the hash was created correctly

### User Already Exists
The script will update the existing user's password and role if the email already exists.

