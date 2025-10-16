# Requirements Document

## Introduction
This feature implements a complete user authentication system for Zencourt using Stack Auth, a modern authentication-as-a-service platform. The system enables users to securely register, log in, and access their personalized project dashboard using email/password credentials or OAuth providers (Google, GitHub, etc.). Stack Auth handles all user management, session handling, and security, while we integrate it seamlessly into the Next.js application.

## Requirements

### Requirement 1: Stack Auth Integration
**User Story:** As a developer, I want Stack Auth integrated into the application, so that user authentication is managed securely without building custom auth infrastructure.

#### Acceptance Criteria
1. WHEN the application starts THEN Stack Auth SDK SHALL be initialized with project credentials
2. WHEN Stack Auth is configured THEN it SHALL use environment variables for project ID and publishable key
3. WHEN the application renders THEN it SHALL be wrapped with StackProvider for authentication context
4. WHEN Stack Auth routes are accessed THEN the handler route SHALL process authentication callbacks
5. WHEN sessions are created THEN they SHALL be stored as HTTP-only cookies via Stack Auth
6. IF Stack Auth configuration is missing THEN the application SHALL fail with clear error messages

### Requirement 2: Authentication Portal UI
**User Story:** As a user, I want a clean authentication portal, so that I can easily register or log in to Zencourt.

#### Acceptance Criteria
1. WHEN accessing Zencourt while not authenticated THEN the system SHALL display the authentication portal at /auth route
2. WHEN the authentication portal loads THEN it SHALL use Stack Auth's pre-built SignIn component
3. WHEN the portal is displayed THEN it SHALL use Zencourt's design system (beige/cream gradient, modern styling)
4. WHEN authentication succeeds THEN the user SHALL be redirected to the home page
5. WHEN authentication fails THEN the system SHALL display error messages from Stack Auth
6. IF the user is already authenticated THEN accessing /auth SHALL redirect to the dashboard
7. WHEN the portal is displayed on mobile THEN it SHALL be fully responsive

### Requirement 3: Protected Routes and Dashboard Redirection
**User Story:** As an authenticated user, I want to be automatically redirected to my dashboard, so that I can immediately access my projects.

#### Acceptance Criteria
1. WHEN a user successfully authenticates THEN the system SHALL redirect them to / (main projects view)
2. WHEN a user accesses the root route while not authenticated THEN they SHALL be redirected to /auth
3. WHEN a user is redirected to /auth THEN the system SHALL preserve the intended destination URL as a query parameter
4. WHEN authentication succeeds after redirect THEN the user SHALL be sent to the originally intended destination
5. IF the session expires while browsing THEN the system SHALL redirect to /auth on the next page load
6. WHEN the user manually navigates to /auth while authenticated THEN they SHALL be redirected to /
7. WHEN middleware runs THEN it SHALL check authentication status using Stack Auth's getUser() method

### Requirement 4: User Profile Data Management
**User Story:** As a logged-in user, I want my profile information displayed, so that I know I'm logged into the correct account.

#### Acceptance Criteria
1. WHEN the user is authenticated THEN their name and avatar SHALL be displayed in the sidebar
2. WHEN user data is fetched THEN it SHALL include: id, displayName, primaryEmail, profileImageUrl
3. WHEN an OAuth user logs in THEN their OAuth profile picture SHALL be displayed as avatar
4. WHEN a user without profile image logs in THEN their initials SHALL be displayed in a circular avatar
5. WHEN user profile data changes THEN it SHALL be reflected in the UI using Stack's useUser() hook
6. WHEN the sidebar renders THEN it SHALL use Stack Auth's useUser() hook to access current user

### Requirement 5: Session Management
**User Story:** As a logged-in user, I want my session to persist across page refreshes, so that I don't have to log in repeatedly.

#### Acceptance Criteria
1. WHEN a user logs in successfully THEN Stack Auth SHALL create a secure session token
2. WHEN a session token is created THEN it SHALL be stored as an HTTP-only, secure cookie
3. WHEN the user makes authenticated requests THEN Stack Auth SHALL automatically validate the session
4. WHEN a session is valid THEN the system SHALL provide user data through useUser() hook
5. IF the session expires THEN Stack Auth SHALL clear the session and redirect to /auth
6. WHEN the user logs out THEN Stack Auth SHALL delete the session and clear cookies
7. WHEN sessions are managed THEN Stack Auth SHALL handle all security best practices

### Requirement 6: OAuth Authentication
**User Story:** As a user, I want to log in with my Google or GitHub account, so that I can quickly access Zencourt without creating a password.

#### Acceptance Criteria
1. WHEN OAuth providers are configured in Stack dashboard THEN users SHALL see OAuth buttons in sign-in UI
2. WHEN the user clicks an OAuth button THEN Stack Auth SHALL redirect to the provider's consent screen
3. WHEN the user authorizes the application THEN the provider SHALL redirect back with authorization
4. WHEN OAuth authorization succeeds THEN Stack Auth SHALL create or retrieve the user account
5. WHEN a new OAuth user signs in THEN Stack Auth SHALL create a user profile automatically
6. WHEN an existing user signs in via OAuth THEN Stack Auth SHALL link the OAuth provider to their account
7. WHEN OAuth fails THEN Stack Auth SHALL display an error message and return to /auth
8. WHEN OAuth providers are enabled THEN they SHALL be configured in the Stack Auth dashboard

### Requirement 7: Logout Functionality
**User Story:** As a logged-in user, I want to log out, so that I can secure my account when done.

#### Acceptance Criteria
1. WHEN the user clicks a logout button in the sidebar THEN Stack Auth's signOut() method SHALL be called
2. WHEN signOut() is called THEN Stack Auth SHALL delete the session from the server
3. WHEN the session is deleted THEN Stack Auth SHALL clear the session cookie
4. WHEN logout completes THEN the user SHALL be redirected to /auth
5. IF logout fails THEN the user SHALL still be logged out client-side and redirected

### Requirement 8: Multi-Project User Isolation
**User Story:** As a user, I want to see only my own projects, so that my data is private and secure.

#### Acceptance Criteria
1. WHEN fetching projects via API THEN the query SHALL filter by the authenticated user's Stack Auth ID
2. WHEN creating a project THEN the Stack Auth user_id SHALL be automatically associated with the project
3. WHEN accessing a project THEN the system SHALL verify the project belongs to the authenticated user
4. IF a user tries to access another user's project THEN the system SHALL return 403 Forbidden
5. WHEN displaying the dashboard THEN only projects owned by the current user SHALL be shown
6. WHEN user authentication is required in API routes THEN stackServerApp.getUser() SHALL be used

### Requirement 9: Security and Best Practices
**User Story:** As a system administrator, I want the authentication system to follow security best practices, so that user data is protected.

#### Acceptance Criteria
1. WHEN passwords are stored THEN Stack Auth SHALL hash them using industry-standard algorithms
2. WHEN session tokens are generated THEN Stack Auth SHALL use cryptographically secure random values
3. WHEN cookies are set THEN Stack Auth SHALL use httpOnly, secure (HTTPS), and sameSite flags
4. WHEN authentication endpoints are exposed THEN Stack Auth SHALL implement rate limiting to prevent brute force attacks
5. WHEN database queries are executed THEN they SHALL use parameterized queries to prevent SQL injection
6. WHEN user input is processed THEN Stack Auth SHALL validate and sanitize inputs
7. WHEN errors occur THEN error messages SHALL not leak sensitive information
8. WHEN security updates are needed THEN Stack Auth SHALL handle updates automatically

### Requirement 10: Environment Configuration
**User Story:** As a developer, I want all sensitive configuration in environment variables, so that credentials are not hardcoded.

#### Acceptance Criteria
1. WHEN the application starts THEN it SHALL read Stack Auth configuration from environment variables
2. WHEN environment variables are defined THEN they SHALL include: NEXT_PUBLIC_STACK_PROJECT_ID, NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
3. WHEN environment variables are missing THEN Stack Auth SHALL fail gracefully with clear error messages
4. WHEN environment files are used THEN they SHALL be excluded from version control (.gitignore)
5. IF example configuration is needed THEN a .env.example file SHALL be provided
6. WHEN deploying to production THEN environment variables SHALL be configured in the deployment platform

### Requirement 11: Database Schema for Projects (Non-Auth)
**User Story:** As a developer, I want a database schema for storing project data, so that users can manage their video projects.

#### Acceptance Criteria
1. WHEN the database is initialized THEN it SHALL contain a projects table
2. WHEN projects table is created THEN it SHALL have a user_id column referencing Stack Auth user IDs
3. WHEN projects are created THEN they SHALL be associated with the authenticated user's Stack Auth ID
4. WHEN the database schema is managed THEN SQL migration files SHALL be created in a migrations directory
5. IF schema changes are needed THEN new migration files SHALL be created with timestamps
6. WHEN the projects table is created THEN it SHALL have appropriate constraints and indexes

## Edge Cases and Constraints

### Edge Cases
1. **Email Case Sensitivity:** Stack Auth handles email normalization automatically
2. **Account Linking:** Stack Auth manages OAuth account linking automatically
3. **Session Cleanup:** Stack Auth handles expired session cleanup automatically
4. **Concurrent Login Sessions:** Stack Auth supports multiple devices/browsers with separate sessions
5. **OAuth Cancellation:** Stack Auth handles OAuth cancellation gracefully
6. **Password Requirements:** Stack Auth enforces configurable password requirements
7. **Email Verification:** Stack Auth provides optional email verification flows
8. **Password Reset:** Stack Auth provides built-in password reset functionality

### Constraints
1. **Session Expiration:** Configured in Stack Auth dashboard (default: 30 days)
2. **Password Requirements:** Configured in Stack Auth dashboard
3. **Rate Limiting:** Managed by Stack Auth
4. **Cookie Security:** Enforced by Stack Auth (httpOnly, secure, sameSite=strict)
5. **OAuth Providers:** Configured in Stack Auth dashboard
6. **User Data Storage:** Managed by Stack Auth (hosted)
7. **Authentication UI:** Provided by Stack Auth (customizable via themes)

### Technical Constraints
1. **Frontend Framework:** Next.js 15 with App Router
2. **Database:** Neon PostgreSQL (for application data, not auth)
3. **Authentication Provider:** Stack Auth
4. **Session Storage:** HTTP-only cookies (managed by Stack Auth)
5. **Deployment:** Vercel (serverless functions)
6. **Authentication Strategy:** Session-based with HTTP-only cookies
7. **No Custom Auth Backend:** All authentication handled by Stack Auth

## Removed Requirements (Handled by Stack Auth)

The following requirements from the original specification are **no longer needed** because Stack Auth handles them automatically:

- ~~Neon PostgreSQL database setup for auth tables~~ (Stack Auth manages user storage)
- ~~Custom API routes for register/login/logout~~ (Stack Auth provides API routes)
- ~~Password hashing with bcrypt~~ (Stack Auth handles password security)
- ~~Custom session token generation~~ (Stack Auth manages sessions)
- ~~Custom Google OAuth implementation~~ (Stack Auth provides OAuth)
- ~~Custom user context provider~~ (Stack Auth provides useUser() hook)
- ~~Email validation utilities~~ (Stack Auth validates emails)
- ~~Password reset flow~~ (Stack Auth provides password reset)
- ~~Email verification~~ (Stack Auth provides email verification)
- ~~Rate limiting implementation~~ (Stack Auth handles rate limiting)
