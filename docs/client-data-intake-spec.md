# Client-Side Data Intake Module

## Overview
Provide a guided, client-facing workflow that captures all onboarding data required to enable billing features. Both store users and admins must be able to launch the intake wizard immediately after authentication. Completion state gates the rest of the POS to prevent half-configured deployments.

## Access & Roles
- **User login (store operators):**
  - Redirect to intake wizard until required data is completed for their store.
  - Can create and update their store's submission; cannot view other stores.
- **Admin login:**
  - Access to the wizard plus an overview dashboard showing completion status for every store.
  - Can edit submissions, mark them as approved, or reopen for revisions.

## Functional Requirements
1. **Wizard Entry Point**
   - After login, query `clientData.status`.
   - If status !== `complete`, show blocking modal/page with progress indicators.
   - Provide "Continue later" (saves draft) but keep warning ribbon in POS until completion.

2. **Steps & Inputs**
   1. **Business Profile**
      - Store name (text)
      - Store address (multi-line)
      - GST / Tax ID (text)
      - Primary contact name (text)
      - Contact phone (phone number)
      - Contact email (email)
   2. **Tax & Pricing Configuration**
      - Default currency (dropdown, prefilled with INR)
      - Tax regime selector (GST slabs, VAT, No Tax)
      - Rounding preference (nearest ₹1 / ₹0.50 / none)
      - File upload (PDF/image) for **applicable tax details** when tax regime ≠ "No Tax".
   3. **Item Master Upload**
      - Download link to CSV template.
      - Upload control for **Final Item Master / SKU list with prices** (CSV/XLSX).
      - Inline grid to preview parsed rows and flag validation errors (missing SKU, non-numeric price, invalid tax slab).
      - Optional inline add/edit for quick fixes.
   4. **Receipt Samples** (optional but encouraged)
      - Upload control for sample printed or thermal bill (PDF/image).
      - Toggle "Use system default" if no sample provided.
   5. **Review & Submit**
      - Summary card listing uploaded artifacts, counts, validation status (Pass/Needs Attention).
      - Checkbox "I confirm the above data is final" (required before submit).
      - Submit button finalizes intake and flips status to `pending-approval` (admin review) or `complete` (auto-approval) depending on deployment policy.

3. **Backend & Persistence**
   - Create `ClientData` collection/table storing structured JSON plus file metadata.
   - Support autosave (PATCH per step) with `lastUpdatedBy` and version history.
   - File uploads go to existing storage bucket; keep references in `ClientData.files` array with type tags (`SKU_LIST`, `TAX_PROOF`, `BILL_SAMPLE`).
   - Add admin API endpoints to fetch submission lists, approve/reopen submissions, and download artifacts.

4. **Gating Logic**
   - POS routes check `clientData.status` to ensure `complete` before enabling billing/voice flows.
   - Show banner in POS if intake incomplete, linking back to wizard.
   - Admin dashboard highlights stores with missing mandatory assets.

## Mandatory Client Inputs
1. **Final Item Master / SKU list with prices** (CSV/XLSX upload).
2. **Applicable tax details** (structured form + supporting document if taxes apply).
3. **Business profile basics** (store identity and contact info).
4. **Sample printed bill format** (optional but requested; wizard allows upload or opt-out toggle).

## Non-Functional Notes
- Ensure uploads support at least 10 MB and common formats (CSV, XLSX, PDF, PNG, JPG).
- Provide multilingual labels (English/Tamil) following existing language context.
- Audit trail for admins: record who submitted/approved with timestamps.
- Include validation messaging and save-state indicators per step.
