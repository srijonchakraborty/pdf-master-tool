# Publishing PDF Master Toolkit to the Microsoft Store

This guide details everything you need to know to publish your single-file **PDF Master Toolkit** application to the **Microsoft Store (Windows App Store)**.

---

## 1. Output Files & Formats

When you build the app, the output files are generated in `app/dist/`:

| File | Type | Store Compatibility | Description |
| :--- | :--- | :--- | :--- |
| **`pdf-toolkit-1.0.0.appx`** | **MSIX / AppX Package** | **Recommended (Native)** | Single-file modern package built specifically for Microsoft Store submission. No installer prompts, clean sandboxing, seamless store updates. |
| **`pdf-toolkit-1.0.0-setup.exe`** | **Win32 Setup Installer** | **Supported** | Single-file NSIS installer. Microsoft Store now allows Win32 `.exe` app submissions directly. |
| **`pdf-toolkit-1.0.0-portable.exe`** | **Portable Executable** | Direct Download | Single-file portable app that runs anywhere without installation. |

---

## 2. Quick Build Commands

Navigate to `pdf-toolkit-plan/app` in PowerShell/terminal:

```bash
# Build the single-file Microsoft Store package (.appx)
npm run build:store

# Sign the package locally with a self-signed certificate for local testing
npm run sign:local-appx

# Re-generate high-res AppX tile and logo assets if icon.png changes
npm run generate:appx-assets

# Build all Windows targets (.appx, .exe setup, portable .exe)
npm run build:win
```

---

## 3. Microsoft Store Publishing: Step-by-Step

### Step 1: Register as a Windows Developer
1. Go to [Microsoft Partner Center](https://partner.microsoft.com/dashboard).
2. Sign in with your Microsoft account and register as a Windows & Xbox developer (one-time developer account fee of ~$19 for individuals or ~$99 for companies).

### Step 2: Reserve Your App Name
1. In the Partner Center Dashboard, go to **Apps and games** -> **New product**.
2. Select **MSIX or PWA app** (or Win32 app if submitting `.exe`).
3. Enter your product name (e.g., `PDF Master Toolkit`) and click **Reserve product name**.

### Step 3: Link Your Package Identity
1. In your app dashboard on Partner Center, click **Product management** -> **Product Identity**.
2. You will see three key identity strings:
   - **Package/Identity/Name** (e.g., `12345YourName.PDFMasterToolkit`)
   - **Package/Identity/Publisher** (e.g., `CN=12345678-ABCD-EF01-2345-6789ABCDEF01`)
   - **Package/Properties/PublisherDisplayName** (e.g., `Your Publisher Name`)

3. Open `pdf-toolkit-plan/app/electron-builder.yml` and match these values under the `appx:` section:
   ```yaml
   appx:
     applicationId: PDFMasterToolkit
     identityName: <Paste Package/Identity/Name from Partner Center>
     publisher: <Paste Package/Identity/Publisher from Partner Center>
     publisherDisplayName: <Paste Package/Properties/PublisherDisplayName from Partner Center>
     displayName: PDF Master Toolkit
     artifactName: ${name}-${version}.${ext}
   ```

### Step 4: Build Your Production Package
Run:
```bash
npm run build:store
```
This generates your production-ready single file:
`pdf-toolkit-plan/app/dist/pdf-toolkit-1.0.0.appx`

> [!NOTE]
> **No Paid Code-Signing Certificate Needed for the Store!**
> When submitting to Microsoft Partner Center, Microsoft automatically signs your package with Microsoft's official trusted certificate when your submission is certified and published.

### Step 5: Submit to Microsoft Partner Center
1. In Partner Center, click **Start your submission**.
2. Fill in:
   - **Pricing and availability**: Set your price (Free or Paid) and target markets.
   - **Properties**: Category (e.g., *Productivity* or *Utilities & tools*).
   - **Age ratings**: Complete the short questionnaire.
   - **Packages**: Drag and drop `pdf-toolkit-1.0.0.appx` from `app/dist/`. Partner Center will validate the package manifest and assets.
   - **Store listings**: Add description, keywords, and screenshots.
3. Click **Submit to the Store**. Certification typically takes 24–48 hours.

---

## 4. Testing the AppX Package Locally Before Submitting

Because Store-targeted `.appx` packages are unsigned until Microsoft signs them on release, Windows will block local double-click installation by default.

To test the package on your local machine before uploading:

1. Enable Developer Mode in Windows:
   - Open Windows **Settings** -> **System** (or **Update & Security**) -> **For developers**.
   - Turn on **Developer Mode**.
2. Run the included helper script:
   ```bash
   npm run sign:local-appx
   ```
   This automatically creates a test certificate, registers it in your local `TrustedPeople` store, and signs `pdf-toolkit-1.0.0.appx`.
3. Double-click `pdf-toolkit-1.0.0.appx` to launch the Windows App Installer and install the app!

---

## 5. Alternative: Submitting as a Win32 (.exe) App

If you prefer to submit the standard Win32 installer instead of AppX:
1. In Microsoft Partner Center, click **New product** -> select **Win32 app (.exe or .msi)**.
2. Build the setup installer:
   ```bash
   npm run build:setup
   ```
3. Upload `dist/pdf-toolkit-1.0.0-setup.exe` or provide a direct download URL.
4. Partner Center will list your app in the Microsoft Store with one-click install using your setup installer.
