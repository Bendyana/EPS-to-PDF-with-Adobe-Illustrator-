[README.md](https://github.com/user-attachments/files/21725307/README.md)
# Convert EPS → PDF (AI‑editable) — Finder Quick Action (macOS)

A right‑click **Quick Action** for macOS Finder that batch‑converts selected **.eps / .epsf** files to **PDF with “Preserve Illustrator Editing Capabilities”** using Adobe Illustrator. The action also moves the original EPS files into an `_archive/` folder next to each converted file. Non‑EPS files in your selection are ignored, so you can lasso a whole folder and run it.

**Tested:** macOS 15.5 (24F74), Adobe Illustrator 2025.  
**Why this works:** the JSX uses the correct pattern `main(arguments)` so AppleScript‑passed arguments survive the hop into Illustrator.

---

## Features
- Right‑click in Finder → **Quick Actions → Convert EPS → PDF (AI)**
- Produces **PDFs that preview in Finder** and reopen cleanly in Illustrator
- Archives originals to `_archive/`
- Safe to run on mixed selections (only processes EPS/EPSF)
- Fast after the first Illustrator launch

---

## Requirements
- macOS with **Shortcuts** (or Automator; steps below use Shortcuts)
- **Adobe Illustrator** (tested with 2025; adjust app name below if yours differs)
- Write access to your user Library folder

---

## 1) Save the Illustrator script (JSX)

Create the folder if needed and save this file as:

```
~/Library/Scripts/Illustrator/EPS_to_PDF_with_AI.jsx
```

**EPS_to_PDF_with_AI.jsx**
```javascript
#target illustrator
function main(args) {
  var OVERWRITE = true;           // set false to skip existing PDFs
  var ARCHIVE   = "_archive";     // where EPS originals go

  try { app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS; } catch(e) {}

  function isEPS(p){ return /\.(eps|epsf)$/i.test(p||""); }
  function savePDF(doc, outPath){
    var o = new PDFSaveOptions();
    o.preserveEditability = true;                 // <-- key: AI‑editable PDF
    o.compatibility = PDFCompatibility.ACROBAT8;  // PDF 1.7 (macOS-friendly)
    o.generateThumbnails = true;
    o.viewAfterSaving = false;
    try { o.preserveSpotColors = true; } catch(e){}
    doc.saveAs(new File(outPath), o);
  }

  var ok=0, skip=0, fail=0;
  for (var i=0; i<args.length; i++) {
    var p = String(args[i]||"").replace(/\s+$/,"");
    if (!isEPS(p)) continue;

    var src = new File(p);
    if (!src.exists) { fail++; continue; }

    var base = src.name.replace(/\.(eps|epsf)$/i,"");
    var pdf  = new File(src.parent.fsName + "/" + base + ".pdf");
    if (pdf.exists && !OVERWRITE) { skip++; continue; }

    try {
      var doc = app.open(src);
      savePDF(doc, pdf);
      doc.close(SaveOptions.DONOTSAVECHANGES);

      var arch = new Folder(src.parent.fsName + "/" + ARCHIVE);
      if (!arch.exists) arch.create();
      var dest = new File(arch.fsName + "/" + src.name);
      if (dest.exists) try { dest.remove(); } catch(e){}
      src.copy(dest.fsName);
      try { src.remove(); } catch(e){}
      ok++;
    } catch(e) {
      fail++;
      try { if (app.documents.length) app.activeDocument.close(SaveOptions.DONOTSAVECHANGES); } catch(_){}
    }
  }

  alert("EPS→PDF done.\\nOK: " + ok + "  Skipped: " + skip + "  Failed: " + fail);
}
main(arguments);   // <-- critical: pass AppleScript args into a function
```

---

## 2) Create the Finder Quick Action (Shortcuts)

1. Open **Shortcuts** → **New Shortcut** → name it: `Convert EPS → PDF (AI)`.
2. Click **Details (ⓘ)** → enable **Use as Quick Action** → check **Finder** and **Services Menu**.
3. Add one action: **Run AppleScript**. Paste this:

```applescript
on run {input, parameters}
  -- Collect POSIX paths from Finder selection
  set paths to {}
  repeat with f in input
    try
      set end of paths to POSIX path of f
    end try
  end repeat
  if (count of paths) = 0 then return input

  -- Load JSX source
  set jsPOSIX to (POSIX path of (path to library folder from user domain)) & "Scripts/Illustrator/EPS_to_PDF_with_AI.jsx"
  set jsText to do shell script "cat " & quoted form of jsPOSIX

  -- Run Illustrator with the file list as arguments
  tell application "Adobe Illustrator 2025"
    activate
    do javascript jsText with arguments paths
  end tell
  return input
end run
```

> **If your app name differs** (e.g., just “Adobe Illustrator”), change it in the `tell application` line.

---

## 3) Use it

- In Finder, select any files (EPS and non‑EPS mixed is fine).  
- Right‑click → **Quick Actions → Convert EPS → PDF (AI)**.  
- You’ll get `name.pdf` next to each EPS and an `_archive/` folder holding the originals.

Optional: assign a keyboard shortcut in Shortcuts (Details → **Add Keyboard Shortcut**).

---

## Customization

Edit the JSX file:
- **Skip overwriting existing PDFs**  
  ```javascript
  var OVERWRITE = false;
  ```
- **Change archive folder name**  
  ```javascript
  var ARCHIVE = "_archive_done";
  ```
- **Delete EPS instead of archiving** (not recommended; remove with caution)  
  Replace the copy/remove block with just:
  ```javascript
  try { src.remove(); } catch(e){}
  ```
- **Silence the summary popup**  
  Comment out the last `alert(...)` line.

---

## Optional: Toolbar button version

Duplicate the Shortcut and replace its action with this AppleScript that grabs the **current Finder selection** (handy for a Finder toolbar button). Then add the shortcut‑app to the Finder toolbar via **View → Customize Toolbar…** (drag from `~/Applications/`).

```applescript
on run {input, parameters}
  tell application "Finder" to set sel to selection as alias list
  if (count of sel) = 0 then return input

  set paths to {}
  repeat with a in sel
    try
      set end of paths to POSIX path of a
    end try
  end repeat

  set jsPOSIX to (POSIX path of (path to library folder from user domain)) & "Scripts/Illustrator/EPS_to_PDF_with_AI.jsx"
  set jsText to do shell script "cat " & quoted form of jsPOSIX

  tell application "Adobe Illustrator 2025"
    activate
    do javascript jsText with arguments paths
  end tell
  return input
end run
```

---

## Troubleshooting

- **Nothing happens / OK: 0**  
  Ensure the Shortcut **receives input from Finder** (Details → Use as Quick Action → Finder). Make sure you saved the JSX at the exact path shown above.

- **“Couldn’t communicate with a helper application”**  
  That’s macOS Apple Events being grumpy. Usually fixed after the first permission prompt from Shortcuts → Illustrator. If needed, run this once in Terminal to reset the permission cache and try again:  
  ```bash
  tccutil reset AppleEvents com.apple.shortcuts
  ```

- **App name mismatch**  
  If your Illustrator is named differently in `/Applications`, change the `tell application "Adobe Illustrator 2025"` line to match.

- **Why the function wrapper?**  
  Illustrator reliably receives AppleScript arguments when you pass them into a function (`main(arguments)`); using `arguments` at global scope can yield zero args in some builds.

---

## Uninstall

- Delete the Shortcut in **Shortcuts**.  
- Remove the JSX: `~/Library/Scripts/Illustrator/EPS_to_PDF_with_AI.jsx`.  
- Optionally delete any `_archive/` folders you don’t need.

---

## License

MIT License — do whatever you want, no warranty. Consider keeping attribution.

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## Credits

Thanks to the Illustrator scripting community for the `main(arguments)` pattern, and to everyone sick of EPS previews on modern macOS who needed a sane workaround.
