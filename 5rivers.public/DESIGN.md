---
name: Vitesse Technical
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5a413d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#8e706c'
  outline-variant: '#e2bfb9'
  surface-tint: '#b22b1d'
  primary: '#570000'
  on-primary: '#ffffff'
  primary-container: '#800000'
  on-primary-container: '#ff8371'
  inverse-primary: '#ffb4a8'
  secondary: '#0055c6'
  on-secondary: '#ffffff'
  secondary-container: '#116df4'
  on-secondary-container: '#fefcff'
  tertiary: '#262626'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c3c3c'
  on-tertiary-container: '#a6a6a6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#8f0f07'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b0c6ff'
  on-secondary-fixed: '#001945'
  on-secondary-fixed-variant: '#00429c'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1b1b1b'
  on-tertiary-fixed-variant: '#474747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-xl:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.1em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  section-padding: 120px
  stack-overlap: -40px
---

## Brand & Style

This design system is engineered for a premium, high-tech logistics environment. It balances the grit of global transportation with the precision of advanced software. The visual language evokes a sense of "Engineered Velocity"—reliable, swift, and technologically superior.

The aesthetic follows a **Modern/Futuristic** movement characterized by:
- **Architectural Precision:** Using sharp lines and rigid geometry to signify structural integrity.
- **Expansive Whitespace:** Creating "breathing room" that mirrors the openness of the road and the clarity of data-driven insights.
- **Dynamic Depth:** Supporting scroll-triggered animations through overlapping layers and staggered layouts to keep the user engaged during the narrative of the logistics journey.

## Colors

The palette is anchored by a sophisticated Maroon (#800000) that suggests heritage and authority. This is contrasted against a stark White base to maintain a clean, high-tech feel. 

- **Primary Maroon:** Reserved for high-impact branding, key hero text, and primary actions. 
- **Tech Blue:** Borrowed from the technical profile to represent connectivity, real-time tracking, and data points.
- **Absolute Neutrals:** Black and high-contrast grays are used for technical data and structural borders.
- **Functional Whitespace:** The background is kept predominantly white (#FFFFFF) to allow high-quality logistics photography to stand out.

## Typography

The typography system uses a tiered technical approach. 

- **Space Grotesk** is used for headlines to provide a geometric, futuristic character. It should be typeset with tight letter-spacing in larger formats.
- **Inter** provides high readability for body copy, ensuring professional clarity for complex logistics information.
- **Space Mono** (Label-Mono) is the "data layer." Use this for tracking numbers, coordinates, timestamps, and small technical metadata to reinforce the high-tech brand narrative.

## Layout & Spacing

The design system utilizes a **12-column fixed grid** with generous gutters. 

To support the requirement for scroll-triggered animations:
- **Staggered Offsets:** Elements in a grid should often be offset by one "unit" (8px) relative to their neighbors to create a sense of motion during scrolling.
- **Overlapping Sections:** Utilize the `stack-overlap` variable to allow sections to bleed into one another, creating a seamless, futuristic flow.
- **Floating UI:** Floating elements (like floating navs or tracking widgets) should maintain consistent margins from the viewport edge, typically 40px to 64px.

## Elevation & Depth

In line with the sharp, futuristic aesthetic, this design system avoids heavy, organic shadows. Instead, it uses:

- **Structural Outlines:** 1px borders in low-opacity black or primary maroon to define containers without adding visual weight.
- **Layered Glass:** For floating UI elements, use a backdrop-blur (12px) with a semi-transparent white fill (80% opacity) to create a "heads-up display" (HUD) effect.
- **Hard Shadows:** Where depth is required for interaction, use "hard" shadows with 0 blur and a 4px offset to maintain the "sharp lines" philosophy.

## Shapes

To satisfy the "sharp lines" requirement, the roundedness is set to 0. 

Every UI element—from buttons and input fields to cards and images—should feature 90-degree corners. This evokes industrial precision and technical discipline. Diagonal clips (45-degree cuts on corners) may be used sparingly on decorative elements to enhance the "high-tech" futuristic feel.

## Components

### Buttons
Primary buttons are solid Maroon (#800000) with White text in Space Mono. They feature sharp 0px corners. Hover states should trigger a color invert or a subtle "glitch" slide-in effect to maintain the tech vibe.

### Cards
Cards use a 1px border (#000000 at 10% opacity) and no background fill unless they are overlapping other content, in which case they use the Glassmorphism style. Cards should be designed to stagger vertically in a 3-column layout to facilitate scroll animations.

### Input Fields
Fields are minimalist: a bottom-border only or a very light gray (#F8F8F8) fill. Labels utilize the "Label-Mono" typography style for a technical tracking look.

### Navigation
The navigation should be a "Floating UI" element. It is a centered, narrow bar with a backdrop blur and sharp corners, appearing to hover over the content as the user scrolls.

### Data Visualization
Logistics metrics should be displayed using technical "Status Chips" (sharp-edged rectangles) utilizing the Tech Blue (#146EF5) for active states and Maroon for critical alerts.