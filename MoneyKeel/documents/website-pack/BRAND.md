# MoneyKeel: the look and feel

## The feel

- **A calm instrument, not a game.** MoneyKeel should feel like a well-made gauge on a boat's dashboard: quiet, steady and exact. Numbers come first, and the decoration stays out of their way.
- **Trust over excitement.** No rockets, coins, piles of cash, dollar-sign icons, confetti, streaks or badges. No "to the moon" energy. The reader is 36 to 70 years old and wants to know where they stand.
- **Plain words.** Short sentences a ten-year-old could repeat. One word per idea, used the same way everywhere. Say what a number means, not only what it is.
- **Honest colour.** Colour never carries meaning alone. Up and down are always shown with a word or an arrow as well (▲ up, ▼ down), so colour-blind readers get the same message. The chart colours were chosen and checked so that colour-blind readers can tell them apart.
- **iPhone first.** MoneyKeel is designed for iPhone, at the iPhone's standard width of 390 points. Show it in iPhone frames on the website, and make the site itself work well on a phone.

## Logo

Files are in `logo/`:
- `moneykeel-wordmark.png`: the name, with "Money" in teal and "Keel" in navy, bold. This is the artwork the app shows at the top of every screen. The name is always shown as this artwork, never retyped in another font.
- `moneykeel-mark.png` and `moneykeel-mark.svg`: the "K" mark. A steady upright stem stands for stability, and a rising arrow stands for growth. Its gradient runs from navy to blue to mint.
- `moneykeel-app-icon.png`: the app icon (1024 × 1024).

| Logo colour | Hex |
|---|---|
| "Money" teal | `#0E8C74` |
| "Keel" navy | `#0D233A` |
| Mark gradient (navy → blue → mint) | `#0D233A` → `#185FA5` → `#1AC4A7` |

## Colours (from the app itself)

### Brand greens
| Role | Hex |
|---|---|
| **Deep green**: section bars, headings, the anchor colour of the brand | `#085041` |
| **Green**: buttons, links, the big headline figure | `#178F6B` |
| Darker green: strong accents | `#0F6E56` |
| Light green: selected tabs, soft highlights | `#E1F5EE` |
| Pale green: the lighter sub-heading bars under a deep-green bar | `#DFF2E9` |
| Mid green: subtle fills | `#9FE1CB` |

### Backgrounds and text
| Role | Hex |
|---|---|
| Page background (warm off-white) | `#F6F7F5` |
| Cards | `#FFFFFF` |
| Quiet fill (chips, tracks) | `#EEEEE9` |
| Main text (near-black) | `#1A1A18` |
| Secondary text | `#6B6B66` |
| Quiet text (dates, notes) | `#76766F` |
| Thin dividers | black at 10% opacity |

### Meaning colours
| Meaning | Text | Background |
|---|---|---|
| **Needs your attention** (amber): a missing number, a bill due, "Tight" | `#854F0B` | `#FAEEDA` (mid `#FAC775`) |
| **Gain** (money up) | `#006300` | none |
| **Loss and debt** (money down, what you owe) | `#A32D2D` | `#FCEBEB` |
| Information (blue) | `#185FA5` | `#E6F1FB` |

Amber is the only "warning" colour. The app saves it for things that need the person to act, so it keeps its meaning.

### Chart colours (fixed: the same category always gets the same colour)
| Category | Hex |
|---|---|
| Stocks / Funds | `#2A78D6` |
| Cash | `#1BAF7A` |
| Real estate | `#EDA100` |
| Bonds & CDs | `#4A3AA7` |
| Other investments | `#EB6834` |
| Personal property | `#E87BA4` |
| Mixed | `#898781` |
| Debts (one brown family, dark to light) | `#4A2E00`, `#854F0B`, `#B98A4B`, `#E8CFA6` |
| Money in / money out | `#2A78D6` / `#EB6834` |

## Type

- **Font:** the iPhone's own system font (San Francisco). On the web, use the system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`). Inter is a close match where the system font isn't available.
- **Sizes used in the app (points):** 11 · 13 · 15 · 17 · 20 · 24 · 30 · 38.
  - 38, bold: the headline figure (net worth, a return).
  - 20, bold: screen titles.
  - 15 to 17: body text and money rows.
  - 13: supporting lines under a row.
  - 11, extra-bold, capitals, slightly letter-spaced: section bars ("YOUR NET WORTH", "WHAT YOU OWN").
  - Nothing is smaller than about 11 points. The readers are 55 to 70, so larger is better on the website too.
- **Numbers** use even-width (tabular) digits and line up on one right-hand edge, so columns of dollars read like a statement.

## Shapes and layout

- **Deep-green section bars** run edge to edge across the screen with **square corners** and white capital letters. They are the signature element of the look. A pale-green bar with deep-green capitals marks a group inside a section.
- Cards are white on the warm off-white page, with gently rounded corners (8, 12 or 16 points) and very soft shadows.
- Buttons: solid green with white text for the main action, and white with a green outline for the others. The main "+ Add an account" button is a full-width green pill.
- Spacing steps: 4 · 8 · 12 · 16 · 20 · 24 · 32 points. Generous white space and one idea per row.

## Do and don't

| Do | Don't |
|---|---|
| Show real screens in iPhone frames | Use stock photos of piles of money or people celebrating |
| Lead with clarity: "See how every number was made" | Promise riches, returns or "beating the market" |
| Use deep green, off-white and lots of space | Use bright gradients, neon or dark "trading app" themes |
| Use amber only for "needs your attention" | Use red and green as the only signal |
| Write plain, short, calm sentences | Use jargon or hype ("AI-powered", "to the moon") |
