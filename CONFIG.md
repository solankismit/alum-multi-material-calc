# Window Configuration Derivations

This document serves as the mathematical guide for retrieving configuration values for **Openable Windows** to plug into the Admin UI without reading any code.

Because different profiles (e.g., standard vs heavy or varying mullion sizes) modify the geometric overlap of the shutters, it's safer to reverse-engineer the required configuration deductions using simple algebra rather than measuring the physical aluminum track.

---

## 1. How to Find `Outer Frame Width` and `Mullion Width` Deductions
The calculation engine uses the universal equation:
`Shutter Width = (Total Window Width - OuterFrameDeduction - TotalMullionDeduction) / N`

Therefore, Total Width Deduction is represented as:
`Total Deduction = Outer Frame (F) + [ (N - 1) × Mullion (M) ]`

### Step 1: Find the "Total Deduction" for two different sizes
Ask your supplier or measure a known 3-section window and a 2-section window of the same profile series. 

**Example Calculation (3 Sections):**
- Total window width = `60"`
- Shutter width = `18.375"`
- Total space taken by the 3 shutters = `3 × 18.375" = 55.125"`
- **Total Deduction** = `60" - 55.125" = 4.875"`
- *We know a 3-section window has 1 outer frame (F) and 2 mullions (M).*
- **Equation 1:** `F + 2M = 4.875"`

**Example Calculation (2 Sections):**
- Total window width = `36.375"`
- Shutter width = `16.5"`
- Total space taken by the 2 shutters = `2 × 16.5" = 33"`
- **Total Deduction** = `36.375" - 33" = 3.375"`
- *We know a 2-section window has 1 outer frame (F) and 1 mullion (M).*
- **Equation 2:** `F + 1M = 3.375"`

### Step 2: Solve for `F` and `M`
Subtract Equation 2 from Equation 1 to isolate the Mullion (M) deduction:
- `(F + 2M) - (F + 1M) = 4.875" - 3.375"`
- **`M = 1.5"`** *(The Mullion Width Deduction)*

Now plug `M` back into Equation 2 to find the Outer Frame (F) deduction:
- `F + 1.5" = 3.375"` 
- **`F = 1.875"`** *(The Outer Frame Width Deduction)*

*(To enter these into the UI, always convert them to **mm** by multiplying by `25.4`!)*

---

## 2. Does Mullion Width Deduction (M) equal the physical size of the Mullion?
**No.** The structural/physical width of the mullion (e.g., `72mm`) is rarely the mathematical `M` deduction you enter into the system.

**The Relationship:**
`M = Physical Mullion Width - (2 × Overlap)`
*(Overlap meaning how deep the shutter inserts/overlaps both the left and right grooves of that mullion).*

If you swap a `40mm` mullion for a `72mm` Big Mullion, and the frame grooves are functionally identical, then `M` will increase proportionally. **However**, "Big" mullions typically have much deeper grooves to hold heavier shutters. If the deep grooves swallow more of the shutter, the mathematical gap (`M`) might actually *shrink*.

**Always use the 2-equation algebra method above to derive `M`**, rather than guessing based on the physical ruler-measured width of the mullion.

---

## 3. Finding Heights and Glass Deductions
Heights and Glass calculations do not scale via the number of sections (`N`), making them incredibly simple.

Find the difference between the outer layer and inner layer:
- **Outer Frame Height Deduction:** Total Height - Shutter Height
 *(e.g., `50.5" - 48.25" = 2.25"`)*
- **Mullion Length Deduction:** Total Window Height - Mullion Length 
 *(e.g., `50.5" - 48" = 2.5"`)*
- **Glass Width/Height Deduction:** Shutter Size - Glass Size 
 *(e.g., `18.375" - 15.25" = 3.125"`)*
