# 📧 Email Scheduler - Frontend

React + TypeScript + Vite frontend for the Email Scheduler application.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Backend server running on port 5000

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Running the Application

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

The app will be available at **http://localhost:5173**

---

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images, icons
│   ├── auth/              # Authentication
│   │   ├── AuthContext.tsx    # Auth state management
│   │   ├── GoogleAuth.tsx     # Google OAuth button
│   │   ├── RequireAuth.tsx    # Protected route wrapper
│   │   └── UserProfile.tsx    # User profile component
│   ├── components/        # Reusable UI components
│   │   ├── Badge.tsx          # Status badges
│   │   ├── Button.tsx         # Button component
│   │   ├── EmptyState.tsx     # Empty state display
│   │   ├── Header.tsx         # App header
│   │   ├── Input.tsx          # Input field
│   │   ├── Loader.tsx         # Loading spinner
│   │   ├── Modal.tsx          # Modal dialog
│   │   ├── Table.tsx          # Data table/cards
│   │   └── Textarea.tsx       # Textarea field
│   ├── pages/             # Application pages
│   │   ├── Dashboard.tsx      # Main dashboard
│   │   ├── Login.tsx          # Login page
│   │   ├── ComposeEmail.tsx   # Compose new email
│   │   ├── ScheduledEmails.tsx# Scheduled emails list
│   │   └── SentEmails.tsx     # Sent emails list
│   ├── services/          # API services
│   │   ├── api.service.ts     # Axios instance
│   │   ├── auth.service.ts    # Auth API calls
│   │   └── email.service.ts   # Email API calls
│   ├── types/             # TypeScript types
│   │   ├── auth.types.ts      # Auth types
│   │   ├── email.types.ts     # Email types
│   │   └── index.ts           # Type exports
│   ├── utils/             # Utility functions
│   │   ├── dateFormatter.ts   # Date formatting
│   │   └── parseEmails.ts     # Email parsing
│   ├── App.tsx            # Main app component
│   ├── App.css            # App styles
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── .env                   # Environment variables
├── index.html             # HTML template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
└── tailwind.config.js     # Tailwind config
```

---

## 🔐 Authentication Flow

### Google OAuth Login

1. User clicks "Sign in with Google" button
2. Google OAuth popup opens
3. User grants permission
4. Frontend receives Google credential (JWT)
5. Frontend sends credential to backend `/api/auth/google`
6. Backend verifies credential and returns app JWT
7. JWT stored in localStorage
8. User redirected to Dashboard

### Protected Routes

All routes except `/login` require authentication:

```tsx
<Route element={<RequireAuth />}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/compose" element={<ComposeEmail />} />
  {/* ... */}
</Route>
```

---

## 📡 API Services

### Auth Service (`services/auth.service.ts`)

```typescript
// Google OAuth login
authService.googleLogin(credential: string): Promise<AuthResponse>

// Get user profile
authService.getProfile(): Promise<User>
```

### Email Service (`services/email.service.ts`)

```typescript
// Get all emails
emailService.getEmails(): Promise<Email[]>

// Get scheduled emails
emailService.getScheduledEmails(): Promise<Email[]>

// Get sent emails
emailService.getSentEmails(): Promise<Email[]>

// Create/schedule email
emailService.createEmail(data: CreateEmailData): Promise<Email>

// Cancel scheduled email
emailService.cancelEmail(id: string): Promise<void>
```

---

## 🎨 UI Components

### Table Component

Displays emails as cards with responsive design:

```tsx
<Table
  columns={["Recipient", "Subject", "Status", "Scheduled"]}
  data={emails.map((email) => [
    email.recipientEmail,
    email.subject,
    email.status,
    formatDate(email.scheduledAt),
  ])}
/>
```

### Badge Component

Status indicators:

```tsx
<Badge variant="success">SENT</Badge>
<Badge variant="warning">SCHEDULED</Badge>
<Badge variant="error">FAILED</Badge>
```

---

## 🛠️ Tech Stack

| Technology          | Version | Purpose      |
| ------------------- | ------- | ------------ |
| React               | 19.x    | UI library   |
| TypeScript          | 5.x     | Type safety  |
| Vite                | 7.x     | Build tool   |
| Tailwind CSS        | 4.x     | Styling      |
| React Router        | 7.x     | Routing      |
| Axios               | 1.x     | HTTP client  |
| @react-oauth/google | 0.13.x  | Google OAuth |
| jwt-decode          | 4.x     | JWT decoding |

---

## 🔧 Available Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build for production     |
| `npm run preview` | Preview production build |
| `npm run lint`    | Run ESLint               |

---

## 🌐 Environment Variables

| Variable                | Required | Description            |
| ----------------------- | -------- | ---------------------- |
| `VITE_API_URL`          | Yes      | Backend API URL        |
| `VITE_GOOGLE_CLIENT_ID` | Yes      | Google OAuth Client ID |

---

## 📝 Notes

- All API requests include JWT token in Authorization header
- Token is stored in localStorage under `user` key
- Axios interceptor automatically attaches token to requests
- 401 responses trigger automatic logout

---

## 🏗️ Implementation Guide

### How Frontend Features Are Implemented

#### 1. Google OAuth Authentication

**Files:** `auth/GoogleAuth.tsx`, `auth/AuthContext.tsx`

**Flow:**

1. User clicks "Sign in with Google" button
2. Google OAuth popup opens via `@react-oauth/google`
3. User grants permission
4. Frontend receives credential (JWT)
5. Credential sent to backend: `POST /api/auth/google`
6. Backend verifies and returns app JWT
7. JWT stored in localStorage
8. User redirected to Dashboard

**Code:**

```tsx
// auth/GoogleAuth.tsx
<GoogleOAuthProvider clientId={clientId}>
  <GoogleLogin
    onSuccess={(credentialResponse) => {
      authService.googleLogin(credentialResponse.credential);
    }}
  />
</GoogleOAuthProvider>
```

#### 2. Protected Routes

**File:** `auth/RequireAuth.tsx`

**Implementation:**

```tsx
export const RequireAuth = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

**Usage in App.tsx:**

```tsx
<Route element={<RequireAuth />}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/compose" element={<ComposeEmail />} />
  <Route path="/scheduled" element={<ScheduledEmails />} />
  <Route path="/sent" element={<SentEmails />} />
</Route>
```

#### 3. Dashboard with Real-time Stats

**File:** `pages/Dashboard.tsx`

**Features:**

- Display counts: Total, Scheduled, Sent, Failed
- Show recent emails
- Search and filter functionality
- Card-based responsive layout

**Data Fetching:**

```tsx
const fetchEmails = async () => {
  const data = await emailService.getEmails();
  setEmails(data);

  // Calculate stats
  setTotalEmails(data.length);
  setScheduledCount(data.filter((e) => e.status === "SCHEDULED").length);
  setSentCount(data.filter((e) => e.status === "SENT").length);
  setFailedCount(data.filter((e) => e.status === "FAILED").length);
};
```

#### 4. Compose Email Form

**File:** `pages/ComposeEmail.tsx`

**Features:**

- Sender selection dropdown
- Recipient email validation
- Subject and body inputs
- Date/time picker for scheduling
- Form validation

**Submit Handler:**

```tsx
const handleSubmit = async (e) => {
  const emailData = {
    senderId: selectedSender,
    recipientEmail,
    subject,
    body,
    scheduledAt: new Date(scheduledDate).toISOString(),
  };

  await emailService.createEmail(emailData);
  navigate("/");
};
```

#### 5. Card-Based Table Component

**File:** `components/Table.tsx`

**Design:**

- Responsive cards instead of traditional tables
- First 2 columns on left, remaining on right
- Status badges with colors
- Empty state when no data

**Structure:**

```tsx
<div className="space-y-3">
  {data.map((row, index) => (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex justify-between">
        <div>
          <div>{row[0]}</div> {/* First column */}
          <div>{row[1]}</div> {/* Second column */}
        </div>
        <div className="text-right">
          {row.slice(2).map((cell) => (
            <div>{cell}</div>
          ))}
        </div>
      </div>
    </div>
  ))}
</div>
```

#### 6. API Service Layer

**File:** `services/api.service.ts`

**Features:**

- Centralized Axios instance
- Automatic JWT token attachment
- Request/response interceptors
- Error handling

**Implementation:**

```tsx
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
```

#### 7. Date Formatting

**File:** `utils/dateFormatter.ts`

**Implementation:**

```tsx
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
```

**Usage:**

```tsx
{
  formatDate(email.scheduledAt);
} // → "Jan 30, 2026, 7:30 PM"
```

#### 8. Email Parsing Utility

**File:** `utils/parseEmails.ts`

**Purpose:** Parse comma/semicolon-separated email lists

**Implementation:**

```tsx
export const parseEmails = (input: string): string[] => {
  return input
    .split(/[,;]/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
};
```

#### 9. Status Badges

**File:** `components/Badge.tsx`

**Variants:**

- `success` (green) - SENT
- `warning` (yellow) - SCHEDULED
- `error` (red) - FAILED
- `default` (gray) - Other

**Implementation:**

```tsx
const variants = {
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  default: "bg-gray-100 text-gray-800",
};
```

---

## 🎨 UI/UX Implementation Details

### Design System

**Colors:**

- Primary: `#49a34b` (green)
- Backgrounds: `#e9f5ed` (pale green), `#f9fafb` (gray)
- Text: `#000000` (black headings), `#6b7280` (gray body)

**Components:**

- Buttons: Rounded with hover effects
- Inputs: Border with focus states
- Cards: Shadow on hover
- Badges: Rounded pill shape

### Responsive Design

**Breakpoints:**

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Implementation:**

```tsx
className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
```

### State Management

**Global State:**

- Auth: `AuthContext.tsx` (React Context)
- User info stored in localStorage

**Local State:**

- Component state with `useState`
- Form state with controlled inputs
- Loading states for async operations

### Error Handling

**API Errors:**

```tsx
try {
  await emailService.createEmail(data);
  setSuccess("Email scheduled successfully!");
} catch (error) {
  setError(error.response?.data?.message || "Failed to schedule email");
}
```

**Form Validation:**

- Email format validation
- Required field checks
- Date validation (future dates only)

---

## 🚀 Running Frontend in Different Modes

### Development Mode

```bash
npm run dev
# - Hot module replacement
# - Source maps enabled
# - Dev server on port 5173
```

### Production Build

```bash
npm run build
# - TypeScript compilation
# - Vite optimization
# - Output to dist/
```

### Preview Production Build

```bash
npm run preview
# - Serves dist/ folder
# - Test production build locally
```

### Linting

```bash
npm run lint
# - ESLint checks
# - TypeScript errors
# - Code style issues
```

---

## 🔧 Customization Guide

### Change Color Scheme

Edit `index.css` and component files:

```css
/* Primary color */
--primary: #49a34b;

/* Backgrounds */
--bg-light: #e9f5ed;
```

### Add New Route

1. Create page in `pages/`
2. Add route in `App.tsx`:

```tsx
<Route path="/new-page" element={<NewPage />} />
```

### Add New API Endpoint

1. Add function in `services/email.service.ts`:

```tsx
export const newEndpoint = async () => {
  const { data } = await api.get("/new-endpoint");
  return data;
};
```

2. Use in component:

```tsx
const result = await emailService.newEndpoint();
```

---

## 📚 Key Dependencies Explained

| Package               | Purpose                  | Used In                |
| --------------------- | ------------------------ | ---------------------- |
| `@react-oauth/google` | Google OAuth integration | `auth/GoogleAuth.tsx`  |
| `react-router-dom`    | Client-side routing      | `App.tsx`, navigation  |
| `axios`               | HTTP client              | `services/*.ts`        |
| `jwt-decode`          | Decode JWT tokens        | `auth/AuthContext.tsx` |
| `tailwindcss`         | Utility-first CSS        | All components         |
| `vite`                | Build tool & dev server  | Build process          |

---

## 🐛 Debugging Tips

### Check API Calls

Open Browser DevTools → Network tab:

- See all API requests
- Check request/response data
- Verify JWT token in headers

### Check localStorage

Console:

```javascript
JSON.parse(localStorage.getItem("user"));
```

### React DevTools

Install React DevTools extension:

- Inspect component tree
- Check props and state
- Track re-renders

### Common Issues

**Issue: "401 Unauthorized"**

- Check token in localStorage
- Verify backend is running
- Check CORS settings

**Issue: "Network Error"**

- Verify backend URL in `.env`
- Check backend is running on port 5000

**Issue: Google OAuth not working**

- Verify Client ID in `.env`
- Check authorized origins in Google Console
- Clear browser cache

---
