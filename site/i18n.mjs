export const LANG_EN='en';
export const LANG_BILINGUAL='bilingual';
export const isBilingual = lang => lang===LANG_BILINGUAL;
export const cjkFont='Noto Sans CJK SC, PingFang SC, Microsoft YaHei, WenQuanYi Zen Hei, DejaVu Sans, sans-serif';
export const categories={
 coffee:{en:'Coffee',zh:'咖啡'},
 nature:{en:'Green space',zh:'绿地'},
 photo:{en:'Photo spot',zh:'拍照点'},
 culture:{en:'Culture',zh:'人文'}
};
const demoChinese={
 'Mosslight Pocket Garden':'苔光小花园','The Little Mosaic':'小小马赛克','Little Fern Coffee':'小蕨咖啡',
 'Alder Lane Books':'桤木巷书店','Lantern Espresso':'灯笼咖啡馆','Fern Steps':'蕨径台阶',
 'Three Swallows Mural':'三燕壁画','Juniper Bakehouse':'杜松面包房','Rose Tile Stairs':'玫瑰砖阶',
 'Mosswing Tree':'苔翼树','Button House':'纽扣屋','Book Nest':'书窝',
 'Frog Tile Wall':'青蛙砖墙','Clover Pocket Park':'三叶草小公园','South Creek Gardens':'南溪花园',
 'Lantern Steps':'灯笼台阶','Creekside Ferns':'溪畔蕨丛','Plover Arch':'鸻鸟拱门',
 'Stone Bridge View':'石桥观景点','Overlook Terrace':'观景露台','Footbridge Café':'步桥咖啡',
 'Paper Lantern Arcade':'纸灯廊','West Orchard Trail':'西果园小径','Creek Footbridge':'溪上步桥',
 'Lookout Grove':'瞭望林','Sparrow Roasters':'麻雀烘焙咖啡','The Clockmaker’s Courtyard':'钟匠小院','Hilltop View':'山顶观景点'
};
export function localLabel(place,bilingual){
 const raw=place.name||'';
 if(!bilingual)return raw;
 const names=place.names||{};
 const zh=place.demo?demoChinese[raw]:(names.zh||'');
 const en=names.en||raw;
 if(zh&&zh!==raw&&zh!==en)return names.en&&raw!==en?raw+' / '+en+' / '+zh:raw+' / '+zh;
 if(names.en&&names.en!==raw)return raw+' / '+names.en;
 return raw;
}
export function trimText(value,count){
 const chars=[...String(value||'')];
 return chars.length>count?chars.slice(0,Math.max(1,count-1)).join('')+'…':chars.join('');
}
