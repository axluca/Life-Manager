<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1z169QV9h8muPJuRazjwNCenljdD8QrJO

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Firebase credentials (contact project admin)

3. Run the app:
   ```bash
   npm run dev
   ```

## 🔒 Security

**Important:** Never commit `.env` files to the repository. See [SECURITY.md](SECURITY.md) for complete security guidelines.

For Firebase configuration and security best practices, refer to the security documentation.
