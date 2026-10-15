// A small shared ZIP writer for the three JPEGs. STORE keeps image bytes exact.
// ZIP64, arbitrary paths and archives over 512 MiB are deliberately unsupported.
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,value)=>{for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
function crc32(bytes){let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
export function createZip(entries){
  if(!Array.isArray(entries)||entries.length<1||entries.length>100)throw new Error('压缩包文件数量不正确。');
  const names=new Set();let localSize=0,centralSize=0;
  const files=entries.map(entry=>{
    if(typeof entry.name!=='string'||!entry.name||/[\\/\x00-\x1f]/.test(entry.name)||entry.name==='.'||entry.name==='..'||names.has(entry.name)||!(entry.bytes instanceof Uint8Array))throw new Error('压缩包文件格式不正确。');
    names.add(entry.name);const name=encoder.encode(entry.name);if(name.length>65535)throw new Error('压缩包文件名过长。');
    const file={name,bytes:entry.bytes,crc:crc32(entry.bytes),offset:localSize};localSize+=30+name.length+file.bytes.length;centralSize+=46+name.length;return file;
  });
  const size=localSize+centralSize+22;if(size>512*1024*1024)throw new Error('压缩包过大，请重新处理照片。');
  const output=new Uint8Array(size),view=new DataView(output.buffer);let at=0;
  const u16=(offset,value)=>view.setUint16(at+offset,value,true),u32=(offset,value)=>view.setUint32(at+offset,value,true);
  for(const file of files){
    u32(0,0x04034b50);u16(4,20);u16(6,0x0800);u16(8,0);u16(12,0x21);u32(14,file.crc);u32(18,file.bytes.length);u32(22,file.bytes.length);u16(26,file.name.length);
    output.set(file.name,at+30);output.set(file.bytes,at+30+file.name.length);at+=30+file.name.length+file.bytes.length;
  }
  for(const file of files){
    u32(0,0x02014b50);u16(4,20);u16(6,20);u16(8,0x0800);u16(10,0);u16(14,0x21);u32(16,file.crc);u32(20,file.bytes.length);u32(24,file.bytes.length);u16(28,file.name.length);u32(42,file.offset);
    output.set(file.name,at+46);at+=46+file.name.length;
  }
  u32(0,0x06054b50);u16(8,files.length);u16(10,files.length);u32(12,centralSize);u32(16,localSize);return output;
}
