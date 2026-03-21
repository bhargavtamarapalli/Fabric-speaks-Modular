# Admin Panel Deployment & Setup Runbook

This guide helps developers set up the Fabric Speaks Admin Panel and deploy it to various environments.

## 🚀 Local Development Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Bhargav/Fabricspeaks.git
    cd FsModular
    ```

2.  **Install Dependencies** (from root)
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Copy `.env.example` to `.env` in the root and in `apps/web/.env.local`.
    Ensure the following keys are set:
    - `NEXT_PUBLIC_FIREBASE_CONFIG`: Standard Firebase config JSON
    - `ADMIN_API_BASE_URL`: URL of the backend microservices (e.g., http://localhost:3000)
    - `INTERNAL_AUTH_SECRET`: Shared secret for service-to-service auth

4.  **Run Development Server**
    ```bash
    npm run dev -w apps/web
    ```
    The admin panel will be available at `http://localhost:3000/admin`.

## 🏗️ Build & Verification

Before deploying, always run the verification suite:

1.  **Type Checking**
    ```bash
    npm run type-check -w apps/web
    ```

2.  **Production Build**
    ```bash
    npm run build -w apps/web
    ```

## 🚢 Deployment (Vercel / Manual)

### Vercel Deployment
1. Connect the `apps/web` directory to a new Vercel project.
2. Set the "Root Directory" to `apps/web`.
3. Configure the environment variables in the Vercel dashboard.
4. Deploy the `main` branch.

### Manual Node.js Deployment
1. Build the project: `npm run build`
2. Start the server: `npm run start`

## 🧪 Testing State & Performance

- **Memoization**: Check `ProductCard` and `DataTable` rows for unnecessary re-renders using React DevTools.
- **Images**: Ensure all product images use `next/image` for WebP conversion and lazy loading.
- **Errors**: Verify that failed API calls show user-friendly messages via `mapError`.

## 🛠️ Troubleshooting

- **401 Unauthorized**: Check if your Firebase session has expired or if the `INTERNAL_AUTH_SECRET` matches the backend.
- **Image 404/500**: Ensure the image domains are allowed in `apps/web/next.config.js`.
- **Z-Index Issues**: Form overlays and drawers use a Z-index scale starting at 50. Ensure no standard page content exceeds this.
