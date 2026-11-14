Page({
  data: {
    videos: [],
    loading: false,
    page: 1,
    hasMore: true
  },

  onShow() {
    const openid = getApp().globalData.openid;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.setData({ page: 1, hasMore: true, videos: [] });
    this.loadVideos();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, videos: [] });
    this.loadVideos().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadVideos();
    }
  },

  loadVideos() {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });

    const db = wx.cloud.database();
    const pageSize = 10;
    const { page } = this.data;
    const openid = getApp().globalData.openid;

    return db.collection('videos')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
      .then(res => {
        const videos = this.data.videos.concat(res.data);
        this.setData({
          videos,
          loading: false,
          hasMore: res.data.length === pageSize,
          page: this.data.page + 1
        });
      })
      .catch(err => {
        console.error('加载视频失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/video/detail/detail?id=' + id });
  },

  deleteVideo(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除视频',
      content: '确定删除？数据无法恢复',
      success: res => {
        if (res.confirm) {
          const db = wx.cloud.database();
          db.collection('videos').doc(id).remove({
            success: () => {
              wx.showToast({ title: '已删除', icon: 'success' });
              this.setData({ page: 1, hasMore: true, videos: [] });
              this.loadVideos();
            },
            fail: () => {
              wx.showToast({ title: '删除失败', icon: 'none' });
            }
          });
        }
      }
    });
  }
});
