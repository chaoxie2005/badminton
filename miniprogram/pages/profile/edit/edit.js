Page({
  data: {
    avatarUrl: '',
    nickName: '',
    bio: '',
    badmintonLevel: '',
    city: '',
    homeCourt: '',
    age: '',
    playingStyle: '',
    genderIndex: 0,
    levelIndex: 0,
    styleIndex: 0,
    ageIndex: 0,
    genders: ['保密', '男', '女'],
    levels: ['小白', '业余初级', '业余中级', '业余高级', '专业级'],
    styles: ['都可以', '单打', '双打', '混双'],
    ages: ['保密', '18岁以下', '18-25岁', '25-35岁', '35-45岁', '45岁以上'],
    saving: false,
    uploading: false
  },

  onLoad() {
    const user = getApp().globalData.userInfo;
    if (!user) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    const levelIndex = Math.max(0, this.data.levels.indexOf(user.badmintonLevel || ''));
    const styleIndex = Math.max(0, this.data.styles.indexOf(user.playingStyle || ''));
    const ageIndex = Math.max(0, this.data.ages.indexOf(user.age || ''));
    this.setData({
      avatarUrl: user.avatarUrl || '',
      nickName: user.nickName || '',
      bio: user.bio || '',
      badmintonLevel: user.badmintonLevel || '',
      city: user.city || '',
      homeCourt: user.homeCourt || '',
      age: user.age || '',
      playingStyle: user.playingStyle || '',
      genderIndex: user.gender || 0,
      levelIndex,
      styleIndex,
      ageIndex
    });
  },

  onNameInput(e)       { this.setData({ nickName: e.detail.value }); },
  onBioInput(e)        { this.setData({ bio: e.detail.value }); },
  onCityInput(e)       { this.setData({ city: e.detail.value }); },
  onCourtInput(e)      { this.setData({ homeCourt: e.detail.value }); },
  onGenderChange(e)    { this.setData({ genderIndex: parseInt(e.detail.value) }); },
  onLevelChange(e)     {
    const idx = parseInt(e.detail.value);
    this.setData({ levelIndex: idx, badmintonLevel: this.data.levels[idx] });
  },
  onStyleChange(e)     {
    const idx = parseInt(e.detail.value);
    this.setData({ styleIndex: idx, playingStyle: this.data.styles[idx] });
  },
  onAgeChange(e)       {
    const idx = parseInt(e.detail.value);
    this.setData({ ageIndex: idx, age: this.data.ages[idx] });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        this.setData({ uploading: true });
        const cloudPath = 'avatars/' + getApp().globalData.openid + '_' + Date.now() + '.jpg';
        wx.cloud.uploadFile({
          cloudPath,
          filePath: tempPath,
          success: (uploadRes) => {
            this.setData({ avatarUrl: uploadRes.fileID });
            wx.showToast({ title: '头像上传成功', icon: 'success' });
          },
          fail: (err) => {
            console.error('头像上传失败:', err);
            wx.showToast({ title: '头像上传失败', icon: 'none' });
          },
          complete: () => {
            this.setData({ uploading: false });
          }
        });
      }
    });
  },

  save() {
    if (!this.data.nickName.trim()) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    this.setData({ saving: true });

    wx.cloud.callFunction({
      name: 'login',
      data: {
        action: 'updateProfile',
        avatarUrl: this.data.avatarUrl,
        nickName: this.data.nickName.trim(),
        bio: this.data.bio.trim(),
        badmintonLevel: this.data.badmintonLevel,
        city: this.data.city.trim(),
        homeCourt: this.data.homeCourt.trim(),
        age: this.data.age,
        playingStyle: this.data.playingStyle,
        gender: this.data.genderIndex
      }
    }).then(res => {
      const user = res.result.user;
      getApp().globalData.userInfo = user;
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    }).catch(() => {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }).finally(() => {
      this.setData({ saving: false });
    });
  }
});
