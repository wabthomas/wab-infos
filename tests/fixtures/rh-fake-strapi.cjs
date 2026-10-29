const http = require('http');
const users={alice:{id:1,email:'alice@example.test',username:'alice',confirmed:true,blocked:false,role:{name:'Authenticated'}},bob:{id:2,email:'bob@example.test',username:'bob',confirmed:true,blocked:false,role:{name:'Authenticated'}},admin:{id:3,email:'admin@example.test',username:'admin',confirmed:true,blocked:false,role:{name:'admin'}}};
http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'); const token=(req.headers.authorization||'').replace('Bearer ',''); let data;
 if(u.pathname==='/api/users/me') data=users[token];
 else if(/^\/api\/users\/\d+$/.test(u.pathname) && token==='fake-server-token') data=Object.values(users).find(x=>x.id===Number(u.pathname.split('/').pop()));
 else if(u.pathname==='/api/users' && token==='fake-server-token') data={data:[]};
 if(!data){res.writeHead(401); return res.end('{}')} res.setHeader('content-type','application/json');res.end(JSON.stringify(data));
}).listen(58090,'127.0.0.1',()=>console.log('Simulated Strapi ready'));
