/* ============================================================
 * Momolab · 客户专属配置
 * ------------------------------------------------------------
 * 换一只宠物、换一个世界，只需要改这个文件，不用碰游戏核心代码。
 * 通用引擎读取：宠物资料 / 世界场景 / 互动文案 / 小游戏 / 物品 / 任务 / 品牌署名
 * ============================================================ */
window.MOMO_CONFIG = {
  version: "1.0",
  projectId: "momo-meijiejie",

  /* ---------- 游戏名称与介绍 ---------- */
  gameName: "Momolab",
  gameSubtitle: "眉姐姐的专属世界",
  gameDescription: "一只虎斑小猫的私人冒险岛。在这里陪她晒太阳、找零食、去森林探险，把每一个瞬间收进相册。",
  gameTagline: "每一只宠物，都有一个自己的世界",

  opening: {
    keyArt: "assets/img/scenes/keyart-opening.jpg",
    eyebrow: "MO MOLAB · 专属宠物游戏",
    startLabel: "开始游戏",
    continueLabel: "继续游戏",
    skipLabel: "跳过",
    intro: [
      { title: "这是眉姐姐的世界", text: "一座藏在山丘上的小屋，推门就是花园，往深处走是森林和湖泊。" },
      { title: "她认得你", text: "摸摸、喂食、陪她玩，她会记住每一次互动，也会把心情写在脸上。" },
      { title: "慢慢逛，不着急", text: "没有体力条，也没有必须每天登录的惩罚。想来的时候，她都在。" }
    ]
  },

  /* ---------- 宠物资料 ---------- */
  petName: "眉姐姐",
  petType: "猫",
  petBreed: "虎斑 · 英短混血",
  petAge: "3 岁",
  petBirthday: "2023 年 3 月 8 日",
  petPersonality: "好奇、爱撒娇、有点小傲娇",
  petIntro: "一只把家当成领地的虎斑小猫。最爱小鱼干和晒太阳，怕吹风机，会在你打字的时候踩上键盘。",
  petAvatar: "assets/pets/pet001/avatar.png",

  /* 角色动作素材：固定机位、统一比例，换素材只需替换文件 */
  petCharacterAssets: {
    basePath: "assets/pets/pet001/",
    states: {
      idle: "avatar.png",
      calm: "deadpan.png",
      greet: "avatar.png",
      happy: "happy.png",
      excited: "surprise.png",   // 轻微吃惊：嘴只开一条缝，不是原来那张大张嘴
      shy: "innocent.png",
      proud: "skeptical.png",
      sulk: "angry.png",
      mischief: "mischief.png",
      sleep: "sleep.png",
      /* ---- 第二批表情：全部与 avatar 同机位、同毛色 ---- */
      laugh: "laugh.png",        // 眯眼笑
      lick: "lick.png",          // 舔嘴（吃东西时用）
      curious: "curious.png",    // 歪头好奇（进新区域用）
      scared: "scared.png",      // 飞机耳（小游戏失败用）
      focus: "focus.png",        // 瞳孔收窄，专注（寻宝 / 快跑用）
      yawn: "yawn.png",          // 打哈欠（刚睡醒用）
      sleepy: "shy.png"          // 半眯眼发困（休息时用）
    }
  },

  /* 装饰槽位：头部 / 颈部 / 身体，可以同时戴三件 */
  decoSlots: [
    { id: "head", label: "头部", z: 4 },
    { id: "neck", label: "颈部", z: 5 },
    { id: "body", label: "身体", z: 3 }
  ],

  /* ---------- 世界主题与场景 ---------- */
  worldTheme: {
    name: "毛茸茸的家园",
    keywords: ["Cozy Fantasy", "Soft Light", "Handcrafted"],
    palette: { cream: "#FBF3E4", ink: "#3B3226", sage: "#8FAE87", peach: "#F0B49B", gold: "#E4C07E" }
  },
  sceneAssets: {
    home: "assets/img/scenes/scene-home.jpg",
    garden: "assets/img/scenes/scene-garden.jpg",
    forest: "assets/img/scenes/scene-forest.jpg",
    lake: "assets/img/scenes/scene-lake.jpg",
    secret: "assets/img/scenes/scene-secret.jpg"
  },

  /* ---------- 区域 ---------- */
  areas: [
    {
      id: "home",
      name: "宠物小屋",
      short: "小屋",
      icon: "home",
      subtitle: "午后的光落在木地板上",
      intro: "推开门，屋里是熟悉的暖气味。猫窝在光里，壁炉还留着一小块火。",
      unlock: null,
      hotspots: [
        { id: "fire", label: "壁炉", x: 20, y: 52, type: "rest", icon: "spark", speech: "火光把地板烘得暖暖的，眉姐姐趴下来伸了个懒腰。" },
        { id: "shelf", label: "书架", x: 82, y: 34, type: "collect", item: "home-book", icon: "book", speech: "书架第三层有一本旧相册，里面夹着一片干花。" },
        { id: "yarn", label: "毛线球", x: 22, y: 74, type: "collect", item: "toy-ball", icon: "yarn", speech: "毛线球滚到脚边，她一巴掌按住，假装什么都没发生。" },
        { id: "window", label: "圆窗", x: 62, y: 20, type: "story", icon: "sun", speech: "窗外能看见花园的拱门，风把藤蔓吹得轻轻摇晃。" }
      ]
    },
    {
      id: "garden",
      name: "花园",
      short: "花园",
      icon: "leaf",
      subtitle: "石头小径通向藤蔓拱门",
      intro: "花园里全是刚开的花。泥土是湿的，蝴蝶停在最高的那朵郁金香上。",
      unlock: null,
      hotspots: [
        { id: "can", label: "洒水壶", x: 14, y: 62, type: "water", icon: "water", speech: "给花圃浇了水，泥土的味道升起来。" },
        { id: "flower", label: "郁金香", x: 24, y: 74, type: "collect", item: "plant-tulip", requires: "watered", icon: "flower", speech: "花瓣软软的，掐下来的时候还带着水珠。" },
        { id: "butterfly", label: "蝴蝶", x: 72, y: 36, type: "collect", item: "plant-butterfly", icon: "butterfly", speech: "蝴蝶落在她鼻尖上，她愣了一下，一动不敢动。" },
        { id: "arch", label: "藤蔓拱门", x: 50, y: 28, type: "travel", target: "forest", icon: "next", speech: "拱门后面就是森林的小径。" }
      ]
    },
    {
      id: "forest",
      name: "森林",
      short: "森林",
      icon: "tree",
      subtitle: "灯笼挂在树上，萤火在低处飞",
      intro: "越往里走越安静。树上挂着暖黄的灯笼，地上有刚冒头的红蘑菇。",
      unlock: null,
      hotspots: [
        { id: "chest", label: "宝箱", x: 74, y: 64, type: "collect", item: "souvenir-chest", icon: "chest", speech: "宝箱没有锁，里面躺着一枚小小的木质徽章。" },
        { id: "mushroom", label: "红蘑菇", x: 22, y: 72, type: "collect", item: "forest-mushroom", icon: "mushroom", speech: "蘑菇帽上还留着昨夜的露水。" },
        { id: "firefly", label: "萤火", x: 50, y: 32, type: "collect", item: "souvenir-firefly", icon: "jar", speech: "捉了几只萤火，装进玻璃瓶，光在掌心里一起一伏。" },
        { id: "lantern", label: "灯笼", x: 62, y: 22, type: "minigame", target: "treasure", icon: "spark", speech: "灯笼下压着一张手绘地图，画着森林深处的藏宝处。" }
      ]
    },
    {
      id: "lake",
      name: "湖泊",
      short: "湖泊",
      icon: "water",
      subtitle: "水面把夕阳揉成了一片碎金",
      intro: "湖边一个人也没有。木码头伸进水里，芦苇在风里沙沙地响。",
      unlock: { type: "minigames", count: 2, hint: "完成 2 款小游戏后解锁湖泊" },
      hotspots: [
        { id: "fish", label: "鱼群", x: 62, y: 70, type: "collect", item: "lake-fish", icon: "fish", speech: "水面下有一群小鱼，她把爪子伸进水里，捞了个空。" },
        { id: "lily", label: "睡莲", x: 34, y: 62, type: "collect", item: "plant-lily", icon: "flower", speech: "睡莲叶子上停着一颗亮亮的水珠。" },
        { id: "dock", label: "木码头", x: 16, y: 56, type: "minigame", target: "catch", icon: "timer", speech: "码头边很适合玩接东西的游戏。" },
        { id: "shell", label: "贝壳", x: 80, y: 50, type: "collect", item: "souvenir-shell", icon: "shell", speech: "沙里埋着一枚小小的贝壳，翻过来是珍珠色。" }
      ]
    },
    {
      id: "secret",
      name: "秘密区域",
      short: "秘境",
      icon: "gem",
      subtitle: "苔藓下面是会发光的石头",
      intro: "穿过石拱门，空气忽然变得很凉。水晶在岩壁上呼吸一样地亮着。",
      unlock: { type: "allGames", count: 4, hint: "任意四款小游戏通关后解锁秘境世界" },
      hotspots: [
        { id: "crystal", label: "记忆水晶", x: 22, y: 46, type: "collect", item: "hidden-crystal", icon: "gem", speech: "水晶里像封着一小段光，握久了掌心会变暖。" },
        { id: "altar", label: "石台", x: 50, y: 58, type: "collect", item: "secret-badge", icon: "star", speech: "石台上刻着爪印，中间嵌着一枚旧徽章。" },
        { id: "moon", label: "白花", x: 74, y: 64, type: "collect", item: "hidden-moonflower", icon: "flower", speech: "白花只在没有阳光的地方开，闻起来像雨后的草。" }
      ]
    }
  ],

  /* ---------- 小游戏 ---------- */
  minigames: [
    {
      id: "snack",
      name: "寻找零食",
      tagline: "把藏起来的零食都找出来",
      desc: "屋子的角落藏着 5 份零食。点中就能收进口袋，60 秒内找齐。",
      icon: "fish",
      accent: "peach",
      rewardItem: "food-fish"
    },
    {
      id: "catch",
      name: "接住玩具",
      tagline: "别让玩具掉在地上",
      desc: "拖动底部的爪子接住落下的玩具。连击越高分越多，限时 30 秒。",
      icon: "paw",
      accent: "sage",
      rewardItem: "toy-fish"
    },
    {
      id: "memory",
      name: "记忆翻牌",
      tagline: "找出成对的图案",
      desc: "翻开两张一样的牌就能留住它们。用最少的步数配完 8 对。",
      icon: "grid",
      accent: "gold",
      rewardItem: "food-cookie"
    },
    {
      id: "treasure",
      name: "森林寻宝",
      tagline: "顺着线索走到藏宝处",
      desc: "三段线索，三个正确的地点。找错会浪费时间，限时 90 秒。",
      icon: "chest",
      accent: "forest",
      rewardItem: "souvenir-map"
    },
    {
      id: "run",
      name: "小猫快跑",
      tagline: "别撞上花盆",
      desc: "她一直在小路上往前跑。点屏幕跳起来，躲开花盆、接住小鱼干，跑得越远分越高。",
      icon: "paw",
      accent: "sage",
      rewardItem: "toy-drop",
      target: 300
    }
  ],

  /* ---------- 默契测试 ---------- */
  quiz: {
    title: "默契测试",
    subtitle: "八道题，看看你有多懂她",
    intro: "全部是关于眉姐姐的小事。凭印象答，答错会告诉你正确答案。",
    reward: { coins: 24 },
    questions: [
      { q: "眉姐姐最爱的零食是哪一样？", options: ["小鱼干", "黄油曲奇", "脆脆猫粮"], answer: 0, tip: "袋子一响她就会出现，答案是 小鱼干。" },
      { q: "她的生日是哪一天？", options: ["2023 年 1 月 8 日", "2023 年 3 月 8 日", "2022 年 3 月 18 日"], answer: 1, tip: "她 2023 年 3 月 8 日出生，今年 3 岁。" },
      { q: "她是什么品种？", options: ["布偶猫", "虎斑 · 英短混血", "橘猫"], answer: 1, tip: "虎斑的额头有一个 M 形的纹路。" },
      { q: "下面哪件事会让她立刻躲到床底下？", options: ["吹风机", "纸箱", "逗猫棒"], answer: 0, tip: "她怕吹风机，一开机就没影了。" },
      { q: "她最常出现在你打字的时候的哪里？", options: ["键盘上", "窗帘后面", "冰箱上"], answer: 0, tip: "踩键盘是她表达「看我」的方式。" },
      { q: "她最喜欢怎么待着？", options: ["晒太阳", "淋雨", "游泳"], answer: 0, tip: "光挪一格，她跟着挪一格。" },
      { q: "她的性格更接近下面哪一句？", options: ["冷淡怕生", "好奇爱撒娇、有点小傲娇", "完全不粘人"], answer: 1, tip: "先装作没听见，第二声才回头。" },
      { q: "她今年几岁？", options: ["1 岁", "3 岁", "6 岁"], answer: 1, tip: "3 岁，正是最能闹的时候。" }
    ],
    tiers: [
      { min: 90, title: "灵魂同频", desc: "你几乎知道她的每一个小习惯。她大概也这么觉得。" },
      { min: 70, title: "很懂她", desc: "大部分时候你都猜得对，剩下几处是她的秘密。" },
      { min: 50, title: "还在熟悉", desc: "你知道她喜欢什么，但还没摸清她的小脾气。" },
      { min: 0, title: "重新认识一下", desc: "没关系，多陪她几天就知道了。" }
    ]
  },

  /* ---------- 物品 ---------- */
  items: [
    { id: "food-fish", name: "小鱼干", cat: "food", img: "assets/props/snack-fish.png", desc: "眉姐姐最爱的零食，袋子一响她就会出现。", source: "初始拥有 · 小游戏奖励", use: { happy: 10, vigor: 6 } },
    { id: "food-kibble", name: "脆脆猫粮", cat: "food", img: "assets/props/snack-kibble.png", desc: "颗粒很小，嚼起来咔嚓响。", source: "初始拥有", use: { happy: 6, vigor: 10 } },
    { id: "food-cookie", name: "黄油曲奇", cat: "food", img: "assets/props/snack-cookie.png", desc: "烤得有点焦，但她每次都吃完。", source: "记忆翻牌奖励", use: { happy: 12, vigor: 4 } },
    { id: "food-strips", name: "鸡肉条", cat: "food", img: "assets/props/snack-strips.png", desc: "撕成小条更好喂，适合奖励。", source: "每日任务奖励", use: { happy: 9, vigor: 12 } },
    { id: "food-can", name: "鲜肉罐头", cat: "food", img: "assets/props/snack-platter.png", desc: "开罐的声音比什么都管用。", source: "探索任务奖励", use: { happy: 16, vigor: 16 } },

    { id: "toy-ball", name: "毛线球", cat: "toy", img: "assets/props/snack-ball.png", desc: "滚起来会散线，她越玩越起劲。", source: "小屋探索", use: { bond: 8, happy: 8 } },
    { id: "toy-drop", name: "弹弹球", cat: "toy", img: "assets/props/snack-dropball.png", desc: "弹得高的时候，她会在原地等它落下来。", source: "接住玩具奖励", use: { bond: 7, happy: 10 } },
    { id: "toy-fish", name: "布偶鱼", cat: "toy", img: "assets/props/snack-toyfish.png", desc: "里面塞了猫薄荷，抱着会踢。", source: "接住玩具奖励", use: { bond: 10, happy: 12 } },
    { id: "toy-sock", name: "旧袜子", cat: "toy", img: "assets/props/prop-socks.png", desc: "她坚信这是她狩猎到的战利品。", source: "初始拥有", use: { bond: 6, happy: 9 } },

    { id: "deco-bowtie", name: "奶油蝴蝶结", cat: "deco", slot: "neck", img: "assets/deco/bowtie.png", desc: "戴在脖子上会显得很乖。", source: "收藏满 8 种解锁", overlay: { x: 50, y: 74, w: 30 } },
    { id: "deco-scarf", name: "格纹围巾", cat: "deco", slot: "neck", img: "assets/deco/scarf.png", desc: "去湖边的时候适合戴。", source: "首次解锁湖泊", price: 0, overlay: { x: 50, y: 70, w: 34 } },
    { id: "deco-beret", name: "猫耳贝雷帽", cat: "deco", slot: "head", img: "assets/deco/beret.png", desc: "戴上之后她的表情会很得意。", source: "全部小游戏通关奖励", price: 0, overlay: { x: 47, y: 30, w: 32 } },
    { id: "deco-sweater", name: "米色小毛衣", cat: "deco", slot: "body", img: "assets/deco/sweater.png", desc: "袖口有点松，她走路的时候会滑下来。", source: "换装间用 60 星星兑换", price: 60, overlay: { x: 50, y: 82, w: 50 } },
    { id: "deco-hoodie", name: "条纹小卫衣", cat: "deco", slot: "body", img: "assets/deco/hoodie.png", desc: "帽兜里能塞下她一整只脑袋。", source: "换装间用 80 星星兑换", price: 80, overlay: { x: 50, y: 84, w: 52 } },

    { id: "home-book", name: "旧相册", cat: "home", icon: "book", desc: "第一页是她刚来家里的样子，比现在小一圈。", source: "小屋书架" },
    { id: "plant-tulip", name: "花园郁金香", cat: "plant", icon: "flower", desc: "浇过水的花圃开得最好，花瓣是奶油色。", source: "花园浇水后采集" },
    { id: "plant-butterfly", name: "蝴蝶标本", cat: "plant", icon: "butterfly", desc: "没有真的抓住它，只是记住了翅膀的颜色。", source: "花园蝴蝶" },
    { id: "plant-lily", name: "睡莲叶", cat: "plant", icon: "flower", desc: "叶子上能托住一整颗水珠。", source: "湖泊采集" },

    { id: "souvenir-chest", name: "木质徽章", cat: "souvenir", icon: "chest", desc: "森林宝箱里的旧徽章，背面刻着一个爪印。", source: "森林宝箱" },
    { id: "souvenir-firefly", name: "萤火小瓶", cat: "souvenir", icon: "jar", desc: "夏天晚上在森林捉到的光，现在还亮着。", source: "森林萤火" },
    { id: "souvenir-shell", name: "珍珠贝壳", cat: "souvenir", icon: "shell", desc: "湖边的贝壳，翻过来能听见很远的水声。", source: "湖泊沙滩" },
    { id: "souvenir-map", name: "手绘藏宝图", cat: "souvenir", icon: "map", desc: "森林寻宝时画下来的地图，边角已经卷起来了。", source: "森林寻宝通关" },

    { id: "hidden-crystal", name: "记忆水晶", cat: "hidden", icon: "gem", desc: "秘境里的水晶。贴近耳朵听，能听见她的呼噜声。", source: "秘密区域" },
    { id: "hidden-moonflower", name: "月光花", cat: "hidden", icon: "flower", desc: "只在没有阳光的地方开的花，白色近乎透明。", source: "秘密区域" },
    { id: "secret-badge", name: "爪印徽章", cat: "hidden", icon: "star", desc: "石台上的徽章。凑近看，爪印是很久以前按上去的。", source: "秘密区域石台" },
    { id: "forest-mushroom", name: "红帽蘑菇", cat: "hidden", icon: "mushroom", desc: "不能吃，但很好看，她盯着看了很久。", source: "森林采集" }
  ],

  /* ---------- 任务 ---------- */
  tasks: {
    daily: [
      { id: "d-pet", title: "摸摸眉姐姐", desc: "在任意场景摸摸她一次", metric: "pet", target: 1, reward: { coins: 18 } },
      { id: "d-feed", title: "喂一次零食", desc: "选择一份食物喂给她", metric: "feed", target: 1, reward: { coins: 18 } },
      { id: "d-play", title: "陪她玩一次", desc: "用玩具陪她玩一轮", metric: "play", target: 1, reward: { coins: 20 } },
      { id: "d-game", title: "玩一款小游戏", desc: "在小游戏中心完成任意一款", metric: "game", target: 1, reward: { coins: 30, items: ["food-strips"] } },
      { id: "d-explore", title: "探索一次花园", desc: "进入花园并待上一会儿", metric: "garden", target: 1, reward: { coins: 15 } },
      { id: "d-collect", title: "收集 3 件物品", desc: "在小屋、花园或森林里找到 3 件东西", metric: "collect", target: 3, reward: { coins: 28 } }
    ],
    explore: [
      { id: "e-forest", title: "第一次走进森林", desc: "从花园的藤蔓拱门进入森林", metric: "visit-forest", target: 1, reward: { coins: 30 } },
      { id: "e-chest", title: "找到森林的宝箱", desc: "打开森林深处的木箱", metric: "chest", target: 1, reward: { coins: 40, items: ["food-can"] } },
      { id: "e-lake", title: "解锁湖泊", desc: "完成两款小游戏，湖边的路就会打开", metric: "lake", target: 1, reward: { coins: 50, items: ["deco-scarf"] } },
      { id: "e-games", title: "五款小游戏各玩一次", desc: "寻找零食、接住玩具、记忆翻牌、森林寻宝、小猫快跑", metric: "allgames", target: 5, reward: { coins: 80, items: ["deco-beret"] } }
    ]
  },

  /* ---------- 属性 ---------- */
  initialAttributes: { happy: 62, bond: 45, vigor: 78, explore: 12 },
  attributes: [
    { key: "happy", label: "快乐值", icon: "heart", hint: "互动、玩具、小游戏会让她更开心" },
    { key: "bond", label: "亲密度", icon: "paw", hint: "摸摸、陪玩、呼唤都会积累亲密度" },
    { key: "vigor", label: "活力值", icon: "spark", hint: "休息和进食可以恢复活力" },
    { key: "explore", label: "探索值", icon: "compass", hint: "发现新的区域与物品会推进探索" }
  ],

  /* ---------- 剧情文案 ---------- */
  storyContent: {
    idle: [
      "她就坐在那里，尾巴尖轻轻晃。",
      "阳光挪了一格，她跟着挪了一格。",
      "听见你靠近，耳朵先动了一下。",
      "假装在看窗外，其实在等你说话。"
    ],
    pet: [
      "呼噜声从掌心传上来，像一台小小的发动机。",
      "她把头顶往你手里顶了顶，示意别停。",
      "翻了个身，露出肚子，又立刻收回去——试探一下你。",
      "耳朵往后压了一下，然后蹭了蹭你的手腕。"
    ],
    call: [
      "她从远处跑过来，刹车没刹住，撞到你脚边。",
      "先装作没听见，第二声才回头。",
      "尾巴竖起来，绕着你转了一个圈。",
      "短促地应了一声，像是在说“干嘛”。"
    ],
    feed: [
      "闻了两下，确认是小鱼干，才开始吃。",
      "吃得很慢，吃到一半抬头看你一眼。",
      "吃完把碗推了推，意思是还要。",
      "把最大的一块叼到旁边，慢慢享用。"
    ],
    rest: [
      "她把下巴搁在前爪上，眼睛慢慢合上。",
      "呼吸变长了，尾巴也安静下来。",
      "翻了个方向，把脸埋进软垫里。"
    ],
    play: [
      "扑过来的瞬间爪子是收着的。",
      "追着玩具跑了两圈，然后假装不感兴趣。",
      "抱住玩具翻身，后腿蹬得飞快。"
    ],
    areas: {
      home: "屋里还是那个味道，猫窝在光里。",
      garden: "风里有泥土和花的味道，蝴蝶又来了。",
      forest: "灯笼亮着，往里走一点会更安静。",
      lake: "水面碎金一样，风把芦苇吹得沙沙响。",
      secret: "水晶在呼吸，这里安静得能听见自己的心跳。"
    },
    locked: {
      lake: "往湖边的路还被藤蔓挡着。再完成两款小游戏，路就会开。",
      secret: "石门紧闭，上面刻着四个图案。也许要先把四款小游戏都走一遍。"
    }
  },

  /* ---------- 音乐与音效 ---------- */
  gameMusic: { bgm: "cozy-ambient", volume: 0.5, track: "pentatonic-soft" },
  gameEffects: { chapterFade: true, particles: true, petShadow: true },

  /* ---------- 品牌署名 ---------- */
  branding: {
    studioName: "Momolab",
    creatorCredit: "Designed & Crafted by Momolab",
    showCredit: true,      // 客户可关掉
    showWatermark: false,  // 主要游戏区域不加水印
    showLogoInMain: false, // 主界面不展示醒目 Logo
    supportContact: "hello@momolab.studio"
  },
  creatorCredit: "Designed & Crafted by Momolab"
};
