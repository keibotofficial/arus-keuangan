/* File export transport shared by the web app and the installed Android wrapper. */
(function(root){'use strict';
async function save(win,doc,name,data,mime){
 const blob=new win.Blob([data],{type:mime});
 const bridge=win.ArusNativeBridge;
 if(bridge&&typeof bridge.saveExportFile==='function'){
  const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';
  for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  // This exact three-argument interface already exists in the installed APK.
  // Native Android code reports the actual filesystem result with its own toast.
  bridge.saveExportFile('data:'+mime+';base64,'+win.btoa(binary),mime,name);
  return {route:'android',name,confirmed:false};
 }
 const url=win.URL.createObjectURL(blob),link=doc.createElement('a');
 link.href=url;link.download=name;link.style.display='none';
 try{doc.body.appendChild(link);link.click();}
 catch(error){win.URL.revokeObjectURL(url);throw error;}
 finally{link.remove();}
 // Keep the URL alive for browser downloads and any asynchronous WebView shim.
 win.setTimeout(()=>win.URL.revokeObjectURL(url),60000);
 return {route:'browser',name,confirmed:false};
}
const api={save};if(typeof module!=='undefined')module.exports=api;else root.ArusDownloads=api;
})(typeof window!=='undefined'?window:this);
