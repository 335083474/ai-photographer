// Static preview: conventional pixel adjustments only, with no photo uploads.
const jpeg=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('照片无法导出，请换一张重试。')),'image/jpeg',.94));
export async function makeBrowserDemo(file){
  const sourceUrl=URL.createObjectURL(file),image=new Image();
  try{
    image.src=sourceUrl;await image.decode();
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>60000000)throw new Error('照片无法打开或超过 6000 万像素，请换一张较小的照片。');
    const scale=Math.min(1,2400/image.naturalWidth,2400/image.naturalHeight);
    const width=Math.round(image.naturalWidth*scale),height=Math.round(image.naturalHeight*scale);
    const originalCanvas=document.createElement('canvas');originalCanvas.width=width;originalCanvas.height=height;
    const originalCtx=originalCanvas.getContext('2d',{willReadFrequently:true});originalCtx.fillStyle='#fff';originalCtx.fillRect(0,0,width,height);originalCtx.drawImage(image,0,0,width,height);
    const original=await jpeg(originalCanvas),variants=[];
    for(const id of ['natural','photographer','creative']){
      const canvas=document.createElement('canvas'),crop=id==='creative'?.92:1;
      canvas.width=Math.max(1,Math.round(width*crop));canvas.height=Math.max(1,Math.round(height*crop));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(originalCanvas,(width-canvas.width)/2,(height-canvas.height)/2,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
      const brightness=id==='natural'?1.035:id==='photographer'?1.07:1.04,saturation=id==='natural'?1.025:id==='photographer'?1.1:1.12;
      for(let i=0;i<data.length;i+=4){
        const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
        for(let c=0;c<3;c++){let value=(l+(data[i+c]-l)*saturation)*brightness;if(id==='photographer')value=value*1.04-4;if(id==='creative')value=value*.9+[244,231,213][c]*.1;data[i+c]=Math.max(0,Math.min(255,value));}
      }
      ctx.putImageData(pixels,0,0);const blob=await jpeg(canvas);
      const description=id==='natural'?'轻量亮度与色彩调整':id==='photographer'?'更明显的明暗与色彩层次':'收紧取景与暖色氛围，未改变动作或场景';
      variants.push({id,blob,width:canvas.width,height:canvas.height,description});
      canvas.width=canvas.height=1;await new Promise(r=>setTimeout(r,0));
    }
    originalCanvas.width=originalCanvas.height=1;return {original,variants};
  }catch(e){throw new Error(e.message==='The source image cannot be decoded.'?'照片无法打开，请使用 JPG、PNG 或 WebP。':e.message);}finally{URL.revokeObjectURL(sourceUrl);}
}
