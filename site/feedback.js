// Stable feedback codes shared by the browser and backend. Customer notes are data.
export const FEEDBACK={
  lighting:{label:'光线不舒服',choices:{brighter:'主体亮一些',softer:'光线柔和一些',contrast:'明暗层次更清楚'}},
  color:{label:'颜色不喜欢',choices:{natural:'颜色自然一些',warm:'氛围温暖一些',cool:'色调清冷一些'}},
  composition:{label:'构图还不够好',choices:{closer:'主体更突出',space:'保留更多环境和留白',balance:'画面更平衡'}},
  realism:{label:'修得太重',choices:{subtle:'接近原片一些',texture:'保留真实纹理',restrained:'减少夸张效果'}},
  identity:{label:'人物或主体不像了',choices:{preserve:'更贴近原片特征',skin:'肤色与质感真实一些',shape:'保留原有外形与比例'}},
  pose:{label:'动作不自然',choices:{original:'保留原来的动作',relaxed:'动作放松一些',natural:'姿态自然一些'}},
  background:{label:'背景不合适',choices:{preserve:'保留原来的背景',clean:'背景简洁一些',depth:'前后景层次更清楚'}},
};
export function feedbackIssues(subjects=[]){return ['lighting','color','composition','realism',...(subjects.some(s=>['portrait','group','pet','product'].includes(s))?['identity']:[]),...(subjects.some(s=>['portrait','group','pet'].includes(s))?['pose']:[]),'background'];}
export function normalizeFeedback(input,{bases,subjects=[]}){
  if(!input||typeof input!=='object'||!bases.includes(input.base)||!feedbackIssues(subjects).includes(input.issue)||!Object.hasOwn(FEEDBACK[input.issue].choices,input.direction)||input.notes!==undefined&&typeof input.notes!=='string')throw new Error('请选择参考版本、主要问题和调整方向。');
  const notes=(input.notes||'').trim();if(notes.length>200||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(notes))throw new Error('补充说明请控制在 200 字以内。');
  return {base:input.base,issue:input.issue,direction:input.direction,notes};
}
