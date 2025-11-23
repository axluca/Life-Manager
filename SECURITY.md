# Firebase Security Guide

## ✅ Completed Security Measures

### 1. Environment Variables
- Firebase configuration moved to `.env` file
- `.env` added to `.gitignore` to prevent exposure
- `.env.example` created as a template for other developers

## 🔒 Critical Security Steps

### Step 1: Set Up Your Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Firebase credentials from [Firebase Console](https://console.firebase.google.com/)
3. Update the values in your `.env` file

### Step 2: Configure Firebase Security Rules

**Firestore Rules** should restrict access to authenticated users only.

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### Step 3: Set Up Firebase App Check (Highly Recommended)

Protects your Firebase resources from abuse:

1. Go to Firebase Console → Build → App Check
2. Register your web app
3. Choose reCAPTCHA v3 or reCAPTCHA Enterprise
4. Enable enforcement for all services

### Step 4: Configure Authorized Domains

In Firebase Console → Authentication → Settings → Authorized domains:
- Add only your production domain
- Remove any suspicious domains

### Step 5: Set Up Budget Alerts

In Google Cloud Console:
1. Go to Billing → Budgets & alerts
2. Set up alerts to prevent unexpected costs from abuse

## 🛡️ Ongoing Security Best Practices

### 1. **Never Commit Sensitive Data**
- ✅ API keys in `.env`
- ✅ Service account keys (never in repo)
- ✅ Database credentials
- ✅ OAuth secrets

### 2. **Use Firebase Security Rules**
- Validate all data server-side
- Never trust client-side validation
- Test rules with Firebase Emulator

### 3. **Monitor Usage**
- Check Firebase Console → Usage dashboard regularly
- Set up Cloud Functions for anomaly detection
- Enable Cloud Logging

### 4. **Principle of Least Privilege**
- Create separate Firebase projects for dev/staging/prod
- Use service accounts with minimal permissions
- Regularly audit IAM permissions

## 📝 For Team Members

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Ask the project admin for the Firebase credentials
4. Never commit the `.env` file

## 🚨 If Keys Are Compromised

1. **Immediately rotate all keys**
2. Review Firebase Authentication logs
3. Check Firestore for unauthorized access
4. Review Cloud Functions logs
5. Enable App Check if not already enabled
6. Consider resetting user passwords if suspicious activity detected

## 🔗 Important Links

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)

## ⚠️ Note About Public API Keys

Firebase API keys for web apps are **designed to be public** but must be protected by:
1. Security Rules
2. App Check
3. Authorized domains
4. Usage quotas

The real security comes from proper configuration, not hiding the API key.
