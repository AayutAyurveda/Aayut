/* Aayut shared menu.
   Website, portal and patient form: a floating menu button.
   Staff app (/staff/): public links are added to the existing ⋮ menu.
   Both have a sound switch. */
(function(){
  'use strict';
  var path=location.pathname;
  // The staff app lives in /staff/ (GitHub Pages serves a folder path as its index.html).
  var inStaff=/\/staff(\/|\/index\.html)?$/i.test(path);
  var root=inStaff?'../':'';
  var file=(path.split('/').pop()||'').toLowerCase();
  var here=inStaff?'staff/':(file||'index.html');

  function staffRole(){
    try{var s=JSON.parse(sessionStorage.getItem('pp-staff')||'null');return(s&&s.exp>Date.now()+60000)?(s.role||'staff'):'';}
    catch(e){return '';}
  }
  function patientIn(){return !!sessionStorage.getItem('aayut.portal');}

  var PUBLIC=[['About Aayut','index.html'],['Book a visit','index.html#book'],['Contact us','index.html#contact']];

  function link(label,href,cls){
    var a=document.createElement('a');
    a.href=root+href;a.textContent=label;
    if(cls)a.className=cls;
    if(href.indexOf('#')<0&&href.toLowerCase()===here)a.setAttribute('aria-current','page');
    return a;
  }
  function soundSwitch(){
    var b=document.createElement('button');
    b.type='button';b.className='sx-link';
    var paint=function(){
      var on=window.AayutSound?AayutSound.isOn():false;
      b.textContent='Sounds: '+(on?'on':'off');
      b.setAttribute('aria-pressed',String(on));
    };
    paint();
    b.addEventListener('click',function(){if(window.AayutSound)AayutSound.toggle();paint();});
    return b;
  }

  if(inStaff){
    var menu=document.getElementById('menu');
    if(!menu)return;
    var frag=document.createDocumentFragment();
    var head=document.createElement('p');head.className='sx-head';head.textContent='Website';frag.appendChild(head);
    PUBLIC.concat([['Patient portal','portal.html']]).forEach(function(p){frag.appendChild(link(p[0],p[1],'sx-link'));});
    frag.appendChild(soundSwitch());
    menu.insertBefore(frag,menu.firstChild);
    return;
  }

  var items=PUBLIC.slice();
  items.push(patientIn()?['My records','portal.html']:['Patient login','portal.html']);
  if(staffRole()){items.push(['Open the staff app','staff/']);}
  else{items.push(['Staff login','staff/']);items.push(['Doctor login','staff/#doctor']);}

  var wrap=document.createElement('div');wrap.className='sx';
  var btn=document.createElement('button');
  btn.className='sx-btn';btn.type='button';btn.setAttribute('aria-label','Menu');
  btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','sx-panel');
  btn.innerHTML='<span></span><span></span><span></span>';
  var panel=document.createElement('nav');
  panel.id='sx-panel';panel.className='sx-panel';panel.setAttribute('aria-label','Aayut');
  items.forEach(function(p){panel.appendChild(link(p[0],p[1]));});
  panel.appendChild(soundSwitch());
  wrap.appendChild(panel);wrap.appendChild(btn);
  document.body.appendChild(wrap);

  // Opening and closing both animate: the panel leaves the way it came in
  function setOpen(open){
    if(open){
      panel.classList.remove('closing');panel.classList.add('open');
      if(window.AayutSound)AayutSound.play('menu');
    }else if(panel.classList.contains('open')&&!panel.classList.contains('closing')){
      panel.classList.add('closing');
      setTimeout(function(){panel.classList.remove('open','closing');},220);
    }
    btn.setAttribute('aria-expanded',String(open));
  }
  btn.addEventListener('click',function(e){e.stopPropagation();setOpen(!panel.classList.contains('open')||panel.classList.contains('closing'));});
  document.addEventListener('click',function(e){if(!wrap.contains(e.target))setOpen(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){setOpen(false);btn.focus();}});
})();
