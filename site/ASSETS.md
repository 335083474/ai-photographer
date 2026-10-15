# 素材来源

以下图库照片用于交互原型，不代表真实用户、真实 AI 修图前后结果或案例授权。页面用 CSS 呈现裁切、光影或色彩变化，显式标记为演示作品墙。没有编造用户评价、使用人数或能力指标。

来源：Unsplash 图片 CDN。许可参考 https://unsplash.com/license 。项目保留下载的示例图片；生产发布前应再次核对所选图片对应的许可和可识别人物、商标等使用边界。

| 本地文件 | 图片来源 |
|---|---|
| dist/assets/portrait.jpg | https://images.unsplash.com/photo-1534528741775-53994a69daeb |
| dist/assets/travel.jpg | https://images.unsplash.com/photo-1501785888041-af3ef285b470 |
| dist/assets/food.jpg | https://images.unsplash.com/photo-1512621776951-a57141f2eefd |
| dist/assets/pet.jpg | https://images.unsplash.com/photo-1552053831-71594a27632d |
| dist/assets/product.jpg | https://images.unsplash.com/photo-1608571423902-eed4a5ad8108 |
| dist/assets/night.jpg | https://images.unsplash.com/photo-1519608487953-e999c86e7455 |
| dist/assets/architecture.jpg | https://images.unsplash.com/photo-1518005020951-eccb494ad742 |
| dist/assets/coast.jpg | https://images.unsplash.com/photo-1518837695005-2083093ee35b |
| dist/assets/coffee.jpg | https://images.unsplash.com/photo-1447933601403-0c6688de566e |

新增动作演示：`dist/assets/pose-diptych.png`，使用内置 Imagegen 生成同一成年女性在相近场景中的僵硬/放松姿态概念对比。原始图不改动，前后画面由 CSS 分别显示。完整提示词见 `POSE_ASSET_PROMPT.md`。素材不是产品模型实测结果。

三类实测新增原片：Nursultan Rakysh，Man looking at lake, Almaty，来源 [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Man_looking_at_lake,_Almaty_(Unsplash).jpg) / Unsplash。2026-10-13读取来源页，页面标注CC0。源JPEG保存在 `test-runs/20261013-three-categories-v1/person_in_landscape/source.jpg`；实际输入和展示原片去除EXIF、长边缩到2048、JPEG质量95，没有裁切或AI预编辑，哈希见同目录 `input.json`。新增三张编辑是本轮会员网页真实输出，完整提示词、对话来源、结果和失败评审均保留。

字体：Noto Serif SC，Google Fonts https://fonts.google.com/noto/specimen/Noto+Serif+SC 。
