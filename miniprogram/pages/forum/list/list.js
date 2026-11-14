Page({
  data: {
    forums: [],
    keyword: '',
    loading: false,
    hasMore: true,
    joinedForums: {},
    _skip: 0,
    pageSize: 20
  },

  onShow() {
    this.fetchForums(true);
    this.loadJoined();
  },

  onPullDownRefresh() {
    this.fetchForums(true);
    this.loadJoined();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchForums(false);
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.fetchForums(true);
  },

  loadJoined() {
    const db = wx.cloud.database();
    const openid = getApp().globalData.openid;
    if (!openid) return;

    db.collection('forum_members').where({ openid }).get().then(res => {
      const joined = {};
      res.data.forEach(m => { joined[m.forumId] = true; });
      this.setData({ joinedForums: joined });
    }).catch(() => {});
  },

  fetchForums(reset) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    let skip = this.data._skip;
    if (reset) skip = 0;

    wx.cloud.callFunction({
      name: 'forum',
      data: {
        action: 'listForums',
        keyword: this.data.keyword,
        skip,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      const result = res.result;
      const data = result.data || [];
      skip += data.length;
      const list = reset ? data : this.data.forums.concat(data);
      this.setData({
        forums: list,
        loading: false,
        hasMore: result.hasMore !== false,
        _skip: skip
      });
    }).catch(err => {
      console.error('fetchForums error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  toggleJoin(e) {
    const { id, joined } = e.currentTarget.dataset;
    const openid = getApp().globalData.openid;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const action = joined ? 'leaveForum' : 'joinForum';

    wx.cloud.callFunction({
      name: 'forum',
      data: { action, forumId: id }
    }).then(res => {
      if (res.result.error) {
        wx.showToast({ title: res.result.error, icon: 'none' });
        return;
      }
      const joinedForums = { ...this.data.joinedForums };
      if (joined) {
        delete joinedForums[id];
      } else {
        joinedForums[id] = true;
      }
      this.setData({ joinedForums });

      // 更新 memberCount
      const forums = this.data.forums.map(f => {
        if (f._id === id) {
          return { ...f, memberCount: joined ? f.memberCount - 1 : f.memberCount + 1 };
        }
        return f;
      });
      this.setData({ forums });

      wx.showToast({ title: joined ? '已退出' : '已加入', icon: 'success' });
    }).catch(err => {
      console.error('toggleJoin error:', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  goForum(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/forum/detail/detail?id=' + id });
  },

  goCreateForum() {
    wx.showModal({
      title: '创建论坛',
      editable: true,
      placeholderText: '输入论坛名称',
      success: res => {
        if (res.confirm && res.content) {
          const openid = getApp().globalData.openid;
          if (!openid) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
          }
          wx.cloud.callFunction({
            name: 'forum',
            data: { action: 'createForum', name: res.content }
          }).then(cf => {
            wx.showToast({ title: '创建成功', icon: 'success' });
            this.fetchForums(true);
            this.loadJoined();
          }).catch(err => {
            wx.showToast({ title: '创建失败', icon: 'none' });
          });
        }
      }
    });
  }
});
