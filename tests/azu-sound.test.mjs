import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSiteSound} from '../public/azu-ip/sound.js';

class Target {
  listeners=new Map();attributes={};hidden=false;dataset={};
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  dispatchEvent(event){for(const fn of this.listeners.get(event.type)||[])fn(event);return true;}
  async fire(type,extra={}){await Promise.all((this.listeners.get(type)||[]).map(fn=>fn({type,target:this,...extra})));}
  setAttribute(name,value){this.attributes[name]=value;}
  closest(selector){return selector.includes(`#${this.id}`)?this:null;}
}
function harness(saved='on'){
  let allowed=false,now=1;
  const contexts=[],storage=new Map([['azu-sound',saved]]),doc=new Target(),win=new Target(),toggle=new Target();
  toggle.id='sound-toggle';doc.documentElement=new Target();doc.body={append(element){doc.hint=element;}};
  doc.createElement=()=>new Target();doc.getElementById=id=>id==='sound-toggle'?toggle:null;
  const param=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({gain:param(),frequency:param(),connect(next){return next;},disconnect(){}});
  class Context extends Target {
    constructor(){super();this.state='suspended';this.destination={};this.oscillators=[];contexts.push(this);}
    get currentTime(){return now;}
    setState(value){this.state=value;this.dispatchEvent({type:'statechange'});}
    resume(){if(allowed){this.setState('running');return Promise.resolve();}return new Promise(()=>{});}
    createGain(){return node();}
    createAnalyser(){return {...node(),getFloatTimeDomainData(values){values.fill(.1);}};}
    createOscillator(){const osc={...node(),stops:[],start(){this.started=true;},stop(at){this.stops.push(at);}};this.oscillators.push(osc);return osc;}
  }
  Object.assign(win,{AudioContext:Context});
  Object.assign(globalThis,{document:doc,window:win,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});
  const sound=createSiteSound();
  return {sound,doc,win,toggle,contexts,storage,allow:()=>{allowed=true;},advance:()=>{now+=.1;}};
}

test('blocked deep link reports waiting; clicking its speaker enables instead of saving mute',async()=>{
  const h=harness();
  assert.equal(h.doc.documentElement.dataset.sound,'waiting');
  assert.equal(h.toggle.attributes['aria-label'],'开启音效');
  assert.equal(h.toggle.attributes['aria-pressed'],'false');
  assert.equal(h.doc.hint.hidden,false);
  h.allow();await h.doc.fire('pointerdown',{target:h.toggle});await h.toggle.fire('click');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.storage.get('azu-sound'),'on');
  assert.equal(h.doc.documentElement.dataset.sound,'ready');
  assert.equal(h.doc.hint.hidden,true);
  assert.equal(h.contexts[0].oscillators.length,1,'first enable must give audible feedback');
});

test('entry unlock waits for running, even with an older blocked resume promise',async()=>{
  const h=harness();h.allow();
  const context=await h.sound.ready();
  assert.equal(context.state,'running');
  assert.equal(h.contexts.length,1);
});

test('explicit mute survives reload/recovery until enabled by the visitor',async()=>{
  const h=harness('off');h.allow();
  await h.win.fire('pageshow');await h.win.fire('focus');
  assert.equal(h.contexts.length,0);assert.equal(h.doc.documentElement.dataset.sound,'off');
  await h.toggle.fire('click');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.storage.get('azu-sound'),'on');
  await h.toggle.fire('click');
  assert.equal(h.storage.get('azu-sound'),'off');
  assert.equal(h.doc.documentElement.dataset.sound,'off');
});

test('visibility, browser back and focus recover suspended or interrupted audio',async()=>{
  const h=harness();h.allow();await h.sound.ready();
  const context=h.contexts[0];
  for(const event of ['visibilitychange','pageshow','focus']){
    context.setState('interrupted');
    assert.equal(h.doc.documentElement.dataset.sound,'waiting');
    await (event==='visibilitychange'?h.doc:h.win).fire(event);
    assert.equal(h.doc.documentElement.dataset.sound,'ready',event);
  }
  context.setState('closed');await h.win.fire('pageshow');
  assert.equal(h.contexts.length,2);assert.equal(h.doc.documentElement.dataset.sound,'ready');
});

test('rapid card crossings are throttled; a new note fades the previous voice, hidden tabs stay silent',async()=>{
  const h=harness();h.allow();await h.sound.ready();const context=h.contexts[0];
  h.sound.card();h.sound.card();h.sound.card();
  assert.equal(context.oscillators.length,1);
  h.advance();h.sound.card();
  assert.equal(context.oscillators.length,2);assert.equal(context.oscillators[0].stops.length,2);
  h.doc.hidden=true;await h.doc.fire('visibilitychange');h.advance();h.sound.card();
  assert.equal(context.oscillators.length,2);
});

test('a reload cannot confuse the saved on preference with actual audio readiness',async()=>{
  const first=harness();first.allow();await first.sound.ready();assert.equal(first.doc.documentElement.dataset.sound,'ready');
  const next=harness('on');assert.equal(next.doc.documentElement.dataset.sound,'waiting');
  next.allow();await next.doc.hint.fire('click');
  assert.equal(next.doc.documentElement.dataset.sound,'ready');
});
