import {FEEDBACK} from './feedback.js';
export const supportsDemoFeedback=feedback=>['lighting','color','realism'].includes(feedback.issue)||feedback.issue==='composition'&&feedback.direction==='closer';
// Conventional, local adjustments for an explicitly labelled workflow preview.
export async function makeDemoRevision(original,feedback){
  if(!supportsDemoFeedback(feedback))throw new Error('这项调整需要接入真实 AI，当前不会生成替代图片或扣除补做次数。');
  const image=new Image();image.src=original;await image.decode();
  const scale=Math.min(1,2400/image.naturalWidth,2400/image.naturalHeight),width=Math.round(image.naturalWidth*scale),height=Math.round(image.naturalHeight*scale),crop=feedback.issue==='composition'?.86:1;
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*crop));canvas.height=Math.max(1,Math.round(height*crop));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  const cropWidth=image.naturalWidth*crop,cropHeight=image.naturalHeight*crop;
  ctx.drawImage(image,(image.naturalWidth-cropWidth)/2,(image.naturalHeight-cropHeight)/2,cropWidth,cropHeight,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
  for(let i=0;i<data.length;i+=4){
    const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
    for(let c=0;c<3;c++){
      let value=data[i+c];
      if(feedback.issue==='lighting'){if(feedback.direction==='brighter')value*=1.14;else if(feedback.direction==='softer')value=value*.9+15;else value=value*1.15-16;}
      if(feedback.issue==='color'){const strength=feedback.direction==='natural'?.95:1.02;value=l+(value-l)*strength;if(feedback.direction==='warm')value+=(c===0?9:c===2?-7:0);if(feedback.direction==='cool')value+=(c===0?-6:c===2?9:0);}
      if(feedback.issue==='realism')value=l+(value-l)*.9;
      data[i+c]=Math.max(0,Math.min(255,value));
    }
  }
  ctx.putImageData(pixels,0,0);const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('照片暂时无法导出，请重试。')),'image/jpeg',.94));
  const result={blob,width:canvas.width,height:canvas.height,note:`${FEEDBACK[feedback.issue].choices[feedback.direction]} · 本地调色/裁剪演示，未调用 AI`};canvas.width=canvas.height=1;return result;
}
