Page({
  data: {
    categories: ['全部', '膝盖', '脚踝', '肩部', '腰部', '肘部', '其他'],
    activeCategory: '全部',
    articles: [],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadArticles();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, articles: [] });
    this.loadArticles().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadArticles();
    }
  },

  switchCategory(e) {
    const cat = e.currentTarget.dataset.category;
    if (cat === this.data.activeCategory) return;
    this.setData({ activeCategory: cat, page: 1, hasMore: true, articles: [] });
    this.loadArticles();
  },

  loadArticles() {
    if (this.data.loading) return Promise.resolve();
    this.setData({ loading: true });

    const db = wx.cloud.database();
    const pageSize = 10;
    const { activeCategory, page } = this.data;

    let query = db.collection('injury_articles');
    if (activeCategory !== '全部') {
      query = query.where({ category: activeCategory });
    }

    return query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
      .then(res => {
        const articles = this.data.articles.concat(res.data);
        this.setData({
          articles,
          loading: false,
          hasMore: res.data.length === pageSize,
          page: this.data.page + 1
        });
      })
      .catch(err => {
        console.error('加载文章失败:', err);
        this.setData({ loading: false });
      });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/injury/detail/detail?id=${id}` });
  }
});
