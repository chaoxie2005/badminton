Page({
  data: {
    forumId: '',
    forum: null,
    posts: [],
    loading: false,
    hasMore: true,
    joined: false,
    _skip: 0,
    pageSize: 10
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        forumId: options.id,
        currentOpenid: getApp().globalData.openid || ''
      });
      this.loadForum(options.id);
      this.checkJoined(options.id);
    }
  },

  onShow() {
    if (this.data.forumId) {
      this.fetchPosts(true);
    }
  },

  onPullDownRefresh() {
    this.fetchPosts(true);
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchPosts(false);
    }
  },

  loadForum(id) {
    const db = wx.cloud.database();
    db.collection('forums').doc(id).get().then(res => {
      this.setData({ forum: res.data });
    }).catch(() => {});
  },

  checkJoined(forumId) {
    const openid = getApp().globalData.openid;
    if (!openid) return;
    const db = wx.cloud.database();
    db.collection('forum_members')
      .where({ forumId, openid })
      .get()
      .then(res => {
        this.setData({ joined: res.data.length > 0 });
      }).catch(() => {});
  },

  fetchPosts(reset) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    let skip = this.data._skip;
    if (reset) skip = 0;

    wx.cloud.callFunction({
      name: 'forum',
      data: {
        action: 'listPosts',
        forumId: this.data.forumId,
        skip,
        pageSize: this.data.pageSize
      }
    }).then(res => {
      const result = res.result;
      const data = result.data || [];
      skip += data.length;
      const list = reset ? data : this.data.posts.concat(data);
      this.setData({
        posts: list,
        loading: false,
        hasMore: result.hasMore !== false,
        _skip: skip
      });
    }).catch(err => {
      console.error('fetchPosts error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  toggleJoin() {
    const openid = getApp().globalData.openid;
    if (!openid) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const action = this.data.joined ? 'leaveForum' : 'joinForum';

    wx.cloud.callFunction({
      name: 'forum',
      data: { action, forumId: this.data.forumId }
    }).then(res => {
      if (res.result.error) {
        wx.showToast({ title: res.result.error, icon: 'none' });
        return;
      }
      this.setData({ joined: !this.data.joined });
      wx.showToast({ title: this.data.joined ? '已退出' : '已加入', icon: 'success' });
      this.loadForum(this.data.forumId);
    }).catch(err => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  goCreatePost() {
    if (!this.data.joined) {
      wx.showToast({ title: '请先加入论坛', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: '/pages/forum/create/create?forumId=' + this.data.forumId
    });
  },

  goPost(e) {
    wx.navigateTo({
      url: '/pages/forum/post/post?id=' + e.currentTarget.dataset.id
    });
  },

  toggleLike(e) {
    const { id } = e.currentTarget.dataset;
    wx.cloud.callFunction({
      name: 'forum',
      data: { action: 'toggleLike', postId: id }
    }).then(res => {
      const { liked, likeCount } = res.result;
      const posts = this.data.posts.map(p => {
        if (p._id === id) {
          p.likeCount = likeCount;
          p._liked = liked;
        }
        return p;
      });
      this.setData({ posts });
    }).catch(err => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  deletePost(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除帖子',
      content: '确定删除？数据无法恢复',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'forum',
            data: { action: 'deletePost', id }
          }).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.fetchPosts(true);
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  }
});
