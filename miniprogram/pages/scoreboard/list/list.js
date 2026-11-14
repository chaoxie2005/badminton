Page({
  data: {
    boards: [],
    filter: 'all',
    loading: false,
    hasMore: true,
    _fetchedCount: 0
  },

  onShow() {
    this.fetchBoards(true);
  },

  onPullDownRefresh() {
    this.fetchBoards(true);
    wx.stopPullDownRefresh();
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
    if (this.data.loading) return;
    this.setData({ loading: true });

    const filter = this.data.filter;
    const pageSize = 20;
    let fetchedCount = this.data._fetchedCount || 0;
    if (reset) fetchedCount = 0;

    wx.cloud.callFunction({
      name: 'scoreboard',
      data: {
        action: 'list',
        filter,
        skip: fetchedCount,
        pageSize
      }
    }).then(res => {
      const result = res.result;
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
      console.error('fetchBoards error:', JSON.stringify(err));
      this.setData({ loading: false });
      if (err.errCode === -1) {
        wx.showToast({ title: '网络错误，请检查连接', icon: 'none' });
      } else if (err.errCode === -502001) {
        wx.showToast({ title: '数据库连接受限，请到云开发控制台开通', icon: 'none' });
        console.error('可能是集合权限问题，请到云开发控制台 → 数据库 → scoreboards → 权限设置 → 改为"所有用户可读，仅创建者可写"');
      } else {
        wx.showToast({ title: '加载失败: ' + (err.errMsg || err.errCode || ''), icon: 'none' });
      }
    });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/scoreboard/create/create' });
  },

  goDetail(e) {
    wx.navigateTo({
      url: '/pages/scoreboard/detail/detail?id=' + e.currentTarget.dataset.id
    });
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
            data: { action: 'delete', id: id }
          }).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.fetchBoards(true);
          });
        }
      }
    });
  }
});
