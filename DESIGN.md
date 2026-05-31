# DESIGN.md — Textla (textla.com)

> **Design Language:** Playful-bold SaaS. Rooted in a Southwest/outdoor adventure aesthetic — illustrated desert landscapes, hand-drawn illustration characters, and a warm sunshine palette cut through by deep forest green. The tone is approachable, confident, and high-energy without being aggressive.

---

## 1. Color Palette

### Core Semantic Tokens

| Token Name               | HEX       | Usage                                                                 |
|--------------------------|-----------|-----------------------------------------------------------------------|
| `color-bg-primary`       | `#F5F5C8` | Main page background — a warm, pale cream-yellow                     |
| `color-brand-green`      | `#1A4731` | Primary dark forest green — logo, headings, dark cards, outlines     |
| `color-accent-yellow`    | `#F5E642` | CTA buttons (primary), stat ticker background, highlight blocks      |
| `color-accent-green`     | `#3CB371` | Italic accent text (e.g. "Unbeatable", "outreach"), link highlights  |
| `color-surface-white`    | `#FFFFFF` | Card surfaces, modal/floating UI elements, message bubbles           |
| `color-surface-dark`     | `#1A4731` | Dark card variant — "Easy to use" section, footer-adjacent blocks    |
| `color-surface-yellow`   | `#F5E642` | Testimonial card background ("Hear it from them"), CTA strip         |
| `color-surface-sage`     | `#E8EDCB` | Pledge section card, softer content zones within the cream field     |
| `color-tag-yellow-light` | `#FFF59D` | UI table tags ("One-time") inside dashboard mockup                   |
| `color-tag-green-light`  | `#C8F5D0` | UI table tags ("Sending in 3 days") inside dashboard mockup          |
| `color-text-primary`     | `#1A4731` | All body text, headings, labels — dark green, not pure black         |
| `color-text-muted`       | `#4A5E50` | Secondary/sub-body text, captions, descriptors                       |
| `color-star-orange`      | `#FFA500` | Star rating icons                                                     |
| `color-ticker-bg`        | `#E8E86A` | Scrolling stat ticker band at bottom of hero                         |

### Color Usage Principles
- The palette is **triadic at its core**: cream-yellow bg + forest green text/outlines + bright yellow accent.
- Green is **never decorative**; it is always semantic (brand, text, nature-illustration).
- Yellow is **always functional**: it signals action (button), social proof (testimonial), or emphasis.
- White surfaces are reserved for **floating UI elements** (modals, cards inside illustrations, message bubbles) — they contrast deliberately against the cream background.

---

## 2. Typography

### Font Families

| Role             | Family                  | Notes                                                                  |
|------------------|-------------------------|------------------------------------------------------------------------|
| Display / Hero   | **Syne** (or equivalent heavy grotesque) | Ultra-bold, wide, condensed — used for hero headline and section titles |
| Body / UI        | **Inter** or **DM Sans** | Clean, legible sans-serif for body copy, navigation, labels           |
| Italic Accent    | Syne Italic or a bold italic sans | Used exclusively for highlighted/emphasis words within headings ("Unbeatable", "outreach", "news") |

> **Note:** Textla uses a Webflow-hosted site. The display font appears to be a heavy grotesque in the Syne/Space Grotesk family based on the letterform geometry — particularly the squared terminals and high x-height visible in "Unbeatable" and "Speed up your outreach".

### Type Scale

| Token          | Size (desktop) | Weight      | Line Height | Usage                                             |
|----------------|----------------|-------------|-------------|---------------------------------------------------|
| `text-h1`      | ~72–80px       | 900 (Black) | 1.0–1.05    | Hero headline ("Unbeatable rates on every message") |
| `text-h1-italic` | ~72–80px     | 900 Italic  | 1.0         | Italic hero accent word ("Unbeatable", "outreach") — rendered in `color-accent-green` |
| `text-h2`      | ~48–56px       | 800 (ExtraBold) | 1.1     | Section titles ("Speed up your", "The latest")   |
| `text-h3`      | ~28–32px       | 700 (Bold)  | 1.2         | Card/subsection titles ("Bulk Messaging", "Easy contact storage") |
| `text-h4`      | ~20–22px       | 700         | 1.3         | Testimonial quote headings, step titles           |
| `text-body`    | 16px           | 400         | 1.6         | General body/paragraph copy                       |
| `text-body-sm` | 14px           | 400         | 1.5         | Captions, card metadata, table row text           |
| `text-label`   | 13–14px        | 600 (SemiBold) | 1.4      | Navigation links, button labels, badge text       |
| `text-ticker`  | ~28–32px       | 800         | 1.0         | Scrolling stat bar ("0 missed messages", "Over 2B+") |

### Typography Behaviour
- Hero headline is **split across two lines** with the italic accent word on line 1 (colored green) and the remaining text in bold dark green below.
- Section titles use a **two-line split**: plain weight on line 1, italic colored accent on line 2 — a consistent brand pattern throughout the page.
- All type is **left-aligned** in hero/feature sections; **center-aligned** inside cards and testimonial blocks.

---

## 3. Spacing & Layout

### Grid System

| Property            | Value                    |
|---------------------|--------------------------|
| Max content width   | ~1280px                  |
| Column count        | 12-column grid (Webflow) |
| Gutter width        | 24px                     |
| Side padding (page) | 80px desktop / 24px mobile |

### Spacing Scale (8px base unit)

| Token        | Value  | Usage                                           |
|--------------|--------|-------------------------------------------------|
| `space-1`    | 4px    | Tight internal gaps (icon-to-label, tag padding) |
| `space-2`    | 8px    | Badge/tag internal padding, list item gaps       |
| `space-3`    | 12px   | Button vertical padding, form element gaps       |
| `space-4`    | 16px   | Default component padding, card inner spacing    |
| `space-6`    | 24px   | Grid gutters, nav item spacing, card gaps        |
| `space-8`    | 32px   | Section internal padding-top/bottom              |
| `space-12`   | 48px   | Between subsection elements                      |
| `space-16`   | 64px   | Between major sections                           |
| `space-24`   | 96px   | Hero top padding, large section breathing room   |
| `space-32`   | 128px  | Full section vertical padding (desktop)          |

### Layout Patterns
- **Hero:** Two-column split — text left (~45%), illustrated UI mockup right (~55%). Illustration bleeds to the viewport edge.
- **Feature sections:** Alternating — text block left + visual right, then visual left + text right.
- **Cards:** Auto-fit 2-column grid on desktop, single column on mobile. Cards have generous internal padding (32px).
- **Ticker/Marquee:** Full-width horizontal scrolling band — no grid, edge-to-edge.
- **Testimonials:** Asymmetric two-column layout — review card (left, ~45%) + video testimonial card (right, ~55%).

### Border Radius

| Token          | Value   | Usage                                         |
|----------------|---------|-----------------------------------------------|
| `radius-sm`    | 8px     | Tags, badges, small UI elements               |
| `radius-md`    | 16px    | Buttons, input fields                         |
| `radius-lg`    | 24px    | Cards, feature blocks, testimonial containers |
| `radius-xl`    | 32–40px | Large hero cards, pledge block, CTA strip     |
| `radius-full`  | 9999px  | Pill buttons ("Try for free"), avatar images  |

---

## 4. UI Components

### 4.1 Buttons

#### Primary CTA — "Try for free"
```
Background:    #F5E642  (color-accent-yellow)
Text:          #1A4731  (color-brand-green)
Font weight:   700–800
Font size:     16px
Padding:       14px 28px
Border-radius: 9999px  (full pill)
Border:        2px solid #1A4731
Box-shadow:    4px 4px 0px #1A4731  (hard offset shadow — no blur, flat brutalist feel)
Hover:         translate(-2px, -2px), shadow expands to 6px 6px 0px #1A4731
```

#### Secondary CTA — "Get a demo"
```
Background:    transparent
Text:          #1A4731
Font weight:   600
Font size:     16px
Arrow icon:    inline →
Border:        none
Padding:       14px 0px
Hover:         Arrow nudges right 4px
```

#### Navbar CTA — "Try for free" (smaller variant)
```
Background:    #F5E642 (slightly muted at nav scale)
Text:          #1A4731
Padding:       10px 20px
Border-radius: 9999px
Border:        1.5px solid #1A4731
Box-shadow:    3px 3px 0 #1A4731
```

---

### 4.2 Cards

#### Feature Card (Light)
```
Background:    #FFFFFF
Border:        2px solid #1A4731
Border-radius: 24px
Padding:       32px
Box-shadow:    6px 6px 0 #1A4731  (hard offset — consistent brand shadow)
```

#### Feature Card (Dark)
```
Background:    #1A4731  (color-brand-green)
Border:        2px solid #1A4731
Border-radius: 24px
Padding:       32px
Text color:    #F5E642 for headings, #FFFFFF or #C8E6C9 for body
```

#### Testimonial Card
```
Background:    #F5E642  (color-surface-yellow)
Border-radius: 32px
Padding:       40px
Border:        2px solid #1A4731
Box-shadow:    6px 6px 0 #1A4731
```

#### Review Card (User quote)
```
Background:    #FFFFFF
Border:        2px solid #1A4731
Border-radius: 20px
Padding:       24px 28px
Layout:        Avatar + name/title top row, G2 badge top-right, quote headline center, stars bottom
```

#### Pledge / Light Section Card
```
Background:    #E8EDCB  (color-surface-sage)
Border-radius: 32px
Padding:       40px 48px
Border:        2px solid #1A4731
```

#### News / Blog Cards
```
Background:    #FFFFFF
Border:        2px solid #1A4731
Border-radius: 16px
Padding:       20px
Thumbnail:     top, full-width, border-radius 12px
Title:         text-h4, color-brand-green
Body:          text-body-sm, color-text-muted
```

---

### 4.3 Navigation

```
Position:      Fixed top / sticky (appears to be sticky on scroll)
Background:    #F5F5C8  (same as page bg — seamless)
Height:        ~64px
Layout:        Logo left | Nav links center | [Log in] + [Try for free] right
Logo:          Wordmark + bird illustration mark, color-brand-green
Nav links:     text-label (14px, 600), color-brand-green, no underline
               Hover: underline or subtle opacity change
Log in link:   Plain text, color-brand-green, no button treatment
CTA button:    Pill button — yellow with dark border + offset shadow (see Button spec above)
Divider:       No visible bottom border on nav; blends into page background
```

---

### 4.4 Tags / Badges (Dashboard UI Mockup)

#### One-time Tag
```
Background:    #FFF59D  (color-tag-yellow-light)
Text:          #1A4731
Font size:     12px
Font weight:   600
Padding:       4px 10px
Border-radius: 6px
```

#### Sending Status Tag
```
Background:    #C8F5D0  (color-tag-green-light)
Text:          #1A4731
Font size:     12px
Font weight:   600
Padding:       4px 10px
Border-radius: 6px
```

---

### 4.5 Illustration System

Textla's visual identity is inseparable from its illustration style:

- **Style:** Flat 2D line illustrations with limited fills — desert Southwest theme (mesas, arch rocks, cacti, clouds).
- **Color Constraint:** Illustrations use only 3 colors — `#1A4731` (outline/fill), `#E8E86A` (mid-ground fill), `#F5F5C8` (background — same as page, creating depth illusion).
- **Characters:** Cartoon figure (parachutist, bird mascot "Textla bird") rendered in the same flat line style.
- **Purpose:** These are NOT decorative — they form the primary visual hierarchy in the hero and section dividers. They replace photography.
- **Placement:** Illustrations bleed to the viewport edge and overlap into cards/content areas for depth.

---

### 4.6 Scrolling Ticker / Marquee

```
Background:    #E8E86A  (color-ticker-bg) — slightly more saturated yellow than accent
Height:        ~72px
Text:          text-ticker size (~28–30px, weight 800), color-brand-green
Content:       Stat strings separated by a small diamond/dot divider
Animation:     Continuous left-scroll (CSS marquee / JS scroll loop)
Border-top:    2px solid #1A4731
Border-bottom: 2px solid #1A4731
```

---

### 4.7 Avatar / User Images

```
Shape:         Circle (border-radius: 9999px)
Size:          56px (card header), 120px (testimonial featured)
Border:        2px solid #1A4731
```

---

## 5. Motion & Interaction Principles

| Principle          | Behaviour                                                                  |
|--------------------|----------------------------------------------------------------------------|
| Button hover       | Translate up-left (-2px, -2px), shadow grows — gives a "pop off" feel     |
| Ticker             | Continuous horizontal marquee, no pause                                    |
| Testimonial slider | Horizontal slide with prev/next arrow buttons (circle, bordered)           |
| Card hover         | Slight lift (translateY -4px), shadow deepens                             |
| Link hover         | Color shift from `color-brand-green` to `color-accent-green`              |
| Transition timing  | `200–300ms ease-out` across all interactions                               |

---

## 6. Shadow System

Textla uses a **hard offset drop shadow** consistently — no Gaussian blur. This is a deliberate brutalist/illustrative choice that matches the flat illustration style.

```css
--shadow-sm:  3px 3px 0px #1A4731;
--shadow-md:  4px 4px 0px #1A4731;
--shadow-lg:  6px 6px 0px #1A4731;
--shadow-xl:  8px 8px 0px #1A4731;
```

---

## 7. CSS Custom Properties — Quick Reference

```css
:root {
  /* Colors */
  --color-bg-primary:        #F5F5C8;
  --color-brand-green:       #1A4731;
  --color-accent-yellow:     #F5E642;
  --color-accent-green:      #3CB371;
  --color-surface-white:     #FFFFFF;
  --color-surface-dark:      #1A4731;
  --color-surface-yellow:    #F5E642;
  --color-surface-sage:      #E8EDCB;
  --color-ticker-bg:         #E8E86A;
  --color-tag-yellow-light:  #FFF59D;
  --color-tag-green-light:   #C8F5D0;
  --color-text-primary:      #1A4731;
  --color-text-muted:        #4A5E50;
  --color-star:              #FFA500;

  /* Typography */
  --font-display:   'Syne', sans-serif;
  --font-body:      'DM Sans', 'Inter', sans-serif;

  --text-h1:        clamp(48px, 6vw, 80px);
  --text-h2:        clamp(36px, 4.5vw, 56px);
  --text-h3:        clamp(22px, 2.5vw, 32px);
  --text-h4:        20px;
  --text-body:      16px;
  --text-body-sm:   14px;
  --text-label:     13px;

  /* Spacing */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-6:   24px;
  --space-8:   32px;
  --space-12:  48px;
  --space-16:  64px;
  --space-24:  96px;
  --space-32:  128px;

  /* Border Radius */
  --radius-sm:   8px;
  --radius-md:   16px;
  --radius-lg:   24px;
  --radius-xl:   40px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:  3px 3px 0px var(--color-brand-green);
  --shadow-md:  4px 4px 0px var(--color-brand-green);
  --shadow-lg:  6px 6px 0px var(--color-brand-green);
  --shadow-xl:  8px 8px 0px var(--color-brand-green);

  /* Layout */
  --max-width:        1280px;
  --page-padding-x:  80px;
}
```

---

## 8. Design Principles Summary

| Principle           | Manifestation                                                                 |
|---------------------|-------------------------------------------------------------------------------|
| **Playful but credible** | Illustration-heavy but paired with real social proof (G2, Capterra, AICPA SOC 2) |
| **High contrast**   | Dark green on cream, yellow on green — every pairing exceeds WCAG AA          |
| **No gradients**    | All surfaces are flat fills — consistent with the illustration vocabulary      |
| **Hard shadows only** | No soft drop shadows anywhere — brutalist edge maintained throughout         |
| **Color = function** | Yellow always = action/CTA. Green always = brand/text. White = UI chrome      |
| **Type as illustration** | Large, bold italic text functions visually like an illustration element    |
