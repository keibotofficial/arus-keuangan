from pathlib import Path
p=Path(__file__).parent
core=(p/'core.js').read_text()
html=(p/'index.html').read_text()
if '/* FINANCE_CORE */' in html:html=html.replace('/* FINANCE_CORE */',core)
else:
 start=html.index('<script>')+len('<script>');end=html.index('</script>',start);html=html[:start]+'\n'+core+'\n'+html[end:]
if '/* Minimal OOXML workbook writer.' in html:
 start=html.index('/* Minimal OOXML workbook writer.');end=html.index('const F=Finance,',start);html=html[:start]+(p/'excel.js').read_text()+'\n'+html[end:]
if '/* File export transport shared' in html:
 start=html.index('/* File export transport shared');end=html.index('async function download(name',start);html=html[:start]+(p/'file-download.js').read_text()+'\n'+html[end:]
(p/'index.html').write_text(html)
backend='var crypto={randomUUID:function(){return Utilities.getUuid();}};\nvar window=this;\n'+core+'\n'+(p/'backend/server.js').read_text()
(p/'backend/Code.gs').write_text(backend)
print('Built index.html and backend/Code.gs')
