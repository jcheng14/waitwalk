# WaitWalk for Muse · 可直接复制的 Prompt

用下面这一段做一次**离线测试**。示例是虚构街区，既不用手机定位，也不用地图 API。把这段发给 Muse 不等于安装插件，也不会自动批准系统弹窗。

> 请现在运行 WaitWalk v0.1.1 的离线示例，直接返回一张中英双语 PNG 聊天图片。仓库：https://github.com/jcheng14/waitwalk/tree/v0.1.1
>
> 如果已有 v0.1.1 就复用；否则只取这个版本。请用 WaitWalk 自带的双语渲染，不要让 AI 重画地图，不要改路线、景点顺序或时间。命令：
>
> `node plan-walk.mjs --demo --choices --minutes 30 --lang bilingual --png --output waitwalk-demo.png`
>
> 只发一张 PNG，不要只发 SVG 文件、路径或截图说明。如果输出来了，先确认标题和路线标签没有中文方框，再把 PNG 作为图片发给我。请一句话注明是「本次运行」还是「官方预渲染示例」。
>
> 这是执行请求，不用再问我「要不要跑」。只在平台真的需要你停下请求审批时，指出具体那一项，并在批准后继续。不要读我的定位、切到实地模式或为了测试自动安装依赖。如果当前环境不能执行、缺 PNG 渲染依赖，或 30 秒内没有出图，就用发布页的官方示例 PNG，并说清楚这次没有重新运行。如果连附件也发不了，发官方 PNG 链接即可：
>
> https://github.com/jcheng14/waitwalk/releases/download/v0.1.1/waitwalk-demo-bilingual.png

## What to look for

A successful fresh run produces one map with 30- and 60-minute choices, numbered sights and Chinese/English labels. The fallback is the official, already rendered sample, not evidence that Muse itself ran the code. It should never present a made-up map as a WaitWalk result.

For real locations, use the app or a separately configured trusted connector with the user's permission. A GitHub link cannot install a connector or override an approval required by the chat host.
