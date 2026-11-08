// Arus backend — Google Apps Script V8. Gabungkan dengan core.js menggunakan build.py.
function props_(){return PropertiesService.getScriptProperties();}
function hash_(s){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8).map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
function db_(){var id=props_().getProperty('SPREADSHEET_ID');if(!id)throw Error('Jalankan setup terlebih dahulu.');return SpreadsheetApp.openById(id);}
function setup(){
 var p=props_(),db;if(p.getProperty('SPREADSHEET_ID'))db=db_();else {db=SpreadsheetApp.getActiveSpreadsheet();if(!db)db=SpreadsheetApp.create('Arus — Database Keuangan');p.setProperty('SPREADSHEET_ID',db.getId());}
 if(!db.getSheetByName('_Journal')){var sh=db.insertSheet('_Journal');sh.getRange(1,1,1,4).setValues([['Revision','Part','Payload','Request ID']]);save_(db,Finance.seed(),'setup');}
 if(!p.getProperty('ACCESS_HASH')){var secret=Utilities.getUuid()+Utilities.getUuid();p.setProperty('ACCESS_HASH',hash_(secret));p.setProperty('SESSION_EPOCH',Utilities.getUuid());console.log('KUNCI AKSES PRIBADI (simpan sendiri, jangan unggah ke GitHub): '+secret);}
 project_(db,read_(db));console.log('DATABASE: '+db.getUrl());console.log('Setup selesai. Deploy sebagai Web App (execute as Me; access Anyone).');
}
function read_(db){
 var sh=db.getSheetByName('_Journal');if(!sh||sh.getLastRow()<2)throw Error('Database belum diinisialisasi.');
 var last=sh.getLastRow();var marker=sh.getRange(last,1,1,4).getValues()[0];
 if(marker[1]!=='COMMIT')throw Error('Jurnal belum lengkap. Hubungi pemilik database; jangan menimpa data.');
 var info=JSON.parse(marker[2]),start=last-info.parts;
 if(start<2)throw Error('Jurnal tidak valid.');
 var chunks=sh.getRange(start,1,info.parts,4).getValues();var text='';
 chunks.forEach(function(row,i){if(row[0]!==marker[0]||row[1]!==i)throw Error('Urutan jurnal tidak valid.');text+=row[2];});
 if(hash_(text)!==info.hash)throw Error('Integritas database gagal. Hubungi pemilik database.');return JSON.parse(text);
}
function save_(db,s,requestId){
 var sh=db.getSheetByName('_Journal'),text=JSON.stringify(s),parts=[];
 if(text.length>3000000)throw Error('Database mencapai batas aplikasi. Ekspor cadangan dan arsipkan data melalui administrator.');
 for(var i=0;i<text.length;i+=35000)parts.push([s.revision,parts.length,text.slice(i,i+35000),requestId]);
 var count=parts.length;parts.push([s.revision,'COMMIT',JSON.stringify({parts:count,hash:hash_(text)}),requestId]);
 var start=sh.getLastRow()+1,needed=start+parts.length-1;if(needed>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),needed-sh.getMaxRows());
 sh.getRange(start,1,parts.length,4).setValues(parts);SpreadsheetApp.flush();
}
function safe_(v){if(typeof v==='string'&&/^[=+\-@\t\r]/.test(v))return "'"+v;return v==null?'':v;}
function writeView_(db,name,headers,rows){var sh=db.getSheetByName(name)||db.insertSheet(name);var all=[headers].concat(rows.map(function(r){return r.map(safe_);}));if(all.length>sh.getMaxRows())sh.insertRowsAfter(sh.getMaxRows(),all.length-sh.getMaxRows());if(headers.length>sh.getMaxColumns())sh.insertColumnsAfter(sh.getMaxColumns(),headers.length-sh.getMaxColumns());sh.clearContents();sh.getRange(1,1,all.length,headers.length).setValues(all);sh.getRange(1,1,1,headers.length).setBackground('#eeeeee').setFontWeight('bold');sh.setFrozenRows(1);sh.setColumnWidths(1,headers.length,155);sh.getRange(1,1,Math.max(2,all.length),headers.length).setFontFamily('Arial').setFontSize(10);}
function project_(db,s){
 var wn=function(id){var w=s.wallets.find(function(w){return w.id===id;});return w?w.name:'';};var cn=function(id){var c=s.categories.find(function(c){return c.id===id;});return c?c.name:'';};
 writeView_(db,'Transaksi',['ID','Tanggal','Jenis','Deskripsi','Nominal IDR','Dompet','Tujuan','Kategori','Catatan','Bukti HTTPS','Dihapus'],s.transactions.map(function(t){return [t.id,t.date,t.type,t.description,t.amount,wn(t.walletId),wn(t.toWalletId),cn(t.categoryId),t.note,t.receipt,t.deleted?'YA':''];}));
 writeView_(db,'Dompet',['ID','Nama','Saldo awal IDR'],s.wallets.map(function(w){return [w.id,w.name,w.opening];}));
 writeView_(db,'Kategori',['ID','Nama','Jenis'],s.categories.map(function(c){return [c.id,c.name,c.type];}));
 writeView_(db,'Anggaran',['ID','Bulan','Kategori','Batas IDR'],s.budgets.map(function(b){return [b.id,b.month,cn(b.categoryId),b.amount];}));
 writeView_(db,'Tagihan',['ID','Nama','Nominal IDR','Tanggal jatuh tempo','Dompet','Kategori'],s.bills.map(function(b){return [b.id,b.name,b.amount,b.day,wn(b.walletId),cn(b.categoryId)];}));
 writeView_(db,'Riwayat',['ID','Waktu UTC','Aktivitas'],s.history.map(function(h){return [h.id,h.at,h.label];}));
}
function refreshViews(){project_(db_(),read_(db_()));}
function doGet(){return json_({ok:true,app:'Arus',version:'1.0',message:'Gunakan aplikasi Arus untuk masuk. Data keuangan memerlukan autentikasi.'});}
function doPost(e){
 var lock=LockService.getScriptLock();try{
 if(!e||!e.postData||e.postData.contents.length>20000)return json_({ok:false,error:'Permintaan tidak valid.'});
 var r=JSON.parse(e.postData.contents),p=props_(),cache=CacheService.getScriptCache();
 if(r.action==='login'){
  if(!p.getProperty('ACCESS_HASH'))return json_({ok:false,error:'Backend belum diatur. Jalankan setup.'});
  var key=hash_(String(r.password||'')),rateKey='attempt:'+key.slice(0,20),attempts=Number(cache.get(rateKey)||0);
  if(attempts>=5)return json_({ok:false,error:'Terlalu banyak percobaan. Tunggu 10 menit.'});
  if(key!==p.getProperty('ACCESS_HASH')){cache.put(rateKey,String(attempts+1),600);return json_({ok:false,error:'Kunci akses salah.'});}
  var token=Utilities.getUuid()+Utilities.getUuid();cache.put('session:'+hash_(token),p.getProperty('SESSION_EPOCH'),21600);
  lock.waitLock(25000);return json_({ok:true,token:token,state:read_(db_())});
 }
 if(!r.token||cache.get('session:'+hash_(r.token))!==p.getProperty('SESSION_EPOCH'))return json_({ok:false,code:'AUTH',error:'Sesi berakhir. Silakan masuk kembali.'});
 lock.waitLock(25000);var db=db_(),s=read_(db);
 if(r.action==='read')return json_({ok:true,state:s});
 if(!r.requestId||!/^[a-zA-Z0-9-]{16,80}$/.test(r.requestId))return json_({ok:false,error:'ID permintaan tidak valid.'});
 var sh=db.getSheetByName('_Journal'),rows=Math.min(1000,sh.getLastRow()-1),recent=sh.getRange(sh.getLastRow()-rows+1,4,rows,1).getValues();
 if(recent.some(function(row){return row[0]===r.requestId;}))return json_({ok:true,state:s,duplicate:true});
 if(r.revision!==s.revision)return json_({ok:false,code:'CONFLICT',error:'Data berubah di tab lain. Data terbaru telah dimuat; periksa sebelum menyimpan kembali.',state:s});
 var next=Finance.mutate(s,r.action,r.payload||{});save_(db,next,r.requestId);
 try{project_(db,next);}catch(projectionError){console.error('Tampilan sheet belum diperbarui. Jalankan refreshViews.');}
 return json_({ok:true,state:next});
 }catch(err){return json_({ok:false,error:err.message||'Permintaan gagal.'});}finally{if(lock.hasLock())lock.releaseLock();}
}
