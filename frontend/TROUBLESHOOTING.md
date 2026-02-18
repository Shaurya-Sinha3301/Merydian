# Troubleshooting Guide

## Common Issues and Solutions

### 1. JSON Parse Error - BOM Character

**Error Message:**
```
Unable to make a module from invalid JSON: expected value at line 1 column 1
```

**Cause:**
The JSON file was created with a UTF-8 BOM (Byte Order Mark) character, which is invisible but causes JSON parsing to fail.

**Solution:**
The file has been recreated without the BOM using proper UTF-8 encoding.

**Prevention:**
When creating JSON files via PowerShell, always use:
```powershell
[System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
```

Instead of:
```powershell
$content | Out-File -FilePath $path -Encoding UTF8  # This adds BOM!
```

### 2. Module Not Found Errors

**Issue:** Import statements fail to find modules

**Solutions:**
- Check file paths are relative to the correct directory
- Ensure file extensions are correct (.ts, .tsx, .json)
- Verify the file actually exists at the specified path
- Check for typos in import paths

### 3. Type Errors in Hotel Data

**Issue:** TypeScript complains about hotel data structure

**Solution:**
Ensure all hotels in `hotels.json` have these required fields:
```json
{
  "id": number,
  "name": string,
  "type": string,
  "rating": number,
  "price_per_night": number,
  "agent_commission_amount": number,
  "cost_price": number,
  "location": { "city": string, "address": string },
  "description": string,
  "tags": string[],
  "facilities": string[],
  "images": string[],
  "available": boolean
}
```

### 4. Images Not Loading

**Issue:** Hotel images show broken links

**Solutions:**
- Verify image URLs are valid and accessible
- Check network connectivity
- Ensure URLs use HTTPS protocol
- Consider using placeholder images for development

### 5. Search Results Empty

**Issue:** Hotel search returns no results

**Possible Causes:**
- Search criteria too restrictive
- City name doesn't match any hotels
- `available` field set to `false`

**Solution:**
- Check the destination matches hotel cities in data
- Verify hotels have `available: true`
- Review search logic in `apiService.ts`

### 6. Agent Metrics Not Showing

**Issue:** Commission and profit data not displaying

**Solution:**
Ensure each hotel has these business metric fields:
```json
{
  "agent_commission_percent": number,
  "agent_commission_amount": number,
  "cost_price": number,
  "profit_margin": number,
  "markup_percent": number (optional)
}
```

### 7. Carousel Not Working

**Issue:** Image carousel doesn't navigate

**Possible Causes:**
- Hotel has only one image
- JavaScript errors in console
- State management issues

**Solutions:**
- Check browser console for errors
- Ensure hotel has multiple images in array
- Verify Icon component is working

### 8. Build Errors

**Issue:** Next.js build fails

**Common Causes:**
- Invalid JSON syntax
- Missing dependencies
- TypeScript errors
- Import path issues

**Solutions:**
```bash
# Clear cache and rebuild
rm -rf .next
npm run build

# Check for TypeScript errors
npm run type-check

# Verify all dependencies installed
npm install
```

### 9. Prefill Not Working

**Issue:** Booking form doesn't auto-fill group data

**Checklist:**
- [ ] Group ID is in URL parameters
- [ ] Group exists in `allGroups` data
- [ ] Group has required fields (destination, startDate, groupSize)
- [ ] Component receives `group` prop correctly

**Debug:**
```typescript
console.log('Group ID:', groupId);
console.log('Found Group:', group);
console.log('Criteria:', criteria);
```

### 10. Responsive Design Issues

**Issue:** Layout breaks on mobile/tablet

**Solutions:**
- Check Tailwind responsive classes (md:, lg:)
- Test in browser dev tools device mode
- Verify grid layouts have proper breakpoints
- Check for fixed widths that don't scale

## Development Tips

### Hot Reload Not Working
```bash
# Restart dev server
npm run dev
```

### Clear All Caches
```bash
# Windows
rmdir /s /q .next
rmdir /s /q node_modules\.cache

# Then reinstall
npm install
npm run dev
```

### Check for Port Conflicts
```bash
# If port 3000 is in use
netstat -ano | findstr :3000
# Kill the process or use different port
npm run dev -- -p 3001
```

### Verify JSON Validity
Use online JSON validators or:
```bash
# Using Node.js
node -e "console.log(JSON.parse(require('fs').readFileSync('path/to/file.json')))"
```

## Getting Help

If issues persist:

1. **Check Console Logs**
   - Browser console (F12)
   - Terminal/command prompt
   - Network tab for API calls

2. **Verify File Structure**
   ```
   frontend/
   ├── lib/
   │   └── agent-dashboard/
   │       ├── data/
   │       │   └── hotels.json ✓
   │       ├── data.ts ✓
   │       ├── types.ts ✓
   │       └── apiService.ts ✓
   └── app/
       └── agent-dashboard/
           └── bookings/
               ├── page.tsx ✓
               ├── new/
               │   └── page.tsx ✓
               └── hotel/
                   └── [id]/
                       └── page.tsx ✓
   ```

3. **Check Dependencies**
   ```json
   {
     "next": "^16.1.6",
     "react": "^19.x",
     "typescript": "^5.x"
   }
   ```

4. **Review Recent Changes**
   - Use git to see what changed
   - Revert suspicious commits
   - Test incrementally

## Status: All Issues Resolved ✅

Current status of the application:
- ✅ JSON files valid (no BOM)
- ✅ TypeScript compilation successful
- ✅ All imports resolved
- ✅ Hotel data complete (10 hotels)
- ✅ Business metrics included
- ✅ No build errors
- ✅ Ready for development/production

Last updated: 2026-02-17
