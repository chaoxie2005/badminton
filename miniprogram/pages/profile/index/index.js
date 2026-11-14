Page({
  data: {
    user: null,
    loading: true,
    boardCount: 0,
    postCount: 0,
    videoCount: 0
  },

  onShow() {
    this.initUser();
  },

  onPullDownRefresh() {
    this.initUser().then(() => wx.stopPullDownRefresh());
  },

  initUser() {
    return wx.cloud.callFunction({
      name: 'login',
      data: {}
    }).then(res => {
      const user = res.result.user;
      if (user) {
        this.setData({ user, loading: false });
        getApp().globalData.userInfo = user;
        getApp().globalData.openid = user._openid;
        this.loadStats(user._openid);
      } else {
        this.setData({ loading: false });
      }
    }).catch(err => {
      console.error('登录失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '登录失败，请检查网络', icon: 'none' });
    });
  },

  loadStats(openid) {
    const db = wx.cloud.database();
    const userId = openid || this.data.user?._openid || '';

    Promise.all([
      db.collection('scoreboards').where({ _openid: userId }).count(),
      db.collection('posts').where({ openid: userId }).count(),
      db.collection('videos').where({ openid: userId }).count()
    ]).then(([boards, posts, videos]) => {
      this.setData({
        boardCount: boards.total,
        postCount: posts.total,
        videoCount: videos.total
      });
    }).catch(err => {
      console.error('加载统计数据失败:', err);
    });
  },

  handleLogin() {
    wx.getUserProfile({
      desc: '用于完善个人资料',
      success: (res) => {
        const u = res.userInfo;
        wx.cloud.callFunction({
          name: 'login',
          data: {
            action: 'updateProfile',
            nickName: u.nickName,
            avatarUrl: u.avatarUrl,
            gender: u.gender,
            city: u.city
          }
        }).then(cf => {
          const user = cf.result.user;
          this.setData({ user });
          getApp().globalData.userInfo = user;
          getApp().globalData.openid = user._openid;
          this.loadStats(user._openid);
          wx.showToast({ title: '登录成功', icon: 'success' });
        }).catch(err => {
          console.error('同步微信信息失败:', err);
        });
      },
      fail: (err) => {
        if (err.errMsg.indexOf('cancel') === -1) {
          wx.showToast({ title: '获取微信信息失败', icon: 'none' });
        }
      }
    });
  },

  goEdit() {
    if (!this.data.user) return;
    wx.navigateTo({ url: '/pages/profile/edit/edit' });
  },

  goMyBoards() {
    if (!this.data.user) return;
    wx.navigateTo({ url: '/pages/profile/boards/boards' });
  },

  goMyPosts() {
    if (!this.data.user) return;
    wx.navigateTo({ url: '/pages/profile/posts/posts' });
  },

  goMyVideos() {
    if (!this.data.user) return;
    wx.navigateTo({ url: '/pages/profile/videos/videos' });
  },

  goInjury() {
    wx.navigateTo({ url: '/pages/injury/list/list' });
  },

  goAbout() {
    wx.showModal({
      title: '关于羽毛球社区',
      content: '版本 1.0.0\n\n一个属于羽毛球爱好者的社区小程序。\n\n功能：记分牌、论坛、视频分享、伤病科普等。',
      showCancel: false,
      confirmText: '好的'
    });
  },

  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除本地缓存数据，不会影响你的账号信息。',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({ title: '缓存已清除', icon: 'success' });
            }
          });
        }
      }
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后需要重新授权登录。',
      success: (res) => {
        if (res.confirm) {
          this.setData({ user: null, boardCount: 0, postCount: 0, videoCount: 0 });
          getApp().globalData.userInfo = null;
          getApp().globalData.openid = '';
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }
});
