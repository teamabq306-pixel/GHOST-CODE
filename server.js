/**
 * GHOST CODE - Backend Server v3.0
 * Seguridad reforzada + Repos + Actualizaciones/Noticias
 */
'use strict';

const http        = require('http');
const fs          = require('fs');
const path        = require('path');
const crypto      = require('crypto');
const url_mod     = require('url');
const querystring = require('querystring');
const config      = require('./backend/config.js');

const PUBLIC_DIR    = path.join(__dirname, 'public');
const PORTFOLIO_DIR = path.join(PUBLIC_DIR, 'portfolio');
const NEWS_DIR      = path.join(PUBLIC_DIR, 'news-images');
[path.join(PUBLIC_DIR,'uploads'), PORTFOLIO_DIR, NEWS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const DATA_FILE = path.join(__dirname, 'data.json');
function loadData() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); } catch {}
  return { contacts:[], portfolio:[], repos:[], updates:[] };
}
function saveData(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const security = {
  rateLimiter: new Map(),
  loginAttempts: new Map(),
  MAX_ATTEMPTS: 5,
  LOCK_MS: 15 * 60 * 1000,

  checkRateLimit(ip, max=200, windowMs=60000) {
    const now = Date.now();
    if (!this.rateLimiter.has(ip)) { this.rateLimiter.set(ip,{count:1,start:now}); return true; }
    const r = this.rateLimiter.get(ip);
    if (now - r.start > windowMs) { this.rateLimiter.set(ip,{count:1,start:now}); return true; }
    if (r.count >= max) return false;
    r.count++; return true;
  },

  checkLoginAllowed(ip) {
    const now = Date.now(), r = this.loginAttempts.get(ip);
    if (!r) return { allowed: true };
    if (r.lockedUntil && now < r.lockedUntil)
      return { allowed: false, remaining: Math.ceil((r.lockedUntil-now)/60000) };
    return { allowed: true };
  },

  recordFail(ip) {
    const now = Date.now(), r = this.loginAttempts.get(ip) || { count: 0 };
    if (r.lockedUntil && now > r.lockedUntil) r.count = 0;
    r.count++;
    if (r.count >= this.MAX_ATTEMPTS) r.lockedUntil = now + this.LOCK_MS;
    this.loginAttempts.set(ip, r);
  },

  resetFail(ip) { this.loginAttempts.delete(ip); },

  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
              .replace(/"/g,'&quot;').replace(/'/g,'&#x27;').trim().substring(0,5000);
  },

  sanitizeUrl(str) {
    if (typeof str !== 'string') return '';
    const s = str.trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) return '';
    return s.substring(0,500);
  },

  validateEmail(e) {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(String(e).toLowerCase());
  },

  generateToken() { return crypto.randomBytes(48).toString('hex'); },

  hashPassword(pwd, salt) {
    if (!salt) salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(pwd, salt, 310000, 64, 'sha512').toString('hex');
    return { hash, salt };
  },

  verifyPassword(pwd, hash, salt) {
    try {
      const a = this.hashPassword(pwd, salt).hash;
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(hash));
    } catch { return false; }
  },

  setHeaders(res) {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('X-XSS-Protection','1; mode=block');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; " +
      "style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; " +
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
      "img-src 'self' data: blob:; connect-src 'self';"
    );
  }
};

const db = {
  data: loadData(),
  sessions: new Map(),
  admins: [],

  init() {
    if (!this.data.repos)   this.data.repos   = [];
    if (!this.data.updates) this.data.updates = [];
    const pwd = process.env.ADMIN_PASSWORD || config.adminPassword || 'Admin@GhostCode2024';
    const usr = process.env.ADMIN_USER     || config.adminUser     || 'admin';
    const { hash, salt } = security.hashPassword(pwd);
    this.admins.push({ id:1, username: usr, hash, salt });
    saveData(this.data);
    console.log(`[DB] Admin: ${usr}`);
  },

  saveContact(d) {
    const c = { id: Date.now().toString(), ...d, createdAt: new Date().toISOString() };
    this.data.contacts.push(c); saveData(this.data); return c;
  },

  getPortfolio()  { return this.data.portfolio || []; },
  addPortfolio(i) { const p={id:Date.now().toString(),...i,createdAt:new Date().toISOString()}; this.data.portfolio.push(p); saveData(this.data); return p; },
  delPortfolio(id) {
    const idx = this.data.portfolio.findIndex(p=>p.id===id); if(idx===-1) return false;
    const it = this.data.portfolio[idx];
    if(it.image){try{const f=path.join(PUBLIC_DIR,it.image);if(fs.existsSync(f))fs.unlinkSync(f);}catch{}}
    this.data.portfolio.splice(idx,1); saveData(this.data); return true;
  },

  getRepos()  { return this.data.repos || []; },
  addRepo(i)  { const r={id:Date.now().toString(),...i,createdAt:new Date().toISOString()}; this.data.repos.push(r); saveData(this.data); return r; },
  delRepo(id) {
    const idx=this.data.repos.findIndex(r=>r.id===id); if(idx===-1) return false;
    this.data.repos.splice(idx,1); saveData(this.data); return true;
  },

  getUpdates()  { return this.data.updates || []; },
  addUpdate(i)  { const u={id:Date.now().toString(),...i,createdAt:new Date().toISOString()}; this.data.updates.unshift(u); saveData(this.data); return u; },
  delUpdate(id) {
    const idx=this.data.updates.findIndex(u=>u.id===id); if(idx===-1) return false;
    const it=this.data.updates[idx];
    if(it.image){try{const f=path.join(PUBLIC_DIR,it.image);if(fs.existsSync(f))fs.unlinkSync(f);}catch{}}
    this.data.updates.splice(idx,1); saveData(this.data); return true;
  },

  createSession(adminId, ip) {
    const token = security.generateToken();
    this.sessions.set(token, { adminId, ip, expiresAt: Date.now() + 3600000 });
    return token;
  },
  validateSession(token) {
    if(!token) return null;
    const s = this.sessions.get(token);
    if(!s) return null;
    if(Date.now() > s.expiresAt){ this.sessions.delete(token); return null; }
    return s;
  },
  destroySession(token) { this.sessions.delete(token); }
};

setInterval(()=>{ const now=Date.now(); for(const[t,s] of db.sessions) if(now>s.expiresAt) db.sessions.delete(t); }, 3600000);

const MIME = {
  '.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf'
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type']||'';
    const boundary = ct.split('boundary=')[1];
    if(!boundary) return reject(new Error('No boundary'));
    const chunks=[]; let total=0;
    req.on('data',c=>{ total+=c.length; if(total>12*1024*1024){req.destroy();return reject(new Error('Too large'));} chunks.push(c); });
    req.on('end',()=>{
      const buf=Buffer.concat(chunks), sep=Buffer.from('--'+boundary);
      const fields={}; let fileBuffer=null,fileName='';
      let start=0;
      while(start<buf.length){
        const end=buf.indexOf(sep,start+1); if(end===-1) break;
        const part=buf.slice(start+sep.length+2,end-2); start=end;
        const he=part.indexOf('\r\n\r\n'); if(he===-1) continue;
        const header=part.slice(0,he).toString(), body=part.slice(he+4);
        const nm=header.match(/name="([^"]+)"/) , fm=header.match(/filename="([^"]+)"/);
        if(!nm) continue;
        if(fm){ fileName=fm[1]; fileBuffer=body; }
        else  { fields[nm[1]]=body.toString().trim(); }
      }
      resolve({fields,fileBuffer,fileName});
    });
    req.on('error',reject);
  });
}

const routes = {
  send(res,status,data){ const b=JSON.stringify(data); res.writeHead(status,{'Content-Type':'application/json','Content-Length':Buffer.byteLength(b)}); res.end(b); },

  async parseBody(req) {
    return new Promise((resolve,reject)=>{
      let body='';
      req.on('data',c=>{ body+=c.toString(); if(body.length>10000){req.destroy();reject(new Error('Too large'));} });
      req.on('end',()=>{ try{ const ct=req.headers['content-type']||''; resolve(ct.includes('application/json')?JSON.parse(body):querystring.parse(body)); }catch{resolve({});} });
      req.on('error',reject);
    });
  },

  getToken(req){ const c=req.headers['cookie']||'',m=c.match(/ghost_session=([a-f0-9]+)/); return m?m[1]:null; },
  isAuth(req)  { return !!db.validateSession(this.getToken(req)); },

  serveStatic(res,filePath){
    const ext=path.extname(filePath).toLowerCase(), full=path.join(PUBLIC_DIR,filePath);
    if(!full.startsWith(PUBLIC_DIR)) return this.send(res,403,{error:'Acceso denegado'});
    fs.readFile(full,(err,data)=>{
      if(err){
        if(err.code==='ENOENT') fs.readFile(path.join(PUBLIC_DIR,'404.html'),(e2,d2)=>{ res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}); res.end(d2||'<h1>404</h1>'); });
        else this.send(res,500,{error:'Error interno'});
        return;
      }
      res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'}); res.end(data);
    });
  },

  async handleContact(req,res,ip){
    const body=await this.parseBody(req);
    const name=security.sanitize(body.name||''),email=security.sanitize(body.email||''),
          subject=security.sanitize(body.subject||''),message=security.sanitize(body.message||'');
    const errors=[];
    if(name.length<2) errors.push('Nombre inválido');
    if(!security.validateEmail(email)) errors.push('Email inválido');
    if(subject.length<3) errors.push('Asunto inválido');
    if(message.length<10) errors.push('Mensaje muy corto');
    if(errors.length) return this.send(res,400,{success:false,errors});
    const c=db.saveContact({name,email,subject,message,ip});
    return this.send(res,200,{success:true,message:'Mensaje enviado. Te contactaremos pronto.'});
  },

  async handleLogin(req,res,ip){
    const chk=security.checkLoginAllowed(ip);
    if(!chk.allowed) return this.send(res,429,{success:false,message:`Demasiados intentos. Espera ${chk.remaining} min.`});
    const body=await this.parseBody(req);
    const username=security.sanitize(body.username||''), password=body.password||'';
    await new Promise(r=>setTimeout(r,800+Math.random()*400));
    const admin=db.admins.find(a=>a.username===username);
    const valid=admin&&security.verifyPassword(password,admin.hash,admin.salt);
    if(!valid){
      security.recordFail(ip);
      const rec=security.loginAttempts.get(ip)||{};
      const left=security.MAX_ATTEMPTS-(rec.count||0);
      const msg=rec.lockedUntil?`Bloqueado por ${security.LOCK_MS/60000} min.`:`Credenciales inválidas. Intentos restantes: ${Math.max(0,left)}`;
      return this.send(res,401,{success:false,message:msg});
    }
    security.resetFail(ip);
    const token=db.createSession(admin.id,ip);
    res.setHeader('Set-Cookie',`ghost_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
    return this.send(res,200,{success:true,message:'Acceso concedido'});
  },

  handleLogout(req,res){
    const t=this.getToken(req); if(t) db.destroySession(t);
    res.setHeader('Set-Cookie','ghost_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return this.send(res,200,{success:true});
  },

  handleCheckAuth(req,res){ return this.send(res,200,{authenticated:this.isAuth(req)}); },

  handleDashboard(req,res){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    return this.send(res,200,{success:true,stats:{
      totalContacts:db.data.contacts.length, totalPortfolio:db.data.portfolio.length,
      totalRepos:db.data.repos.length, totalUpdates:db.data.updates.length,
      contacts:db.data.contacts.map(c=>({id:c.id,name:c.name,email:c.email,subject:c.subject,message:c.message,createdAt:c.createdAt}))
    }});
  },

  // Portfolio
  handleGetPortfolio(req,res){ return this.send(res,200,{success:true,portfolio:db.getPortfolio()}); },
  async handleAddPortfolio(req,res){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    const ct=req.headers['content-type']||''; let fields={},imagePath='';
    try{
      if(ct.includes('multipart/form-data')){
        const p=await parseMultipart(req); fields=p.fields;
        if(p.fileBuffer&&p.fileName){
          const ext=path.extname(p.fileName).toLowerCase();
          if(!['.jpg','.jpeg','.png','.gif','.webp','.svg'].includes(ext)) return this.send(res,400,{success:false,message:'Formato no permitido'});
          if(p.fileBuffer.length>5*1024*1024) return this.send(res,400,{success:false,message:'Máx 5MB'});
          const n=`${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
          fs.writeFileSync(path.join(PORTFOLIO_DIR,n),p.fileBuffer); imagePath=`/portfolio/${n}`;
        }
      } else { fields=await this.parseBody(req); }
      const item=db.addPortfolio({title:security.sanitize(fields.title||''),description:security.sanitize(fields.description||''),category:security.sanitize(fields.category||''),tags:security.sanitize(fields.tags||''),link:security.sanitizeUrl(fields.link||''),image:imagePath});
      return this.send(res,200,{success:true,item});
    }catch{ return this.send(res,500,{success:false,message:'Error al procesar'}); }
  },
  handleDelPortfolio(req,res,id){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    return this.send(res,db.delPortfolio(id)?200:404,{success:db.delPortfolio(id)});
  },

  // Repos
  handleGetRepos(req,res){ return this.send(res,200,{success:true,repos:db.getRepos()}); },
  async handleAddRepo(req,res){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    const body=await this.parseBody(req);
    const name=security.sanitize(body.name||''), repoUrl=security.sanitizeUrl(body.url||'');
    if(!name||!repoUrl) return this.send(res,400,{success:false,message:'Nombre y URL requeridos'});
    if(!/github\.com|gitlab\.com|bitbucket\.org/.test(repoUrl)) return this.send(res,400,{success:false,message:'URL debe ser GitHub, GitLab o Bitbucket'});
    const item=db.addRepo({name,desc:security.sanitize(body.desc||''),url:repoUrl,lang:security.sanitize(body.lang||''),tags:security.sanitize(body.tags||''),status:security.sanitize(body.status||'público')});
    return this.send(res,200,{success:true,item});
  },
  handleDelRepo(req,res,id){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    return this.send(res,db.delRepo(id)?200:404,{success:true});
  },

  // Updates/News
  handleGetUpdates(req,res){ return this.send(res,200,{success:true,updates:db.getUpdates()}); },
  async handleAddUpdate(req,res){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    const ct=req.headers['content-type']||''; let fields={},imagePath='';
    try{
      if(ct.includes('multipart/form-data')){
        const p=await parseMultipart(req); fields=p.fields;
        if(p.fileBuffer&&p.fileName){
          const ext=path.extname(p.fileName).toLowerCase();
          if(!['.jpg','.jpeg','.png','.gif','.webp','.svg'].includes(ext)) return this.send(res,400,{success:false,message:'Formato no permitido'});
          if(p.fileBuffer.length>5*1024*1024) return this.send(res,400,{success:false,message:'Máx 5MB'});
          const n=`${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
          fs.writeFileSync(path.join(NEWS_DIR,n),p.fileBuffer); imagePath=`/news-images/${n}`;
        }
      } else { fields=await this.parseBody(req); }
      const item=db.addUpdate({title:security.sanitize(fields.title||''),content:security.sanitize(fields.content||''),category:security.sanitize(fields.category||'Noticia'),link:security.sanitizeUrl(fields.link||''),image:imagePath});
      return this.send(res,200,{success:true,item});
    }catch{ return this.send(res,500,{success:false,message:'Error al procesar'}); }
  },
  handleDelUpdate(req,res,id){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    return this.send(res,db.delUpdate(id)?200:404,{success:true});
  },

  // Change password (runtime only)
  async handleChangePwd(req,res){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    const body=await this.parseBody(req);
    const current=body.currentPassword||'', newPwd=body.newPassword||'';
    if(!current||!newPwd) return this.send(res,400,{success:false,message:'Campos requeridos'});
    if(newPwd.length<8) return this.send(res,400,{success:false,message:'Mínimo 8 caracteres'});
    const admin=db.admins[0];
    if(!security.verifyPassword(current,admin.hash,admin.salt))
      return this.send(res,401,{success:false,message:'Contraseña actual incorrecta'});
    const{hash,salt}=security.hashPassword(newPwd);
    admin.hash=hash; admin.salt=salt;
    console.log('[SECURITY] Contraseña de admin actualizada en runtime');
    return this.send(res,200,{success:true,message:'Contraseña actualizada'});
  },

  // Background
  async handleUploadBg(req,res){
    if(!this.isAuth(req)) return this.send(res,401,{success:false,message:'No autorizado'});
    try{
      const{fileBuffer,fileName}=await parseMultipart(req);
      if(!fileBuffer||!fileName) return this.send(res,400,{success:false,message:'Sin archivo'});
      const ext=path.extname(fileName).toLowerCase();
      if(!['.jpg','.jpeg','.png','.webp'].includes(ext)) return this.send(res,400,{success:false,message:'Formato no permitido'});
      if(fileBuffer.length>10*1024*1024) return this.send(res,400,{success:false,message:'Máx 10MB'});
      fs.writeFileSync(path.join(PUBLIC_DIR,'images',`bg${ext}`),fileBuffer);
      return this.send(res,200,{success:true,path:`/images/bg${ext}`});
    }catch{ return this.send(res,500,{success:false,message:'Error al subir'}); }
  }
};

const server = http.createServer(async(req,res)=>{
  const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();
  const{pathname}=url_mod.parse(req.url);
  const method=req.method.toUpperCase();
  security.setHeaders(res);
  if(!security.checkRateLimit(ip)){routes.send(res,429,{error:'Demasiadas solicitudes'});return;}
  console.log(`[${new Date().toISOString()}] ${method} ${pathname} - ${ip}`);
  try{
    if(pathname.startsWith('/api/')){
      res.setHeader('Content-Type','application/json');
      if(pathname==='/api/login'&&method==='POST')    return await routes.handleLogin(req,res,ip);
      if(pathname==='/api/logout'&&method==='POST')   return routes.handleLogout(req,res);
      if(pathname==='/api/auth/check'&&method==='GET')return routes.handleCheckAuth(req,res);
      if(pathname==='/api/dashboard'&&method==='GET') return routes.handleDashboard(req,res);
      if(pathname==='/api/contact'&&method==='POST')  return await routes.handleContact(req,res,ip);
      if(pathname==='/api/portfolio'&&method==='GET') return routes.handleGetPortfolio(req,res);
      if(pathname==='/api/portfolio'&&method==='POST')return await routes.handleAddPortfolio(req,res);
      if(pathname==='/api/repos'&&method==='GET')     return routes.handleGetRepos(req,res);
      if(pathname==='/api/repos'&&method==='POST')    return await routes.handleAddRepo(req,res);
      if(pathname==='/api/updates'&&method==='GET')   return routes.handleGetUpdates(req,res);
      if(pathname==='/api/updates'&&method==='POST')  return await routes.handleAddUpdate(req,res);
      if(pathname==='/api/upload/background'&&method==='POST') return await routes.handleUploadBg(req,res);
      const dp=pathname.match(/^\/api\/portfolio\/(.+)$/); if(dp&&method==='DELETE') return routes.handleDelPortfolio(req,res,dp[1]);
      const dr=pathname.match(/^\/api\/repos\/(.+)$/);     if(dr&&method==='DELETE') return routes.handleDelRepo(req,res,dr[1]);
      const du=pathname.match(/^\/api\/updates\/(.+)$/);   if(du&&method==='DELETE') return routes.handleDelUpdate(req,res,du[1]);
      return routes.send(res,404,{error:'Endpoint no encontrado'});
    }
    if(method==='GET'){
      let fp=pathname==='/'?'/index.html':pathname;
      const blocked=['.env','server.js','config.js','package.json','.git','data.json'];
      if(blocked.some(b=>fp.includes(b))) return routes.send(res,403,{error:'Acceso denegado'});
      return routes.serveStatic(res,fp);
    }
    routes.send(res,405,{error:'Método no permitido'});
  }catch(err){console.error('[ERROR]',err.message);routes.send(res,500,{error:'Error interno'});}
});

db.init();
server.listen(config.port,()=>{
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     GHOST CODE v3.0 - ONLINE         ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n🚀 http://localhost:${config.port}`);
  console.log(`🔒 Brute-force protection activa`);
  console.log(`👤 Cambia credenciales en backend/config.js\n`);
});
process.on('uncaughtException',err=>console.error('[FATAL]',err.message));
process.on('unhandledRejection',err=>console.error('[REJECTION]',err));
