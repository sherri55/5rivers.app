# Design System Document: The Technical Precision Framework

## 1. Overview & Creative North Star: "The Digital Freight Architect"
The Creative North Star for this design system is **The Digital Freight Architect**. In an industry defined by the chaotic movement of goods, this system acts as the structural blueprint—providing absolute clarity, rigid precision, and an editorial high-end feel.

To move beyond a "generic SaaS" look, we reject the standard "box-in-a-box" layout. Instead, we utilize **Intentional Asymmetry** and **Tonal Layering**. Data isn't just placed on a page; it is architected into a hierarchy of importance using expansive whitespace and subtle shifts in surface values. We achieve a "Linear-esque" aesthetic by prioritizing crispness, mathematical spacing, and a total rejection of traditional "drop shadows" in favor of ambient light and physical layering.

---

## 2. Colors: The Palette of Efficiency
Our color strategy relies on a high-contrast relationship between a sterile white base and "Precision Blue."

### Color Roles
- **Primary (`#004ac6`) & Primary Container (`#2563eb`):** Used for critical action paths. The "Precision Blue" acts as a beacon of intent against the neutral backdrop.
- **Surface Tiers:** These are the workhorses of the system. 
  - `surface_container_lowest` (#ffffff) is our primary canvas.
  - `surface_container_low` (#f2f4f6) is used for large-scale structural division.
- **Neutral Accents:** `outline_variant` (#c3c6d7) is used sparingly for technical definition.

### The "No-Line" Rule
Sectioning must **never** be achieved through 1px solid high-contrast borders. To define a sidebar or a header, use a background shift from `surface` (#f7f9fb) to `surface_container_low` (#f2f4f6). If a visual break is required, use a "Ghost Border" (see Section 4).

### Signature Textures
Main CTAs should utilize a subtle vertical gradient from `primary_container` (#2563eb) to `primary` (#004ac6). This 2-point shift adds a "machined" quality to buttons, making them feel like physical instruments of precision rather than flat digital rectangles.

---

## 3. Typography: Technical Clarity
We use **Inter** to maintain a crisp, technical aesthetic that mimics engineering documentation while remaining highly legible for high-density logistics data.

| Level | Token | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | 3.5rem | 600 | Editorial impact for key metrics (e.g., total fleet volume). |
| **Headline**| `headline-sm`| 1.5rem | 500 | Section entry points; crisp and authoritative. |
| **Title**   | `title-md`   | 1.125rem| 600 | Data group headings and card titles. |
| **Body**    | `body-md`    | 0.875rem| 400 | Standard data entries and descriptions. |
| **Label**   | `label-sm`   | 0.6875rem| 500 | Uppercase tracking (+0.05em) for technical metadata. |

**The Editorial Contrast:** Pair a `display-lg` metric with a `label-sm` technical tag to create a high-end, asymmetric hierarchy that feels custom-built for logistics professionals.

---

## 4. Elevation & Depth: Tonal Layering
We convey hierarchy through material physics rather than artificial styling.

- **The Layering Principle:** Depth is achieved by "stacking" surface tiers. Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f2f4f6) background. This creates a natural 0.5rem "lift" without the messiness of shadows.
- **Ambient Shadows:** For floating elements (Modals, Popovers), use a shadow color tinted with the `on_surface` (#191c1e) at 4% opacity with a large 32px blur. It should feel like a soft glow of light, not a black smudge.
- **The "Ghost Border":** When containment is required for data grids, use `outline_variant` at **15% opacity**. This creates a "suggestion" of a boundary that disappears into the background upon quick glance.
- **Glassmorphism:** Use `surface_container_lowest` with an 80% alpha and a 12px backdrop-blur for sticky navigation headers. This allows the logistics map or data scrolls to bleed through, maintaining spatial awareness.

---

## 5. Components: Machined Primitives

### Buttons
- **Primary:** Gradient fill (`primary_container` to `primary`), `lg` (0.5rem) rounding, and `on_primary` (#ffffff) text.
- **Tertiary:** No background. Use `primary` (#004ac6) text with a subtle `surface_container` background on hover.

### Cards & Lists
- **The "No Divider" Rule:** Forbid the use of horizontal divider lines in lists. Use `3` (1rem) spacing to separate items. For extreme density, use alternating background tints between `surface` and `surface_container_low`.
- **Status Chips:** High-contrast text on low-contrast backgrounds. E.g., a "Delayed" chip uses `on_error_container` text on an `error_container` background with `full` (9999px) rounding.

### Input Fields
- **State:** Resting state uses `surface_container_highest` (#e0e3e5) as a subtle background. On focus, the background shifts to `surface_container_lowest` (#ffffff) with a 1px `primary` border. This "pop-out" effect signals active data entry.

### Logistics-Specific Components
- **The Timeline Node:** Use `primary` (#004ac6) for completed legs and `outline_variant` for upcoming legs. Nodes are never just circles; they are small 8px squares to reinforce the "architectural" theme.
- **Data Densifiers:** Small, high-density sparklines using `primary` strokes to show real-time fuel or speed metrics within a list item.

---

## 6. Do's and Don'ts

### Do
- **DO** use the `20` (7rem) spacing token for hero section margins to create "breathe room."
- **DO** use asymmetric layouts—e.g., a 2/3 width data table paired with a 1/3 width technical summary sidebar.
- **DO** use `label-sm` in all-caps for technical units (e.g., "1,200 KG") to provide a professional, audited feel.

### Don't
- **DON'T** use 100% opaque `outline` tokens for borders; it creates visual "clutter" and kills the high-end feel.
- **DON'T** use rounded corners larger than `xl` (0.75rem) for structural elements. Logistics is about efficiency, not "softness."
- **DON'T** use heavy drop shadows. If it feels like it’s "popping" off the screen, the shadow is too strong. It should feel "seated" in the UI.