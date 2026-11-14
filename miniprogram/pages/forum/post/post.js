Page({
  data: {
    postId: '',
    post: null,
    comments: [],
    commentText: '',
    sending: false,
    currentOpenid: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        postId: options.id,
        currentOpenid: getApp().globalData.openid || ''
      });
      this.loadPost(options.id);
      this.loadComments(true);
    }
  },

  onPullDownRefresh() {
    this.loadPost(this.data.postId);
    this.loadComments(true);
    wx.stopPullDownRefresh();
  },

  loadPost(id) {
    wx.cloud.callFunction({
      name: 'forum',
      data: { action: 'getPost', id }
    }).then(res => {
      this.setData({ post: res.result });
    }).catch(err => {
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  loadComments(reset) {
    wx.cloud.callFunction({
      name: 'forum',
      data: {
        action: 'listComments',
        postId: this.data.postId,
        skip: 0,
        pageSize: 50
      }
    }).then(res => {
      this.setData({ comments: res.result.data || [] });
    }).catch(err => {
      console.error('loadComments error:', err);
    });
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  sendComment() {
    const text = this.data.commentText.trim();
    if (!text) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' });
      return;
    }
    if (this.data.sending) return;

    this.setData({ sending: true });

    wx.cloud.callFunction({
      name: 'forum',
      data: {
        action: 'createComment',
        postId: this.data.postId,
        content: text
      }
    }).then(res => {
      wx.showToast({ title: '评论成功', icon: 'success' });
      this.setData({ commentText: '', sending: false });
      this.loadComments(true);
      this.loadPost(this.data.postId);
    }).catch(err => {
      wx.showToast({ title: '评论失败', icon: 'none' });
      this.setData({ sending: false });
    });
  },

  toggleLike() {
    wx.cloud.callFunction({
      name: 'forum',
      data: { action: 'toggleLike', postId: this.data.postId }
    }).then(res => {
      const { liked, likeCount } = res.result;
      const post = this.data.post;
      if (post) {
        post.likeCount = likeCount;
        post._liked = liked;
        this.setData({ post });
      }
    }).catch(err => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  deleteComment(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除评论',
      content: '确定删除？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'forum',
            data: { action: 'deleteComment', id }
          }).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadComments(true);
            this.loadPost(this.data.postId);
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  deletePost() {
    wx.showModal({
      title: '删除帖子',
      content: '确定删除？数据无法恢复',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'forum',
            data: { action: 'deletePost', id: this.data.postId }
          }).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            wx.navigateBack();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
        }
      }
    });
  },

  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    const urls = (this.data.post && this.data.post.images) ? this.data.post.images : [src];
    wx.previewImage({ current: src, urls });
  }
});
