(() => {
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp = (a,b,t)=>a+(b-a)*t;
  const ease = t => 1 - Math.pow(1-t,3);

  // Cursor
  const cursor = document.querySelector('.cursor');
  let cx=innerWidth/2,cy=innerHeight/2,tx=cx,ty=cy;
  addEventListener('pointermove', e => { tx=e.clientX; ty=e.clientY; });
  document.querySelectorAll('a,.magnetic').forEach(el=>{
    el.addEventListener('pointerenter',()=>cursor.classList.add('hover'));
    el.addEventListener('pointerleave',()=>cursor.classList.remove('hover'));
  });

  // Scroll-driven transforms
  const scenes = [...document.querySelectorAll('.scene')];
  const progressBar = document.getElementById('progress');
  let scrollY=scrollY;

  function update(){
    scrollY=window.scrollY;
    const doc = document.documentElement.scrollHeight-innerHeight;
    progressBar.style.transform=`scaleX(${doc ? scrollY/doc : 0})`;

    scenes.forEach(scene=>{
      const r=scene.getBoundingClientRect();
      const p=clamp((innerHeight-r.top)/(innerHeight+r.height),0,1);
      scene.style.setProperty('--p',p.toFixed(4));

      if(scene.classList.contains('marquee-stage')){
        const m=scene.querySelector('.marquee-3d');
        const z=lerp(-18,18,ease(p));
        const rot=lerp(-8,-2,ease(p));
        m.style.transform=`rotate(${rot}deg) rotateX(${48-z}deg) translateY(${lerp(13,-13,ease(p))}vh) translateZ(${z}px)`;
      }

      if(scene.classList.contains('statement')){
        const h=scene.querySelector('h2');
        const side=scene.querySelector('.statement-side');
        const giant=scene.querySelector('.huge-type');
        const y=lerp(90,-35,ease(p));
        h.style.transform=`translate3d(0,${y}px,0)`;
        side.style.transform=`translate3d(0,${-y*.55}px,0)`;
        giant.style.transform=`translate3d(${lerp(-4,10,ease(p))}%,0,0)`;
      }

      if(scene.classList.contains('loop-stage')){
        const main=scene.querySelector('.loop-word:not(.stroke):not(.offset)');
        const stroke=scene.querySelector('.stroke');
        const offset=scene.querySelector('.offset');
        const orb=scene.querySelector('.loop-orb');
        main.style.transform=`translate3d(${lerp(-30,30,p)}vw,${lerp(24,-24,p)}vh,${lerp(-80,120,p)}px) rotate(${lerp(-6,6,p)}deg)`;
        stroke.style.transform=`translate3d(${lerp(25,-25,p)}vw,${lerp(16,-10,p)}vh,0) rotate(${lerp(6,-5,p)}deg)`;
        offset.style.transform=`translate3d(${lerp(-20,20,p)}vw,${lerp(-10,10,p)}vh,0) rotate(${lerp(8,-3,p)}deg)`;
        orb.style.transform=`rotateX(${lerp(56,8,p)}deg) rotateY(${lerp(-35,55,p)}deg) scale(${lerp(.72,1.15,p)})`;
      }
    });

    cx=lerp(cx,tx,.18); cy=lerp(cy,ty,.18);
    cursor.style.transform=`translate(${cx}px,${cy}px) translate(-50%,-50%)`;

    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);

  // Neural field — particles connected in 3D-ish perspective.
  function createNeuralCanvas(canvas){
    const ctx=canvas.getContext('2d');
    let w=0,h=0,dpr=1;
    const density=Number(canvas.dataset.density||90);
    const pts=[];
    const resize=()=>{
      const r=canvas.getBoundingClientRect(); dpr=devicePixelRatio||1; w=r.width; h=r.height;
      canvas.width=w*dpr; canvas.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      pts.length=0;
      for(let i=0;i<density;i++){
        const a=Math.random()*Math.PI*2, rad=Math.pow(Math.random(),.7);
        pts.push({a,rad,z:Math.random(),phase:Math.random()*6.28,speed:.15+Math.random()*.4,size:.6+Math.random()*1.8});
      }
    };
    resize(); addEventListener('resize',resize,{passive:true});

    function draw(t){
      ctx.clearRect(0,0,w,h);
      const r=.38*Math.min(w,h);
      const cx=w/2,cy=h/2;
      const scroll=window.scrollY;
      const pts2=[];

      for(let i=0;i<pts.length;i++){
        const q=pts[i];
        const a=q.a + t*.00012*q.speed + Math.sin(q.phase+t*.001)*.08;
        const breathe=1 + Math.sin(t*.0013+q.phase)*.08;
        const rad=q.rad*r*breathe;
        const z=(q.z + t*.000035*q.speed)%1;
        const x=Math.cos(a)*rad;
        const y=Math.sin(a)*rad*.64;
        const depth=(.25 + z*.75);
        const px=cx+x*depth;
        const py=cy+y*depth;
        pts2.push({x:px,y:py,z,ox:x,oy:y,q});
      }

      pts2.forEach((p,i)=>{
        const shift=Math.sin(scroll*.002+i*.07)*.18;
        p.x += Math.cos(p.q.a)*shift*20;
        p.y += Math.sin(p.q.a)*shift*14;
      });

      for(let i=0;i<pts2.length;i++){
        for(let j=i+1;j<pts2.length;j++){
          const a=pts2[i],b=pts2[j];
          const dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
          if(d<75 && Math.abs(a.z-b.z)<.28){
            const alpha=(1-d/75)*.13*(.45+Math.abs(a.z-b.z));
            ctx.strokeStyle=`rgba(235,232,223,${alpha})`;
            ctx.lineWidth=.6;
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
          }
        }
      }

      pts2.forEach((p,i)=>{
        const glow=.35+.5*Math.sin(t*.002+p.q.phase);
        ctx.fillStyle=`rgba(245,242,233,${.28+glow*.3})`;
        ctx.beginPath();ctx.arc(p.x,p.y,p.q.size*(.7+p.z),0,Math.PI*2);ctx.fill();
        if(i%9===0 && p.z>.45){
          ctx.fillStyle=`rgba(255,255,255,.035)`;
          ctx.beginPath();ctx.arc(p.x,p.y,12+8*p.z,0,Math.PI*2);ctx.fill();
        }
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }
  document.querySelectorAll('.neural-canvas').forEach(createNeuralCanvas);

  // Dedicated brain canvas: a more structured rotating "connectome".
  const bc=document.querySelector('.brain-canvas');
  const bctx=bc.getContext('2d');
  let bw=0,bh=0,bd=1;
  const nodes=[];
  function resizeBrain(){
    const r=bc.getBoundingClientRect(); bd=devicePixelRatio||1; bw=r.width; bh=r.height;
    bc.width=bw*bd;bc.height=bh*bd;bctx.setTransform(bd,0,0,bd,0,0);
    nodes.length=0;
    for(let i=0;i<150;i++){
      const u=Math.random()*2-1;
      const theta=Math.random()*Math.PI*2;
      const s=Math.sqrt(1-u*u);
      nodes.push({x:s*Math.cos(theta),y:s*Math.sin(theta),z:u, phase:Math.random()*Math.PI*2});
    }
  }
  resizeBrain(); addEventListener('resize',resizeBrain,{passive:true});

  function brainDraw(t){
    bctx.clearRect(0,0,bw,bh);
    const rot=t*.00025+window.scrollY*.00045;
    const scale=Math.min(bw,bh)*.38;
    const projected=nodes.map((n,i)=>{
      let x=n.x*Math.cos(rot)-n.z*Math.sin(rot);
      let z=n.x*Math.sin(rot)+n.z*Math.cos(rot);
      let y=n.y;
      const pulse=1+Math.sin(t*.0014+n.phase)*.045;
      return {x:bw/2+x*scale*pulse,y:bh/2+y*scale*.82*pulse,z,size:1.1+(z+.9)*1.4,i};
    }).sort((a,b)=>a.z-b.z);

    for(let i=0;i<projected.length;i++){
      const a=projected[i];
      for(let j=i+1;j<Math.min(i+9,projected.length);j++){
        const b=projected[j], d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<150){
          const alpha=(1-d/150)*.11*(.35+(a.z+1)/2);
          bctx.strokeStyle=`rgba(236,233,225,${alpha})`;
          bctx.lineWidth=.55;
          bctx.beginPath();bctx.moveTo(a.x,a.y);bctx.lineTo(b.x,b.y);bctx.stroke();
        }
      }
    }
    projected.forEach(p=>{
      const alpha=.25+.5*(p.z+1)/2;
      bctx.fillStyle=`rgba(245,242,233,${alpha})`;
      bctx.beginPath();bctx.arc(p.x,p.y,p.size,0,Math.PI*2);bctx.fill();
    });

    const activity=document.getElementById('activity');
    if(activity) activity.textContent=`${Math.round(58+22*(.5+.5*Math.sin(t*.0015)))}%`;
    requestAnimationFrame(brainDraw);
  }
  requestAnimationFrame(brainDraw);

  // Magnetic links
  document.querySelectorAll('.magnetic').forEach(el=>{
    el.addEventListener('pointermove',e=>{
      const r=el.getBoundingClientRect(), x=(e.clientX-(r.left+r.width/2))/r.width, y=(e.clientY-(r.top+r.height/2))/r.height;
      el.style.transform=`translate(${x*9}px,${y*7}px)`;
    });
    el.addEventListener('pointerleave',()=>el.style.transform='');
  });
})();
