# 3D Animated Landing Page

This is an isolated 3D animated landing page for Merydian, featuring scroll-based canvas animations and modern design.

## Structure

```
landing-3d/
├── components/
│   ├── HeroCanvas.tsx       # Main 3D canvas animation component
│   ├── Header3D.tsx         # Fixed header with login buttons
│   ├── FeaturesSection.tsx  # Feature cards section
│   ├── BentoGrid.tsx        # Grid layout with features and CTA
│   ├── Footer3D.tsx         # Footer component
│   └── Landing3DPage.tsx    # Main page component
├── hooks/
│   └── useCanvasVideo.ts    # Hook for loading and drawing canvas frames
├── page.tsx                 # Route entry point
└── README.md               # This file
```

## Setup Instructions

### 1. Add Video Frames

The landing page uses a sequence of 278 frames for the scroll animation. You need to:

1. Extract frames from your video (278 frames total)
2. Name them as: `frame_0000.jpg`, `frame_0001.jpg`, ..., `frame_0277.jpg`
3. Place them in: `frontend/public/landing-frames/`

**To extract frames from a video:**

```bash
# Using ffmpeg (install if needed)
ffmpeg -i your_video.mp4 -vf "fps=30,scale=1920:1080" frontend/public/landing-frames/frame_%04d.jpg
```

### 2. Dependencies

All required dependencies are already installed in the main project:
- `gsap` - For scroll animations
- `next` - Framework
- `react` - UI library

### 3. Customization

#### Update Button Links
The header has two login buttons that link to:
- `/customer-login` - Customer portal
- `/agent-login` - Travel agent portal

These are already configured in `components/Header3D.tsx`.

#### Change Text Content
Edit the text overlays in `components/HeroCanvas.tsx`:
- Scene 1 (0-25%): "AI-POWERED TRAVEL"
- Scene 2 (30-60%): "Intelligent Planning Made Simple"
- Scene 3 (65-100%): "YOUR JOURNEY AWAITS"

#### Modify Colors
The landing page uses a dark theme with amber accents. To change colors:
- Edit `frontend/app/globals.css` for brand colors
- Update Tailwind classes in components

## Isolation Strategy

This landing page is completely isolated from the rest of the application:

1. **Separate Route**: Lives at `/landing-3d` route
2. **Self-contained Components**: All components are in the `landing-3d` directory
3. **No Shared State**: Doesn't use any global state from customer/agent portals
4. **Independent Styling**: Uses its own CSS classes and doesn't affect other pages
5. **Separate Assets**: Uses its own frames in `/public/landing-frames/`

## Benefits of Isolation

- **Parallel Development**: You and your friend can work on different areas without conflicts
- **Easy Updates**: Changes to the landing page won't affect customer/agent portals
- **Backend Independence**: Backend changes don't impact the landing page
- **Clean Separation**: Clear boundaries between marketing page and application

## Navigation Flow

```
/ (root)
  ↓ redirects to
/landing-3d
  ↓ user clicks button
/customer-login  OR  /agent-login
  ↓
Customer Portal  OR  Agent Dashboard
```

## Performance Notes

- The hook preloads all 278 frames on initial load
- Shows a loading progress bar during frame loading
- Uses GSAP ScrollTrigger for smooth scroll-based animations
- Canvas is optimized for responsive sizing

## Troubleshooting

### Frames not loading
- Check that frames are in `frontend/public/landing-frames/`
- Verify frame naming: `frame_0000.jpg` to `frame_0277.jpg`
- Check browser console for 404 errors

### Animation not smooth
- Ensure all frames are loaded (check loading progress)
- Try reducing frame count or image quality
- Check GSAP is properly installed

### Styling conflicts
- The landing page uses isolated CSS classes
- If conflicts occur, check `globals.css` for overlapping styles
- Use more specific selectors if needed

## Future Enhancements

- Add more interactive elements
- Implement lazy loading for frames
- Add mobile-optimized animations
- Include analytics tracking
- Add A/B testing capabilities
