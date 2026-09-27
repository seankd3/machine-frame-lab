# Parts, prices and stiffness data (read 2026-09-27)

Every number carries its source. `null` = not found; never guess. Prices USD, single unit, before shipping/tax.

## Market changes
- OpenBuilds closed (2025). BlackBox, V-slot and C-beam survive only at MakerTechStore, mostly out of stock.
- Onefinity dropped the Machinist and Woodworker. It now sells the Apprentice (from $995) and the Gen 2 Elite (from $2,195).
- Misumi USA was down for maintenance, so Misumi prices are null.
- The PrintNC store is gone.
- Bart Dring's Tindie FluidNC links now return 404.

## Stiffness (feeds the FE model)
- **HIWIN carriage radial stiffness, N/µm (catalogue G99TE24-2410):**
  - Tables 2-1-13 (p.28) and 2-4-7 (p.81): HGH15CA Z0 196 / ZA 365 / ZB 483; HGH20CA 232/460/678; HGH25CA 292/539/705; HGH30CA 354/618/823.
  - MGN12H Z0 105 / Z1 182; MGN15H 134/204; MGN12C 67/109; MGN15C 87/126.
  - MGN preload classes are ZF/Z0/Z1. Only radial stiffness is tabulated.
- **Ball nuts:**
  - HIWIN single nut, no preload (p.67): 16-5 108–118 N/µm, 20-5 196–265.
  - TBI SFU lists 1605 314, 1610 255, 2005 382; this is likely a preloaded figure.
  - Root diameters (HIWIN): 16 mm → 13.324, 20 mm → 17.324.
- **Critical speed (HIWIN M31/M32):** Nc = 2.71e8 · Mf · dr / L² rpm, where Mf = 1 fixed-fixed, 0.689 fixed-supported, 0.441 supported-supported, 0.157 fixed-free. Allowed speed is 0.8·Nc. DN limit is 70,000.
- **Support bearings (THK catalogue 513-2E, via distributor copy):** BK12 88 N/µm axial; BK15 100 N/µm. Generic clones are likely softer.
- **Belts (Gates Light Power & Precision manual, Table 6, EA = T per 0.1 % elongation / 0.001):** GT2 6 mm 16.9 kN; GT2 9 mm 25.4 kN; GT3 9 mm 39.6 kN; GT3 15 mm 73.4 kN. All glass-fibre cord.
- **Rack and pinion:** mod 1, 17 mm face, roughly 240–340 N/µm (ISO 6336 typical values, secondary source).
- **T-slot joint rotational stiffness:** not published anywhere found. Only strength limits exist, from item and Bosch R999001283 p.19-6. Treat it as a calibrated unknown.

## Motors (StepperOnline)
| Motor | Price | Mass | Other |
|---|---|---|---|
| 23HS45-4204S, 3.0 Nm | $28.70 | 1.6 kg | 113 mm long, Ø10 shaft |
| 23HS30-2804S, now rated 2.0 Nm | $18.26 | 1.1–1.2 kg | 76.5 mm long, Ø6.35 shaft |
| 17HS19-2004S1, 0.59 Nm | $9.62 | — | rotor 82 g·cm² |

- **23HS30 pull-out torque at 48 V, DM542T driver (rpm: N·cm):** 90: 184, 300: 176, 390: 156, 510: 128, 600: 112, 810: 88, 990: 60, 1200: 40, 1500: 18.
- **Drivers and PSU:** DM542T $19.65; DM556T $22.92; Mean Well LRS-350-48 $20.51 (price needs verifying).
- **Closed-loop:** CL57TE + 2 Nm $59.26.

## Structural stock
- **80/20, direct from 8020.net:**
  - 1530: $1.81/in + $3.79/cut.
  - 1545: $2.76/in + $3.94/cut.
  - 3060: $5.72/in + $4.47/cut.
  - 40-4080: $0.0821/mm + $3.79/cut.
  - 45-4590: $0.0994/mm + $3.79/cut.
- **TNUTZ EX-1530 (80/20 compatible):** about $0.98/in with the cut included.
- **Steel tube (Metals Depot, A500, 24 ft lengths):**
  - 3×2×0.120: $9.12/ft.
  - 4×2×0.120: $11.54/ft.
  - 4×2×3/16: $15.45/ft.

## Motion
- **Genuine HIWIN rails (Motion Constrained):** HGR20 1000 mm $107.63; HGR15 1000 mm $98.70; MGNR12 995 mm $146.60; MGNR15 1020 mm $164.44.
- **Genuine HIWIN blocks (Motion Constrained):** HGH20CA $44.90; HGH15CA $34.97; HGW20CC $57.23; MGN12H $31.61; MGN15H $34.33.
- **Chinese rail sets (Amazon):** 2× HGR20 1 m + 4 blocks $53–80; 2× HGR15 500 mm + 4 blocks $48.99.
- **Ball-screw kits, 1000 mm (Amazon):**
  - SFU1605 with BK/BF12 and housing: $62–65.
  - SFU1610 C7 kit: $115.
  - SFU2005 C7 kit: $130.
- **Belt (V1E):** GT2 6 mm $1.49/m; GT2 10 mm $1.95/m.

## Spindles and controllers
- **Spindles and mounts:**
  - Makita RT0701C: $159 (ASIN needs verifying).
  - 2.2 kW 80 mm water-cooled spindle + VFD: $295–390.
  - 1.5 kW 65 mm air-cooled spindle + VFD: $269–310.
  - 80 mm spindle clamp: $20–42.
- **Controllers:**
  - Elecrow FluidNC 6x: $139.90.
  - Jackpot3: $75.99.
  - Masso G3: $879.
  - grbl CNC shield: $11.99.
  - BlackBox: $219.99, unavailable.

## Hardware and sheet goods
- **Brackets and plates:**
  - 80/20 4334 / 40-4334 gusset: $11.23.
  - 80/20 4340 tee plate: $14.03.
  - TNUTZ CB-015-C gusset: $5.15.
  - TNUTZ JP-015-T tee plate: $6.85.
- **T-nuts:**
  - TNUTZ ET-015 T-nut: $0.19 each.
  - 80/20 drop-in T-nut: $1.30 each.
  - 80/20 anchor fastener: $5.52–6.22.
- **Socket head cap screws (Bolt Depot, class 12.9, per 100):** M5×12 $8.15; M6×16 $10.95; M8×20 $20.76.
- **Other hardware:**
  - Flexible coupler: $6–8 each.
  - Drag chain: $13–16/m.
  - Inductive limit switch: $3.60–8 each.
- **Sheet goods (Lowe's):** ¾" MDF 4×8 $50.98; ¾" plywood $52–69.

## Reference machines (for the build check)
- **PrintNC:**
  - Frame: 75×50 / 3×2" steel, about 2.5 mm wall.
  - Motion: 6× HGR20 rails with 1 HGW20CC block each; SFU1610 on X and Y.
  - Work area: about 1050×650×100 mm.
  - Cost: $1,500–3,000.
- **Shapeoko 5 Pro 4×4:**
  - Motion: HG15 rails on every axis; 1620 screws on X/Y, 1610 on Z.
  - Work area: 1237×1237×155 mm.
  - Price: $3,800.
- **LowRider 4:**
  - Frame and motion: EMT tube rails, GT2 10 mm belts, NEMA17 motors.
  - Work area: full 4×8 sheet.
  - Cost: about $650 plus a router.
- **Avid PRO4848:**
  - Frame and motion: 80×160 beam, 20 mm rails, rack and pinion.
  - Work area: 1260×1260×203 mm.
  - Price: $5,784 (N23 motors, router mount) to $9,279.
- **Milo v1.5:**
  - Frame and motion: V-slot extrusion, 15 mm rails, Tr8x8 lead screws, 1.5 kW spindle.
  - Work area: 340×160×120 mm.
  - Price: about $1,250–1,880.
- **OpenBuilds LEAD 1515:**
  - Frame and motion: C-beam and V-wheels, 8 mm lead screws.
  - Work area: 1170×1250×90 mm.
  - Price: $1,800–2,816.

## Second pass (read 2026-09-27)

8020.net, Bolt Depot, Amazon, Metals Depot, OnlineMetals and McMaster refused automated reads (HTTP 403/500, or a certificate the browser would not accept). Their items stay unpriced unless another source is listed here. Search-snippet prices for 8020.net were inconsistent and are **not** used.

### 6061-T651 plate (Speedy Metals, 12 × 12 in, saw cut)
- ¼" $52.92 · ⅜" $85.75 · ½" $107.78 · ⅝" $144.72 · ¾" $168.48 · 1" $211.68.
- That works out to about $33–36/kg. Larger pieces run cheaper; for example ½" 12 × 24 in is $161.68 ($25.38/kg).
- The BOM prices a design thickness as the next inch stock at least that thick, so 10 mm is bought as ½".
- Cutting is extra. SendCutSend publishes no example prices.

### Steel square tube (Speedy Metals, short lengths)
- 2 × 2 × 0.120 (11 ga): $8.88/ft.
- 3 × 3 × 0.188: $17.76/ft.

### HIWIN (Motion Constrained store)
- HGR25R 1000 mm $121.44 · HGR30R 1000 mm $158.05.
- HGH25CAZAC $57.45 · HGH30CAZAC $75.57. These are ZA preload; the model uses the Z0 stiffness, so it is conservative for these blocks.

### Drives
- SFU2010 1000 mm C7 kit with BK15/BF15 and nut housing: $99.00, FastToBuy.
- GT2 9 mm Gates LL-2GT-9 belt: $6.50/m, West3D.
- GT2 20T pulley $1.29 + idler $1.69, generic 5 mm bore: West3D.
- GT3 15 mm belt: $6.50/m, V-Belt Outlet, generic. No GT3 20T 15 mm pulley source was found.

### Fasteners (ASMC, class 12.9, per piece)
- M3×18 SHCS $0.0573 (100-piece minimum).
- M8×16 ISO 7380 button head $0.1822.
- M6×30 SHCS $0.1073.
- M8×50 SHCS $0.4523.
- Low confidence: M5×16 button, M4×22 and M5×22 SHCS all show an identical $0.648, which looks like a placeholder. Not used.

### Other
- M10 levelling foot, 60 mm base, 304 stainless: $8.81, WDS Components.
- 23HS22-2804S: $19.87, Oyostepper (StepperOnline's sister store).
- Mean Well LRS-350-24 $34.81 and LRS-350-48 $36.11, TRC Electronics. This replaces the unverified $20.51.
- 65 mm router clamp: $39.20, MakerMade (sale; list $49).
- Makita RT0701C: $159, Inventables (sold out when read).
