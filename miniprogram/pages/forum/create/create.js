Page({
  data: {
    forumId: '',
    title: '',
    content: '',
    images: [],
    uploading: false,
    submitting: false
  },

  onLoad(options) {
    if (options.forumId) {
      this.setData({ forumId: options.forumId });
    }
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  chooseImage() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        this.uploadImages(res.tempFilePaths);
      }
    });
  },

  uploadImages(filePaths) {
    this.setData({ uploading: true });
    const cloudPathPrefix = 'forum-images/' + Date.now() + '/';
    const uploadTasks = filePaths.map((path, i) => {
      return wx.cloud.uploadFile({
        cloudPath: cloudPathPrefix + i + path.match(/\.[^.]+$/)[0],
        filePath: path
      });
    });

    Promise.all(uploadTasks).then(results => {
      const newImages = results.map(r => r.fileID);
      this.setData({
        images: this.data.images.concat(newImages),
        uploading: false
      });
      wx.showToast({ title: '上传成功', icon: 'success' });
    }).catch(err => {
      console.error('upload error:', err);
      this.setData({ uploading: false });
      wx.showToast({ title: '上传失败', icon: 'none' });
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(idx, 1);
    this.setData({ images });
  },

  submit() {
    if (this.data.submitting) return;

    const title = this.data.title.trim();
    const content = this.data.content.trim();

    if (!title) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!content) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    wx.cloud.callFunction({
      name: 'forum',
      data: {
        action: 'createPost',
        forumId: this.data.forumId,
        title,
        content,
        images: this.data.images
      }
    }).then(res => {
      wx.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch(err => {
      wx.showToast({ title: '发布失败', icon: 'none' });
      this.setData({ submitting: false });
    });
  }
});
