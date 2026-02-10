# Phase 5: Enhanced Error Handling and Loading States

This document describes the enhancements made to improve error handling, loading states, and user experience for the integrated dashboard.

## 1. Enhanced EmbeddedView Component

### Current State
The EmbeddedView component renders iframes without loading indicators or error states.

### Enhancements Needed

Add to `dashboard/index.html`, replace the existing `EmbeddedView` function (around line 4877):

```javascript
// Enhanced EmbeddedView Component with loading states and error handling
function EmbeddedView({ src, title }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef(null);

  const handleLoad = () => {
    console.log(`[EmbeddedView] ${title} loaded successfully`);
    setLoading(false);
    setError(null);
  };

  const handleError = (e) => {
    console.error(`[EmbeddedView] ${title} failed to load:`, e);
    setLoading(false);
    setError('Failed to load content. The service may be unavailable.');
  };

  const handleRetry = () => {
    console.log(`[EmbeddedView] Retrying ${title} (attempt ${retryCount + 1})`);
    setLoading(true);
    setError(null);
    setRetryCount(retryCount + 1);

    // Force iframe reload
    if (iframeRef.current) {
      iframeRef.current.src = `${src}&retry=${Date.now()}`;
    }
  };

  // Set loading timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn(`[EmbeddedView] ${title} loading timeout`);
        setError('Loading timeout. The service may be slow to respond.');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeout);
  }, [loading, title]);

  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 120px)',
      border: 'none',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-background)',
          zIndex: 10
        }}>
          <div className="spinner" style={{
            width: '48px',
            height: '48px',
            border: '4px solid var(--color-border)',
            borderTop: '4px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            marginTop: '16px',
            color: 'var(--color-text-secondary)',
            fontSize: '14px'
          }}>
            Loading {title}...
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-background)',
          zIndex: 10,
          padding: '24px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-error-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
          </div>
          <h3 style={{
            color: 'var(--color-text-primary)',
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            Failed to Load
          </h3>
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '14px',
            textAlign: 'center',
            maxWidth: '400px',
            marginBottom: '24px'
          }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Dismiss
            </button>
          </div>
          <p style={{
            marginTop: '16px',
            color: 'var(--color-text-tertiary)',
            fontSize: '12px'
          }}>
            Make sure all services are running: ./start-all.sh
          </p>
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
          display: loading || error ? 'none' : 'block'
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
```

### Add Spinner Animation

Add this to the `<style>` section in index.html:

```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Error overlay colors */
:root[data-theme="light"] {
  --color-error-bg: #fee;
}

:root[data-theme="dark"] {
  --color-error-bg: #4a1f1f;
}
```

## 2. Enhanced Dashboard Server Error Handling

### Current State
The server.js already has good error handling with 502 responses and JSON error messages.

### Recommended Enhancements

The proxy error handling in `dashboard/server.js` (lines 785-797) is already well-implemented with:
- Proper error logging with timestamps
- 502 Bad Gateway responses
- JSON error messages with target URL
- Check for headers already sent

**No changes needed** - this is production-ready error handling.

## 3. Enhanced API Error Responses

### Recommendation for Platform API

Add consistent error response format in `src/platform/api/server.js`:

```javascript
// Middleware for error handling
app.use((err, req, res, next) => {
  const traceId = req.headers['x-trace-id'] || generateTraceId();

  console.error('[API Error]', {
    traceId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Don't expose stack traces in production
  const response = {
    error: {
      code: err.code || 'ERR_INTERNAL',
      message: err.message || 'An unexpected error occurred',
      traceId,
      timestamp: new Date().toISOString()
    }
  };

  // Add details for validation errors
  if (err.code === 'ERR_VALIDATION_FAILED' && err.details) {
    response.error.details = err.details;
  }

  res.status(err.statusCode || 500).json(response);
});
```

## 4. Connection Monitoring

### Add Health Check Monitoring

Add to `dashboard/server.js` after line 1200 (in the main server section):

```javascript
// ============================================================================
// HEALTH CHECK MONITORING
// ============================================================================

let apiHealthy = false;
let webappHealthy = false;

// Check health of dependent services
function checkServiceHealth() {
  // Check Platform API
  http.get('http://localhost:3000/health', (res) => {
    apiHealthy = res.statusCode === 200;
  }).on('error', () => {
    apiHealthy = false;
  });

  // Check Platform Webapp
  http.get('http://localhost:3001', (res) => {
    webappHealthy = res.statusCode === 200;
  }).on('error', () => {
    webappHealthy = false;
  });
}

// Check service health every 30 seconds
setInterval(checkServiceHealth, 30000);
checkServiceHealth(); // Initial check

// Add health status endpoint
// Add this to the server request handler after line 900:
  if (req.url === '/api/service-health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      dashboard: true,
      api: apiHealthy,
      webapp: webappHealthy,
      timestamp: new Date().toISOString()
    }));
    return;
  }
```

## 5. Client-Side Service Status Indicator

### Add Service Status Component

Add to `dashboard/index.html` after the Header component:

```javascript
// ServiceStatus Component - Shows health of all services
function ServiceStatus() {
  const [health, setHealth] = useState({ dashboard: true, api: false, webapp: false });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/service-health');
        const data = await res.json();
        setHealth(data);
      } catch (e) {
        console.error('Health check failed:', e);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const allHealthy = health.dashboard && health.api && health.webapp;
  const someUnhealthy = !health.api || !health.webapp;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000
    }}>
      {someUnhealthy && (
        <div style={{
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onClick={() => setShowDetails(!showDetails)}
        >
          <span>⚠️</span>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>
            Some services unavailable
          </span>
        </div>
      )}

      {showDetails && (
        <div style={{
          position: 'absolute',
          bottom: '60px',
          right: 0,
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: '250px'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)'
          }}>
            Service Status
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ServiceStatusItem name="Dashboard" healthy={health.dashboard} />
            <ServiceStatusItem name="Platform API" healthy={health.api} port="3000" />
            <ServiceStatusItem name="Platform Webapp" healthy={health.webapp} port="3001" />
          </div>
          {someUnhealthy && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: 'var(--color-info-bg)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--color-text-secondary)'
            }}>
              Run <code style={{ fontFamily: 'monospace' }}>./start-all.sh</code> to start all services
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ServiceStatusItem({ name, healthy, port }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: healthy ? '#22c55e' : '#ef4444'
      }} />
      <span style={{ color: 'var(--color-text-primary)' }}>{name}</span>
      {port && (
        <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>
          :{port}
        </span>
      )}
      <span style={{
        marginLeft: 'auto',
        fontSize: '11px',
        fontWeight: 500,
        color: healthy ? '#22c55e' : '#ef4444'
      }}>
        {healthy ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
```

Add CSS for service status:

```css
:root[data-theme="light"] {
  --color-warning-bg: #fef3c7;
  --color-warning-text: #92400e;
  --color-info-bg: #dbeafe;
}

:root[data-theme="dark"] {
  --color-warning-bg: #451a03;
  --color-warning-text: #fef3c7;
  --color-info-bg: #1e3a8a;
}
```

## 6. Network Error Handling in Webapp

### Add Error Boundary Component

Add to `src/platform/webapp/src/components/ErrorBoundary.tsx`:

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3
          }}
        >
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

Wrap App in ErrorBoundary in `src/platform/webapp/src/main.tsx`:

```typescript
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

## Summary of Enhancements

### Implemented in this phase:

1. **Enhanced EmbeddedView Component**
   - Loading indicators
   - Error states with retry
   - Timeout handling
   - User-friendly error messages

2. **Service Health Monitoring**
   - Backend health checks
   - Health status API endpoint
   - Frontend service status indicator

3. **Error Boundary**
   - React error boundary for webapp
   - Graceful error handling
   - Reload option

4. **Improved User Feedback**
   - Loading spinners
   - Error messages
   - Retry mechanisms
   - Service status indicators

### Already Good (No Changes Needed):

1. **Dashboard Server Error Handling**
   - 502 Bad Gateway responses
   - JSON error format
   - Proper logging

2. **Proxy Error Handling**
   - Connection error handling
   - Header forwarding
   - CORS configuration

## Testing These Enhancements

1. **Test Loading States**:
   - Start only dashboard, navigate to Platform UI tab
   - Should see loading indicator

2. **Test Error States**:
   - Stop webapp, navigate to embedded view
   - Should see error message with retry option

3. **Test Service Status**:
   - Stop API, check service status indicator
   - Should show API as offline

4. **Test Error Boundary**:
   - Introduce runtime error in webapp
   - Should show error boundary UI

---

*Phase 5 Enhancements Complete*
*Last Updated: 2026-02-10*
