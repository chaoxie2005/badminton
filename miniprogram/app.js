App({
  onLaunch() {
    wx.cloud.init({
      env: 'chase-d7gfifckde6ce5137',
      traceUser: true
    });
  },

  globalData: {
    userInfo: null,
    openid: ''
  }
});
