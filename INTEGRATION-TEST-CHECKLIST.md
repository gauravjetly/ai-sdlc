# Integration Test Checklist

Comprehensive testing guide for the AI-SDLC Integrated Dashboard.

## Pre-Test Setup

- [ ] All dependencies installed (`npm install` in both platform and webapp directories)
- [ ] No conflicting processes on ports 3030, 3000, 3001
- [ ] Browser with developer tools ready (Chrome/Firefox recommended)

---

## Test Suite 1: Service Startup

### 1.1 Individual Service Health

**Dashboard Server (Port 3030)**
- [ ] Start: `cd dashboard && node server.js`
- [ ] Check: `curl http://localhost:3030`
- [ ] Expected: HTML page returned
- [ ] Expected: No errors in console
- [ ] Stop: `Ctrl+C`

**Platform API (Port 3000)**
- [ ] Start: `cd src/platform && npm run api:dev`
- [ ] Check: `curl http://localhost:3000/health`
- [ ] Expected: `{"status":"ok"}` or similar health response
- [ ] Stop: `Ctrl+C`

**Platform Webapp (Port 3001)**
- [ ] Start: `cd src/platform/webapp && npm run dev`
- [ ] Check: `curl http://localhost:3001`
- [ ] Expected: HTML page or Vite/React response
- [ ] Stop: `Ctrl+C`

### 1.2 Unified Startup

**Using start-all.sh**
- [ ] Run: `./start-all.sh`
- [ ] Expected: Dashboard starts first (3030)
- [ ] Expected: API starts second (3000)
- [ ] Expected: Webapp starts third (3001)
- [ ] Expected: Health checks pass for all services
- [ ] Expected: "All Services Started Successfully!" message
- [ ] Check: All three ports responding

---

## Test Suite 2: Dashboard UI Navigation

### 2.1 Main Dashboard View

**Access**: http://localhost:3030

- [ ] Page loads without errors
- [ ] Header displays "AI-SDLC Control Center"
- [ ] All view tabs visible: Overview, Projects, Agents, Activity, etc.
- [ ] No console errors in browser developer tools
- [ ] Responsive layout (test window resize)

### 2.2 View Switching

- [ ] Click "Overview" - displays dashboard content
- [ ] Click "Projects" - displays projects list/management
- [ ] Click "Agents" - displays agent status
- [ ] Click "Activity" - displays activity feed
- [ ] Click "Platform UI" - loads embedded view
- [ ] Click "Visual Designer" - loads designer view
- [ ] Click "Deployments" - loads deployments view
- [ ] Each view transition smooth, no flickering
- [ ] Active tab highlighted correctly

### 2.3 Embedded Views

**Platform UI Tab**
- [ ] Iframe loads without errors
- [ ] Content from http://localhost:3001 displayed
- [ ] No security/CORS errors in console
- [ ] Scrolling works within iframe
- [ ] Loading spinner shows while loading

**Visual Designer Tab**
- [ ] Iframe loads without errors
- [ ] Designer interface visible
- [ ] Interactive elements functional
- [ ] No cross-origin issues

**Deployments Tab**
- [ ] Iframe loads without errors
- [ ] Deployment list/controls visible
- [ ] Data loads from API successfully

---

## Test Suite 3: Theme Synchronization

### 3.1 Parent-to-Child Theme Sync

**Dashboard Theme Toggle**
- [ ] Open dashboard (http://localhost:3030)
- [ ] Switch to "Platform UI" tab
- [ ] Note current theme (light/dark)
- [ ] Toggle theme in dashboard
- [ ] Verify: Embedded iframe theme changes accordingly
- [ ] Expected: Theme change within 1 second
- [ ] No console errors during theme change

### 3.2 Child-to-Parent Theme Sync

**Webapp Theme Toggle**
- [ ] With "Platform UI" tab active
- [ ] Toggle theme within embedded webapp (if theme toggle exists in iframe)
- [ ] Verify: Dashboard theme should update to match
- [ ] Expected: Theme synchronization bidirectional
- [ ] No flickering or flash of unstyled content

### 3.3 Theme Persistence

- [ ] Set theme to dark mode
- [ ] Refresh page (F5)
- [ ] Expected: Theme remains dark after reload
- [ ] Switch tabs to embedded views
- [ ] Expected: Embedded views load with correct theme
- [ ] Close browser, reopen
- [ ] Expected: Theme preference persists

---

## Test Suite 4: API Proxy Functionality

### 4.1 Proxy Routes

**Test API proxying through dashboard**

- [ ] Test: `curl http://localhost:3030/api/deployments`
- [ ] Expected: JSON response from platform API
- [ ] Expected: No CORS errors
- [ ] Expected: Response time < 500ms

- [ ] Test: `curl http://localhost:3030/api/environments`
- [ ] Expected: JSON response with environments data

- [ ] Test: `curl http://localhost:3030/api/health`
- [ ] Expected: Platform API health status

### 4.2 Proxy Error Handling

**Test proxy behavior with API down**

- [ ] Stop platform API: `kill $(cat .platform-state/api.pid)`
- [ ] Test: `curl http://localhost:3030/api/deployments`
- [ ] Expected: 502 Bad Gateway or appropriate error
- [ ] Expected: Error logged in dashboard console
- [ ] Restart API: `cd src/platform && npm run api:dev &`
- [ ] Test: `curl http://localhost:3030/api/deployments`
- [ ] Expected: API requests succeed again

### 4.3 Proxy Headers

**Verify proper header forwarding**

- [ ] Test: `curl -H "Authorization: Bearer test-token" http://localhost:3030/api/deployments`
- [ ] Check dashboard logs: Authorization header should be proxied
- [ ] Test: `curl -H "Content-Type: application/json" -X POST http://localhost:3030/api/test`
- [ ] Verify: Content-Type header forwarded correctly

---

## Test Suite 5: Cross-Origin Communication

### 5.1 postMessage Communication

**Verify postMessage between dashboard and iframes**

Open browser console while testing:

- [ ] Go to "Platform UI" tab
- [ ] Open console: Look for postMessage logs
- [ ] Expected: Messages like `"Sending theme to iframe: dark"`
- [ ] Expected: No postMessage errors
- [ ] Switch themes several times
- [ ] Expected: Each theme change triggers postMessage
- [ ] Expected: Message format: `{type: 'theme-change', theme: 'dark'}`

### 5.2 Origin Validation

**Security test: Ensure only expected origins accepted**

- [ ] Check dashboard HTML source
- [ ] Verify: postMessage listeners check `event.origin`
- [ ] Verify: Only http://localhost:3001 and http://localhost:3030 accepted
- [ ] Manual test: Open console, attempt to send message from wrong origin
- [ ] Expected: Message rejected/ignored

---

## Test Suite 6: Error Handling

### 6.1 Iframe Loading Errors

**Test iframe error states**

- [ ] Stop webapp: `kill $(cat .platform-state/webapp.pid)`
- [ ] Navigate to "Platform UI" tab
- [ ] Expected: Error message displayed or loading state
- [ ] Expected: No infinite loading spinner
- [ ] Check console: Appropriate error logged
- [ ] Restart webapp: `cd src/platform/webapp && npm run dev &`
- [ ] Refresh dashboard
- [ ] Expected: Iframe loads successfully now

### 6.2 API Connection Errors

**Test dashboard behavior with API unavailable**

- [ ] Stop API: `kill $(cat .platform-state/api.pid)`
- [ ] Navigate to "Activity" or "Projects" view
- [ ] Expected: Error message shown (e.g., "Unable to connect to API")
- [ ] Expected: No crashes, dashboard remains functional
- [ ] Expected: Retry mechanism or helpful error message
- [ ] Restart API
- [ ] Expected: Dashboard reconnects automatically or with manual refresh

### 6.3 Network Timeout Handling

**Test behavior with slow responses**

Manual simulation (requires network throttling):

- [ ] Open DevTools > Network tab
- [ ] Enable "Slow 3G" throttling
- [ ] Navigate between views
- [ ] Expected: Loading indicators shown
- [ ] Expected: No timeout errors < 30 seconds
- [ ] Expected: Graceful handling of slow responses
- [ ] Disable throttling
- [ ] Expected: Normal performance resumes

---

## Test Suite 7: Performance Testing

### 7.1 Initial Load Performance

**Measure page load times**

- [ ] Open DevTools > Network tab
- [ ] Clear cache (Shift+F5)
- [ ] Load http://localhost:3030
- [ ] Measure: Time to first byte (TTFB) < 200ms
- [ ] Measure: DOM content loaded < 1 second
- [ ] Measure: Full page load < 2 seconds
- [ ] Check: No unnecessary HTTP requests

### 7.2 Iframe Loading Performance

**Measure iframe load times**

- [ ] Open Performance tab in DevTools
- [ ] Navigate to "Platform UI" tab
- [ ] Measure: Iframe load time < 2 seconds
- [ ] Expected: Loading indicator shown during load
- [ ] Expected: Smooth transition when loaded
- [ ] Test: Switch to other tabs and back
- [ ] Expected: Iframe should cache/not reload unnecessarily

### 7.3 Theme Switch Performance

**Measure theme change latency**

- [ ] Open Performance tab
- [ ] Record performance
- [ ] Toggle theme 5 times rapidly
- [ ] Stop recording
- [ ] Verify: Each theme change < 100ms
- [ ] Verify: No layout thrashing
- [ ] Verify: Smooth visual transition

### 7.4 Memory Leak Detection

**Test for memory leaks**

- [ ] Open DevTools > Memory tab
- [ ] Take heap snapshot (baseline)
- [ ] Switch between all views 10 times
- [ ] Take another heap snapshot
- [ ] Compare: Memory growth should be minimal (< 10MB)
- [ ] Expected: No detached DOM trees
- [ ] Expected: No retained event listeners

---

## Test Suite 8: Browser Compatibility

### 8.1 Chrome/Edge (Chromium)

- [ ] Test on latest Chrome
- [ ] All features functional
- [ ] No console errors
- [ ] Theme switching works
- [ ] Iframe embedding works

### 8.2 Firefox

- [ ] Test on latest Firefox
- [ ] All features functional
- [ ] No console errors
- [ ] Theme switching works
- [ ] Iframe embedding works

### 8.3 Safari

- [ ] Test on latest Safari (macOS)
- [ ] All features functional
- [ ] No console errors
- [ ] Theme switching works
- [ ] Iframe embedding works

---

## Test Suite 9: Responsive Design

### 9.1 Desktop Sizes

- [ ] 1920x1080 (Full HD): Layout proper
- [ ] 1366x768 (Laptop): Layout proper
- [ ] 1280x720 (Small laptop): Layout proper
- [ ] All views accessible
- [ ] No horizontal scrolling
- [ ] Text readable

### 9.2 Tablet Sizes

- [ ] 768x1024 (iPad): Layout adapts
- [ ] Touch interactions work
- [ ] Iframes scale properly

### 9.3 Mobile Sizes

- [ ] 375x667 (iPhone SE): Layout adapts
- [ ] 414x896 (iPhone 11): Layout adapts
- [ ] Navigation accessible
- [ ] Iframes functional or gracefully degraded

---

## Test Suite 10: Data Synchronization

### 10.1 Real-time Updates

**Test live data updates from registry**

- [ ] Start dashboard
- [ ] Open "Activity" view
- [ ] From another terminal, create SDLC activity:
  ```bash
  echo "TEST: $(date)" >> ~/.claude/sdlc-registry/activity.log
  ```
- [ ] Expected: Activity view updates automatically within 1-2 seconds
- [ ] Expected: No page refresh required

### 10.2 Project Data Sync

**Test project data updates**

- [ ] Open "Projects" view
- [ ] Note current projects displayed
- [ ] Add/modify project file in `~/.claude/sdlc-registry/projects/`
- [ ] Expected: Projects view updates automatically
- [ ] Expected: New project appears in list

### 10.3 Agent Status Sync

**Test agent status updates**

- [ ] Open "Agents" view
- [ ] Note current agent statuses
- [ ] Modify registry.json to change agent status
- [ ] Expected: Agents view updates automatically
- [ ] Expected: Status indicators update correctly

---

## Test Suite 11: Security Testing

### 11.1 XSS Prevention

**Test for XSS vulnerabilities**

- [ ] Attempt to inject script in project name/description
- [ ] Expected: Script tags escaped/sanitized
- [ ] Attempt to inject HTML in activity log
- [ ] Expected: HTML rendered as text, not executed

### 11.2 CSRF Protection

**Verify CSRF protection (if applicable)**

- [ ] Check API endpoints for CSRF tokens
- [ ] Attempt unauthorized API calls
- [ ] Expected: Proper authentication/authorization checks

### 11.3 Content Security Policy

**Verify CSP headers**

- [ ] Check response headers for CSP
- [ ] Expected: CSP allows localhost iframes
- [ ] Expected: CSP blocks unauthorized scripts

---

## Test Suite 12: Cleanup and Shutdown

### 12.1 Graceful Shutdown

**Test proper service shutdown**

- [ ] With all services running, press Ctrl+C in terminal
- [ ] Expected: "Stopping all services..." message
- [ ] Expected: All PIDs killed properly
- [ ] Expected: No zombie processes
- [ ] Verify: `lsof -i :3030,3000,3001` shows no processes

### 12.2 PID File Cleanup

**Verify PID files removed**

- [ ] After shutdown, check for PID files:
  ```bash
  ls dashboard/dashboard.pid
  ls .platform-state/api.pid
  ls .platform-state/webapp.pid
  ```
- [ ] Expected: Files removed or PIDs no longer active

### 12.3 Resource Cleanup

**Check for resource leaks**

- [ ] After shutdown, check open file descriptors
- [ ] Expected: No leaked file handles
- [ ] Expected: No orphaned child processes
- [ ] Check: `ps aux | grep node` shows only legitimate processes

---

## Summary Report Template

```
## Integration Test Report

Date: _______________
Tester: _______________
Environment: _______________

### Results Summary

| Test Suite | Total | Passed | Failed | Skipped |
|------------|-------|--------|--------|---------|
| Service Startup | | | | |
| Dashboard Navigation | | | | |
| Theme Sync | | | | |
| API Proxy | | | | |
| Cross-Origin Comm | | | | |
| Error Handling | | | | |
| Performance | | | | |
| Browser Compat | | | | |
| Responsive Design | | | | |
| Data Sync | | | | |
| Security | | | | |
| Shutdown | | | | |

### Issues Found

1. [Description]
   - Severity: High/Medium/Low
   - Steps to reproduce:
   - Expected vs Actual:

### Performance Metrics

- Dashboard Load Time: _____ ms
- Iframe Load Time: _____ ms
- Theme Switch Latency: _____ ms
- Memory Usage: _____ MB

### Recommendations

1.
2.
3.

### Sign-off

- [ ] All critical tests passed
- [ ] No blocking issues found
- [ ] Ready for production: Yes/No

Tester Signature: _______________
Date: _______________
```

---

## Automated Testing (Future)

For automated testing, consider implementing:

1. **Playwright/Puppeteer** for E2E tests
2. **Jest** for unit tests
3. **Lighthouse CI** for performance
4. **OWASP ZAP** for security scanning

---

*Last Updated: 2026-02-10*
