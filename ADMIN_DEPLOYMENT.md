!# Admin Panel Deployment & Setup Runbook

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
    - `APP_JWT_SECRET`: Required. Must be the same value across *all* services and Next.js.
    - `JWT_SECRET`: Must match `APP_JWT_SECRET` (kept for compatibility).
    - `NEXT_PUBLIC_FIREBASE_CONFIG`: Standard Firebase config JSON
    - `ADMIN_API_BASE_URL`: URL of the backend microservices (e.g., http://localhost:3000)
    - `INTERNAL_AUTH_SECRET`: Shared secret for service-to-service auth

4.  **Setup Shared Module** (one-time, required for all services)
    ```bash
    npm run setup:shared
    ```

5.  **Start Development Server**

    ### Option A: Start Everything (All Services + Gateway + Frontend)
    ```bash
    npm run dev:all
    ```

    ### Option B: Start Only Backend Services (Admin + Auth + Catalog)
    ```bash
    npm run dev:services
    npm run dev:gateway
    npm run dev:frontend
    ```

    ### Option C: Start Admin Only
    ```bash
    npm run dev:admin
    npm run dev:gateway
    npm run dev:frontend
    ```

    ### Available Commands:
    | Command | Description |
    |---------|-------------|
    | `npm run setup:shared` | Build shared module and copy to all services |
    | `npm run dev:gateway` | Start local API gateway (port 4000) |
    | `npm run dev:frontend` | Start Next.js frontend (port 3000) |
    | `npm run dev:services` | Start all backend microservices |
    | `npm run dev:admin` | Start only admin service (port 8080) |
    | `npm run dev:all` | Start everything (services + gateway + frontend) |
    | `npm run stop` | Stop all Node.js processes |

    The admin panel will be available at `http://localhost:3000/admin`.
    The local gateway runs on `http://localhost:4000`.

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
