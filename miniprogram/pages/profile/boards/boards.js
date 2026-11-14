Page({
  data: {
    boards: [],
    filter: 'all',
    loading: false,
    hasMore: true,
    _fetchedCount: 0
  },

  onShow() {
    const openid = getApp().globalData.openid;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.fetchBoards(true);
  },

  onPullDownRefresh() {
    this.fetchBoards(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchBoards(false);
    }
  },

  setFilter(e) {
    const f = e.currentTarget.dataset.filter;
    if (f === this.data.filter) return;
    this.setData({ filter: f });
    this.fetchBoards(true);
  },

  fetchBoards(reset) {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });

    const openid = getApp().globalData.openid;
    const filter = this.data.filter;
    const pageSize = 20;

    let fetchedCount = this.data._fetchedCount || 0;
    if (reset) fetchedCount = 0;

    return wx.cloud.callFunction({
      name: 'scoreboard',
      data: {
        action: 'list',
        filter,
        openid,
        skip: fetchedCount,
        pageSize
      }
    }).then(res => {
      const result = res.result;
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      const data = result.data || [];
      fetchedCount += data.length;
      const list = reset ? data : this.data.boards.concat(data);
      this.setData({
        boards: list,
        loading: false,
        hasMore: result.hasMore !== false,
        _fetchedCount: fetchedCount
      });
    }).catch(err => {
      console.error('fetchBoards error:', err);
      this.setData({ loading: false });
      if (err.errCode === -1) {
        wx.showToast({ title: '网络错误，请检查连接', icon: 'none' });
      } else {
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    });
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/scoreboard/detail/detail?id=' + e.currentTarget.dataset.id
    });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/scoreboard/create/create' });
  },

  deleteBoard(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除记分牌',
      content: '确定删除？数据无法恢复',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'scoreboard',
            data: { action: 'delete', id }
          }).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.fetchBoards(true);
          }).catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});
