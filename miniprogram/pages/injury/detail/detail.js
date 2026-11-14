Page({
  data: {
    article: null,
    loading: true
  },

  onLoad(options) {
    const id = options.id;
    if (!id) {
      wx.showToast({ title: '文章不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.loadArticle(id);
  },

  loadArticle(id) {
    const db = wx.cloud.database();
    db.collection('injury_articles')
      .doc(id)
      .get()
      .then(res => {
        this.setData({ article: res.data, loading: false });
        db.collection('injury_articles')
          .doc(id)
          .update({
            data: { viewCount: db.command.inc(1) }
          })
          .catch(() => {});
      })
      .catch(err => {
        console.error('加载文章失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  }
});
