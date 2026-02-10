# ADR-016: State Management Approach

**Status**: Accepted
**Date**: 2026-01-30
**Decision Makers**: Jets (Enterprise Architect)
**Technical Area**: Frontend Architecture

---

## Context

The Deltek Catalyst frontend requires state management for:

- Server state (API data): Deployments, resources, agents, costs
- UI state: Dialogs, wizards, navigation, filters
- User state: Authentication, permissions, preferences
- Real-time state: WebSocket connections, live updates
- Form state: Multi-step wizards, validation

The current implementation uses local component state (useState) with no centralized state management.

## Decision

**We will implement a hybrid state management approach**:

1. **Server State**: RTK Query (part of Redux Toolkit)
2. **Global UI State**: Redux Toolkit slices
3. **Local UI State**: React useState/useReducer
4. **Form State**: React Hook Form
5. **URL State**: React Router search params

### State Categories

```
+------------------------------------------------------------------+
|                    STATE MANAGEMENT STRATEGY                      |
+------------------------------------------------------------------+
|                                                                   |
|  SERVER STATE (RTK Query)                                         |
|  +------------------------------------------------------------+  |
|  | - API responses (deployments, resources, agents)            |  |
|  | - Automatic caching and invalidation                        |  |
|  | - Background refetching                                     |  |
|  | - Optimistic updates                                        |  |
|  | - WebSocket subscription integration                        |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  GLOBAL UI STATE (Redux Toolkit)                                 |
|  +------------------------------------------------------------+  |
|  | - User authentication state                                  |  |
|  | - Tenant context                                            |  |
|  | - Notification queue                                        |  |
|  | - Theme preferences                                         |  |
|  | - Feature flags                                             |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  LOCAL UI STATE (React State)                                    |
|  +------------------------------------------------------------+  |
|  | - Dialog open/close                                         |  |
|  | - Accordion expanded states                                 |  |
|  | - Hover/focus states                                        |  |
|  | - Temporary UI toggles                                      |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  FORM STATE (React Hook Form)                                    |
|  +------------------------------------------------------------+  |
|  | - Form field values                                         |  |
|  | - Validation errors                                         |  |
|  | - Wizard step state                                         |  |
|  | - Dirty/touched tracking                                    |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  URL STATE (React Router)                                        |
|  +------------------------------------------------------------+  |
|  | - Filters and sorting                                       |  |
|  | - Pagination                                                |  |
|  | - Selected tab                                              |  |
|  | - Search queries                                            |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### Redux Store Structure

```typescript
// Store structure
interface RootState {
  // RTK Query API cache
  api: {
    queries: Record<string, QueryState>;
    mutations: Record<string, MutationState>;
    subscriptions: Record<string, SubscriptionState>;
  };

  // Authentication state
  auth: {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  };

  // Tenant context
  tenant: {
    current: Tenant | null;
    isLoading: boolean;
  };

  // UI state
  ui: {
    sidebarCollapsed: boolean;
    theme: 'light' | 'dark' | 'system';
    notifications: Notification[];
    announcements: Announcement[];
  };

  // Feature flags
  features: {
    flags: Record<string, boolean>;
    isLoading: boolean;
  };
}
```

## Alternatives Considered

### State Management Libraries

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Redux Toolkit** | DevTools, middleware, mature | Boilerplate | **Selected** |
| Zustand | Simple, small | No DevTools | Rejected |
| Jotai | Atomic, minimal | Less mature | Rejected |
| MobX | Reactive | Different paradigm | Rejected |
| Recoil | Atomic, Facebook-backed | Experimental | Rejected |

### Server State Libraries

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **RTK Query** | Redux integration, caching | Part of Redux | **Selected** |
| React Query | Excellent caching | Separate from Redux | Alternative considered |
| SWR | Simple, lightweight | Less features | Rejected |
| Apollo Client | GraphQL-native | Not using GraphQL | Rejected |

### Form Libraries

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **React Hook Form** | Performance, TypeScript | Learning curve | **Selected** |
| Formik | Popular, simple | Performance issues | Rejected |
| Final Form | Subscription-based | Less maintained | Rejected |
| Native useState | No dependencies | Boilerplate | Rejected |

## Consequences

### Positive

1. **Clear Boundaries**: Each state type has appropriate tool
2. **Performance**: RTK Query caching reduces re-renders
3. **Developer Experience**: Redux DevTools for debugging
4. **Type Safety**: Full TypeScript support throughout
5. **Testing**: Isolated state is easier to test

### Negative

1. **Learning Curve**: Team needs training on RTK Query
2. **Bundle Size**: Redux adds ~15KB (tree-shaken)
3. **Complexity**: Multiple state management approaches

### Mitigations

1. **Documentation**: Clear guidelines on when to use each approach
2. **Code Review**: Ensure consistent state management patterns
3. **Training**: Team workshops on Redux Toolkit

## Implementation Details

### Store Configuration

```typescript
// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { api } from '../services/api';
import authReducer from '../features/auth/authSlice';
import tenantReducer from '../features/tenant/tenantSlice';
import uiReducer from '../features/ui/uiSlice';
import featuresReducer from '../features/flags/featuresSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    tenant: tenantReducer,
    ui: uiReducer,
    features: featuresReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in specific paths
        ignoredActions: ['api/config/middlewareRegistered'],
        ignoredPaths: ['api.mutations', 'api.queries'],
      },
    }).concat(
      api.middleware,
      loggerMiddleware,
      errorMiddleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

// Enable refetch on focus/reconnect
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### RTK Query API Definition

```typescript
// src/services/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../app/store';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Deployment', 'Resource', 'Agent', 'Cost', 'Security'],
  endpoints: () => ({}),
});
```

### Feature Slice Example

```typescript
// src/features/deployments/deploymentsApi.ts
import { api } from '../../services/api';
import type { Deployment, DeploymentRequest, DeploymentProgress } from './types';

export const deploymentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // List deployments with filtering and pagination
    getDeployments: builder.query<
      { data: Deployment[]; total: number },
      { environment?: string; status?: string; page?: number; limit?: number }
    >({
      query: (params) => ({
        url: '/deployments',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Deployment' as const, id })),
              { type: 'Deployment', id: 'LIST' },
            ]
          : [{ type: 'Deployment', id: 'LIST' }],
    }),

    // Get single deployment
    getDeployment: builder.query<Deployment, string>({
      query: (id) => `/deployments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Deployment', id }],
    }),

    // Create deployment with optimistic update
    createDeployment: builder.mutation<Deployment, DeploymentRequest>({
      query: (body) => ({
        url: '/deployments',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Deployment', id: 'LIST' }],
      // Optimistic update
      async onQueryStarted(newDeployment, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          deploymentsApi.util.updateQueryData('getDeployments', {}, (draft) => {
            draft.data.unshift({
              ...newDeployment,
              id: 'temp-' + Date.now(),
              status: 'pending',
              progress: 0,
            } as Deployment);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Rollback deployment
    rollbackDeployment: builder.mutation<void, string>({
      query: (id) => ({
        url: `/deployments/${id}/rollback`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Deployment', id }],
    }),

    // Get deployment progress (with WebSocket subscription)
    getDeploymentProgress: builder.query<DeploymentProgress, string>({
      query: (id) => `/deployments/${id}/progress`,
      async onCacheEntryAdded(
        id,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        await cacheDataLoaded;

        const unsubscribe = wsManager.subscribe(
          `deployments:${id}:progress`,
          (data: DeploymentProgress) => {
            updateCachedData((draft) => {
              Object.assign(draft, data);
            });
          }
        );

        await cacheEntryRemoved;
        unsubscribe();
      },
    }),
  }),
});

export const {
  useGetDeploymentsQuery,
  useGetDeploymentQuery,
  useCreateDeploymentMutation,
  useRollbackDeploymentMutation,
  useGetDeploymentProgressQuery,
} = deploymentsApi;
```

### Auth Slice Example

```typescript
// src/features/auth/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { User } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check stored auth
  error: null,
};

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('catalyst_token');
      if (!token) {
        return null;
      }

      // Validate token and get user
      const response = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Token invalid');
      }

      const user = await response.json();
      return { user: user.data, token };
    } catch (error) {
      localStorage.removeItem('catalyst_token');
      return rejectWithValue('Session expired');
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refresh',
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState() as { auth: AuthState };

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue('Session expired');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token, refreshToken } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;

      localStorage.setItem('catalyst_token', token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;

      localStorage.removeItem('catalyst_token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
        state.isLoading = false;
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
```

### Usage in Components

```typescript
// src/features/deployments/components/DeploymentList.tsx
import { useGetDeploymentsQuery } from '../deploymentsApi';
import { useSearchParams } from 'react-router-dom';

export function DeploymentList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state for filters
  const environment = searchParams.get('environment') || undefined;
  const status = searchParams.get('status') || undefined;
  const page = parseInt(searchParams.get('page') || '1');

  // Server state via RTK Query
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetDeploymentsQuery({ environment, status, page, limit: 20 });

  // Local UI state
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} retry={refetch} />;

  return (
    <Box>
      <Filters
        values={{ environment, status }}
        onChange={(filters) => setSearchParams(filters)}
      />

      <DataTable
        data={data?.data || []}
        loading={isFetching}
        onRowClick={(row) => setSelectedDeployment(row.id)}
      />

      <Pagination
        total={data?.total || 0}
        page={page}
        onChange={(newPage) => setSearchParams({ ...Object.fromEntries(searchParams), page: newPage.toString() })}
      />

      <DeploymentDetailsDrawer
        deploymentId={selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
      />
    </Box>
  );
}
```

## Decision Rules

| Scenario | Use |
|----------|-----|
| Data from API | RTK Query |
| User/tenant info | Redux slice |
| Theme/preferences | Redux slice |
| Dialog open/close | React useState |
| Form values | React Hook Form |
| Filters/pagination | URL params |
| Tab selection | URL params |
| Hover states | React useState |

## References

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [RTK Query Overview](https://redux-toolkit.js.org/rtk-query/overview)
- [React Hook Form](https://react-hook-form.com/)
- [Kent C. Dodds - State Colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)

---

**Decision Made By**: Jets
**Date**: 2026-01-30
