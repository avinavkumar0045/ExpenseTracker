# ExpenseFlow Setup Guide

##  Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173`

## 📋 Database Schema Requirements

Your Supabase database MUST have these exact tables with these exact column names:

### users
- user_id (uuid, primary key, default: gen_random_uuid())
- name (text, not null)
- email (text, not null, unique)
- login_password (text, not null)
- transaction_password (text, not null)
- dob (date, not null)
- contact (numeric)
- created_at (timestamp, default: now())

### groups
- group_id (integer, primary key, auto-increment)
- group_name (text, not null)
- created_by (uuid, foreign key → users.user_id)
- created_at (timestamp, default: now())

### group_members
- membership_id (integer, primary key, auto-increment)
- group_id (integer, foreign key → groups.group_id)
- user_id (uuid, foreign key → users.user_id)
- role (text, check: 'admin' or 'member')
- joined_at (timestamp, default: now())

### expenses
- expense_id (integer, primary key, auto-increment)
- paid_by (uuid, foreign key → users.user_id)
- group_id (integer, foreign key → groups.group_id, nullable)
- amount (numeric, check: > 0)
- category (text)
- item_name (text)
- payment_source (text, check: 'personal' or 'group')
- expense_date (date, default: CURRENT_DATE)
- entered_transaction_password (text, not null)

### expense_splits
- split_id (integer, primary key, auto-increment)
- expense_id (integer, foreign key → expenses.expense_id)
- user_id (uuid, foreign key → users.user_id)
- share_amount (numeric, check: >= 0)
- payment_status (text, check: 'paid' or 'unpaid')

### contributions
- contribution_id (integer, primary key, auto-increment)
- user_id (uuid, foreign key → users.user_id)
- group_id (integer, foreign key → groups.group_id)
- amount (numeric, check: > 0)
- contributed_at (timestamp, default: now())
- entered_transaction_password (text, not null)

### personal_wallet
- wallet_id (integer, primary key, auto-increment)
- user_id (uuid, foreign key → users.user_id, unique)
- balance (numeric, check: >= 0)

### group_wallet
- group_wallet_id (integer, primary key, auto-increment)
- group_id (integer, foreign key → groups.group_id, unique)
- balance (numeric, check: >= 0)

### transactions
- transaction_id (integer, primary key, auto-increment)
- user_id (uuid, foreign key → users.user_id)
- group_id (integer, foreign key → groups.group_id, nullable)
- transaction_type (text, check: 'INITIAL', 'EXPENSE', or 'CONTRIBUTION')
- amount (numeric, check: > 0)
- direction (text, check: 'DEBIT' or 'CREDIT')
- category (text)
- item_name (text)
- payment_source (text)
- created_at (timestamp, default: now())

### notifications
- notification_id (integer, primary key, auto-increment)
- user_id (uuid, foreign key → users.user_id)
- message (text, not null)
- notification_type (text, check: 'PERSONAL' or 'GROUP')
- related_group_id (integer, foreign key → groups.group_id, nullable)
- is_read (boolean, default: false)
- created_at (timestamp, default: now())

## ⚠️ Security Notice

**IMPORTANT**: This project uses plain-text passwords for educational purposes only!

For production:
1. Hash all passwords using bcrypt
2. Use Supabase Auth instead of custom auth
3. Implement server-side validation
4. Add rate limiting
5. Use environment variables for sensitive data

## 🎨 Features

✅ CRED-inspired dark theme
✅ Custom authentication (login_password + transaction_password)
✅ Personal & Group expense management
✅ Wallet system with real-time balance
✅ Expense splitting (equal split among group members)
✅ Transaction history
✅ Notifications system
✅ Group invitations

## 📁 Project Structure

```
src/
├── pages/           # All page components
├── layouts/         # Navbar, Sidebar, Layout
├── supabase/        # Supabase client & custom auth
└── index.css        # Global CRED theme styles
```

## 🔑 Login Flow

1. User enters email + login_password
2. System queries `users` table
3. On match, user object stored in sessionStorage
4. For financial operations, transaction_password is required

## 💡 Tips

- Always test with transaction passwords first
- Check Supabase logs if queries fail
- Wallet balances auto-update on transactions
- Group wallets created automatically with groups
- Personal wallets created on user registration

## 🐛 Troubleshooting

**"User not found"**: Check email spelling and database
**"Incorrect transaction password"**: Verify against user record
**"Insufficient balance"**: Add funds to personal wallet first
**Network errors**: Check .env file and Supabase URL

## 📞 Support

This is an educational project. Feel free to modify and learn!
