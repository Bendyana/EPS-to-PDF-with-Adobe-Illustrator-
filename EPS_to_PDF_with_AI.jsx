#target illustrator
function main(args) {
  var OVERWRITE = true;           // set false to skip existing PDFs
  var ARCHIVE   = "_archive";     // where EPS originals go

  try { app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS; } catch(e) {}

  function isEPS(p){ return /\.(eps|epsf)$/i.test(p||""); }
  function savePDF(doc, outPath){
    var o = new PDFSaveOptions();
    o.preserveEditability = true;                 // <-- the key
    o.compatibility = PDFCompatibility.ACROBAT8;  // PDF 1.7
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

  alert("EPS→PDF done.\nOK: " + ok + "  Skipped: " + skip + "  Failed: " + fail);
}
main(arguments);   // <-- critical: pass AppleScript args into a function