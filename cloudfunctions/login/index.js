const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action, nickName, avatarUrl, gender, city, bio, badmintonLevel,
          playingStyle, homeCourt, age } = event;

  if (action === 'updateProfile') {
    const exist = await db.collection('users').where({ _openid: OPENID }).get();

    const profileData = {
      nickName: nickName || '球友',
      avatarUrl: avatarUrl || '',
      gender: gender !== undefined ? gender : 0,
      city: city || '',
      bio: bio || '',
      badmintonLevel: badmintonLevel || '',
      playingStyle: playingStyle || '',
      homeCourt: homeCourt || '',
      age: age || '',
      updatedAt: new Date()
    };

    if (exist.data.length === 0) {
      profileData.createdAt = new Date();
      await db.collection('users').add({ data: profileData });
    } else {
      await db.collection('users').where({ _openid: OPENID }).update({ data: profileData });
    }

    const updated = await db.collection('users').where({ _openid: OPENID }).get();
    return { user: updated.data[0] };
  }

  // 默认：登录
  const exist = await db.collection('users').where({ _openid: OPENID }).get();

  if (exist.data.length === 0) {
    await db.collection('users').add({
      data: {
        nickName: nickName || '球友',
        avatarUrl: avatarUrl || '',
        gender: gender || 0,
        city: city || '',
        bio: '',
        badmintonLevel: '',
        playingStyle: '',
        homeCourt: '',
        age: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    const created = await db.collection('users').where({ _openid: OPENID }).get();
    return { isNew: true, user: created.data[0] };
  }

  await db.collection('users').where({ _openid: OPENID }).update({
    data: { updatedAt: new Date() }
  });

  return { isNew: false, user: exist.data[0] };
};
