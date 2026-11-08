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
function filter(s,f={}){return s.transactions.filter(t=>Boolean(t.deleted)===Boolean(f.trash)&&(!f.start||t.date>=f.start)&&(!f.end||t.date<=f.end)&&(!f.type||t.type===f.type)&&(!f.wallet||t.walletId===f.wallet||t.toWalletId===f.wallet)&&(!f.category||t.categoryId===f.category)&&(!f.q||(t.description+' '+(t.note||'')).toLowerCase().includes(f.q.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));}
function mutate(s,action,p){
 const n=JSON.parse(JSON.stringify(s)); let label='';
 if(action==='saveTx'){const t={...p};validateTx(t,n);const i=n.transactions.findIndex(x=>x.id===t.id);if(i>=0&&n.transactions[i].deleted)throw Error('Pulihkan transaksi terlebih dahulu.');t.id=t.id||uid();t.description=t.description.trim();t.createdAt=i>=0?n.transactions[i].createdAt:new Date().toISOString();t.updatedAt=new Date().toISOString();t.deleted=false;if(i>=0)n.transactions[i]=t;else n.transactions.push(t);label=(i>=0?'Mengubah':'Menambah')+' transaksi: '+t.description;}
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
