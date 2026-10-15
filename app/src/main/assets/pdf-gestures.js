'use strict';
// Zoom only the rendered PDF image; the surrounding WebView stays at scale 1.
window.attachPdfGestures=function(frame){
 const image=frame.querySelector('img'),pointers=new Map();
 let scale=1;
 function zoomTo(value,clientX,clientY){
  const next=Math.max(1,Math.min(4,value));
  if(Math.abs(next-scale)<.0001)return;
  const rect=frame.getBoundingClientRect();
  const x=(clientX??rect.left+frame.clientWidth/2)-rect.left-frame.clientLeft;
  const y=(clientY??rect.top+frame.clientHeight/2)-rect.top-frame.clientTop;
  const left=(frame.scrollLeft+x)*next/scale-x,top=(frame.scrollTop+y)*next/scale-y;
  scale=next;image.style.width=(scale*100)+'%';
  frame.classList.toggle('zoomed',scale>1.001);frame.dataset.zoom=scale.toFixed(3);
  frame.scrollLeft=left;frame.scrollTop=top;
  const resolution=scale>1.01?'4':'2.5';
  if(image.dataset.resolution!==resolution){image.dataset.resolution=resolution;image.src='pdf-page/'+image.dataset.page+'.png?scale='+resolution;}
 }
 function down(event){
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  frame.setPointerCapture(event.pointerId);
 }
 function move(event){
  if(!pointers.has(event.pointerId))return;
  event.preventDefault();const previous=[...pointers.values()];
  const old=pointers.get(event.pointerId),point={x:event.clientX,y:event.clientY};
  pointers.set(event.pointerId,point);
  if(pointers.size===1){frame.scrollLeft-=point.x-old.x;frame.scrollTop-=point.y-old.y;return;}
  const current=[...pointers.values()];
  const distance=points=>Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
  const before=distance(previous),after=distance(current);
  if(before<1)return;
  const x=(current[0].x+current[1].x)/2,y=(current[0].y+current[1].y)/2;
  zoomTo(scale*after/before,x,y);
  frame.scrollLeft-=(current[0].x+current[1].x-previous[0].x-previous[1].x)/2;
  frame.scrollTop-=(current[0].y+current[1].y-previous[0].y-previous[1].y)/2;
 }
 function up(event){pointers.delete(event.pointerId);}
 function toggle(){zoomTo(scale>1.01?1:2.2);}
 function wheel(event){if(event.ctrlKey){event.preventDefault();zoomTo(scale*Math.exp(-event.deltaY*.002),event.clientX,event.clientY);}}
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,dblclick:toggle,wheel};
 frame.dataset.zoom='1.000';image.dataset.resolution='2.5';
 for(const [name,handler]of Object.entries(handlers))frame.addEventListener(name,handler,{passive:false});
 return {toggle,get scale(){return scale;},destroy(){for(const [name,handler]of Object.entries(handlers))frame.removeEventListener(name,handler);pointers.clear();}};
};
