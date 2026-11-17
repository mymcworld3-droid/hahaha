(()=>{
'use strict';
const g=id=>document.getElementById(id),source=g('source'),out=g('output'),main=document.querySelector('main'),grid=document.querySelector('main .grid');
if(!source||!out||!grid)return;
const st=document.createElement('style');st.textContent='.rw-layout{display:grid;grid-template-columns:minmax(0,43fr) minmax(0,57fr);gap:16px;align-items:stretch}.rw-panel{background:#fff;border:1px solid #e1e6df;border-radius:16px;overflow:hidden;min-width:0;display:flex;flex-direction:column}.rw-panel h2{font-size:17px;margin:0}.rw-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:14px;border-bottom:1px solid #e5eae3}.rw-actions{display:flex;flex-wrap:wrap;gap:7px}.rw-btn{font:600 13px system-ui,-apple-system,sans-serif;background:#fff;border:1px solid #cbd7ce;border-radius:9px;padding:9px 10px;cursor:pointer;color:#274b3a}.rw-btn.primary{background:#2e5847;border-color:#2e5847;color:#fff}.rw-btn:disabled{opacity:.45;cursor:not-allowed}.rw-body{display:flex;flex-direction:column;gap:8px;padding:14px;flex:1}.rw-small{font-size:12px;color:#5c7564}.rw-original{border-radius:10px;background:#f6f8f5;border:1px solid #e9ede7;padding:11px;line-height:1.75;min-height:70px;max-height:125px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}.rw-edit{width:100%;min-height:104px;border:1px solid #ccd9ce;border-radius:10px;padding:10px;resize:vertical;font:14px/1.75 system-ui,-apple-system,sans-serif}.rw-hint{color:#436249;background:#edf4ed;padding:8px 10px;border-radius:9px;font-size:12px;line-height:1.65}.rw-nav{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.rw-spacer{flex:1}.rw-index{display:flex;gap:5px;overflow:auto;flex-wrap:wrap;padding:10px 13px;border-top:1px solid #e8ebe6;max-height:93px}.rw-index button{border:1px solid #d8dfd9;border-radius:6px;background:#fff;color:#4a5c50;padding:4px 6px;min-width:28px;cursor:pointer}.rw-index button.on{background:#2e5847;color:#fff}.rw-index button.edited{border-color:#74a77c}.rw-meta{background:#f6f8f5;border-top:1px solid #e8ebe6;padding:9px 13px;color:#526558;font-size:12px}.rw-preview{margin-top:16px}.rw-preview textarea{height:240px}.rw-desc{margin-top:12px;padding:12px 14px;border:1px solid #dce9dd;border-radius:11px;background:#f2f7f2;font-size:13px;color:#516c57}@media(max-width:800px){.rw-layout{grid-template-columns:1fr}.rw-layout #source{height:240px}.rw-panel{min-height:400px}}';
document.head.append(st);
const right=out.closest('.panel');grid.className='rw-layout';
const editor=document.createElement('section');editor.className='rw-panel';
editor.innerHTML='<div class="rw-head"><div><h2>逐句修訂</h2><div class="rw-small">直接在這裡選句、修改，不必往下捲動找建議</div></div><div class="rw-actions"><button class="rw-btn primary" id="rw-all">一鍵初步潤飾</button></div></div><div class="rw-body"><div class="rw-nav"><strong id="rw-position">尚未開始</strong><span class="rw-spacer"></span><span class="rw-small" id="rw-label"></span></div><b class="rw-small">原句</b><div class="rw-original" id="rw-original">貼上文字後按「分析文章」。每一句都會出現在這裡。</div><label class="rw-small" for="rw-edit"><b>修訂建議（可以直接編輯）</b></label><textarea id="rw-edit" class="rw-edit"></textarea><div class="rw-hint" id="rw-hint">沒有問題的句子可以保留；可自行修改任何一句。</div><div class="rw-nav"><button class="rw-btn primary" id="rw-apply">套用此句</button><button class="rw-btn" id="rw-keep">保留原句</button><span class="rw-spacer"></span><button class="rw-btn" id="rw-prev">上一句</button><button class="rw-btn" id="rw-next">下一句</button></div></div><div class="rw-index" id="rw-index"></div><div class="rw-meta" id="rw-meta">待分析</div>';
grid.append(editor);grid.after(right);right.classList.add('rw-preview');const h=right.querySelector('h2');if(h)h.textContent='完成稿預覽（複製或下載）';out.readOnly=true;
const note=document.createElement('div');note.className='rw-desc';note.textContent='已支援逐句編輯與可選擇的一鍵修訂。它使用本機規則，不會將全文送到伺服器，也不會虛構你沒寫過的經驗；無法取代 AI 語意改寫，請自行核對每一處建議。';right.after(note);
let units=[],pos=0,history=[],ready=false;
const wordCount=s=>(s.match(/[\u3400-\u9fff]|[A-Za-z0-9]+/g)||[]).length;
const rules=[
 [/總而言之[，,]?/g,'','去掉公式化收尾'],[/不可否認地[，,]?/g,'','去掉空泛強調'],[/值得一提的是[，,]?/g,'','直接說明重點'],[/在當今快節奏的時代[，,]?/g,'','刪除沒有資訊的背景'],
 [/隨著(?:科技|社會|時代)的不斷發展[，,]?/g,'','刪除空泛開頭'],[/至關重要/g,'重要','減少過度強調'],[/深入探討/g,'討論','讓動詞更直接'],[/充分彰顯(?:了)?/g,'顯示','去掉制式讚美'],
 [/我們可以清楚地(?:看出|發現)[，,]?/g,'可以看出','減少迂迴語氣'],[/也許可能|可能也許/g,'可能','避免重複限定詞'],[/進行(?:了)?(?:一(?:次|番))?(分析|比較|研究|討論|檢查)/g,(m,v)=>v+(m.includes('了')?'了':''),'縮短「進行＋動作」']
];
const editable=u=>!u.skip;
function split(text){
 return (text.match(/[^\n。！？!?；;]+[。！？!?；;]?|\n+/g)||[]).map(raw=>{
  const t=raw.trim(),skip=!t||t.length<10||/^#{1,6}\s/.test(t)||/^(?:A|B|C|D|a|b|c|d)[.．、:]?\s*(?:與課本連結|題目內容|SDGs|論點說明)?$/.test(t)||/^(?:字數|題目|班級|座號|姓名)[:：]/.test(t)||/^\d+[.、)]\s/.test(t);
  let suggestion=raw,reason=[];
  if(!skip){
    for(const [rx,repl,why] of rules){rx.lastIndex=0;if(rx.test(suggestion)){rx.lastIndex=0;const next=suggestion.replace(rx,repl);if(next!==suggestion){suggestion=next;reason.push(why);}}}
    if(wordCount(suggestion)>=54){
      const commas=[...suggestion.matchAll(/，/g)].filter(m=>m.index>suggestion.length*.30&&m.index<suggestion.length*.70).sort((a,b)=>Math.abs(a.index-suggestion.length/2)-Math.abs(b.index-suggestion.length/2));
      const match=commas.find(m=>{const tail=suggestion.slice(m.index+1).trim();return wordCount(tail)>16&&!/^(?:而|卻|但|因為|所以|讓|使|也|並|或|及|與|和|則|如果|若|才|才能|不然|甚至|並且)/.test(tail);});
      if(match){suggestion=suggestion.slice(0,match.index)+'。'+suggestion.slice(match.index+1);reason.push('在長句的自然停頓處拆句，請確認語意');}
    }
  }
  return {raw,text:raw,suggestion,reason,skip,reviewed:false};
 });
}
const active=()=>units.filter(editable);
function sync(){out.value=units.map(u=>u.text).join('');g('outputcount').textContent=wordCount(out.value)+' 字';g('draftstatus').textContent='已修改 '+active().filter(u=>u.text!==u.raw).length+' 句';}
function display(){
 const arr=active();if(!arr.length){g('rw-position').textContent='尚未開始';g('rw-original').textContent='貼上文字並按「分析文章」';g('rw-edit').value='';g('rw-index').replaceChildren();g('rw-meta').textContent='待分析';return;}
 pos=Math.max(0,Math.min(arr.length-1,pos));const u=arr[pos];
 g('rw-position').textContent='第 '+(pos+1)+' / '+arr.length+' 句';
 g('rw-label').textContent=u.text!==u.raw?'已套用修改':(u.suggestion!==u.raw?'有建議':'可保留');
 g('rw-original').textContent=u.raw.trim();
 g('rw-edit').value=(u.text===u.raw?u.suggestion:u.text).trim();
 g('rw-hint').textContent=u.reason.join('；')||'這句已經清楚；也可以自行在編輯框改寫，再按「套用此句」。';
 g('rw-prev').disabled=pos===0;g('rw-next').disabled=pos===arr.length-1;
 const elements=arr.map((v,i)=>{const b=document.createElement('button');b.textContent=i+1;b.title='第 '+(i+1)+' 句';b.className=(i===pos?'on ':'')+(v.text!==v.raw?'edited':'');b.onclick=()=>{pos=i;display();};return b;});g('rw-index').replaceChildren(...elements);
 g('rw-meta').textContent='有建議 '+arr.filter(x=>x.suggestion!==x.raw).length+' 句 · 已修改 '+arr.filter(x=>x.text!==x.raw).length+' 句 · 已審閱 '+arr.filter(x=>x.reviewed).length+' 句';
}
function start(){if(!source.value.trim()){source.focus();alert('請先貼上文章');return;}units=split(source.value);history=[];pos=0;ready=true;sync();display();editor.scrollIntoView({block:'start',behavior:'smooth'});}
function snap(){history.push(units.map(u=>[u.text,u.reviewed]));}
function edit(keep=false){const u=active()[pos];if(!u)return;snap();const leading=(u.raw.match(/^\s*/)||[''])[0],trailing=(u.raw.match(/\s*$/)||[''])[0];u.text=keep?u.raw:leading+g('rw-edit').value.trim()+trailing;u.reviewed=true;sync();display();}
g('analyze').onclick=start;g('rw-apply').onclick=()=>edit(false);g('rw-keep').onclick=()=>edit(true);
g('rw-prev').onclick=()=>{pos--;display();};g('rw-next').onclick=()=>{pos++;display();};
g('rw-all').onclick=()=>{if(!ready){start();if(!ready)return;}const changes=active().filter(u=>u.text===u.raw&&u.suggestion!==u.raw);if(!changes.length){alert('目前沒有可套用的固定規則。你仍可逐句編輯文章。');return;}snap();changes.forEach(u=>{u.text=u.suggestion;u.reviewed=true;});sync();display();g('draftstatus').textContent='已自動修改 '+changes.length+' 句，請核對';};
g('safefix').onclick=()=>g('rw-all').click();
g('undo').onclick=()=>{if(!history.length)return;const prev=history.pop();units.forEach((u,i)=>{u.text=prev[i][0];u.reviewed=prev[i][1];});sync();display();};
g('reset').onclick=()=>{if(source.value&&!confirm('確定清空文章與修改稿？'))return;source.value='';out.value='';units=[];history=[];ready=false;pos=0;display();g('inputcount').textContent='0 字';g('outputcount').textContent='0 字';g('draftstatus').textContent='等待輸入';};
g('sample').onclick=()=>{source.value='隨著科技的不斷發展，這項技術的研發至關重要。研究團隊對系統進行了分析，發現了需要改善的問題。\n\n當時的工匠利用尖拱與肋拱頂來傳遞重量，也能利用飛扶壁將向外推的力量傳給外側支柱，這些做法不僅讓建築更高，也讓教堂有更大的彩繪玻璃窗，整個設計需要充足的資金與人力投入。';start();};
window.WritingStudio={version:'2.0',getState:()=>({sentences:active().length,changed:active().filter(u=>u.text!==u.raw).length})};display();
})();