const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { action } = event;
  const { OPENID } = cloud.getWXContext();

  switch (action) {
    case 'listForums':     return listForums(event);
    case 'createForum':    return createForum(OPENID, event);
    case 'joinForum':      return joinForum(OPENID, event);
    case 'leaveForum':     return leaveForum(OPENID, event);
    case 'listPosts':      return listPosts(event);
    case 'createPost':     return createPost(OPENID, event);
    case 'getPost':        return getPost(event);
    case 'deletePost':     return deletePost(OPENID, event);
    case 'toggleLike':     return toggleLike(OPENID, event);
    case 'listComments':   return listComments(event);
    case 'createComment':  return createComment(OPENID, event);
    case 'deleteComment':  return deleteComment(OPENID, event);
    default:
      return { error: 'unknown action' };
  }
};

// ========== 论坛 ==========

async function listForums(data) {
  const { keyword, skip, pageSize } = data;
  const _skip = skip || 0;
  const _pageSize = pageSize || 20;
  let query = db.collection('forums');

  if (keyword) {
    query = query.where(
      _.or([
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { description: db.RegExp({ regexp: keyword, options: 'i' }) }
      ])
    );
  }

  const res = await query
    .orderBy('memberCount', 'desc')
    .skip(_skip)
    .limit(_pageSize)
    .get();

  return { data: res.data, hasMore: res.data.length === _pageSize };
}

async function createForum(openid, data) {
  const { name, description, tags, coverImage } = data;
  const forum = {
    name: name || '未命名论坛',
    description: description || '',
    coverImage: coverImage || '',
    tags: tags || [],
    memberCount: 1,
    creatorOpenid: openid,
    createdAt: new Date()
  };
  const res = await db.collection('forums').add({ data: forum });

  await db.collection('forum_members').add({
    data: {
      forumId: res._id,
      openid,
      role: 'admin',
      joinedAt: new Date()
    }
  });

  return { _id: res._id };
}

async function joinForum(openid, data) {
  const { forumId } = data;
  const exist = await db.collection('forum_members')
    .where({ forumId, openid }).get();
  if (exist.data.length > 0) return { ok: true, msg: 'already joined' };

  await db.collection('forum_members').add({
    data: { forumId, openid, role: 'user', joinedAt: new Date() }
  });

  await db.collection('forums').doc(forumId).update({
    data: { memberCount: _.inc(1) }
  });

  return { ok: true };
}

async function leaveForum(openid, data) {
  const { forumId } = data;
  await db.collection('forum_members')
    .where({ forumId, openid }).remove();

  await db.collection('forums').doc(forumId).update({
    data: { memberCount: _.inc(-1) }
  });

  return { ok: true };
}

// ========== 帖子 ==========

async function listPosts(data) {
  const { forumId, skip, pageSize } = data;
  const _skip = skip || 0;
  const _pageSize = pageSize || 10;

  let query = db.collection('posts');
  if (forumId) query = query.where({ forumId });

  const res = await query
    .orderBy('createdAt', 'desc')
    .skip(_skip)
    .limit(_pageSize)
    .get();

  return { data: res.data, hasMore: res.data.length === _pageSize };
}

async function createPost(openid, data) {
  const { forumId, title, content, images } = data;

  // 读取用户信息
  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data[0] || {};

  const post = {
    forumId,
    openid,
    nickName: user.nickName || '球友',
    avatarUrl: user.avatarUrl || '',
    title: title || '',
    content: content || '',
    images: images || [],
    likeCount: 0,
    commentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const res = await db.collection('posts').add({ data: post });
  return { _id: res._id };
}

async function getPost(data) {
  const res = await db.collection('posts').doc(data.id).get();
  return res.data;
}

async function deletePost(openid, data) {
  const post = await db.collection('posts').doc(data.id).get();
  if (post.data.openid !== openid) return { error: '无权删除' };

  await db.collection('posts').doc(data.id).remove();
  await db.collection('comments').where({ postId: data.id }).remove();
  return { ok: true };
}

async function toggleLike(openid, data) {
  const { postId } = data;
  const post = await db.collection('posts').doc(postId).get();
  const likedBy = post.data.likedBy || [];

  const idx = likedBy.indexOf(openid);
  if (idx > -1) {
    likedBy.splice(idx, 1);
    await db.collection('posts').doc(postId).update({
      data: { likedBy, likeCount: _.inc(-1) }
    });
    return { liked: false, likeCount: post.data.likeCount - 1 };
  } else {
    likedBy.push(openid);
    await db.collection('posts').doc(postId).update({
      data: { likedBy, likeCount: _.inc(1) }
    });
    return { liked: true, likeCount: post.data.likeCount + 1 };
  }
}

// ========== 评论 ==========

async function listComments(data) {
  const { postId, skip, pageSize } = data;
  const _skip = skip || 0;
  const _pageSize = pageSize || 20;

  const res = await db.collection('comments')
    .where({ postId })
    .orderBy('createdAt', 'asc')
    .skip(_skip)
    .limit(_pageSize)
    .get();

  return { data: res.data, hasMore: res.data.length === _pageSize };
}

async function createComment(openid, data) {
  const { postId, content, replyTo } = data;

  const userRes = await db.collection('users').where({ _openid: openid }).get();
  const user = userRes.data[0] || {};

  const comment = {
    postId,
    openid,
    nickName: user.nickName || '球友',
    avatarUrl: user.avatarUrl || '',
    content,
    replyTo: replyTo || '',
    createdAt: new Date()
  };
  const res = await db.collection('comments').add({ data: comment });

  await db.collection('posts').doc(postId).update({
    data: { commentCount: _.inc(1), updatedAt: new Date() }
  });

  return { _id: res._id };
}

async function deleteComment(openid, data) {
  const comment = await db.collection('comments').doc(data.id).get();
  if (comment.data.openid !== openid) return { error: '无权删除' };

  await db.collection('comments').doc(data.id).remove();
  await db.collection('posts').doc(comment.data.postId).update({
    data: { commentCount: _.inc(-1) }
  });
  return { ok: true };
}
