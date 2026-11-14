const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { action } = event;
  const { OPENID } = cloud.getWXContext();

  switch (action) {
    case 'create':
      return create(OPENID, event);
    case 'update':
      return update(event);
    case 'delete':
      return remove(event);
    case 'get':
      return get(event);
    case 'list':
      return list(event);
    case 'updateScore':
      return updateScore(event);
    case 'toggleCard':
      return toggleCard(event);
    case 'undo':
      return undo(event);
    case 'finish':
      return finish(event);
    default:
      return { error: 'unknown action' };
  }
};

// 新建记分牌
async function create(openid, data) {
  const board = {
    _openid: openid,
    name: data.name || '未命名比赛',
    playerA: data.playerA,
    playerB: data.playerB,
    scoreA: 0,
    scoreB: 0,
    yellowCardsA: 0,
    yellowCardsB: 0,
    redCardsA: 0,
    redCardsB: 0,
    scoreHistory: [],
    status: 'ongoing',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const res = await db.collection('scoreboards').add({ data: board });
  return { _id: res._id };
}

// 编辑记分牌名称/选手
async function update(data) {
  const { id, name, playerA, playerB } = data;
  await db.collection('scoreboards').doc(id).update({
    data: {
      name: name || '未命名比赛',
      playerA,
      playerB,
      updatedAt: new Date()
    }
  });
  return { ok: true };
}

// 删除记分牌
async function remove(data) {
  await db.collection('scoreboards').doc(data.id).remove();
  return { ok: true };
}

// 获取单个记分牌
async function get(data) {
  const res = await db.collection('scoreboards').doc(data.id).get();
  return res.data;
}

// 分页列表（支持服务端状态筛选）
async function list(data) {
  const { filter, pageSize, skip, openid } = data;
  const _skip = skip || 0;
  const _pageSize = pageSize || 20;
  const _ = db.command;

  let query = db.collection('scoreboards');
  const conditions = {};
  if (openid) conditions._openid = openid;
  if (filter && filter !== 'all') conditions.status = filter;
  if (Object.keys(conditions).length > 0) query = query.where(conditions);

  const res = await query
    .orderBy('updatedAt', 'desc')
    .skip(_skip)
    .limit(_pageSize)
    .get();

  return { data: res.data, hasMore: res.data.length === _pageSize };
}

// 更新比分（加减分），记录历史用于撤回
async function updateScore(data) {
  const { id, player, newScore, previousScore } = data;
  const scoreKey = player === 'A' ? 'scoreA' : 'scoreB';

  // 记录操作历史
  const historyEntry = {
    action: 'score',
    player,
    from: previousScore,
    to: newScore,
    time: new Date()
  };

  await db.collection('scoreboards').doc(id).update({
    data: {
      [scoreKey]: newScore,
      scoreHistory: _.push(historyEntry),
      updatedAt: new Date()
    }
  });
  return { ok: true };
}

// 切换红黄牌（点击添加，再次点击取消）
async function toggleCard(data) {
  const { id, player, cardType } = data;
  const field = cardType === 'yellow'
    ? (player === 'A' ? 'yellowCardsA' : 'yellowCardsB')
    : (player === 'A' ? 'redCardsA' : 'redCardsB');

  const board = await db.collection('scoreboards').doc(id).get();
  const current = board.data[field] || 0;

  // 每次点击叠加一张
  const newVal = current + 1;

  const historyEntry = {
    action: cardType + 'Card',
    player,
    from: current,
    to: newVal,
    time: new Date()
  };

  await db.collection('scoreboards').doc(id).update({
    data: {
      [field]: newVal,
      scoreHistory: _.push(historyEntry),
      updatedAt: new Date()
    }
  });
  return { ok: true };
}

// 撤回上一步
async function undo(data) {
  const { id } = data;
  const board = await db.collection('scoreboards').doc(id).get();

  if (board.data.status === 'finished') {
    return { error: '已结束的比赛不能撤回' };
  }

  const history = board.data.scoreHistory || [];

  if (history.length === 0) {
    return { error: '没有可撤回的操作' };
  }

  const last = history[history.length - 1];

  // 根据最后操作类型进行恢复
  const updateData = {};

  if (last.action === 'score') {
    const scoreKey = last.player === 'A' ? 'scoreA' : 'scoreB';
    updateData[scoreKey] = last.from;
  } else if (last.action === 'yellowCard') {
    const field = last.player === 'A' ? 'yellowCardsA' : 'yellowCardsB';
    updateData[field] = last.from;
  } else if (last.action === 'redCard') {
    const field = last.player === 'A' ? 'redCardsA' : 'redCardsB';
    updateData[field] = last.from;
  }

  updateData.scoreHistory = _.pop();
  updateData.updatedAt = new Date();

  await db.collection('scoreboards').doc(id).update({ data: updateData });
  return { ok: true };
}

// 结束比赛
async function finish(data) {
  const board = await db.collection('scoreboards').doc(data.id).get();
  const b = board.data;

  if (b.status === 'finished') {
    return { error: '比赛已结束' };
  }

  const now = new Date();
  const durationMs = now - new Date(b.createdAt);
  const durationMin = Math.round(durationMs / 60000);

  let winner = '';
  if (b.scoreA > b.scoreB) winner = b.playerA;
  else if (b.scoreB > b.scoreA) winner = b.playerB;
  else winner = '平局';

  const finishEntry = {
    action: 'finish',
    player: '',
    from: 0,
    to: 0,
    time: now
  };

  await db.collection('scoreboards').doc(data.id).update({
    data: {
      status: 'finished',
      finishedAt: now,
      duration: durationMin,
      winner,
      scoreHistory: _.push(finishEntry),
      updatedAt: now
    }
  });
  return { ok: true, winner, duration: durationMin };
}
