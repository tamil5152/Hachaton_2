# Firebase Authentication Setup

This branch implements real Firebase Authentication for:

- Email/password sign up and sign in
- Google sign up and sign in
- GitHub sign up and sign in
- Protected application routes

## Required Firebase Console configuration

The frontend uses the Firebase project configured in `frontend/firebase-applet-config.json`.

### 1. Enable providers

Open Firebase Console for that project, then go to **Authentication → Sign-in method** and enable:

- Email/Password
- Google
- GitHub

### 2. Configure GitHub OAuth

In the GitHub provider settings, Firebase will display a callback URL. Create a GitHub OAuth App and use that exact callback URL as the Authorization callback URL. Copy the GitHub OAuth App Client ID and Client Secret back into Firebase's GitHub provider configuration.

### 3. Authorize deployment domains

In Firebase Authentication → Settings → Authorized domains, make sure the deployed Vercel domain is authorized:

- hachaton-2-gray.vercel.app

Also authorize any Vercel preview domain you use for testing.

## Important

The code changes alone cannot enable Google/GitHub OAuth. The providers must be enabled and configured in the Firebase Console, and GitHub requires an OAuth App Client ID and Client Secret.

After configuration, deploy this branch as a Vercel preview and test Google, GitHub, and email/password authentication.
