## Frontend Skills

## SKILL 1 - Page / Screen Creation

**Trigger:** "create a page", "add a screen", "build a [X] page", "new route"

```
You are building a new page or screen for a frontend application.

BEFORE YOU WRITE ANY CODE - ask yourself these 4 questions:
1. What data does this page need? (list every API call)
2. What can the user DO on this page? (list every action)
3. What states can this page be in? (loading, error, empty, populated, submitting)
4. What role or permission level can access this page?

Only start writing after you have clear answers to all 4.

PAGE STRUCTURE - always in this order:
1. Imports (framework, routing, state, types, API, components)
2. Constants and helpers specific to this page (status maps, filter lists, formatters)
3. The default export component function
4. Inside the component - declarations in this order:
   a. Router/navigation hooks
   b. URL params and query params
   c. Data state (the main entity or list)
   d. Loading and error state
   e. UI state (open/closed drawers, selected rows, active filter)
   f. Form state (if page has a form)
5. Data fetching function (memoised with useCallback or equivalent)
6. useEffect to call fetch on mount and when dependencies change
7. Event handlers (one function per user action)
8. Return / render

REQUIRED STATE PATTERN - every page that fetches data must handle all 4 states:
- Loading:   show a loading indicator (spinner or skeleton), never a blank screen
- Error:     show the error message with a Retry button that re-calls the fetch function
- Empty:     show a meaningful empty state message, offer a primary action if one exists
- Populated: the actual content

ACTIONS PATTERN:
- Destructive actions (delete, cancel, deactivate, archive) -> confirm modal first, never fire directly
- Create / edit actions -> drawer or modal form, never inline in the table row
- Success feedback -> toast notification, not alert()
- Failure feedback -> toast notification with the error message from the API, not a console.log

FORMS ON PAGES:
- Validate before calling the API, never after
- Show field-level errors, not just a generic "something went wrong" at the top
- Disable the submit button while the request is in flight
- After success: close the form, refresh the list, show a success toast
- After failure: keep the form open, show the error, let the user retry

LAYOUT RULES:
- List pages: single column, full width
- Detail / view pages: two-column layout - main content left, metadata / timeline / actions right
- Never use fixed heights on content containers
- Padding and spacing come from the design system - never hardcode pixel values inline

DO NOT:
- Use alert() or confirm() - use modal components
- Reload the page after an action - re-fetch the data programmatically
- Leave TODOs or placeholder comments in output
- Hardcode IDs, URLs, or copy strings - put them in constants
- Mix data fetching logic into render logic
```

---
## SKILL 2 - Reusable Component

**Trigger:** "create a component", "add a reusable component", "build a widget", "make a [X] component"

```
You are building a reusable UI component.

BEFORE YOU START - classify the component:
- DISPLAY component: receives data via props, renders it, no internal state
- INTERACTIVE component: has internal state (open/closed, hover, focus) but is self-contained
- CONTROLLED component: value + onChange - parent owns the state, component is a pure input
- COMPOUND component: made of smaller sub-components (e.g. a Table built from Row + Cell + Header)

Match the classification to the correct pattern below:

DISPLAY component:
  - Props are the data to show, plus optional style overrides
  - No useState inside
  - Example: Badge, MetricCard, Timeline, Avatar

INTERACTIVE component:
  - Internal state is only for UI (isOpen, isHovered) - never for data
  - Expose onXxx callbacks so parent can react to events
  - Example: Dropdown, Accordion, Tooltip, ImageCarousel

CONTROLLED component:
  - Always accept: value, onChange, disabled?, placeholder?, name?
  - Never store a copy of value in internal state (causes stale data bugs)
  - Visually reflect disabled state (reduced opacity + no-pointer cursor)
  - Example: TextInput, Select, Toggle, DatePicker, SearchInput

COMPOUND component:
  - Each sub-component is a named export
  - They share context if they need to communicate
  - Example: DataTable + Column, Modal + Header + Footer

PROPS CONTRACT:
- Every prop has an explicit TypeScript type - no 'any', no implicit 'object'
- Optional props have defaults defined (defaultProps or default parameter values)
- Event handler props are typed: onClick?: () => void, onChange?: (value: T) => void
- Children prop is typed: children: React.ReactNode (for slots) or a specific type (for typed children)
- Never pass entire objects when a specific field will do (pass id: string, not user: User)

ACCESSIBILITY (minimum bar):
- Interactive elements are keyboard-reachable (button, input, or tabIndex)
- Buttons have a visible label or aria-label
- Form inputs have an associated label (via htmlFor or wrapping label)
- Error states use aria-invalid and aria-describedby on the input
- Modals trap focus inside while open and restore focus to the trigger on close
- Color is not the only indicator of status (always combine with text or icon)

STYLING RULES:
- Use the project's design system tokens - never hardcode colour hex values
- Hover and focus states are explicit - never rely on browser defaults for custom components
- All spacing uses design system values (never arbitrary px values)
- The component must work in both light and dark mode if the project supports it
- Do not use inline styles mixed with CSS classes - pick one approach and be consistent

QUALITY CHECKLIST before outputting:
- Does it handle the empty/null/undefined case for every prop?
- Does it handle long text gracefully (overflow, truncation, or wrap)?
- Does it look correct at the smallest and largest reasonable size?
- Is the loading state handled if the component can be async?
- Is it exported as a named export?

OUTPUT FORMAT:
- Props interface first, with a JSDoc comment describing what the component does
- Component function next
- Any sub-components or helpers after
- A usage example in a comment at the very top of the component block
```

---
## SKILL 3 - API / Data Layer Function

**Trigger:** "add an API call", "wire up an endpoint", "connect to backend", "fetch data from", "call the API"

```
You are adding a data fetching or mutation function to a frontend project.

ARCHITECTURE RULES:
- All API calls go through a single base request function - never use raw fetch/axios directly in components
- The base function handles: auth headers, base URL, error normalisation, response parsing
- Group related functions into a resource object: usersApi, ordersApi, productsApi etc.
- Each function has one job - never combine two API calls into one function

BASE REQUEST FUNCTION PATTERN:
async function request<T>(method, path, body?, options?) -> Promise<T>
  1. Build the full URL from the configured base URL
  2. Attach auth token (from cookie, localStorage, or in-memory store - match the project's auth pattern)
  3. Set Content-Type: application/json (skip for FormData - let browser set boundary)
  4. Await the fetch
  5. If response is not ok: parse the error body, throw a typed error with errorCode + message
  6. Parse and return the success data
  Never return the raw Response object - always return the parsed data T

FUNCTION RULES:
- Name functions with a verb: getOrders, createProduct, updateStatus, deleteUser, uploadImage
- Accept params as a single typed object, not positional arguments (easier to extend later)
- Query params: build with URLSearchParams from the params object, filter out undefined/null/empty values
- Path params: interpolate directly: `/orders/${id}`
- Optional filters: type the params object with all optional fields, document what each does
- File upload: accept File object, wrap in FormData, do NOT set Content-Type header

RETURN TYPES:
- Single item:   Promise<Product>
- List:          Promise<{ items: Product[]; total: number; page: number }>
- Mutation:      Promise<Product> (return the updated entity, not a success flag)
- Delete:        Promise<void>
- File upload:   Promise<{ url: string }> (return the resulting URL)
- Side effect with no useful return: Promise<void>

ERROR HANDLING:
- Throw typed errors with at minimum: message (human-readable), errorCode (machine-readable)
- Do not swallow errors inside API functions - let them bubble to the caller
- The caller (component or store) decides how to handle and display the error
- Network failures (no internet, timeout) should throw with errorCode: 'NETWORK_ERROR'
- Auth failures (401) should throw with errorCode: 'UNAUTHORIZED' and trigger re-login

CACHING AND STALENESS (decide before writing):
- Is this data that changes often? -> No cache, always re-fetch
- Is this data that rarely changes? -> Cache with a TTL, invalidate on mutation
- Is this data shared across many components? -> Consider a global store, not local state

TYPING RULES:
- All request bodies are typed - no 'any' in POST/PATCH body params
- All response types are defined in a central types file - never inline anonymous types
- If the backend type differs from the frontend type, transform in the API layer, not in the component

OUTPUT FORMAT:
- Show the full typed function signature as a comment above the function
- Group with existing related functions
- List any new types that need to be added to the types file
```

---
## SKILL 4 - Form and Validation

**Trigger:** "add a form", "create a form", "add validation", "form errors", "validate input"

```
You are building a form with validation for a frontend application.

FORM ARCHITECTURE - choose one, do not mix:
A. Uncontrolled with ref   -> simple forms, 1-3 fields, no conditional logic
B. Controlled with useState -> most forms, full control, works with custom components
C. Form library (RHF, Formik etc.) -> complex forms with many fields, nested fields, wizards

For option B (most common), use this state shape:
  const [form, setForm]     = useState<FormState>(INITIAL_VALUES)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)

INITIAL VALUES:
- Always define INITIAL_VALUES as a const above the component
- Used to initialise state AND to reset the form after success
- Type it explicitly - never rely on inference from useState

VALIDATION RULES:
- Validate on submit, not on change (less noisy)
- Exception: clear the error for a field as soon as the user starts editing it again
- validate() function returns Record<keyof FormState, string> - empty string means no error
- Never call the API if validate() returns any non-empty strings

STANDARD VALIDATION MESSAGES (use these exact phrasings for consistency):
  Required field:          "[Field label] is required"
  Min length:              "[Field label] must be at least [n] characters"
  Max length:              "[Field label] cannot exceed [n] characters"
  Invalid email:           "Enter a valid email address"
  Invalid URL:             "Enter a valid URL starting with https://"
  Invalid phone:           "Enter a valid phone number"
  Must be positive number: "[Field label] must be a positive number"
  Must be future date:     "[Field label] must be a future date"
  Passwords must match:    "Passwords do not match"
  Already taken (from API):"[Field label] is already taken"

FIELD ERROR DISPLAY:
- Show error directly below the field it belongs to - never only at the top of the form
- Use a consistent visual: red text, small font, margin-top 4-6px
- Screen readers: aria-invalid="true" on the input, aria-describedby pointing to the error element
- Clear the error when the user edits the field: onChange -> setErrors(p => ({...p, [field]: ''}))

SUBMIT HANDLER PATTERN:
  async function handleSubmit() {
    const validationErrors = validate(form)
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors)
      return                           // stop here, never call API with invalid data
    }
    try {
      setSubmitting(true)
      const result = await api.createX(form)
      onSuccess(result)                // close drawer, refresh list, show toast
      setForm(INITIAL_VALUES)          // reset form
      setErrors({})
    } catch (e) {
      if (e.errorCode === 'DUPLICATE') {
        setErrors({ code: 'Already taken' })   // map API errors back to fields
      } else {
        showToast(e.message, 'error')          // generic errors -> toast
      }
    } finally {
      setSubmitting(false)
    }
  }

SUBMIT BUTTON RULES:
- Disabled while submitting (prevents double-submit)
- Shows a loading indicator while submitting
- Label changes while loading: "Save" -> "Saving..." (optional but good UX)
- Never disabled for any other reason before first submit attempt

EDIT FORM PATTERN (pre-populating):
- Accept an entity prop (or null for create mode)
- useEffect to set form state when entity changes: useEffect(() => { if (entity) setForm(mapToForm(entity)) }, [entity])
- Define a mapToForm() helper that transforms the API entity into the FormState shape

DO NOT:
- Use HTML5 required, min, max attributes - JS validation only, for consistent UX
- Mutate form state directly - always use setForm(prev => ({...prev, field: value}))
- Submit on Enter unless the form is a single-field search or the UX explicitly expects it
- Show all errors at once on page load before the user has interacted with the form
```

---
## SKILL 5 - Table and List Display

**Trigger:** "display a list", "show a table", "list of [X]", "table with columns", "add a column"

```
You are building a data table or list display for a frontend application.

CHOOSE THE RIGHT PATTERN FIRST:
- Few columns, simple data, predictable widths -> HTML table
- Cards/tiles needed, irregular content -> CSS grid of cards
- Infinite scroll or virtualization needed -> virtual list (react-window or equivalent)
- Mobile-first, single entity per row with many fields -> stacked card list

For HTML tables, use this column definition shape:
  { key: string, label: string, width?: string, render: (row: T) => ReactNode }

COLUMN RULES:
- key:    unique identifier, camelCase, matches the field name where possible
- label:  Title Case, concise (1-2 words), no units in the header label
- width:  only set for predictable-width columns (checkboxes, dates, badges, action buttons)
          leave undefined for text columns that should fill the remaining space
- render: always returns a React node - never return a raw string without styling

CELL CONTENT HIERARCHY - every cell should establish a clear visual hierarchy:
  Primary value:   largest, highest contrast (the thing the user scans for)
  Secondary value: smaller, lower contrast (supporting context on a second line)
  Metadata:        smallest, lowest contrast, monospace if it's an ID or code

MANDATORY CELL PATTERNS:
  Status values:      always use a Badge/chip - never plain text
  Monetary values:    always formatted (currency symbol, thousands separator), never raw number
  Dates:              always formatted (not ISO strings), relative time for recent events
  IDs / codes / SKUs: monospace font
  User names:         with avatar initial or photo if available
  Action buttons:     last column, no label, fixed width 80-120px

COLUMN BEHAVIOUR:
  Sortable column:    show sort icon (both directions), highlight active sort
  Filterable column:  chip group or dropdown above the table, not in the header
  Searchable list:    debounced search input (300-400ms), search triggers re-fetch not client filter
  Selectable rows:    checkbox in first column, bulk action bar appears when rows are selected

REQUIRED TABLE STATES (handle all 4):
  Loading:   show skeleton rows (same count as page size) OR a centred spinner
             never show an empty table with a spinner outside it
  Error:     show error message inside the table area with a Retry button
  Empty:     show icon + message + primary action button (e.g. "No products yet - Add first product")
             the empty message must be specific to the entity, never "No data found"
  Populated: the rows

PAGINATION:
  Server-side pagination (preferred for large datasets):
    - Always send page + limit to the API
    - Show total count and current range: "Showing 1-20 of 148"
    - Previous / Next buttons, disable when at boundaries
  Client-side filtering (only for small datasets <200 rows):
    - Load all data once, filter in memory
    - Never mix: either all filtering is server-side or all is client-side

ROW INTERACTIONS:
  Clickable row (navigates to detail):    cursor pointer, subtle hover background
  Row with inline actions only:           no row click handler
  Row with both:                          e.stopPropagation() on all inline action buttons

PERFORMANCE:
  - Memoize column definitions (useMemo) if the table re-renders frequently
  - Memoize row render functions if rows are complex
  - Never re-create the columns array inside the render body if it contains functions

DO NOT:
  - Use an HTML table for a card/tile layout
  - Show more than 8 columns without a horizontal scroll or column toggle
  - Put forms inside table rows - use a drawer or modal
  - Filter/sort data inside the render function - do it in a useMemo or on the server
```

---
## SKILL 6 - Layout and Spacing

**Trigger:** "layout", "page layout", "spacing", "grid", "sidebar", "responsive", "two column", "arrange"

```
You are applying layout and spacing to a frontend screen or component.

LAYOUT DECISION TREE - pick the right tool:
  Single axis, items in a row or column  -> Flexbox
  Two axes, rows AND columns             -> CSS Grid
  Fixed sidebar + scrollable content     -> Grid with fixed column width
  Cards that wrap to fill space          -> Grid with auto-fill/auto-fit
  Overlapping elements (modals, toasts)  -> Position absolute/fixed over a relative parent

COMMON LAYOUT RECIPES:

App shell (sidebar + main):
  display: grid
  gridTemplateColumns: '[sidebar-width] 1fr'
  height: 100vh
  overflow: hidden
  (sidebar scrolls independently, main content scrolls independently)

Detail page (content + metadata sidebar):
  display: grid
  gridTemplateColumns: '1.4fr 1fr'   (adjust ratio to content needs)
  gap: [design system gap token]
  align-items: start                  (prevents sidebar stretching to content height)

Metrics / stat cards row:
  display: grid
  gridTemplateColumns: 'repeat([n], minmax(0, 1fr))'
  gap: [design system gap token]

Filter chips row above a table:
  display: flex
  gap: [small gap token]
  flex-wrap: wrap
  align-items: center
  (search input gets flex: 1 with a minWidth to prevent it collapsing)

Modal / drawer overlay:
  position: fixed
  inset: 0                            (shorthand for top/right/bottom/left: 0)
  z-index: [defined z-index scale]
  (backdrop is position absolute inside the fixed container)

SPACING SYSTEM - always use design system tokens, never raw pixel values:
  xs:   tight spacing inside components (icon + label gap, input padding)
  sm:   spacing between related elements (label + input, icon + text)
  md:   spacing between sections within a card
  lg:   spacing between cards or major page sections
  xl:   spacing above page headers or between major page blocks

SPACING CONSISTENCY RULES:
  - Gap between sibling cards/sections: always the same value (md or lg)
  - Padding inside a card: always the same value (md or lg), consistent across all cards
  - Never mix margin and gap on the same axis for the same layout
  - Use gap on the parent, not margin on children (easier to reason about, no margin collapse)

RESPONSIVE BEHAVIOUR:
  Desktop-first grid that collapses:
    gridTemplateColumns: 'repeat(auto-fill, minmax([min-size], 1fr))'
  Explicit breakpoints:
    use a hook or CSS media queries, not inline style conditionals in JSX
  Two-column detail that stacks:
    at narrow widths: gridTemplateColumns: '1fr' (single column)
  Sidebar that collapses:
    use a collapsed state boolean, animate width with transition

Z-INDEX SCALE (define once, reference by name never by magic number):
  base:     0    (normal document flow)
  raised:   1    (cards, dropdowns relative to siblings)
  dropdown: 10   (floating menus, popovers)
  sticky:   20   (sticky headers, floating action buttons)
  overlay:  50   (drawers, sidesheets, non-blocking overlays)
  modal:    100  (dialogs, confirm modals)
  toast:    200  (notifications, always on top)

OVERFLOW HANDLING:
  Long text in a fixed-width container:
    white-space: nowrap + overflow: hidden + text-overflow: ellipsis
  OR white-space: normal + overflow-wrap: break-word (for wrapping)
  Scrollable content area:
    overflow-y: auto on the container, never on the body or html element
  Table with many columns:
    overflow-x: auto on a wrapper div around the table

DO NOT:
  - Use position: absolute for normal page layout (only for overlays and decorative elements)
  - Set fixed heights on containers that hold dynamic content
  - Use margin: auto for centering in a flex/grid context - use justify-content/align-items
  - Nest grid inside grid inside grid more than 2 levels deep
  - Use !important to override layout - fix the specificity issue instead
  - Set overflow: hidden on a container that has position: sticky children
```

---

## How to use

Each skill is self-contained. Pick any combination based on what tools you're using:

**For a Claude Project:**
Paste all 6 into your project instructions under a `## Frontend Skills` heading.

**For Cursor `.cursorrules`:**
Paste all 6 directly into the file - Cursor injects them automatically when relevant files are open.

**For a custom agent system prompt:**
Add a line at the top:
```
When the user asks you to build frontend code, apply the relevant skill from the skills section below before writing any code.
```
Then paste the skills.

**Mix and match:** Skills 1-2 are for building things. Skills 3-4 are for wiring and logic. Skills 5-6 are for display and layout. Most real tasks use 2-3 skills together.

Here are 6 debug and production-readiness skills, generic enough for any project.

---
## SKILL 7 - Debug a Broken Screen

**Trigger:** "this isn't working", "broken screen", "page not loading", "something is wrong", "fix this bug", "why is this not showing"

```
You are debugging a broken frontend screen. Work through this systematically.
Never guess. Never make 5 changes at once. Isolate first, fix second.

STEP 1 - CLASSIFY THE FAILURE (ask this before touching any code)
Before anything else, determine what category the bug falls into:

  A. RENDER FAILURE     -> Blank screen, white screen, component not appearing
  B. DATA FAILURE       -> Screen loads but shows wrong/missing data
  C. INTERACTION FAILURE -> Screen loads, data shows, but a button/form/action doesn't work
  D. STYLE FAILURE      -> Functionality works but layout is broken or visual is wrong
  E. NAVIGATION FAILURE -> Routing, redirects, back button, URL params broken
  F. PERFORMANCE FAILURE -> Works but is slow, janky, or causes memory issues

Each category has a different starting point. Do not start with code until you know the category.

STEP 2 - GATHER EVIDENCE (do this before reading code)
Ask for or check these in this exact order:

  1. What is the exact error message? (browser console, terminal, network tab)
  2. What is the exact URL where it fails?
  3. Does it fail on first load or after an action?
  4. Does it fail in all browsers or one specific browser?
  5. Does it fail for all users or specific users/roles?
  6. What changed recently? (last commit, dependency update, env variable change)

Do not skip evidence gathering. The answer is usually in the evidence.

STEP 3 - DIAGNOSIS BY CATEGORY

A. RENDER FAILURE - check in this order:
  -> Is there a React error boundary catching and hiding an error? Check console for "The above error occurred in..."
  -> Is a required prop undefined/null causing a crash? Check prop types and default values.
  -> Is a conditional render (&&) swallowing the component? Check for falsy 0, '', null values.
  -> Is the component exported? Named export vs default export mismatch?
  -> Is there a key prop missing or duplicated in a list? Check for "Each child in a list should have a unique key" warning.
  -> Is the component mounting before its data is ready? Add null checks and loading guards.

B. DATA FAILURE - check in this order:
  -> Open the Network tab. Did the API call fire? (if no -> useEffect dependency issue)
  -> Did the API call succeed? (if 4xx/5xx -> backend problem, not frontend)
  -> Is the response shape what you expect? Log the raw response before mapping it.
  -> Is state being set correctly? Add a console.log immediately after setState call.
  -> Is there a stale closure capturing old state? Check useEffect dependencies.
  -> Is the data there but in the wrong format? (number vs string, null vs undefined, nested vs flat)

C. INTERACTION FAILURE - check in this order:
  -> Does the button have an onClick? Is it actually attached to the right element?
  -> Is the button disabled for an unexpected reason? Check all conditions in the disabled prop.
  -> Is an outer element's onClick firing instead? (event bubbling) - check for e.stopPropagation() issues.
  -> Is the async function awaited? Missing await causes fire-and-forget with no error.
  -> Is the loading state getting stuck on true? Check that finally{} always sets it back to false.
  -> Is there a form onSubmit that lacks e.preventDefault()? Causing page reload?

D. STYLE FAILURE - check in this order:
  -> Is the element there but invisible? (color matches background, opacity 0, visibility hidden, height 0)
  -> Is it outside the viewport? (negative position, overflow hidden on parent, z-index behind another element)
  -> Is a flex or grid container missing display:flex/grid?
  -> Is a percentage width/height relative to a parent with no explicit size?
  -> Is the layout correct on desktop but broken on mobile? Check for fixed pixel widths.
  -> Is a CSS class being overridden? Check specificity (inspect element, crossed-out styles).

E. NAVIGATION FAILURE - check in this order:
  -> Is the route defined in the router config?
  -> Is a dynamic segment ([id]) correctly extracted with useParams?
  -> Is there a redirect firing before the page can load? (auth guard, role check)
  -> Is useSearchParams causing a hydration error? (needs Suspense boundary in Next.js)
  -> Is router.push() called before the component mounts?
  -> Is the back button breaking because history is being manipulated incorrectly?

F. PERFORMANCE FAILURE - check in this order:
  -> Is a component re-rendering on every parent render? (missing memo, unstable prop references)
  -> Is an object or array created inline in JSX? ({ } and [] create new references every render)
  -> Is a useEffect missing dependencies causing infinite loops? Check the dependency array.
  -> Is a large list rendering every item without virtualisation?
  -> Is an image unoptimised? (no lazy loading, no size specified, wrong format)
  -> Is a fetch being called in a loop? (inside a .map or inside a useEffect without guard)

STEP 4 - FIX RULES
  - Fix one thing at a time. Test after each fix.
  - If a fix does not resolve the issue within 2 attempts, re-examine the diagnosis.
  - Do not change unrelated code while fixing a bug.
  - Do not "clean up" or "refactor" during a bug fix session.
  - If you are adding a console.log to debug, mark it with // DEBUG so it is easy to find and remove.

STEP 5 - VERIFY THE FIX
After the fix:
  1. Does the original failure reproduce? (it should not)
  2. Does any adjacent functionality break? (check the most obvious related paths)
  3. Is there a null/edge case that could re-trigger the same bug with different data?
  4. Remove all // DEBUG console.log statements.

DO NOT:
  - Make speculative changes ("maybe this will help")
  - Wrap things in try/catch to silence errors without understanding them
  - Add || [] or ?? {} defensively without understanding why the value is null
  - Upgrade dependencies to fix a bug unless the bug is a known library issue
```

---
## SKILL 8 - Debug API / Network Issues

**Trigger:** "API not working", "data not loading", "getting an error from the server", "404", "401", "500", "CORS error", "network request failing"

```
You are debugging a frontend-to-backend communication failure.

STEP 1 - READ THE NETWORK TAB (not the console, the NETWORK tab)
Open DevTools -> Network -> filter by Fetch/XHR.
Answer these questions before touching code:

  1. Did the request fire at all?
     NO  -> The fetch/axios call is never reached. Debug the component flow (SKILL 7, category B).
     YES -> Continue to question 2.

  2. What is the HTTP status code?
     0 or blocked   -> CORS error or network failure. Go to CORS section below.
     400 Bad Request -> Frontend is sending wrong data. Go to REQUEST section below.
     401 Unauthorized -> Auth token missing or invalid. Go to AUTH section below.
     403 Forbidden   -> User lacks permission for this resource. Go to AUTH section below.
     404 Not Found   -> Wrong URL or resource does not exist. Go to URL section below.
     422 Unprocessable -> Validation failure. Go to REQUEST section below.
     429 Too Many Requests -> Rate limited. Back off and retry.
     500/502/503     -> Backend error. This is not a frontend bug. Share the response body with the backend team.

  3. What does the response body say?
     Always read it. The error message is there.

CORS ERROR (status 0, "blocked by CORS policy"):
  Symptoms: request shows as blocked in console, status 0 in network tab
  Frontend side checks:
    -> Is credentials: 'include' set? Then backend must respond with Access-Control-Allow-Credentials: true
       and Access-Control-Allow-Origin must be a specific origin, not *
    -> Is this a preflight (OPTIONS) failure? Check if the OPTIONS request returns 200 and correct headers.
    -> Is the request going to the right origin? Mismatched http vs https, or port mismatch, counts as different origin.
  Frontend cannot fix a CORS error alone - backend must set the correct headers.
  What to tell the backend team:
    "Please add [frontend-origin] to the CORS allowlist and ensure Access-Control-Allow-Credentials is true."

AUTH ERROR (401 / 403):
  -> Is the token being sent? Inspect the request headers in the Network tab. Look for Authorization header or cookie.
  -> Is the token expired? Decode the JWT (jwt.io) and check the exp claim.
  -> Is the token being sent correctly? Bearer token format: "Authorization: Bearer <token>" (with a space, no quotes)
  -> Is the cookie being sent? Check that credentials: 'include' is set on the request.
  -> Is the cookie scoped correctly? Domain, path, and SameSite attributes must allow cross-origin if applicable.
  -> For a 403: the token is valid but the user lacks permission. Check the role/scope on the token claim.

REQUEST ERROR (400 / 422):
  -> Read the response body. It will tell you which field is wrong.
  -> Log the exact request body before it is sent: console.log('Request body:', JSON.stringify(body))
  -> Check for type mismatches: sending a string where the backend expects a number, or null where it expects a string.
  -> Check for missing required fields: a field present in the form but not being sent in the request object.
  -> Check for date format: backend may expect ISO 8601, not a local date string.
  -> Check for enum values: backend may expect uppercase "ACTIVE" not lowercase "active".

URL ERROR (404):
  -> Copy the exact URL from the Network tab. Paste it in the browser. Does it work?
  -> Check for double slashes: api.com//endpoint
  -> Check for missing path segments: is the ID being interpolated? `/users/${userId}` - is userId defined?
  -> Check for trailing slash requirements: some backends treat /users/ and /users differently.
  -> Is the base URL correct for the current environment? dev vs staging vs production.

STEP 2 - REQUEST DEBUGGING CHECKLIST
Before sending a request to a backend team as "broken":
  1. Log the full URL being called
  2. Log the full request body (JSON.stringify it)
  3. Log the full request headers
  4. Try the same request in Postman/Insomnia/curl with the same headers and body
  If it works in Postman but not in the browser -> auth/CORS issue
  If it fails in Postman too -> backend issue, not frontend issue

STEP 3 - ENVIRONMENT ISSUES
If the API works in one environment but not another:
  -> Is NEXT_PUBLIC_API_BASE_URL / VITE_API_URL / equivalent set in the failing environment?
  -> Is it pointing to the right backend? (dev pointing at prod accidentally, or vice versa)
  -> Are environment variables being read at build time vs runtime? (some frameworks require a rebuild)
  -> Is there a proxy configured in dev that is not present in production?

DO NOT:
  - Disable CORS on the frontend - it is a security feature, not an error to suppress
  - Store tokens in localStorage for high-security apps - prefer httpOnly cookies
  - Add a catch block that silently swallows API errors
  - Assume a 500 is a frontend bug - it is always a backend bug
  - Retry a 401 without refreshing the token first
```

---
## SKILL 9 - Production Readiness Audit

**Trigger:** "is this production ready", "ready to ship", "review before deployment", "production checklist", "pre-launch review"

```
You are auditing a frontend codebase or feature for production readiness.
Work through every section. Flag BLOCKING issues (must fix before launch) and IMPORTANT issues (should fix soon).

SECTION 1 - ERROR HANDLING
Check every component that fetches data or performs an action:
  [ ] Every API call has a try/catch
  [ ] Loading state is set to false in a finally block (not just in try and catch separately)
  [ ] Error state is shown to the user with a meaningful message, not "An error occurred"
  [ ] Errors are not silently swallowed (empty catch blocks)
  [ ] An error in one component does not crash the entire page (error boundaries in place)
  [ ] Network failures (offline, timeout) show a user-friendly message with a retry option
  [ ] API errors contain errorCode values that can be mapped to user-friendly copy

BLOCKING: Any silent error, any crash without boundary, any stuck loading state.

SECTION 2 - LOADING STATES
  [ ] Every async operation has a loading indicator
  [ ] Loading indicators appear immediately (not after a delay)
  [ ] Buttons that trigger async actions are disabled while loading (prevents double-submit)
  [ ] The UI does not flash between loading and empty before data arrives
  [ ] Skeleton screens or spinners are used consistently (not a mix of both with no pattern)
  [ ] Long-running operations (>3s) have progress indication or a cancellation option

BLOCKING: Any button that can be double-clicked and trigger duplicate API calls.

SECTION 3 - EMPTY AND EDGE CASES
  [ ] Empty list state: shown with a meaningful message + primary action
  [ ] Single item in a list: renders without layout breaking
  [ ] Very long text in cells: truncated or wrapped, does not break layout
  [ ] Zero values: displayed correctly ($0, 0 items - not blank, undefined, or NaN)
  [ ] Null/undefined props: all components handle optional props gracefully
  [ ] Special characters in user input (', ", <, >, &): displayed correctly, not escaped or broken
  [ ] Very long user names, email addresses, product names: truncated gracefully

BLOCKING: Any NaN, undefined, or [object Object] visible to the user.

SECTION 4 - FORMS AND DATA ENTRY
  [ ] All required fields are validated before submit
  [ ] Validation errors appear next to the field, not only at the top of the form
  [ ] Submit button is disabled while submitting
  [ ] Form resets after successful submission
  [ ] User cannot navigate away mid-form without a warning (if form has significant data entry)
  [ ] Sensitive fields (passwords, card numbers) are not stored in state longer than necessary
  [ ] File upload fields: validate type and size on the frontend before sending to backend

BLOCKING: Any form that can be submitted with invalid data, any double-submit possible.

SECTION 5 - SECURITY
  [ ] No API keys, secrets, or tokens in frontend code or environment variables prefixed NEXT_PUBLIC_ / VITE_
  [ ] User-generated content is never rendered as raw HTML (dangerouslySetInnerHTML without sanitisation)
  [ ] Redirect URLs are validated (open redirect prevention - do not redirect to arbitrary external URLs)
  [ ] Auth tokens are stored in httpOnly cookies, not localStorage (preferred for sensitive apps)
  [ ] Sensitive data (full card numbers, passwords) is never logged to the console
  [ ] The API base URL is the only configurable URL - no user-controlled URLs are fetched

BLOCKING: Any secret in frontend code, any unsanitised HTML render, any token in localStorage for high-security apps.

SECTION 6 - PERFORMANCE
  [ ] No unnecessary re-renders (check with React DevTools Profiler)
  [ ] Images have explicit width and height (prevents layout shift)
  [ ] Images are lazy-loaded below the fold
  [ ] Large lists are paginated or virtualised (never render >100 DOM nodes for a list)
  [ ] No data fetching inside render or inside .map()
  [ ] Heavy components are code-split (dynamic import / lazy) if they are not needed on initial load
  [ ] No memory leaks: event listeners and subscriptions are cleaned up in useEffect return

IMPORTANT: Any list >100 items rendered at once, any image without dimensions.

SECTION 7 - ACCESSIBILITY (minimum bar for launch)
  [ ] All interactive elements are keyboard accessible (Tab to reach, Enter/Space to activate)
  [ ] All images have alt text (empty alt="" for decorative images)
  [ ] Form inputs have associated labels (not just placeholder text)
  [ ] Error messages are associated with their input via aria-describedby
  [ ] Modal dialogs trap focus and return focus to trigger on close
  [ ] Color is not the only way status is communicated (also use text or icons)
  [ ] Page has a logical heading hierarchy (h1 -> h2 -> h3, not arbitrary)

BLOCKING: Any form with no labels, any modal that does not trap focus.

SECTION 8 - ENVIRONMENT AND CONFIG
  [ ] All environment variables are documented in a .env.example file
  [ ] No hardcoded URLs, API endpoints, or environment-specific values in source code
  [ ] The app works correctly when environment variables are not set (fails clearly, not silently)
  [ ] Production build runs without TypeScript errors (npx tsc --noEmit passes)
  [ ] Production build runs without ESLint errors
  [ ] No console.log, console.error, or debugger statements in production code
  [ ] Source maps are disabled or restricted in production (do not expose source code)

BLOCKING: TypeScript errors in production build, hardcoded production URLs in source code.

SECTION 9 - BROWSER AND DEVICE
  [ ] Tested in Chrome, Firefox, Safari (WebKit has different behaviour for many CSS properties)
  [ ] Tested on a real mobile device or accurate emulator
  [ ] Tested with browser zoom at 150% (text and layout should not break)
  [ ] Tested with slow network (Chrome DevTools -> Network -> Slow 3G): loading states appear
  [ ] Tested while offline: app shows an appropriate error, does not crash

IMPORTANT: Safari-specific CSS issues are common - test before launch, not after.

SECTION 10 - OBSERVABILITY
  [ ] Client-side errors are sent to an error monitoring service (Sentry, Datadog, etc.)
  [ ] Critical user flows have basic analytics events (page view, form submit, conversion)
  [ ] API errors include enough context to debug (URL, status code, response body)
  [ ] There is a way to reproduce a bug reported by a user (request IDs, session replay, or logs)

IMPORTANT: Without error monitoring, you will not know something is broken in production until users complain.

OUTPUT FORMAT:
For each section, list:
  BLOCKING: [item] - [why it blocks launch] - [how to fix]
  IMPORTANT: [item] - [why it matters] - [how to fix]
  PASS: [section name] - no issues found

End with a summary:
  "X blocking issues, Y important issues. Ready to launch: YES / NO"
```

---
## SKILL 10 - Console Error / Warning Triage

**Trigger:** "getting a console error", "console warning", "React warning", "hydration error", "key warning", "maximum update depth"

```
You are triaging a browser console error or warning. Identify the root cause and the minimum fix.

COMMON REACT ERRORS AND THEIR EXACT FIXES:

"Warning: Each child in a list should have a unique key"
  Cause:   .map() without a stable key prop on each child element
  Wrong:   items.map((item, index) => <Row key={index} />)   <- index as key is wrong
  Right:   items.map(item => <Row key={item.id} />)           <- use a stable unique ID
  Note:    index is only acceptable for static lists that never reorder or filter

"Warning: Cannot update a component from inside the function body of a different component"
  Cause:   Calling setState of a parent inside the render of a child
  Fix:     Move the setState call into a useEffect, or pass it as a callback prop

"Maximum update depth exceeded"
  Cause:   A useEffect is calling setState which triggers the effect again infinitely
  Fix:     Check the dependency array. A common cause is an object/array in deps that is re-created every render.
           Move the object/array outside the component, or wrap it in useMemo/useCallback.

"Warning: Can't perform a React state update on an unmounted component"
  Cause:   An async operation completes after the component has unmounted, then calls setState
  Fix:     Use an isMounted flag or AbortController in the useEffect cleanup:
           let isMounted = true
           fetchData().then(data => { if (isMounted) setData(data) })
           return () => { isMounted = false }

"Error: Hydration failed because the initial UI does not match what was rendered on the server"
  Cause:   Component renders differently on server vs client (common causes below)
  Common causes and fixes:
    -> Date.now() / new Date() in render -> move to useEffect or pass as prop
    -> Math.random() in render -> move to useEffect or useState initialiser
    -> typeof window !== 'undefined' check -> wrap in useEffect
    -> Browser-only API (localStorage, navigator) in render -> check for window first or use useEffect
    -> Mismatched HTML nesting (<p> inside <p>, <div> inside <p>) -> fix the DOM structure

"Warning: validateDOMNesting: <div> cannot appear as a descendant of <p>"
  Cause:   Invalid HTML nesting (block element inside inline element)
  Fix:     Change the outer element to a div, or the inner element to a span

"Warning: An update to [Component] inside a test was not wrapped in act(...)"
  Cause:   Test has async state updates not wrapped in act()
  Fix:     Wrap async operations in act() or use waitFor() from testing-library

"ReferenceError: [variable] is not defined"
  Cause:   Variable used before declaration, or imported from wrong path
  Fix:     Check the import. Check for typos. Check that the export name matches the import name.

"TypeError: Cannot read properties of undefined (reading '[property]')"
  Cause:   Accessing a property on undefined - most commonly data that hasn't loaded yet
  Fix:     Add a null/loading guard:
           Before:  user.name
           After:   user?.name  OR  if (!user) return null

"TypeError: [function] is not a function"
  Cause:   A prop that should be a function is undefined, or a function is being called on the wrong type
  Fix:     Check that the prop is being passed by the parent. Check for typo in function name.
           Add a guard: if (typeof onSubmit === 'function') onSubmit(data)

"Warning: React Hook useEffect has a missing dependency"
  Cause:   ESLint exhaustive-deps rule flags a variable used inside useEffect not in the deps array
  When to add to deps:   Always, unless you intentionally want it to run only on mount
  When to omit from deps: Stable references (setState functions, dispatch, refs) - these never change
  Never:   Disable the eslint rule with a comment to silence it - understand why it fires first

"Warning: React Hook useCallback / useMemo has unnecessary dependencies"
  Cause:   A value in the deps array never changes (a constant, a stable ref)
  Fix:     Remove the unnecessary dependency. If it is a function, wrap it in useCallback first.

"Objects are not valid as a React child"
  Cause:   Trying to render an object directly: {user} instead of {user.name}
  Fix:     Access the specific property you want to display, or use JSON.stringify for debugging

"Warning: Each child in a list should have a unique 'key' prop. Check the render method of 'Fragment'"
  Cause:   Using shorthand fragment <> inside a .map() - key must go on a real element
  Fix:     Replace <> with <React.Fragment key={item.id}>

CONSOLE LOG HYGIENE (production readiness):
  Before shipping, search for and remove:
    console.log(...)     <- debug output
    console.error(...)   <- only keep intentional error logging
    debugger             <- always remove
    // TODO             <- should be tickets not comments
    // HACK             <- document why, file a ticket to fix properly
    // DEBUG            <- always remove

WHEN TO IGNORE A WARNING:
  Almost never. Warnings are warnings because they indicate likely bugs or future breaking changes.
  Only ignore if: the warning is from a third-party library you cannot control AND you have verified it does not affect behaviour AND it will be fixed in the next library version.
  Never silence a warning with a console.warn override or // eslint-disable.
```

---
## SKILL 11 - Performance Debugging

**Trigger:** "slow", "laggy", "janky", "freezing", "takes too long to load", "too many re-renders", "performance issue"

```
You are diagnosing and fixing a frontend performance problem. Measure first, fix second.
Never optimise without evidence - premature optimisation wastes time and adds complexity.

STEP 1 - MEASURE FIRST
Before writing any code, get a number:
  - For slow page load:      Lighthouse score (Chrome DevTools -> Lighthouse -> Performance)
  - For slow interactions:   Chrome DevTools -> Performance tab -> Record -> do the action -> Stop
  - For too many re-renders: React DevTools -> Profiler -> Record -> do the action -> Stop

A performance issue without a measurement is just a feeling.
After fixing, measure again. Only keep the fix if the number improves.

STEP 2 - CLASSIFY THE PROBLEM

SLOW INITIAL LOAD (page takes >3s to show content):
  -> Bundle too large?
    Check: DevTools -> Network -> JS files size. Total >500KB compressed is a problem.
    Fix: Code split with dynamic import(). Lazy load routes and heavy components.
  -> Too many sequential network requests?
    Check: Network tab waterfall. Are requests waiting for each other?
    Fix: Parallelise with Promise.all(). Move data fetching to the server where possible.
  -> Render-blocking resources?
    Check: Lighthouse -> Opportunities section.
    Fix: Defer non-critical JS. Preload critical resources.
  -> Images too large?
    Check: Network tab -> filter by Img. Any image >200KB on first load is a problem.
    Fix: Use modern format (WebP/AVIF). Add explicit width/height. Lazy load below-the-fold images.
  -> Server response too slow?
    Check: Network tab -> time to first byte (TTFB) >600ms is a backend problem, not frontend.
    Fix: Backend caching, CDN, or database query optimisation - not a frontend fix.

SLOW INTERACTION (button click, filter, sort feels laggy):
  -> Too many re-renders?
    Check: React Profiler. Any component rendering 10+ times for a single interaction is suspect.
    Top causes and fixes:
      - Object/array created inline in JSX: { style={{ color: 'red' }} } -> extract to a const outside render
      - Function created inline in JSX: onClick={() => doX()} in a list -> useCallback or move outside
      - State update causes entire tree to re-render -> split state, use context selectively, or use a store
      - Component not memoised when parent re-renders frequently -> React.memo()
  -> Expensive calculation in render?
    Check: React Profiler -> which component takes the most time per render.
    Fix: useMemo() for expensive calculations. Move calculation outside render if it does not depend on state.
  -> Synchronous operations blocking the main thread?
    Check: Performance tab -> long tasks (red blocks)
    Fix: Move to a Web Worker, or break into chunks with setTimeout(fn, 0)

SLOW SCROLL / ANIMATION (scrolling is choppy, animation stutters):
  -> Too many DOM nodes?
    Check: DevTools -> Elements. More than 1000 visible DOM nodes for a list is too many.
    Fix: Virtualise the list (react-window, react-virtual, TanStack Virtual).
  -> Layout thrashing?
    Check: Performance tab -> purple and green bars alternating rapidly.
    Fix: Batch DOM reads and writes. Avoid reading layout properties (offsetWidth, getBoundingClientRect) inside a loop.
  -> Non-composited animation?
    Check: DevTools -> Rendering -> Paint flashing. If the entire page flashes on scroll, animations are causing repaints.
    Fix: Only animate transform and opacity. These run on the GPU and do not cause repaints.

MEMORY LEAK (page gets slower over time, tab uses increasing RAM):
  -> Event listener not removed?
    Check: DevTools -> Memory -> Heap snapshot. Take two snapshots (before and after an action). Compare detached DOM nodes.
    Fix: Always return a cleanup function from useEffect:
         useEffect(() => {
           window.addEventListener('resize', handler)
           return () => window.removeEventListener('resize', handler)
         }, [])
  -> Subscription not unsubscribed?
    Same pattern - cleanup in useEffect return.
  -> Closure holding a large reference?
    Fix: Be deliberate about what is captured in closures. Avoid capturing entire objects when you only need one field.
  -> setInterval not cleared?
    Fix: clearInterval in useEffect return.

STEP 3 - OPTIMISATION PRIORITY ORDER
Fix in this order (highest impact first, lowest complexity first):
  1. Remove unnecessary network requests
  2. Fix infinite render loops
  3. Virtualise large lists
  4. Code-split large bundles
  5. Optimise images
  6. Memoise expensive calculations (useMemo)
  7. Memoise stable callbacks (useCallback)
  8. Memoize components (React.memo)

Note: Steps 6-8 are the least impactful and most commonly over-applied.
useMemo and useCallback have a cost (memory, complexity). Only use them when profiling shows they help.

STEP 4 - THINGS THAT DO NOT HELP (common wrong fixes):
  - Adding useMemo/useCallback everywhere "just in case" -> adds memory overhead with no benefit
  - Splitting state into many small atoms when it moves together -> more re-renders, not fewer
  - Putting everything in global state -> causes distant components to re-render unnecessarily
  - Upgrading React version to fix performance -> rarely the right fix
  - Adding a loading spinner to make it feel faster -> hides the problem, does not fix it
```

---
## SKILL 12 - Code Review Checklist

**Trigger:** "review this code", "is this good code", "code review", "check this before I merge", "review my PR"

```
You are reviewing frontend code before it is merged. Be specific. Every comment should explain WHY, not just WHAT.

REVIEW IN THIS ORDER (most critical -> least critical):

PASS 1 - CORRECTNESS (does it do what it should?)
  [ ] Does the code handle the null/undefined/empty case for every variable from an external source?
  [ ] Are all async operations awaited? Is every Promise handled?
  [ ] Are side effects (API calls, timers, subscriptions) cleaned up properly?
  [ ] Is the logic correct for edge cases: empty list, single item, maximum value, negative number?
  [ ] Are type assertions (as SomeType) justified? (They bypass the type checker and can hide bugs)
  [ ] Are optional chaining (?.) and nullish coalescing (??) used correctly vs forcing non-null (!.)?

PASS 2 - SECURITY (does it expose risk?)
  [ ] Is user-generated content ever rendered as raw HTML? (dangerouslySetInnerHTML)
  [ ] Are there any secrets, tokens, or API keys in the code or in non-NEXT_PUBLIC env variables rendered client-side?
  [ ] Are file uploads validated (type and size) before being sent?
  [ ] Are redirects validated? (no open redirect to user-supplied URLs)
  [ ] Is authentication checked before showing sensitive data?

PASS 3 - ROBUSTNESS (does it hold up under real conditions?)
  [ ] What happens if the network is slow? (loading state visible)
  [ ] What happens if the API returns an error? (error state visible, not a blank screen)
  [ ] What happens if the user clicks the submit button twice? (protected against double-submit)
  [ ] What happens if the data is much larger or smaller than expected?
  [ ] What happens if the user navigates away mid-operation?

PASS 4 - MAINTAINABILITY (can another developer work on this next month?)
  [ ] Is the component doing more than one job? (should it be split?)
  [ ] Are magic values (strings, numbers) extracted into named constants?
  [ ] Are similar patterns handled consistently with the rest of the codebase?
  [ ] Are function and variable names self-explanatory? (no i, j, temp, data, info, obj)
  [ ] Is complex logic explained with a comment? (not WHAT it does - WHY it does it)
  [ ] Is dead code (commented-out blocks, unused variables) removed?

PASS 5 - PERFORMANCE (does it scale?)
  [ ] Are there any API calls inside a .map() or a loop?
  [ ] Are objects or arrays created inline in JSX in a component that re-renders frequently?
  [ ] Is a list with potentially >50 items rendered without pagination or virtualisation?
  [ ] Are useEffect dependencies complete and minimal?
  [ ] Are any expensive operations (sort, filter, transform) on large arrays done without useMemo?

PASS 6 - TYPES (is the type safety real?)
  [ ] Is 'any' used? Every 'any' must have a comment justifying why.
  [ ] Are non-null assertions (!) justified? (They are a promise to TypeScript that you are right.)
  [ ] Are type definitions in the central types file, not inline anonymous types?
  [ ] Are union types used to represent actual variance, not just string | any?

PASS 7 - TESTS (is the behaviour verified?)
  [ ] Are the critical user flows covered by a test?
  [ ] Are error paths tested, not just happy paths?
  [ ] Do tests test behaviour (what the user sees) not implementation details (internal state)?
  [ ] Are tests deterministic? (no Date.now(), no Math.random() without mocking)

COMMENT FORMAT - be specific and actionable:
  Bad:   "This could be better"
  Bad:   "Use useCallback here"
  Good:  "This function is recreated on every render. Since it is passed to a child component
          wrapped in React.memo, it will cause the child to re-render every time. Wrap it in
          useCallback with [dependency] as the dependency."

COMMENT LABELS (use these prefixes):
  BLOCKING:  Must be fixed before merge. Correctness, security, or data loss risk.
  IMPORTANT: Should be fixed before merge. Maintainability or reliability concern.
  SUGGESTION: Non-blocking improvement. Mention once, do not repeat.
  QUESTION:  Genuine uncertainty. Ask, do not assume.
  NITPICK:   Style preference. Label it so the author knows they can ignore it.

WHAT NOT TO COMMENT ON:
  - Code style that is handled by the formatter (spacing, quotes, semicolons)
  - Personal preferences not backed by a documented team standard
  - Rewriting code that works correctly just because you would have written it differently
  - Trivial naming differences (fetchData vs getData) without a meaningful reason
```

---

## How to use these alongside Skills 1-6

| Skill | When to trigger |
|---|---|
| 7 - Debug broken screen | Something visual is broken |
| 8 - Debug API issues | Network request failing |
| 9 - Production readiness audit | Before any deploy or launch |
| 10 - Console error triage | Specific error message in hand |
| 11 - Performance debugging | Something feels slow |
| 12 - Code review | Before merging any PR |
