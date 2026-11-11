# Momolab · 眉姐姐的专属世界

为一只宠物定制的互动冒险游戏。纯静态站点，无需构建、无需后端，双击就能玩。

![单页游戏](index.html)

## 怎么打开

**推荐：** 双击 `启动游戏.bat`，会起一个本地服务并自动打开浏览器（拍照和下载功能需要它）。

**也可以：** 直接双击 `index.html`。除了「拍照」保存图片可能被浏览器同源策略拦住，其余功能都能用。

手动起服务：

```
cd momolab
python -m http.server 8010
# 浏览器打开 http://127.0.0.1:8010
```

## 能玩什么

| 区域 | 内容 |
|---|---|
| 宠物小屋 | 壁炉休息、书架旧相册、毛线球、圆窗发呆 |
| 花园 | 浇水让花圃开花、采郁金香、追蝴蝶、从藤蔓拱门进森林 |
| 森林 | 开宝箱、采蘑菇、捉萤火、按藏宝图线索寻宝 |
| 湖泊 | 完成 2 款小游戏解锁；鱼群、睡莲、贝壳、码头小游戏 |
| 秘密区域 | 四款小游戏全通后解锁；记忆水晶、爪印徽章、月光花 |

互动：摸摸 / 喂食 / 陪玩 / 呼唤 / 休息 / 拍照。九种表情 + 程序化动作 + 粒子反馈。

小游戏：寻找零食（限时找物）、接住玩具（Canvas 物理 + 连击）、记忆翻牌（3D 翻牌）、森林寻宝（三段线索）。

系统：每日任务与探索任务、四项成长属性、收藏图鉴与佩戴装饰、相册（下载 / 分享）、设置与重新开始。

三条里程碑：集满 8 种收藏解锁「奶油蝴蝶结」；完成任意 2 款小游戏解锁湖泊（首次到湖边获得「格纹围巾」）；四款小游戏全部通关解锁秘境并拿到「猫耳贝雷帽」。

## 结构

```
index.html                  唯一入口，所有界面在同页
assets/config/game-config.js  客户专属配置（第一处要改的文件）
assets/img/scenes/          5 张世界场景 + 开场主视觉
assets/pets/pet001/         9 张统一机位的宠物表情立绘
assets/props/ assets/deco/  食物、玩具、道具、装饰素材
css/style.css               设计系统与全部布局（含桌面 / 移动两套）
js/icons.js                 内联 SVG 图标库（不用 emoji 当素材）
js/store.js                 存档、属性、物品、每日计数、区域解锁
js/audio.js                 WebAudio 实时合成的 BGM 与音效
js/pet.js                   角色控制器：表情 / 动作 / 语言 / 粒子
js/world.js                 场景切换、热点交互、区域解锁
js/interact.js              六种互动与拍照合成
js/tasks.js                 每日 / 探索任务与奖励结算
js/ui.js                    Toast、抽屉、面板、HUD
js/album.js                 相册存储、下载、分享
js/minigames.js             四款小游戏
js/panels.js                游戏中心 / 任务 / 收藏 / 设置 / 宠物资料 / 关于
js/app.js                   启动、开场、导航接线
```

## 换成另一只宠物（不用改逻辑）

1. 把新宠物的表情立绘放进 `assets/pets/pet001/`，保持同一机位、同一比例；
2. 把新场景图放进 `assets/img/scenes/`；
3. 改 `assets/config/game-config.js` 里的 `petName / petBreed / petIntro / petCharacterAssets / sceneAssets / areas / items / tasks / branding`；
4. 刷新即生效。品牌署名在 `branding.showCredit` 一处开关。

游戏核心逻辑全部从配置读取，换素材、换文案、换主题都不需要改 `js/` 下的代码。

## 存档

存在浏览器 `localStorage`：

- `momolab.save.v1` 游戏进度、属性、收藏、任务、成绩
- `momolab.album.v1` 相册（保留最近 12 张，压缩后存储）

清浏览器数据会一起清掉。设置页有「重新开始」。

## 已知边界

- 相册写入受 localStorage 容量限制，只保留最近 12 张。
- 拍照导出需要 `http://` 环境（`启动游戏.bat` 已经处理）；`file://` 下会提示改用本地服务。
- 角色动作为「统一机位立绘 + 程序化动作」，如需逐帧行走序列，把 `petCharacterAssets.states` 换成帧数组即可。
