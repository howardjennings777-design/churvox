(function(){
  if(typeof window==="undefined"||typeof document==="undefined")return;
  const skip=/^(SCRIPT|STYLE|SVG|PATH|NOSCRIPT)$/;
  function rgb(v){let m=String(v||"").match(/rgba?\(([^)]+)\)/);if(!m)return null;let a=m[1].split(",").map(x=>parseFloat(x));if(a.length<3||a.some(Number.isNaN))return null;if(a[3]!==undefined&&a[3]<.15)return null;return{r:a[0],g:a[1],b:a[2]}}
  function lum(c){return !c?255:(.299*c.r+.587*c.g+.114*c.b)}
  function bg(el){for(let n=el;n&&n!==document;n=n.parentElement){let c=rgb(getComputedStyle(n).backgroundColor);if(c)return c}return{r:255,g:255,b:255}}
  function contrast(a,b){let x=lum(a)+.05,y=lum(b)+.05;return x>y?x/y:y/x}
  function hasText(el){return Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim())}
  function fix(){
    document.querySelectorAll("main *").forEach(el=>{
      if(!(el instanceof HTMLElement)||skip.test(el.tagName))return;
      let cs=getComputedStyle(el), b=bg(el), c=rgb(cs.color);
      let bad=(hasText(el)||/INPUT|TEXTAREA|SELECT|BUTTON/.test(el.tagName)) && (!c||contrast(c,b)<2.7||parseFloat(cs.opacity)<.55);
      if(!bad)return;
      let darkBg=lum(b)<145, col=darkBg?"#f9fafb":"#111827";
      el.style.setProperty("color",col,"important");
      el.style.setProperty("-webkit-text-fill-color",col,"important");
      el.style.setProperty("opacity","1","important");
    });
  }
  new MutationObserver(()=>requestAnimationFrame(fix)).observe(document.documentElement,{subtree:true,childList:true,attributes:true});
  window.addEventListener("load",fix);
  document.addEventListener("DOMContentLoaded",fix);
  setInterval(fix,1200);
  fix();
})();
