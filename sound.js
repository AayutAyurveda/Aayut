/* Aayut sound.
   Every sound is synthesised here, so nothing has to be downloaded. The sounds share one key (C major):
   short, soft and quick to decay, with a small room reverb. The dive's four layers play a rising phrase,
   so going deeper into the skin has a musical line. Sound only starts after the first tap or key press
   (browsers require that), stays quiet, and can be switched off in the menu. */
(function(){
  'use strict';
  var KEY='aayut.sound';
  var enabled=true;
  try{enabled=localStorage.getItem(KEY)!=='0';}catch(e){}
  var ctx=null,chain=null,live=0,lastAt=0;

  // Room: a short synthetic reverb, and one master chain that keeps the output under control
  function impulse(c,secs,decay){
    var rate=c.sampleRate,len=Math.floor(rate*secs),buf=c.createBuffer(2,len,rate);
    for(var ch=0;ch<2;ch++){var d=buf.getChannelData(ch);for(var i=0;i<len;i++){d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);}}
    return buf;
  }
  function makeChain(c){
    var master=c.createGain();master.gain.value=0.55;
    var comp=c.createDynamicsCompressor();
    comp.threshold.value=-18;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=0.003;comp.release.value=0.2;
    var conv=c.createConvolver();conv.buffer=impulse(c,1.2,3);
    var wetIn=c.createGain();wetIn.gain.value=1;
    var wetOut=c.createGain();wetOut.gain.value=0.2;
    master.connect(comp);comp.connect(c.destination);
    wetIn.connect(conv);conv.connect(wetOut);wetOut.connect(master);
    return {dry:master,wet:wetIn};
  }
  function noiseBuffer(c){
    if(c._aayutNoise)return c._aayutNoise;
    var len=c.sampleRate,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
    for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    c._aayutNoise=buf;return buf;
  }

  // Building blocks: a tone with a fast attack and an exponential decay, and a filtered noise burst
  function tone(c,ch,t,f0,f1,glide,type,peak,decay,rev,detune){
    var o=c.createOscillator();o.type=type||'sine';
    o.frequency.setValueAtTime(f0,t);
    if(f1&&f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+(glide||0.05));
    if(detune)o.detune.value=detune;
    var g=c.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.004+decay);
    var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=7000;lp.Q.value=0.4;
    o.connect(g);g.connect(lp);lp.connect(ch.dry);
    if(rev){var s=c.createGain();s.gain.value=rev;lp.connect(s);s.connect(ch.wet);}
    o.start(t);o.stop(t+0.004+decay+0.03);
  }
  function burst(c,ch,t,kind,freq,freq2,peak,dur,attack,rev){
    var src=c.createBufferSource();src.buffer=noiseBuffer(c);
    var f=c.createBiquadFilter();f.type=kind;f.frequency.setValueAtTime(freq,t);
    if(freq2)f.frequency.exponentialRampToValueAtTime(freq2,t+dur);
    f.Q.value=0.9;
    var g=c.createGain(),a=attack||0.006;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(f);f.connect(g);g.connect(ch.dry);
    if(rev){var s=c.createGain();s.gain.value=rev;g.connect(s);s.connect(ch.wet);}
    src.start(t);src.stop(t+dur+0.03);
  }

  // The sounds. Each returns how long it lasts, in seconds.
  var LAYER=[523.25,659.25,783.99,987.77]; // C5 E5 G5 B5: the dive's rising phrase
  var SOUNDS={
    tap:function(c,ch,t){
      tone(c,ch,t,1046.5,880,0.04,'sine',0.10,0.09);
      burst(c,ch,t,'highpass',3200,null,0.035,0.012,0.002);
      return 0.14;
    },
    press:function(c,ch,t){
      tone(c,ch,t,659.25,523.25,0.05,'sine',0.12,0.14);
      tone(c,ch,t,1318.5,1318.5,0,'sine',0.02,0.05);
      burst(c,ch,t,'bandpass',1800,null,0.03,0.012,0.002);
      return 0.18;
    },
    select:function(c,ch,t){
      tone(c,ch,t,740,988,0.09,'sine',0.10,0.24,0.12);
      tone(c,ch,t+0.01,1480,1480,0,'sine',0.035,0.14);
      return 0.28;
    },
    tab:function(c,ch,t){
      tone(c,ch,t,1318.5,1318.5,0,'sine',0.085,0.10);
      burst(c,ch,t,'highpass',4000,null,0.09,0.008,0.001);
      return 0.14;
    },
    toggle_on:function(c,ch,t){tone(c,ch,t,880,1320,0.07,'sine',0.10,0.16,0.08);return 0.2;},
    toggle_off:function(c,ch,t){tone(c,ch,t,1320,880,0.07,'sine',0.10,0.16,0.08);return 0.2;},
    layer:function(c,ch,t,i){
      var f=LAYER[Math.max(0,Math.min(3,i|0))];
      tone(c,ch,t,f,f,0,'sine',0.14,0.9,0.35);
      tone(c,ch,t,2*f,2*f,0,'sine',0.05,0.35,0.2);
      tone(c,ch,t,3*f,3*f,0,'sine',0.02,0.18);
      return 1.0;
    },
    section:function(c,ch,t){
      burst(c,ch,t,'bandpass',700,1400,0.09,0.6,0.12,0.3);
      return 0.65;
    },
    menu:function(c,ch,t){
      burst(c,ch,t,'bandpass',500,2400,0.14,0.24,0.06,0.1);
      return 0.26;
    },
    notice:function(c,ch,t){
      tone(c,ch,t,1174.66,1174.66,0,'sine',0.08,0.5,0.25);
      tone(c,ch,t+0.08,1567.98,1567.98,0,'sine',0.07,0.5,0.25);
      return 0.65;
    },
    success:function(c,ch,t){
      var notes=[523.25,659.25,783.99,1046.5];
      notes.forEach(function(f,i){
        tone(c,ch,t+i*0.085,f,f,0,'triangle',0.07,0.9,0.3);
        tone(c,ch,t+i*0.085,f,f,0,'sine',0.04,0.9);
      });
      return 1.1;
    },
    error:function(c,ch,t){
      tone(c,ch,t,329.63,329.63,0,'triangle',0.08,0.25);
      tone(c,ch,t+0.14,261.63,261.63,0,'triangle',0.09,0.4);
      return 0.6;
    },
    bell:function(c,ch,t){
      tone(c,ch,t,1318.5,1318.5,0,'sine',0.12,1.2,0.35);
      tone(c,ch,t,2637,2637,0,'sine',0.03,0.4,0.2);
      return 1.3;
    }
  };

  function ensure(){
    if(ctx)return ctx;
    var C=window.AudioContext||window.webkitAudioContext;
    if(!C)return null;
    ctx=new C();chain=makeChain(ctx);
    return ctx;
  }
  function play(name,arg){
    if(!enabled||!SOUNDS[name])return;
    var now=performance.now();
    if(name!=='success'&&name!=='error'&&now-lastAt<30)return; // a little spacing, so fast taps do not pile up
    lastAt=now;
    if(live>14)return;
    var c=ensure();if(!c)return;
    if(c.state==='suspended')c.resume();
    var d=SOUNDS[name](c,chain,c.currentTime+0.01,arg)||0.2;
    live++;setTimeout(function(){live--;},d*1000);
  }
  function unlock(){
    if(!enabled)return;
    var c=ensure();
    if(c&&c.state==='suspended')c.resume();
  }

  // What each kind of tap sounds like
  function mapTarget(el){
    if(!el||!el.closest)return null;
    if(el.closest('[disabled],[aria-disabled="true"]'))return null;
    if(el.closest('.slot,.pq-opt'))return 'select';
    if(el.closest('.seg button,.dtabs button,.chip'))return 'tab';
    if(el.closest('.btn,.wide,#b-go'))return 'press';
    if(el.closest('button'))return 'tap';
    if(el.closest('a'))return 'tap';
    return null;
  }
  document.addEventListener('pointerdown',function(e){
    if(e.button&&e.button!==0)return;
    unlock();
    var n=mapTarget(e.target);
    if(n){
      play(n);
      if(enabled&&navigator.vibrate)navigator.vibrate(n==='press'?10:6);
    }
  },{passive:true});
  document.addEventListener('keydown',function(e){
    unlock();
    if(e.key==='Enter'||e.key===' '){var n=mapTarget(e.target);if(n)play(n);}
  });
  document.addEventListener('change',function(e){
    var t=e.target;
    if(t&&t.matches&&t.matches('input[type=checkbox]'))play(t.checked?'toggle_on':'toggle_off');
  });
  document.addEventListener('aayut:layer',function(e){play('layer',e.detail);});
  document.addEventListener('aayut:section',function(){play('section');});
  document.addEventListener('aayut:sound',function(e){play(e.detail);});
  document.addEventListener('visibilitychange',function(){
    if(!ctx)return;
    if(document.hidden&&ctx.state==='running')ctx.suspend();
    else if(!document.hidden&&ctx.state==='suspended'&&enabled)ctx.resume();
  });

  // Toasts speak too: a gentle notice, or an error tone when the message reports a problem
  var ERR=/could not|not right|refus|invalid|wrong|warning|please|only|cannot|not available|too many|expired|must|fail|not checked|does not/i;
  function wrapToast(){
    if(typeof window.toast!=='function')return;
    var orig=window.toast;
    window.toast=function(m){
      play(ERR.test(String(m))?'error':'notice');
      return orig.apply(this,arguments);
    };
  }
  wrapToast();

  window.AayutSound={
    play:play,
    isOn:function(){return enabled;},
    set:function(on){
      enabled=!!on;
      try{localStorage.setItem(KEY,enabled?'1':'0');}catch(e){}
      if(enabled)play('tap');
    },
    toggle:function(){this.set(!enabled);return enabled;},
    // used by the tests: renders one sound offline
    _render:function(name,arg){
      var C=window.OfflineAudioContext||window.webkitOfflineAudioContext;
      var oc=new C(1,44100*2.5,44100),ch=makeChain(oc);
      SOUNDS[name](oc,ch,0.01,arg);
      return oc.startRendering();
    },
    _names:Object.keys(SOUNDS)
  };
})();
