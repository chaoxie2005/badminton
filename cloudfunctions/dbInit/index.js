const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  try {
    // 创建 scoreboards 集合
    await db.createCollection('scoreboards');
    console.log('scoreboards 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('scoreboards 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 users 集合
    await db.createCollection('users');
    console.log('users 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('users 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 forums 集合
    await db.createCollection('forums');
    console.log('forums 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('forums 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 posts 集合
    await db.createCollection('posts');
    console.log('posts 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('posts 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 comments 集合
    await db.createCollection('comments');
    console.log('comments 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('comments 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 conversations 集合
    await db.createCollection('conversations');
    console.log('conversations 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('conversations 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 messages 集合
    await db.createCollection('messages');
    console.log('messages 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('messages 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 videos 集合
    await db.createCollection('videos');
    console.log('videos 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('videos 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 injury_articles 集合
    await db.createCollection('injury_articles');
    console.log('injury_articles 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('injury_articles 集合已存在');
    } else {
      console.error(e);
    }
  }

  try {
    // 创建 forum_members 集合
    await db.createCollection('forum_members');
    console.log('forum_members 集合创建成功');
  } catch (e) {
    if (e.errCode === -502005) {
      console.log('forum_members 集合已存在');
    } else {
      console.error(e);
    }
  }

  return { ok: true, tip: '请到云开发控制台完成以下操作：\n1. 数据库 → scoreboards → 权限设置 → 改为"所有用户可读，仅创建者可写"\n2. 数据库 → scoreboards → 索引管理 → 添加索引：updatedAt(降序)' };
};
