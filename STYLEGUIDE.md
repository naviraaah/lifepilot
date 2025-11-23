# ✈️ LifePilot Design System & Style Guide

**Version 1.0** | Last Updated: November 2025

---

## 🎯 Brand Essence

> **"Calm autonomy. Quiet power. It's handled."**

LifePilot is not cold AI productivity. It's your warm, reliable co-pilot for life operations—calm, clarity, and done-for-you simplicity.

### Brand Personality
- **Warm** – Human, not robotic
- **Supportive** – "I've got this"
- **Reliable** – Trustworthy and consistent
- **Soft but Modern** – Premium without intimidation
- **Future-friendly** – Advanced but accessible
- **Zero-stress** – Removes friction, adds peace

### Brand Keywords
- Calm autonomy
- Quiet power
- Ease
- Life clarity
- Invisible help
- "It's handled"
- Friendly AI
- Premium but soft

---

## 🎨 Color Palette

### Philosophy
Our gradient evokes a **warm sunrise**—the perfect metaphor for "starting your day with everything handled." Soft, optimistic, and energizing without being aggressive.

### Primary Colors (Gradient Core)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Sunrise Coral** | `#FF928A` | rgb(255, 146, 138) | Main brand color, primary buttons, highlights, key interactions |
| **Peach Glow** | `#FFBC9F` | rgb(255, 188, 159) | Secondary surfaces, cards, hover states, gradient midpoints |
| **Warm Dawn** | `#FFE8C2` | rgb(255, 232, 194) | Soft backgrounds, gentle gradients, success states, warm overlays |

### Neutrals (Foundation)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Soft Sand** | `#F6F0EB` | rgb(246, 240, 235) | Light backgrounds, card surfaces, subtle dividers |
| **Slate Gray** | `#3C3C3C` | rgb(60, 60, 60) | Body text, secondary information, icons |
| **Midnight** | `#141414` | rgb(20, 20, 20) | Headings, high-contrast text, primary text, navigation |
| **Pure White** | `#FFFFFF` | rgb(255, 255, 255) | Card backgrounds, clean surfaces, text on dark |
| **Pure Black** | `#000000` | rgb(0, 0, 0) | Maximum contrast, logos, critical UI elements |

### Accent Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Pilot Red** | `#D40000` | rgb(212, 0, 0) | Status indicators, emphasis, error states, brand accent from icon |

### Functional Colors

| Purpose | Hex | Usage |
|---------|-----|-------|
| **Success** | `#10B981` | Completed actions, positive feedback |
| **Warning** | `#F59E0B` | Pending approvals, attention needed |
| **Error** | `#EF4444` | Failed actions, critical alerts |
| **Info** | `#3B82F6` | Informational messages, executing states |

---

## 🌈 Gradient Usage

**Key Principle**: Gradients are **strategic accents**, not everywhere. Use sparingly for maximum impact.

### Primary Gradient (Sunrise)
```css
background: linear-gradient(135deg, #FF928A 0%, #FFBC9F 50%, #FFE8C2 100%);
```
**Use cases:**
- Splash/landing screens
- Hero sections
- Empty states with personality
- Loading screens
- Special announcements

### Subtle Gradient (Soft Glow)
```css
background: linear-gradient(135deg, rgba(255, 146, 138, 0.1) 0%, rgba(255, 232, 194, 0.1) 100%);
```
**Use cases:**
- Card backgrounds (subtle)
- Section dividers
- Hover states on important cards
- Behind illustrations

### Button Gradient (Primary CTA)
```css
background: linear-gradient(135deg, #FF928A 0%, #FFBC9F 100%);
```
**Use cases:**
- Primary action buttons only
- "Approve" actions
- Key conversions
- Trust-building moments

### **Where NOT to use gradients:**
- ❌ All text backgrounds
- ❌ Navigation bars
- ❌ Form inputs
- ❌ Body text areas
- ❌ Repetitive UI elements

**Rule of thumb:** If it appears more than 3 times on a page, keep it neutral (black/white/gray).

---

## 🖼️ Logo Usage

### Available Variants
1. **LOGO black.png** – Primary logo for light backgrounds
2. **LOGO colored.png** – Full-color version (use sparingly, special occasions only)
3. **LOGO White.png** – For dark backgrounds or footer

### Logo Guidelines

#### Preferred Usage
```
Light backgrounds → Black logo
Dark backgrounds → White logo
Gradient backgrounds → Black logo (better contrast)
Special marketing → Colored logo (limited use)
```

#### Sizing
- **Minimum width**: 120px (mobile), 180px (desktop)
- **Header**: 180-220px wide
- **Footer**: 140-180px wide
- **Favicon**: Use icon only from logo

#### Clear Space
Maintain clear space around logo equal to the height of the icon element (the asterisk/pilot symbol).

#### Don'ts
- ❌ Don't distort or stretch
- ❌ Don't rotate
- ❌ Don't change colors (use provided versions)
- ❌ Don't add effects (shadows, glows, outlines)
- ❌ Don't place on busy backgrounds

---

## 🔤 Typography

### Philosophy
Clean, modern, highly readable. Friendly without being casual. Professional without being corporate.

### Font Families

#### Primary: **Work Sans** (Google Font)
```css
font-family: var(--font-work-sans), 'Work Sans', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
```
**Usage:** All text, UI elements, body content

**Weights Used:**
- 300 (Light) - Body text, descriptions, subtitles
- 400 (Regular) - Standard UI elements, buttons
- 500 (Medium) - Navigation, emphasis
- 600 (Semi-Bold) - Headlines, page titles

#### Implementation
```typescript
import { Work_Sans } from "next/font/google";

const workSans = Work_Sans({
  weight: ['300', '400', '500', '600'],
  subsets: ["latin"],
  variable: "--font-work-sans",
});
```

**Typography Philosophy:** Work Sans Light (300) provides a modern, airy, and elegant feel that matches the Base44-inspired aesthetic. The lighter weight creates a more spacious and premium appearance while maintaining excellent readability.

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing | Usage |
|---------|------|--------|-------------|----------------|-------|
| **Hero** | 48-64px | 700 | 1.1 | -0.02em | Landing pages, major headlines |
| **H1** | 32-40px | 700 | 1.2 | -0.02em | Page titles |
| **H2** | 24-28px | 600 | 1.3 | -0.01em | Section headers |
| **H3** | 20-22px | 600 | 1.4 | 0 | Subsections |
| **H4** | 18px | 600 | 1.4 | 0 | Card titles |
| **Body Large** | 18px | 400 | 1.6 | 0 | Intro paragraphs, important text |
| **Body** | 16px | 400 | 1.6 | 0 | Primary body text |
| **Body Small** | 14px | 400 | 1.5 | 0 | Secondary info, captions |
| **Caption** | 12px | 500 | 1.4 | 0.01em | Labels, metadata, timestamps |

### Mobile Adjustments
Reduce font sizes by 15-20% on screens < 768px:
- Hero: 36-40px
- H1: 28-32px
- H2: 20-24px
- Body: 15-16px

### Text Colors

```css
/* On white/light backgrounds */
--text-primary: #141414;      /* Midnight - headings, important text */
--text-secondary: #3C3C3C;    /* Slate Gray - body text */
--text-tertiary: #6B7280;     /* Light gray - captions, metadata */

/* On dark backgrounds */
--text-primary-inverse: #FFFFFF;
--text-secondary-inverse: rgba(255, 255, 255, 0.8);
--text-tertiary-inverse: rgba(255, 255, 255, 0.6);

/* On gradient backgrounds */
--text-on-gradient: #141414;  /* Black for maximum contrast */
```

---

## 🎛️ UI Components

### Buttons

#### Primary Button (Main Actions)
```css
background: linear-gradient(135deg, #FF928A 0%, #FFBC9F 100%);
color: #FFFFFF;
padding: 12px 32px;
border-radius: 12px;
font-weight: 600;
font-size: 16px;
border: none;
transition: all 0.2s ease;
box-shadow: 0 2px 8px rgba(255, 146, 138, 0.3);

/* Hover */
transform: translateY(-2px);
box-shadow: 0 4px 16px rgba(255, 146, 138, 0.4);
```

**Use for:** Primary actions, approvals, key conversions

#### Secondary Button (Alternative Actions)
```css
background: #F6F0EB;
color: #141414;
padding: 12px 32px;
border-radius: 12px;
font-weight: 600;
font-size: 16px;
border: none;
transition: all 0.2s ease;

/* Hover */
background: #E5DDD6;
```

**Use for:** Secondary actions, cancel, alternative paths

#### Ghost Button (Subtle Actions)
```css
background: transparent;
color: #3C3C3C;
padding: 12px 32px;
border-radius: 12px;
font-weight: 600;
font-size: 16px;
border: 2px solid #E5E7EB;
transition: all 0.2s ease;

/* Hover */
background: #F9FAFB;
border-color: #D1D5DB;
```

**Use for:** Tertiary actions, navigation, low-priority

#### Button Sizes
- **Large**: 16px font, 14px padding, 48px min-height
- **Medium** (default): 16px font, 12px padding, 44px min-height  
- **Small**: 14px font, 10px padding, 36px min-height

### Cards

#### Standard Card
```css
background: #FFFFFF;
border-radius: 16px;
padding: 24px;
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
border: 1px solid #F3F4F6;
transition: all 0.2s ease;

/* Hover */
transform: translateY(-2px);
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
```

#### Card with Gradient Accent
```css
background: linear-gradient(
  135deg, 
  rgba(255, 146, 138, 0.05) 0%, 
  rgba(255, 232, 194, 0.05) 100%
);
border: 1px solid rgba(255, 146, 138, 0.2);
/* Rest same as standard card */
```

**Use sparingly:** Important announcements, featured content, trust indicators

### Form Inputs

```css
/* Text Input */
background: #FFFFFF;
border: 2px solid #E5E7EB;
border-radius: 12px;
padding: 14px 16px;
font-size: 16px;
color: #141414;
transition: border-color 0.2s ease;

/* Focus */
border-color: #FF928A;
outline: none;
box-shadow: 0 0 0 3px rgba(255, 146, 138, 0.1);

/* Error */
border-color: #EF4444;
```

### Status Badges

```css
/* Base badge */
padding: 6px 12px;
border-radius: 20px;
font-size: 14px;
font-weight: 600;
display: inline-flex;
align-items: center;
gap: 6px;

/* Completed */
background: #D1FAE5;
color: #065F46;

/* Pending */
background: #FEF3C7;
color: #92400E;

/* Error */
background: #FEE2E2;
color: #991B1B;

/* Info */
background: #DBEAFE;
color: #1E40AF;
```

### Icons

**Style**: Outlined (not filled) for consistency
**Size**: 
- Small: 16px
- Medium: 20px
- Large: 24px
- Hero: 32-48px

**Color**: Match text color (`currentColor` for flexibility)

**Library**: Use consistent icon family (Heroicons, Lucide, or custom)

---

## 📐 Spacing & Layout

### Spacing Scale (8px base)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Layout Guidelines

#### Container Widths
```css
--container-sm: 640px;   /* Forms, focused content */
--container-md: 768px;   /* Standard content */
--container-lg: 1024px;  /* Wide content */
--container-xl: 1280px;  /* Dashboard, timeline */
--container-max: 1440px; /* Maximum width */
```

#### Padding
- **Mobile**: 16-24px sides
- **Tablet**: 32-40px sides
- **Desktop**: 40-80px sides (depending on container)

#### Section Spacing
- Between sections: 64-96px (desktop), 40-48px (mobile)
- Within sections: 32-48px (desktop), 24-32px (mobile)

---

## 🎭 Aesthetic Guidelines

### Background Treatments

#### Primary Approach: Clean & Minimal
**90% of the app should use:**
- Pure white backgrounds (`#FFFFFF`)
- Soft sand for alternating sections (`#F6F0EB`)
- Midnight or black for high-contrast sections (`#141414`)

#### Gradient Usage (10% of app)
**Strategic placement only:**

1. **Splash/Loading Screens**
   ```css
   background: linear-gradient(135deg, #FF928A 0%, #FFBC9F 50%, #FFE8C2 100%);
   ```

2. **Hero Sections** (top of landing/dashboard)
   ```css
   background: linear-gradient(135deg, #FF928A 0%, #FFE8C2 100%);
   /* With content overlay */
   ```

3. **Empty States**
   ```css
   background: linear-gradient(
     135deg, 
     rgba(255, 146, 138, 0.1) 0%, 
     rgba(255, 232, 194, 0.1) 100%
   );
   ```

4. **Special Cards/Callouts**
   - Trust indicators
   - Success messages
   - Feature highlights

### Composition Patterns

#### Centered Content on Gradient (aesthetic 2.png style)
```jsx
<div className="gradient-full">
  <div className="centered-content">
    <Logo variant="black" size="large" />
    <h1>Your content here</h1>
  </div>
</div>
```

```css
.gradient-full {
  background: linear-gradient(135deg, #FF928A 0%, #FFBC9F 50%, #FFE8C2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.centered-content {
  text-align: center;
  padding: 2rem;
}
```

#### Letterbox Style (aesthetic 3.png style)
```jsx
<div className="letterbox-container">
  <div className="letterbox-bar top" />
  <div className="gradient-content">
    {/* Your content */}
  </div>
  <div className="letterbox-bar bottom" />
</div>
```

```css
.letterbox-bar {
  height: 80-120px;
  background: #000000;
}

.gradient-content {
  background: linear-gradient(135deg, #FF928A 0%, #FFBC9F 50%, #FFE8C2 100%);
  flex: 1;
}
```

**Use for:** Special marketing pages, onboarding flows, feature showcases

---

## 🖱️ Interaction & Motion

### Animation Principles
- **Subtle & Smooth**: Nothing jarring or aggressive
- **Purpose-Driven**: Enhance understanding, don't distract
- **Performance**: Hardware-accelerated properties only (transform, opacity)

### Timing Functions
```css
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

### Standard Transitions
```css
/* Default hover/interaction */
transition: all 0.2s ease;

/* Modal/overlay entrance */
transition: opacity 0.3s ease, transform 0.3s ease;

/* Page transitions */
transition: opacity 0.5s ease;
```

### Micro-interactions

**Button Hover**
```css
transform: translateY(-2px);
/* Slight lift, never scale */
```

**Card Hover**
```css
transform: translateY(-4px);
box-shadow: /* enhanced shadow */;
```

**Input Focus**
```css
border-color: #FF928A;
box-shadow: 0 0 0 3px rgba(255, 146, 138, 0.1);
```

**Loading States**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 📱 Responsive Design

### Breakpoints
```css
--mobile: 0px;
--tablet: 768px;
--desktop: 1024px;
--wide: 1440px;
```

### Mobile-First Approach
Design for mobile first, enhance for larger screens.

### Key Adaptations

#### Typography
- Reduce sizes by 15-20%
- Decrease line height slightly for small screens

#### Spacing
- Reduce by ~30-40%
- Minimum 16px page padding

#### Navigation
- Hamburger menu on mobile
- Full navigation on desktop

#### Cards/Grids
- Single column on mobile
- 2 columns on tablet
- 3-4 columns on desktop

#### Buttons
- Full-width on mobile for primary actions
- Inline on desktop

---

## ♿ Accessibility

### Color Contrast
- **Text on white**: Minimum 4.5:1 (AA standard)
- **Large text**: Minimum 3:1
- **Interactive elements**: Minimum 3:1

### Focus States
Always visible, never remove:
```css
:focus-visible {
  outline: 2px solid #FF928A;
  outline-offset: 2px;
}
```

### Touch Targets
Minimum 44x44px for all interactive elements

### Screen Readers
- Semantic HTML
- ARIA labels where needed
- Alt text for images
- Skip navigation links

---

## 🎨 Component Patterns

### Trust Indicators

```jsx
<div className="trust-card">
  <div className="trust-icon">🔒</div>
  <div className="trust-content">
    <h4>Why am I showing you this?</h4>
    <p>
      I want to be transparent about what I'll do before I do it. 
      This builds trust between us.
    </p>
  </div>
</div>
```

```css
.trust-card {
  background: linear-gradient(
    135deg, 
    rgba(16, 185, 129, 0.1) 0%, 
    rgba(16, 185, 129, 0.05) 100%
  );
  border: 2px solid #10B981;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  gap: 16px;
}
```

### Success Celebrations

```jsx
<div className="success-screen">
  <div className="success-icon">🎉</div>
  <h2>Action Completed!</h2>
  <p>I've got this handled for you.</p>
</div>
```

**Animation**: Gentle fade-in with slight scale

### Empty States

```jsx
<div className="empty-state">
  <div className="empty-gradient">
    <div className="empty-icon">🌟</div>
    <h3>No actions yet</h3>
    <p>Start by asking me to help with something!</p>
    <button className="primary">Get Started</button>
  </div>
</div>
```

```css
.empty-gradient {
  background: linear-gradient(
    135deg, 
    rgba(255, 146, 138, 0.1) 0%, 
    rgba(255, 232, 194, 0.1) 100%
  );
  border-radius: 16px;
  padding: 48px;
  text-align: center;
}
```

---

## 📝 Copywriting & Voice

### Tone Principles
- **Helpful**, not salesy
- **Clear**, not jargon-y
- **Human**, not robotic
- **Reassuring**, not anxious
- **Conversational**, not corporate

### Example Phrases

#### ✅ Good
- "I'll handle this for you"
- "Let me take care of that"
- "Here's what I'm planning to do"
- "How did I do?"
- "I've got this"

#### ❌ Avoid
- "Please wait while we process your request"
- "Initializing AI agent modules"
- "Execute action workflow"
- "System notification"
- "Error code 500"

### Button Labels
- "Looks Good – Proceed" (not "Submit")
- "Help Me With This" (not "Execute")
- "I've Changed My Mind" (not "Cancel")

### Error Messages
```
❌ "Error 500: Internal Server Error"
✅ "Oops, something went wrong. Mind trying again?"

❌ "Invalid input"
✅ "I didn't quite catch that. Could you rephrase?"
```

---

## 📦 Assets & Resources

### Logo Files
- `LOGO black.png` – Primary, use on light backgrounds
- `LOGO colored.png` – Special use only
- `LOGO White.png` – Use on dark backgrounds

### Gradient References
- `aesthetic 1.png` – Full gradient background
- `aesthetic 2.png` – Gradient with centered logo
- `aesthetic 3.png` – Letterbox composition

### Icon Style
- Outline style (not filled)
- 2px stroke weight
- Rounded corners
- Consistent family

---

## 🚀 Implementation Guidelines

### CSS Variables

```css
:root {
  /* Colors */
  --color-sunrise-coral: #FF928A;
  --color-peach-glow: #FFBC9F;
  --color-warm-dawn: #FFE8C2;
  --color-soft-sand: #F6F0EB;
  --color-slate-gray: #3C3C3C;
  --color-midnight: #141414;
  --color-pilot-red: #D40000;
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #FF928A 0%, #FFBC9F 50%, #FFE8C2 100%);
  --gradient-subtle: linear-gradient(135deg, rgba(255, 146, 138, 0.1) 0%, rgba(255, 232, 194, 0.1) 100%);
  --gradient-button: linear-gradient(135deg, #FF928A 0%, #FFBC9F 100%);
  
  /* Spacing */
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  
  /* Borders */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
}
```

### Component Organization

```
components/
├── ui/
│   ├── Button/
│   ├── Card/
│   ├── Input/
│   └── Badge/
├── layout/
│   ├── Header/
│   ├── Footer/
│   └── Container/
└── features/
    ├── ActionCard/
    ├── TrustIndicator/
    └── FeedbackForm/
```

### Naming Conventions

**CSS Classes**: kebab-case
```css
.action-card { }
.trust-indicator { }
.button-primary { }
```

**Components**: PascalCase
```tsx
<ActionCard />
<TrustIndicator />
<ButtonPrimary />
```

---

## ✅ Design Checklist

Before shipping any new feature/page:

### Visual
- [ ] Uses primarily black/white/neutrals (90%)
- [ ] Gradients used strategically (10% max)
- [ ] Logo placement is appropriate
- [ ] Typography scale is consistent
- [ ] Spacing follows 8px grid
- [ ] Colors match palette exactly

### Interaction
- [ ] All buttons have hover states
- [ ] Focus states are visible
- [ ] Loading states are smooth
- [ ] Transitions are subtle (0.2-0.3s)
- [ ] Micro-interactions feel natural

### Accessibility
- [ ] Color contrast meets AA standards
- [ ] Touch targets are 44x44px minimum
- [ ] Focus order is logical
- [ ] Screen reader tested
- [ ] Keyboard navigation works

### Brand
- [ ] Tone is warm and helpful
- [ ] Copy is jargon-free
- [ ] Feels premium but approachable
- [ ] Supports "It's handled" feeling
- [ ] No cold/corporate vibes

### Responsive
- [ ] Mobile tested (320px+)
- [ ] Tablet tested (768px+)
- [ ] Desktop tested (1024px+)
- [ ] Typography scales appropriately
- [ ] Touch targets adequate on mobile

---

## 📚 Resources

### Design Tools
- **Figma**: For mockups and prototypes
- **ColorBox**: For gradient generation
- **Type Scale**: For typography hierarchy
- **WebAIM**: For contrast checking

### Code Examples
- See existing components in `/frontend/app/dashboard`
- Reference `/frontend/app/confirm` for gradient usage
- Check `/frontend/app/globals.css` for base styles

### Inspiration References
- Apple.com (clean, premium)
- Linear.app (modern, smooth)
- Notion.so (approachable, human)
- Stripe.com (trustworthy, clear)

---

## 🔄 Version History

**v1.0** (November 2025)
- Initial style guide creation
- Brand colors and gradients defined
- Component patterns established
- Aesthetic direction set

---

## 📧 Questions?

For design questions or to propose updates to this guide:
1. Check this document first
2. Review existing components
3. Reference the aesthetic images
4. Maintain the brand principles: warm, human, supportive

**Remember**: LifePilot is your calm, capable co-pilot. Every design decision should reinforce that feeling of "It's handled." 

✈️

