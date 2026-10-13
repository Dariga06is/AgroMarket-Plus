'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=__dirname, DATA=path.join(ROOT,'db.json'), PORT=Number(process.env.PORT||3001), sessions=new Map(), loginAttempts=new Map();
// Private server-side settings, never exposed as static web files.
const envPath=path.join(ROOT,'.env');
if(fs.existsSync(envPath))for(const line of fs.readFileSync(envPath,'utf8').split(/\r?\n/)){
 const match=line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
 if(!match||process.env[match[1]]!==undefined)continue;
 let value=match[2].trim();
 if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
 process.env[match[1]]=value;
}
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const read=()=>JSON.parse(fs.readFileSync(DATA,'utf8'));
function write(db){let tmp=DATA+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),'utf8');fs.renameSync(tmp,DATA)}
const id=()=>crypto.randomUUID(), safeUser=u=>u&&({id:u.id,name:u.name,email:u.email,role:u.role,phone:u.phone||'',address:u.address||'',telegramChatId:u.telegramChatId||''});
const hash=p=>{let salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(p,salt,64).toString('hex')};
const verify=(p,s)=>{try{const [salt,stored]=s.split(':'),expected=Buffer.from(stored,'hex'),actual=crypto.scryptSync(p,salt,expected.length);return crypto.timingSafeEqual(actual,expected)}catch{return false}};
const response=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))};
const err=(status,message)=>Object.assign(new Error(message),{status});
function session(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('agrosid='))?.slice(8);if(!token)return null;const s=sessions.get(token);if(!s)return null;if(s.expires<Date.now()){sessions.delete(token);return null}return {...s,token}}
function auth(req,db,roles=[]){const s=session(req),u=db.users.find(x=>x.id===s?.userId);if(!u)throw err(401,'Алдымен жүйеге кіріңіз');if(roles.length&&!roles.includes(u.role))throw err(403,'Рұқсат жоқ');return u}
function cookie(res,token,maxAge=86400){res.setHeader('Set-Cookie',`agrosid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.COOKIE_SECURE==='1'?'; Secure':''}`)}
function clean(s,n=120){return String(s??'').trim().slice(0,n)}
function validEmail(s){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)}
const statusNames={new:'Қабылданды',accepted:'Расталды',packing:'Дайындалуда',shipping:'Жолда',delivered:'Жеткізілді',cancelled:'Бас тартылды'};
const mailConfigured=()=>Boolean(process.env.GMAIL_USER&&process.env.GMAIL_APP_PASSWORD);
// Gmail SMTP over implicit TLS (465); no extra npm packages required.
function smtpReply(socket){return new Promise((resolve,reject)=>{
 let lines=[];const timer=setTimeout(()=>fail(Error('SMTP timeout')),15000);
 function cleanup(){clearTimeout(timer);socket.off('data',read);socket.off('error',fail);socket.off('close',closed)}
 function fail(e){cleanup();reject(e)}
 function closed(){fail(Error('SMTP connection closed'))}
 function read(data){socket._smtpBuffer=(socket._smtpBuffer||'')+data.toString('utf8');
  while(true){const end=socket._smtpBuffer.indexOf('\n');if(end<0)break;
   const line=socket._smtpBuffer.slice(0,end).replace(/\r$/,'');socket._smtpBuffer=socket._smtpBuffer.slice(end+1);
   lines.push(line);if(/^\d{3} /.test(line)){cleanup();resolve({code:Number(line.slice(0,3)),message:lines.join('\n')});return}
  }
 }
 socket.on('data',read);socket.once('error',fail);socket.once('close',closed);
 if(socket._smtpBuffer)read(Buffer.alloc(0));
})}
async function sendEmail(to,subject,html){
 if(!mailConfigured()||!validEmail(to))return false;
 const tls=require('node:tls'),from=process.env.GMAIL_USER.trim(),password=process.env.GMAIL_APP_PASSWORD.replace(/\s/g,'');
 if(!validEmail(from))throw Error('GMAIL_USER қате');
 const socket=tls.connect({host:'smtp.gmail.com',port:465,servername:'smtp.gmail.com',rejectUnauthorized:true});
 socket.setTimeout(25000,()=>socket.destroy(Error('SMTP timeout')));
 const greet=async()=>{await new Promise((resolve,reject)=>{if(socket.authorized)return resolve();socket.once('secureConnect',resolve);socket.once('error',reject)});};
 const expect=async(valid)=>{const r=await smtpReply(socket);if(!valid.includes(r.code))throw Error('Gmail SMTP '+r.message.slice(0,250));return r};
 const cmd=async(line,codes)=>{socket.write(line+'\r\n');return expect(codes)};
 const encode=s=>'=?UTF-8?B?'+Buffer.from(s,'utf8').toString('base64')+'?=';
 try{
  await greet();await expect([220]);await cmd('EHLO localhost',[250]);
  await cmd('AUTH PLAIN '+Buffer.from('\0'+from+'\0'+password).toString('base64'),[235]);
  await cmd('MAIL FROM:<'+from+'>',[250]);await cmd('RCPT TO:<'+to+'>',[250,251]);await cmd('DATA',[354]);
  const headers=['From: '+encode('AgroMarket')+' <'+from+'>','To: <'+to+'>','Subject: '+encode(subject),'Date: '+new Date().toUTCString(),'MIME-Version: 1.0','Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64'];
  const body=Buffer.from(html,'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n')||'';
  socket.write(headers.join('\r\n')+'\r\n\r\n'+body+'\r\n.\r\n');await expect([250]);
  await cmd('QUIT',[221]);return true;
 }finally{socket.destroy()}
}
const htmlSafe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function telegram(chatId,text){if(!process.env.TELEGRAM_BOT_TOKEN||!chatId)return false;const r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text})});if(!r.ok)throw Error('Telegram HTTP '+r.status);return true}
function notify(db,o,kind){const buyer=db.users.find(u=>u.id===o.userId),farmers=[...new Set(o.items.map(i=>i.farmerId).filter(Boolean))].map(fid=>db.users.find(u=>u.id===fid)).filter(Boolean),short=o.id.slice(0,8).toUpperCase(),status=statusNames[o.status]||o.status,lines=o.items.map(i=>`${i.name} × ${i.quantity}`).join(', '),message=`AgroMarket #${short}\nМәртебесі: ${status}\n${lines}\nСома: ${o.total} ₸`;const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:30px;border:1px solid #dde8df;border-radius:16px"><h1 style="color:#137b45">🌿 AgroMarket</h1><h2>Тапсырысыңыз: ${htmlSafe(status)}</h2><p>Тапсырыс № ${htmlSafe(short)}</p><p>${htmlSafe(lines)}</p><strong>${o.total} ₸</strong><p>Мәртебені жеке кабинеттен бақылай аласыз.</p></div>`;
 const operations=[];if(buyer){operations.push(sendEmail(buyer.email,`AgroMarket #${short}: ${status}`,html));if(buyer.telegramChatId)operations.push(telegram(buyer.telegramChatId,message))}if(kind==='new'){for(const farmer of farmers){operations.push(sendEmail(farmer.email,`AgroMarket: жаңа тапсырыс #${short}`,`<h2>Жаңа тапсырыс #${htmlSafe(short)}</h2><p>${htmlSafe(lines)}</p>`));if(farmer.telegramChatId)operations.push(telegram(farmer.telegramChatId,`Жаңа тапсырыс!\n${message}`))}}Promise.allSettled(operations).then(results=>results.forEach(r=>{if(r.status==='rejected')console.error('Notification:',r.reason.message)}));}
function getOrder(db,orderId,user){const o=db.orders.find(o=>o.id===orderId);if(!o)throw err(404,'Тапсырыс табылмады');if(user.role!=='admin'&&o.userId!==user.id&&!o.items.some(i=>i.farmerId===user.id))throw err(403,'Рұқсат жоқ');return o}
function bootstrapAdmin(){const email=clean(process.env.ADMIN_EMAIL).toLowerCase(),pass=process.env.ADMIN_PASSWORD;if(!email&&!pass)return;if(!validEmail(email)||!pass||pass.length<12)throw Error('ADMIN_EMAIL және ADMIN_PASSWORD (12+ таңба) қажет');const db=read(),u=db.users.find(u=>u.email===email);if(u){if(u.role!=='admin')throw Error('ADMIN_EMAIL басқа аккаунтқа тиесілі');return}db.users.push({id:id(),name:'AgroMarket Admin',email,password:hash(pass),role:'admin',phone:'',address:''});write(db);console.log('Admin account created:',email)}
function prodPublic(p,db){const rev=db.reviews.filter(r=>r.productId===p.id);return {...p, rating:rev.length?Math.round(rev.reduce((s,r)=>s+r.rating,0)/rev.length*10)/10:0,reviews:rev.length}}
async function api(req,res,url){let db=read();db.users??=[];db.orders??=[];db.reviews??=[];db.messages??=[];const method=req.method,route=url.pathname;
 let body={};if(['POST','PATCH','PUT','DELETE'].includes(method)){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>150000)throw err(413,'Сұраныс тым үлкен')}if(raw){try{body=JSON.parse(raw)}catch{throw err(400,'JSON қатесі')}}const origin=req.headers.origin;if(origin){const expected=`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`;if(origin!==expected)throw err(403,'Қауіпсіздік тексерісі өтпеді')}}
 if(route==='/api/products'&&method==='GET')return response(res,200,db.products.map(p=>prodPublic(p,db)));
 if(route==='/api/me'&&method==='GET'){const s=session(req),u=db.users.find(x=>x.id===s?.userId);return response(res,200,{user:safeUser(u)});}
 if(route==='/api/auth/register'&&method==='POST'){
 const address=req.socket.remoteAddress||'unknown',attemptKey='registration:'+address;
 const attempts=loginAttempts.get(attemptKey)||{count:0,time:Date.now()};
 if(Date.now()-attempts.time>15*60*1000){attempts.count=0;attempts.time=Date.now()}
 if(attempts.count>=12)throw err(429,'Тіркелу әрекеті тым көп. 15 минуттан кейін қайталаңыз');
 attempts.count++;loginAttempts.set(attemptKey,attempts);
 const email=clean(body.email).toLowerCase(),name=clean(body.name),password=String(body.password||'');if(name.length<2||!validEmail(email)||password.length<8||password.length>128)throw err(400,'Аты, email және кемінде 8 таңбалы құпиясөз қажет');if(db.users.some(u=>u.email===email))throw err(409,'Бұл email тіркелген');if(!['customer','farmer','admin'].includes(body.role))throw err(400,'Рөл жарамсыз');
 if(body.role==='admin'){
  const expected=process.env.ADMIN_INVITE_CODE||'';
  const supplied=String(body.adminCode||'');
  // A shared six-digit code is suitable only for a local demo. Check on the server.
  if(!/^\d{6}$/.test(supplied)||!/^\d{6}$/.test(expected)||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))throw err(403,'Администратор коды қате');
 }const u={id:id(),name,email,password:hash(password),role:body.role,phone:'',address:''};db.users.push(u);write(db);let tok=id();sessions.set(tok,{userId:u.id,expires:Date.now()+86400000});cookie(res,tok);return response(res,201,{user:safeUser(u)});}
 if(route==='/api/auth/login'&&method==='POST'){const email=clean(body.email).toLowerCase(),key=(req.socket.remoteAddress||'')+email,attempt=loginAttempts.get(key);if(attempt&&attempt.until>Date.now())throw err(429,'Кіру әрекеттері тым көп. Кейін қайталаңыз');const u=db.users.find(x=>x.email===email);if(!u||!verify(String(body.password||''),u.password)){let c=(attempt?.count||0)+1;loginAttempts.set(key,{count:c,until:c>=8?Date.now()+15*60000:0});throw err(401,'Email немесе құпиясөз қате')}loginAttempts.delete(key);const tok=id();sessions.set(tok,{userId:u.id,expires:Date.now()+86400000});cookie(res,tok);return response(res,200,{user:safeUser(u)});}
 if(route==='/api/auth/logout'&&method==='POST'){const s=session(req);if(s)sessions.delete(s.token);cookie(res,'',0);return response(res,200,{ok:true})}
 if(route==='/api/profile'&&method==='PATCH'){const u=auth(req,db);u.name=clean(body.name)||u.name;u.phone=clean(body.phone,32);u.address=clean(body.address,250);if(body.telegramChatId!==undefined){const chat=clean(body.telegramChatId,32);if(chat&&!/^-?\d{5,20}$/.test(chat))throw err(400,'Telegram Chat ID қате');u.telegramChatId=chat}write(db);return response(res,200,{user:safeUser(u)})}
 if(route==='/api/orders'&&method==='POST'){const u=auth(req,db,['customer']);const lines=Array.isArray(body.items)?body.items:[];if(!lines.length||lines.length>40)throw err(400,'Себет бос');const qtys=new Map();for(const line of lines){const pid=clean(line.productId,80),qty=Number(line.quantity);if(!Number.isInteger(qty)||qty<1||qty>100)throw err(400,'Саны қате');qtys.set(pid,(qtys.get(pid)||0)+qty)}let items=[],total=0;for(const [pid,qty] of qtys){const p=db.products.find(p=>p.id===pid);if(!p)throw err(404,'Тауар табылмады');if(p.stock<qty)throw err(409,`${p.name}: қоймада ${p.stock} дана қалды`);items.push({productId:pid,name:p.name,price:p.price,quantity:qty,farmerId:p.farmerId||null});total+=p.price*qty}const address=clean(body.address||u.address,250),phone=clean(body.phone||u.phone,32);if(address.length<5||phone.length<6)throw err(400,'Мекенжай мен телефонды толтырыңыз');for(const item of items)db.products.find(p=>p.id===item.productId).stock-=item.quantity;const order={id:id(),userId:u.id,customerName:u.name,phone,address,items,total,status:'new',createdAt:new Date().toISOString()};db.orders.push(order);write(db);notify(db,order,'new');return response(res,201,{order});}
 if(route==='/api/orders'&&method==='GET'){const u=auth(req,db);let orders=u.role==='admin'?db.orders:u.role==='farmer'?db.orders.filter(o=>o.items.some(i=>i.farmerId===u.id)):db.orders.filter(o=>o.userId===u.id);return response(res,200,orders.slice().reverse())}
 const statusMatch=route.match(/^\/api\/orders\/([^/]+)\/status$/);if(statusMatch&&method==='PATCH'){const u=auth(req,db,['admin','farmer']),o=db.orders.find(o=>o.id===statusMatch[1]);if(!o)throw err(404,'Тапсырыс табылмады');if(u.role==='farmer'&&!o.items.every(i=>i.farmerId===u.id))throw err(403,'Бірнеше фермердің тапсырысын тек админ өзгертеді');if(!['new','accepted','packing','shipping','delivered','cancelled'].includes(body.status))throw err(400,'Мәртебе қате');if(o.status==='delivered'&&body.status!==o.status)throw err(409,'Жеткізілген тапсырыс өзгермейді');if(o.status==='cancelled'&&body.status!==o.status)throw err(409,'Жабылған тапсырыс өзгермейді');if(o.status!==body.status){if(body.status==='cancelled'){for(const item of o.items){const p=db.products.find(p=>p.id===item.productId);if(p)p.stock+=item.quantity}}o.status=body.status;write(db);notify(db,o,'status')}return response(res,200,{order:o})}
 if(route==='/api/analytics'&&method==='GET'){const u=auth(req,db,['admin','farmer']);const selected=db.orders.filter(o=>u.role==='admin'||o.items.some(i=>i.farmerId===u.id));const valid=selected.filter(o=>o.status!=='cancelled');const revenue=valid.reduce((sum,o)=>sum+o.items.filter(i=>u.role==='admin'||i.farmerId===u.id).reduce((v,i)=>v+i.price*i.quantity,0),0);const quantities=new Map();for(const o of valid)for(const i of o.items)if(u.role==='admin'||i.farmerId===u.id)quantities.set(i.productId,{name:i.name,quantity:(quantities.get(i.productId)?.quantity||0)+i.quantity});return response(res,200,{orders:selected.length,revenue,delivered:selected.filter(o=>o.status==='delivered').length,pending:selected.filter(o=>!['cancelled','delivered'].includes(o.status)).length,topProducts:[...quantities.values()].sort((a,b)=>b.quantity-a.quantity).slice(0,8)})}
 if(route==='/api/admin/users'&&method==='GET'){auth(req,db,['admin']);return response(res,200,db.users.map(u=>({...safeUser(u),orders:db.orders.filter(o=>o.userId===u.id).length}))) }
 const userRole=route.match(/^\/api\/admin\/users\/([^/]+)\/role$/);if(userRole&&method==='PATCH'){const u=auth(req,db,['admin']),target=db.users.find(x=>x.id===userRole[1]);if(!target)throw err(404,'Қолданушы жоқ');if(target.id===u.id)throw err(400,'Өзіңіздің рөліңізді өзгерте алмайсыз');if(!['farmer','customer'].includes(body.role))throw err(400,'Рөл жарамсыз');if(target.role==='admin')throw err(403,'Басқа админ өзгертілмейді');target.role=body.role;write(db);return response(res,200,{user:safeUser(target)})}
 const msgRoute=route.match(/^\/api\/orders\/([^/]+)\/messages$/);if(msgRoute&&method==='GET'){const u=auth(req,db);getOrder(db,msgRoute[1],u);return response(res,200,db.messages.filter(m=>m.orderId===msgRoute[1]).slice(-100))}
 if(msgRoute&&method==='POST'){const u=auth(req,db),o=getOrder(db,msgRoute[1],u),content=clean(body.text,1000);if(content.length<1)throw err(400,'Бос хабарлама');if(['delivered','cancelled'].includes(o.status))throw err(409,'Бұл тапсырыс бойынша чат жабылды');const msg={id:id(),orderId:o.id,userId:u.id,name:u.name,role:u.role,text:content,createdAt:new Date().toISOString()};db.messages.push(msg);write(db);return response(res,201,{message:msg})}
 if(route==='/api/reviews'&&method==='GET'){const productId=clean(url.searchParams.get('productId'),80);return response(res,200,db.reviews.filter(r=>r.productId===productId).slice().reverse())}
 if(route==='/api/reviews'&&method==='POST'){const u=auth(req,db,['customer']),pid=clean(body.productId,80),rating=Number(body.rating),comment=clean(body.comment,500);if(!db.products.some(p=>p.id===pid))throw err(404,'Тауар табылмады');if(!Number.isInteger(rating)||rating<1||rating>5||comment.length<3)throw err(400,'Баға және кемінде 3 таңбалы пікір қажет');if(!db.orders.some(o=>o.userId===u.id&&o.items.some(i=>i.productId===pid)))throw err(403,'Пікір қалдыру үшін тауарды сатып алу қажет');if(db.reviews.some(r=>r.userId===u.id&&r.productId===pid))throw err(409,'Бұл тауарға пікір қалдырдыңыз');const review={id:id(),userId:u.id,name:u.name,productId:pid,rating,comment,createdAt:new Date().toISOString()};db.reviews.push(review);write(db);return response(res,201,{review})}
 if(route==='/api/products'&&method==='POST'){const u=auth(req,db,['admin','farmer']);const p=parseProduct(body);p.id=id();p.farmerId=u.role==='farmer'?u.id:null;db.products.push(p);write(db);return response(res,201,{product:prodPublic(p,db)})}
 const pm=route.match(/^\/api\/products\/([^/]+)$/);if(pm&&['PATCH','DELETE'].includes(method)){const u=auth(req,db,['admin','farmer']);const idx=db.products.findIndex(p=>p.id===pm[1]);if(idx<0)throw err(404,'Тауар табылмады');if(u.role!=='admin'&&db.products[idx].farmerId!==u.id)throw err(403,'Бұл тауар сіздікі емес');if(method==='DELETE'){db.products.splice(idx,1);write(db);return response(res,200,{ok:true})}Object.assign(db.products[idx],parseProduct({...db.products[idx],...body}));write(db);return response(res,200,{product:prodPublic(db.products[idx],db)})}
 throw err(404,'API табылмады')}
function parseProduct(b){const name=clean(b.name),price=Number(b.price),stock=Number(b.stock),description=clean(b.description,500),image=clean(b.image,300),category=clean(b.category,30);if(name.length<2||!Number.isFinite(price)||price<=0||price>100000000||!Number.isInteger(stock)||stock<0||stock>1000000)throw err(400,'Атауы, бағасы немесе саны қате');if(image&&!(/^image\/[\w\u0400-\u04ff.-]+\.(png|jpg|jpeg|webp)$/i.test(image)||/^https:\/\/[a-z0-9.-]+\//i.test(image)))throw err(400,'Сурет жолы жарамсыз');return {name,price,stock,description,image,category:category||'other',oldPrice:0,badge:''}}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/'))return await api(req,res,url);if(req.method!=='GET'&&req.method!=='HEAD')throw err(405,'Method not allowed');let file=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);if(file.includes('\0')||file.includes('\\'))throw err(400,'Invalid path');const full=path.resolve(ROOT,'.'+file);if(!full.startsWith(ROOT+path.sep))throw err(403,'Forbidden');if(!fs.existsSync(full)||!fs.statSync(full).isFile())throw err(404,'Page not found');if(!mime[path.extname(full)])throw err(403,'Forbidden');res.writeHead(200,{'Content-Type':mime[path.extname(full)],'X-Content-Type-Options':'nosniff','Cache-Control':file==='/index.html'?'no-store':'public, max-age=300'});fs.createReadStream(full).pipe(res)}catch(e){response(res,e.status||500,{error:e.status?e.message:'Сервер қатесі'});if(!e.status)console.error(e)}});
bootstrapAdmin();
server.listen(PORT,()=>console.log(`AgroMarket → http://localhost:${PORT}`));
