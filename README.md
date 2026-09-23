# lanka-ministry-manager
A full-stack web application (MERN) to manage and browse the directory of Sri Lankan Government Ministries, Departments, and Public Corporations.

# Sri Lanka Government Institutions Directory (CMS)

## 📌 Project Overview
This is a full-stack web application designed to serve as a centralized directory for all Government Ministries, Departments, Statutory Institutions, and Public Corporations in Sri Lanka. 

The system provides a **Public Portal** for citizens to search and browse institutions, and a secure **Admin Panel** to manage the data dynamically (Add, Edit, Delete).

## 🚀 Tech Stack (MERN)
*   **Frontend:** React.js (with Tailwind CSS / Material UI)
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB (Mongoose ORM)
*   **Authentication:** JWT (JSON Web Tokens) for secure Admin access

## Project structure

The project uses one deployable frontend and one deployable backend:

```text
frontend/
	apps/portal/   Public login portal
	apps/admin/    Admin dashboard
	apps/user/     Ministry user dashboard
backend/
	server.js      Admin API and ministry-user API on one port
```

The frontend uses the same-origin `/api` path by default. Set `VITE_API_URL` only
when the frontend and backend are deployed to different domains.

## Local run

```bash
npm install
npm run dev:backend
npm run dev
```

Open the Vite URL and use `/apps/portal/`, `/apps/admin/`, or `/apps/user/`.

For production:

```bash
npm run build
npm start
```

Set `MONGO_URI`, `ADMIN_PASSWORD`, `JWT_SECRET`, and `PORT` in the backend
environment. Never commit `.env` files or database credentials.

## 🔑 Key Features

### 👤 Public Facing (Frontend)
*   **Browse by Ministry:** View a categorized list of all institutions under a specific Minister.
*   **Smart Search:** Search for any department or corporation by name to quickly find which Ministry it belongs to.
*   **Responsive Design:** Accessible on mobile phones, tablets, and desktops.

### 🛡️ Admin Panel (CMS - Content Management System)
*   **Dashboard:** Overview of the total number of Ministries and Institutions.
*   **Manage Ministries:** `Create`, `Read`, `Update`, and `Delete` (CRUD) Ministries.
*   **Manage Institutions:** Assign newly created departments to specific ministries, edit names, or remove outdated ones.
*   **Secure Access:** Only authorized admins can access the modification portal.

## 🗄️ Database Structure (Proposed)
*   **Ministry Collection:** `_id`, `name` (e.g., "Minister of Defence"), `createdAt`
*   **Institution Collection:** `_id`, `name` (e.g., "Sri Lanka Army"), `ministry_id` (Reference to Ministry Collection), `createdAt`
