var crypto={randomUUID:function(){return Utilities.getUuid();}};
var window=this;
(function(root){
'use strict';
const uid=()=>crypto.randomUUID();
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date());
const month=()=>today().slice(0,7);
const seed=()=>({revision:0,transactions:[],wallets:[{id:'cash',name:'Tunai',opening:0},{id:'bank',name:'Rekening Bank',opening:0},{id:'ewallet',name:'E-wallet',opening:0}],categories:[...['Gaji','Usaha','Bonus','Pemasukan lain'].map((name,i)=>({id:'in'+i,name,type:'income'})),...['Makan & Minum','Belanja','Transportasi','Tagihan','Kesehatan','Hiburan','Pendidikan','Pengeluaran lain'].map((name,i)=>({id:'out'+i,name,type:'expense'}))],budgets:[],bills:[],history:[]});
function validDate(d){return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
function validAmount(n,zero=false){return Number.isSafeInteger(n)&&n>=(zero?0:1)&&n<=1000000000000;}
function validateTx(t,s){
 if(!['income','expense','transfer'].includes(t.type))throw Error('Jenis transaksi tidak valid.');
 if(!validDate(t.date))throw Error('Tanggal tidak valid.');
 if(!validAmount(t.amount))throw Error('Nominal harus bulat antara Rp1 dan Rp1 triliun.');
 if(!s.wallets.some(w=>w.id===t.walletId))throw Error('Dompet tidak ditemukan.');
 if(t.type==='transfer'){if(t.toWalletId===t.walletId||!s.wallets.some(w=>w.id===t.toWalletId))throw Error('Pilih dompet tujuan yang berbeda.');}
 else if(!s.categories.some(c=>c.id===t.categoryId&&c.type===t.type))throw Error('Kategori tidak sesuai jenis transaksi.');
 if(typeof t.description!=='string'||!t.description.trim()||t.description.length>200)throw Error('Isi deskripsi maksimal 200 karakter.');
 if(t.note&&String(t.note).length>1000)throw Error('Catatan maksimal 1.000 karakter.');
 if(t.receipt&&!/^https:\/\/[^\s]+$/.test(t.receipt))throw Error('Tautan bukti harus berupa URL HTTPS.');
}
function balances(s,until='9999-12-31'){const out=Object.fromEntries(s.wallets.map(w=>[w.id,Number(w.opening)]));for(const t of s.transactions.filter(t=>!t.deleted&&t.date<=until)){out[t.walletId]+=(t.type==='income'?1:-1)*t.amount;if(t.type==='transfer')out[t.toWalletId]+=t.amount;}return out;}
function summary(txs){return txs.filter(t=>!t.deleted).reduce((a,t)=>{if(t.type==='income')a.income+=t.amount;if(t.type==='expense')a.expense+=t.amount;a.net=a.income-a.expense;return a;},{income:0,expense:0,net:0});}
function filter(s,f={}){return s.transactions.filter(t=>Boolean(t.deleted)===Boolean(f.trash)&&(!f.start||t.date>=f.start)&&(!f.end||t.date<=f.end)&&(!f.type||t.type===f.type)&&(!f.wallet||t.walletId===f.wallet||(t.type==='transfer'&&t.toWalletId===f.wallet))&&(!f.category||t.categoryId===f.category)&&(!f.q||(t.description+' '+(t.note||'')).toLowerCase().includes(f.q.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));}
function mutate(s,action,p){
 const n=JSON.parse(JSON.stringify(s)); let label='';
 if(action==='saveTx'){const t={...p};if(t.type!=='transfer')delete t.toWalletId;else delete t.categoryId;validateTx(t,n);const i=n.transactions.findIndex(x=>x.id===t.id);if(i>=0&&n.transactions[i].deleted)throw Error('Pulihkan transaksi terlebih dahulu.');t.id=t.id||uid();t.description=t.description.trim();t.createdAt=i>=0?n.transactions[i].createdAt:new Date().toISOString();t.updatedAt=new Date().toISOString();t.deleted=false;if(i>=0)n.transactions[i]=t;else n.transactions.push(t);label=(i>=0?'Mengubah':'Menambah')+' transaksi: '+t.description;}
 else if(action==='trashTx'||action==='restoreTx'){const t=n.transactions.find(t=>t.id===p.id);if(!t)throw Error('Transaksi tidak ditemukan.');t.deleted=action==='trashTx';label=(t.deleted?'Memindahkan ke sampah: ':'Memulihkan: ')+t.description;}
 else if(action==='saveWallet'){if(!p.name?.trim()||p.name.length>60||!validAmount(p.opening,true))throw Error('Nama dompet dan saldo awal tidak valid.');const i=n.wallets.findIndex(w=>w.id===p.id);if(n.wallets.some(w=>w.id!==p.id&&w.name.toLowerCase()===p.name.trim().toLowerCase()))throw Error('Nama dompet sudah digunakan.');const w={id:p.id||uid(),name:p.name.trim(),opening:p.opening};if(i>=0)n.wallets[i]=w;else n.wallets.push(w);label='Menyimpan dompet: '+w.name;}
 else if(action==='saveCategory'){if(!p.name?.trim()||p.name.length>60||!['income','expense'].includes(p.type))throw Error('Kategori tidak valid.');if(n.categories.some(c=>c.type===p.type&&c.name.toLowerCase()===p.name.trim().toLowerCase()))throw Error('Kategori sudah ada.');n.categories.push({id:uid(),name:p.name.trim(),type:p.type});label='Menambah kategori: '+p.name;}
 else if(action==='saveBudget'){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month)||!validAmount(p.amount)||!n.categories.some(c=>c.id===p.categoryId&&c.type==='expense'))throw Error('Anggaran tidak valid.');const old=n.budgets.find(b=>b.month===p.month&&b.categoryId===p.categoryId);if(old)old.amount=p.amount;else n.budgets.push({id:uid(),month:p.month,categoryId:p.categoryId,amount:p.amount});label='Menyimpan anggaran '+p.month;}
 else if(action==='deleteBudget'){n.budgets=n.budgets.filter(b=>b.id!==p.id);label='Menghapus anggaran';}
 else if(action==='saveBill'){if(!p.name?.trim()||p.name.length>100||!validAmount(p.amount)||!Number.isInteger(p.day)||p.day<1||p.day>31||!n.wallets.some(w=>w.id===p.walletId)||!n.categories.some(c=>c.id===p.categoryId&&c.type==='expense'))throw Error('Data tagihan tidak valid.');n.bills.push({id:uid(),name:p.name.trim(),amount:p.amount,day:p.day,walletId:p.walletId,categoryId:p.categoryId});label='Menambah tagihan: '+p.name;}
 else if(action==='deleteBill'){n.bills=n.bills.filter(b=>b.id!==p.id);label='Menghapus pengingat tagihan';}
 else if(action==='payBill'){const b=n.bills.find(b=>b.id===p.id);if(!b||!/^\d{4}-(0[1-9]|1[0-2])$/.test(p.month))throw Error('Tagihan tidak valid.');if(n.transactions.some(t=>!t.deleted&&t.billId===b.id&&t.billMonth===p.month))throw Error('Tagihan bulan ini sudah dicatat.');const last=new Date(Number(p.month.slice(0,4)),Number(p.month.slice(5)),0).getDate();const t={id:uid(),type:'expense',description:b.name,date:p.month+'-'+String(Math.min(last,b.day)).padStart(2,'0'),amount:b.amount,walletId:b.walletId,categoryId:b.categoryId,note:'Tagihan bulanan',billId:b.id,billMonth:p.month,deleted:false,createdAt:new Date().toISOString()};validateTx(t,n);n.transactions.push(t);label='Mencatat pembayaran: '+b.name;}
 else throw Error('Aksi tidak dikenal.');
 n.revision++;n.history.unshift({id:uid(),at:new Date().toISOString(),label});n.history=n.history.slice(0,1000);return n;
}
function demo(){let s=seed();s.wallets[0].opening=500000;s.wallets[1].opening=2400000;const m=month();for(const t of [ ['income',6500000,'Gaji bulan ini','bank','in0',1],['expense',425000,'Belanja kebutuhan rumah','bank','out1',2],['expense',85000,'Makan bersama keluarga','cash','out0',3],['expense',175000,'Internet bulanan','bank','out3',4],['income',1250000,'Pembayaran proyek desain','bank','in1',5],['expense',65000,'Bensin & parkir','cash','out2',6]]){s=mutate(s,'saveTx',{type:t[0],amount:t[1],description:t[2],walletId:t[3],categoryId:t[4],date:m+'-'+String(t[5]).padStart(2,'0')});}s=mutate(s,'saveBudget',{month:m,categoryId:'out0',amount:1500000});s=mutate(s,'saveBudget',{month:m,categoryId:'out1',amount:1000000});return s;}
function csv(rows){return '\ufeff'+rows.map(r=>r.map(v=>{let x=String(v??'');if(/^[=+\-@\t\r]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
const api={seed,today,month,uid,validDate,validAmount,validateTx,balances,summary,filter,mutate,demo,csv};if(typeof module!=='undefined')module.exports=api;else root.Finance=api;
})(typeof window!=='undefined'?window:this);

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
