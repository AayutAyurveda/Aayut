/* Aayut sounds: short, soft tones for confirmations, errors and the menu.
   On by default. Browsers only allow sound after a tap, so the first tap unlocks it.
   Visitors can switch sounds off from the menu, and the choice is remembered on this device.
   Pages ask for a sound by dispatching: document.dispatchEvent(new CustomEvent('aayut:sound', {detail: 'success'})) */
(function(){
  'use strict';
  var KEY = 'aayut.sound';
  var ctx = null, unlocked = false;

  function isOn(){
    try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  }
  function setOn(v){
    try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (e) {}
  }
  function audio(){
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock(){
    var c = audio();
    if (c && c.state === 'suspended') c.resume();
    unlocked = true;
  }
  // Notes: [frequency in Hz, start in seconds, length in seconds]
  var PATTERNS = {
    success: [[660, 0, 0.09], [880, 0.1, 0.16]],
    error:   [[220, 0, 0.2]],
    notice:  [[520, 0, 0.12]],
    menu:    [[480, 0, 0.07]]
  };
  function note(c, freq, start, len){
    var t = c.currentTime + start;
    var o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + len + 0.03);
  }
  function play(name){
    if (!isOn() || !unlocked) return;
    var p = PATTERNS[name];
    var c = audio();
    if (!p || !c) return;
    if (c.state === 'suspended') c.resume();
    p.forEach(function(n){ note(c, n[0], n[1], n[2]); });
  }

  window.AayutSound = {
    isOn: isOn,
    play: play,
    toggle: function(){
      setOn(!isOn());
      if (isOn()) play('menu');
      return isOn();
    }
  };

  ['pointerdown', 'keydown'].forEach(function(type){
    document.addEventListener(type, unlock, { once: true, passive: true });
  });
  document.addEventListener('aayut:sound', function(e){ play(e.detail); });
})();
