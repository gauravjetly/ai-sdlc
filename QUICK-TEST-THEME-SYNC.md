# Quick Test Guide: Theme Synchronization

## Prerequisites

Ensure both services are running:

```bash
# Terminal 1: Dashboard
cd /Users/gauravjetly/aisdlc-2.1.0/dashboard
python3 -m http.server 3030

# Terminal 2: Platform Webapp
cd /Users/gauravjetly/aisdlc-2.1.0/src/platform/webapp
npm run dev
```

## Test 1: Main Dashboard Integration

1. Open browser: http://localhost:3030
2. Click "Scheduling" or "Tool Adoption" in the main view
3. Click the theme toggle button (sun/moon icon) in the top-right corner
4. Verify the embedded iframe also switches theme

**Expected Result**: Both dashboard and embedded app change theme simultaneously

## Test 2: Standalone Test Page

1. Open browser: http://localhost:3030/test-theme-sync.html
2. Wait for iframes to load (2-3 seconds)
3. Click "Toggle Theme" button
4. Observe both embedded apps changing theme
5. Check the message log for communication details

**Expected Result**:
- Both iframes sync instantly
- Message log shows: "Sent THEME_CHANGE (dark) to iframe #1" and "#2"
- Message count increments

## Test 3: Browser Console Verification

1. Open DevTools (F12)
2. Go to Console tab
3. Navigate to an embedded view
4. Toggle theme
5. Look for these messages:
   - `[App] Theme listener registered for embed mode`
   - `[App] Received theme change: dark` (or light)

**Expected Result**: Console logs confirm message reception

## Test 4: Direct Access (Non-Embed Mode)

1. Open: http://localhost:5173/scheduling
2. Toggle theme (should not have theme sync)
3. Verify app works normally without embed mode

**Expected Result**: App functions normally, no theme sync messages in console

## Test 5: Multiple Toggles

1. On main dashboard with embedded view
2. Rapidly toggle theme 5-10 times
3. Verify no errors or flickering
4. Check console for errors

**Expected Result**: Smooth transitions, no errors

## Success Criteria

- [ ] Dashboard theme toggle button works
- [ ] Embedded apps receive theme change messages
- [ ] Theme applies correctly in both light and dark modes
- [ ] No JavaScript errors in console
- [ ] Smooth transitions (no flickering)
- [ ] Works across multiple embedded views
- [ ] Non-embed mode unaffected

## Common Issues

### Issue: Embedded app doesn't change theme

**Solution**:
1. Check URL has `?embed=true` parameter
2. Verify iframe has loaded completely
3. Look for console errors
4. Confirm postMessage is being sent (check dashboard console)

### Issue: Colors don't match

**Solution**:
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)
3. Verify both services are using latest code

### Issue: Console errors

**Solution**:
1. Check iframe contentWindow is accessible
2. Verify no CORS issues (should be same localhost)
3. Confirm message format matches expected structure

## Performance Check

Open Performance tab in DevTools and record:
1. Initial page load
2. Theme toggle
3. Should see minimal layout shift
4. Theme transition should complete in <100ms

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

All should work identically.

## Debug Tips

### Enable Verbose Logging

In App.tsx, the console logs are already enabled. Check for:
```
[App] Theme listener registered for embed mode
[App] Received theme change: dark
```

### Check postMessage Flow

In browser console:
```javascript
// Monitor all postMessages
window.addEventListener('message', (e) => {
  console.log('Message received:', e.data);
});
```

### Verify iframe access

In browser console:
```javascript
// Check if iframe is accessible
const iframe = document.querySelector('iframe');
console.log('Iframe loaded:', iframe.contentWindow !== null);
```

## Video Recording

For documentation, record:
1. Open main dashboard
2. Navigate to Scheduling view
3. Toggle theme multiple times
4. Show both dashboard and embedded app changing together
5. Show console logs confirming communication

## Report Issues

If tests fail, include:
1. Browser and version
2. Console error messages
3. Steps to reproduce
4. Expected vs actual behavior
5. Screenshots/video if possible

---

**Test Date**: 2026-02-10
**Implementation**: Phase 4 Complete
**Status**: Ready for testing
